/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '..');
const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;

require.extensions['.ts'] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  loadedModule._compile(compiled.outputText, filename);
};

Module._resolveFilename = function resolveGeneratedAssetExportTestModule(
  request,
  parent,
  isMain,
  options,
) {
  if (request.startsWith('@/')) {
    return originalResolveFilename.call(
      this,
      path.join(repositoryRoot, request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function loadGeneratedAssetExportTestModule(request, parent, isMain) {
  if (request === 'expo-media-library' || request === 'expo-sharing') {
    return {};
  }
  if (request === 'react-native') {
    return { Linking: { openSettings: async () => undefined } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  ExpoGeneratedAssetExportService,
  GeneratedAssetExportError,
} = require('../services/generated-asset-export-service.ts');

const generatedUri = 'file:///documents/jobs/job-1/generated/asset-1.png';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function permissionResponse(overrides = {}) {
  return {
    status: 'granted',
    granted: true,
    expires: 'never',
    canAskAgain: true,
    accessPrivileges: 'all',
    ...overrides,
  };
}

function createHarness(options = {}) {
  const calls = {
    mediaAvailability: 0,
    permission: [],
    save: [],
    sharingAvailability: 0,
    share: [],
    settings: 0,
  };

  const dependencies = {
    mediaLibrary: {
      async isAvailableAsync() {
        calls.mediaAvailability += 1;
        if (options.mediaAvailabilityError) throw options.mediaAvailabilityError;
        return options.mediaAvailable ?? true;
      },
      async requestPermissionsAsync(writeOnly, granularPermissions) {
        calls.permission.push([writeOnly, granularPermissions]);
        if (options.permissionPromise) return options.permissionPromise;
        if (options.permissionError) throw options.permissionError;
        return options.permission ?? permissionResponse();
      },
      async saveToLibraryAsync(uri) {
        calls.save.push(uri);
        if (options.savePromise) return options.savePromise;
        if (options.saveError) throw options.saveError;
      },
    },
    sharing: {
      async isAvailableAsync() {
        calls.sharingAvailability += 1;
        if (options.sharingAvailabilityError) throw options.sharingAvailabilityError;
        return options.sharingAvailable ?? true;
      },
      async shareAsync(uri, shareOptions) {
        calls.share.push([uri, shareOptions]);
        if (options.sharePromise) return options.sharePromise;
        if (options.shareError) throw options.shareError;
      },
    },
    async openSettings() {
      calls.settings += 1;
      if (options.settingsError) throw options.settingsError;
    },
  };

  return {
    calls,
    service: new ExpoGeneratedAssetExportService(dependencies),
  };
}

function hasCode(code) {
  return (error) =>
    error instanceof GeneratedAssetExportError && error.code === code;
}

test('Save requests only write access with no granular reads and saves the PNG', async () => {
  const harness = createHarness();

  assert.deepEqual(await harness.service.saveToPhotos(`  ${generatedUri}  `), {
    status: 'saved',
  });
  assert.deepEqual(harness.calls.permission, [[true, []]]);
  assert.deepEqual(harness.calls.save, [generatedUri]);
  assert.equal(harness.calls.share.length, 0);
});

test('Share uses the PNG directly without requesting media-library permission', async () => {
  const harness = createHarness();

  assert.deepEqual(await harness.service.share(generatedUri), { status: 'shared' });
  assert.equal(harness.calls.permission.length, 0);
  assert.deepEqual(harness.calls.share, [[
    generatedUri,
    {
      dialogTitle: 'Share Before & After Post',
      mimeType: 'image/png',
      UTI: 'public.png',
    },
  ]]);
});

test('Save reports temporary and permanent permission denial without writing', async (t) => {
  for (const canAskAgain of [true, false]) {
    await t.test(`canAskAgain=${canAskAgain}`, async () => {
      const harness = createHarness({
        permission: permissionResponse({
          status: 'denied',
          granted: false,
          canAskAgain,
          accessPrivileges: 'none',
        }),
      });

      assert.deepEqual(await harness.service.saveToPhotos(generatedUri), {
        status: 'permission-denied',
        canAskAgain,
      });
      assert.equal(harness.calls.save.length, 0);
    });
  }
});

test('unavailable Save and Share paths do not attempt their operations', async () => {
  const harness = createHarness({ mediaAvailable: false, sharingAvailable: false });

  assert.deepEqual(await harness.service.saveToPhotos(generatedUri), {
    status: 'unavailable',
  });
  assert.deepEqual(await harness.service.share(generatedUri), {
    status: 'unavailable',
  });
  assert.equal(harness.calls.permission.length, 0);
  assert.equal(harness.calls.save.length, 0);
  assert.equal(harness.calls.share.length, 0);
});

test('native availability-check failures map to stable Save and Share errors', async () => {
  const saveHarness = createHarness({
    mediaAvailabilityError: new Error('native availability failure'),
  });
  await assert.rejects(
    saveHarness.service.saveToPhotos(generatedUri),
    hasCode('save-failed'),
  );
  assert.equal(saveHarness.calls.permission.length, 0);
  assert.equal(saveHarness.calls.save.length, 0);

  const shareHarness = createHarness({
    sharingAvailabilityError: new Error('native availability failure'),
  });
  await assert.rejects(
    shareHarness.service.share(generatedUri),
    hasCode('share-failed'),
  );
  assert.equal(shareHarness.calls.share.length, 0);
});

test('Save maps permission and library failures to stable errors', async (t) => {
  await t.test('permission request failure', async () => {
    const harness = createHarness({ permissionError: new Error('native failure') });
    await assert.rejects(
      harness.service.saveToPhotos(generatedUri),
      hasCode('permission-failed'),
    );
    await assert.rejects(
      harness.service.saveToPhotos(generatedUri),
      hasCode('permission-failed'),
    );
  });

  await t.test('photo library save failure', async () => {
    const harness = createHarness({ saveError: new Error('disk full') });
    await assert.rejects(
      harness.service.saveToPhotos(generatedUri),
      hasCode('save-failed'),
    );
    await assert.rejects(
      harness.service.saveToPhotos(generatedUri),
      hasCode('save-failed'),
    );
  });
});

test('Share maps native failure and rejects invalid local PNG URIs', async () => {
  const harness = createHarness({ shareError: new Error('native failure') });

  await assert.rejects(harness.service.share(generatedUri), hasCode('share-failed'));
  await assert.rejects(harness.service.share(generatedUri), hasCode('share-failed'));
  await assert.rejects(
    harness.service.share('https://example.com/asset.png'),
    hasCode('invalid-uri'),
  );
  await assert.rejects(
    harness.service.saveToPhotos('file:///documents/asset.jpg'),
    hasCode('invalid-uri'),
  );
});

test('Save rejects concurrent work and resets its guard after completion', async () => {
  const pendingPermission = deferred();
  const harness = createHarness({ permissionPromise: pendingPermission.promise });
  const first = harness.service.saveToPhotos(generatedUri);

  await assert.rejects(
    harness.service.saveToPhotos(generatedUri),
    hasCode('operation-in-progress'),
  );
  pendingPermission.resolve(permissionResponse());
  assert.deepEqual(await first, { status: 'saved' });
  assert.deepEqual(await harness.service.saveToPhotos(generatedUri), {
    status: 'saved',
  });
});

test('Share rejects concurrent work and resets its guard after completion', async () => {
  const pendingShare = deferred();
  const harness = createHarness({ sharePromise: pendingShare.promise });
  const first = harness.service.share(generatedUri);

  await assert.rejects(
    harness.service.share(generatedUri),
    hasCode('operation-in-progress'),
  );
  pendingShare.resolve();
  assert.deepEqual(await first, { status: 'shared' });
  assert.deepEqual(await harness.service.share(generatedUri), { status: 'shared' });
});

test('Open Settings succeeds or maps native failure to a stable error', async () => {
  const success = createHarness();
  await success.service.openSettings();
  assert.equal(success.calls.settings, 1);

  const failure = createHarness({ settingsError: new Error('unavailable') });
  await assert.rejects(failure.service.openSettings(), hasCode('settings-failed'));
  assert.equal(failure.calls.settings, 1);
});
