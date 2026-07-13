/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '..');
const originalResolveFilename = Module._resolveFilename;

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

Module._resolveFilename = function resolveMatchedAfterTestModule(
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

const { MatchedAfterService } = require('../services/matched-after-service.ts');

function mediaRecord(overrides = {}) {
  return {
    id: 'before-1',
    jobId: 'job-1',
    stage: 'before',
    mediaType: 'photo',
    localUri: 'file:///before.jpg',
    createdAt: '2026-07-13T09:00:00.000Z',
    updatedAt: '2026-07-13T09:00:00.000Z',
    shotName: 'Living Room Wide',
    width: 1200,
    height: 800,
    cameraFacing: 'back',
    zoom: 0.2,
    ...overrides,
  };
}

function pairRecord(overrides = {}) {
  return {
    id: 'pair-1',
    jobId: 'job-1',
    beforeMediaId: 'before-1',
    afterMediaId: 'after-old',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

function saveInput(overrides = {}) {
  return {
    tempUri: 'file:///cache/after-temp.jpg',
    jobId: 'job-1',
    beforeMediaId: 'before-1',
    capturedAt: '2026-07-13T11:00:00.000Z',
    width: 1600,
    height: 1200,
    cameraFacing: 'back',
    zoom: 0.2,
    ...overrides,
  };
}

function createHarness(options = {}) {
  const events = [];
  const before = options.before ?? mediaRecord();
  let currentPair = options.existingPair;
  let pairAttempts = 0;
  let tempDeleteCount = 0;
  let metadataDeleteCount = 0;
  let persistentDeleteCount = 0;

  const dependencies = {
    mediaRepository: {
      async getMedia(id) {
        events.push(`media:get:${id}`);
        return id === before.id ? before : undefined;
      },
      async createMedia(input) {
        events.push('media:create');
        if (options.mediaCreateError) {
          throw options.mediaCreateError;
        }
        return {
          ...input,
          mediaType: 'photo',
          createdAt: input.createdAt ?? '2026-07-13T11:00:00.000Z',
          updatedAt: '2026-07-13T11:00:00.000Z',
        };
      },
      async deleteMedia(id) {
        events.push(`media:delete:${id}`);
        metadataDeleteCount += 1;
        return options.metadataDeleteResult ?? true;
      },
    },
    mediaFileStorage: {
      async persistCapturedPhoto(tempUri, jobId, stage, mediaId) {
        events.push('file:persist');
        assert.equal(tempUri, 'file:///cache/after-temp.jpg');
        assert.equal(jobId, 'job-1');
        assert.equal(stage, 'after');
        assert.equal(mediaId, 'after-new');
        if (options.persistError) {
          throw options.persistError;
        }
        return 'file:///jobs/job-1/after/after-new.jpg';
      },
      async deleteMediaFile(uri) {
        events.push(`file:delete:${uri}`);
        persistentDeleteCount += 1;
      },
      async deleteTemporaryCapture(uri) {
        events.push(`temp:delete:${uri}`);
        tempDeleteCount += 1;
        if (options.tempDeleteError) {
          throw options.tempDeleteError;
        }
      },
    },
    async getPair(id) {
      events.push(`pair:get:${id}`);
      return currentPair;
    },
    async createPair(input) {
      events.push('pair:create');
      pairAttempts += 1;
      if (options.createPairErrorUntilAttempt >= pairAttempts) {
        throw new Error('Pair storage unavailable.');
      }
      currentPair = pairRecord({
        afterMediaId: input.afterMediaId,
        beforeMediaId: input.beforeMediaId,
        jobId: input.jobId,
      });
      return currentPair;
    },
    async replaceAfterMedia(id, afterMediaId) {
      events.push(`pair:replace:${id}`);
      if (options.replaceError) {
        throw options.replaceError;
      }
      if (options.replaceMissing) {
        return undefined;
      }
      currentPair = { ...currentPair, afterMediaId, updatedAt: '2026-07-13T11:00:00.000Z' };
      return currentPair;
    },
    createMediaId: () => 'after-new',
    warn(message, error) {
      events.push('warn');
      if (options.onWarn) options.onWarn(message, error);
    },
  };

  return {
    service: new MatchedAfterService(dependencies),
    events,
    currentPair: () => currentPair,
    counts: () => ({ tempDeleteCount, metadataDeleteCount, persistentDeleteCount }),
  };
}

test('commits in file, media, pair, then temporary-cleanup order', async () => {
  const harness = createHarness();

  const result = await harness.service.save(saveInput());

  assert.deepEqual(harness.events, [
    'media:get:before-1',
    'file:persist',
    'media:create',
    'pair:create',
    'temp:delete:file:///cache/after-temp.jpg',
  ]);
  assert.equal(result.after.id, 'after-new');
  assert.equal(result.after.stage, 'after');
  assert.equal(result.after.shotName, 'Living Room Wide');
  assert.equal(result.after.orientation, 'landscape');
  assert.equal(result.pair.beforeMediaId, 'before-1');
  assert.equal(result.pair.afterMediaId, 'after-new');
});

test('rolls back the persistent file when media metadata creation fails', async () => {
  const harness = createHarness({ mediaCreateError: new Error('Metadata write failed.') });

  await assert.rejects(harness.service.save(saveInput()), /Metadata write failed/);

  assert.deepEqual(harness.events, [
    'media:get:before-1',
    'file:persist',
    'media:create',
    'file:delete:file:///jobs/job-1/after/after-new.jpg',
  ]);
  assert.deepEqual(harness.counts(), {
    tempDeleteCount: 0,
    metadataDeleteCount: 0,
    persistentDeleteCount: 1,
  });
});

test('rolls back pair failure, retains temp, and permits a successful retry', async () => {
  const harness = createHarness({ createPairErrorUntilAttempt: 1 });

  await assert.rejects(harness.service.save(saveInput()), /Pair storage unavailable/);
  assert.deepEqual(harness.counts(), {
    tempDeleteCount: 0,
    metadataDeleteCount: 1,
    persistentDeleteCount: 1,
  });

  const retried = await harness.service.save(saveInput());

  assert.equal(retried.pair.afterMediaId, 'after-new');
  assert.deepEqual(harness.counts(), {
    tempDeleteCount: 1,
    metadataDeleteCount: 1,
    persistentDeleteCount: 1,
  });
});

test('replacement failure rolls back only the new After and preserves the old pair', async () => {
  const oldPair = pairRecord();
  const harness = createHarness({
    existingPair: oldPair,
    replaceError: new Error('Pair replacement failed.'),
  });

  await assert.rejects(
    harness.service.save(saveInput({ replacePairId: oldPair.id })),
    /Pair replacement failed/,
  );

  assert.deepEqual(harness.currentPair(), oldPair);
  assert.equal(harness.events.includes('pair:replace:pair-1'), true);
  assert.deepEqual(harness.counts(), {
    tempDeleteCount: 0,
    metadataDeleteCount: 1,
    persistentDeleteCount: 1,
  });
});

test('replacement validates the displayed Before and job before writing a file', async (t) => {
  const invalidPairs = [
    ['different Before', pairRecord({ beforeMediaId: 'before-other' })],
    ['different job', pairRecord({ jobId: 'job-other' })],
  ];

  for (const [name, existingPair] of invalidPairs) {
    await t.test(name, async () => {
      const harness = createHarness({ existingPair });
      await assert.rejects(
        harness.service.save(saveInput({ replacePairId: existingPair.id })),
        /selected Before photo does not belong to this pair/i,
      );
      assert.deepEqual(harness.events, ['media:get:before-1', 'pair:get:pair-1']);
      assert.deepEqual(harness.counts(), {
        tempDeleteCount: 0,
        metadataDeleteCount: 0,
        persistentDeleteCount: 0,
      });
    });
  }
});

test('temporary cleanup is best-effort after the pair commit', async () => {
  const cleanupError = new Error('Cache busy.');
  let warning;
  const harness = createHarness({
    tempDeleteError: cleanupError,
    onWarn: (message, error) => {
      warning = { message, error };
    },
  });

  const result = await harness.service.save(saveInput());

  assert.equal(result.pair.afterMediaId, 'after-new');
  assert.equal(warning.message, 'The temporary matched photo could not be cleaned up.');
  assert.equal(warning.error, cleanupError);
  assert.deepEqual(harness.counts(), {
    tempDeleteCount: 1,
    metadataDeleteCount: 0,
    persistentDeleteCount: 0,
  });
  assert.deepEqual(harness.events.slice(-2), [
    'temp:delete:file:///cache/after-temp.jpg',
    'warn',
  ]);
});
