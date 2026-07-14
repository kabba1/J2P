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

Module._resolveFilename = function resolveGeneratedAssetTestModule(
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

Module._load = function loadGeneratedAssetTestModule(request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return {};
  }
  if (request === 'expo-file-system') {
    return {
      Paths: {
        document: { uri: 'file:///document/' },
        normalize(uri) {
          const parsed = new URL(uri);
          const pathname = path.posix.normalize(parsed.pathname);
          return `file://${pathname}`;
        },
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  AsyncStorageGeneratedAssetRepository,
} = require('../repositories/async-storage-generated-asset-repository.ts');
const {
  AsyncStoragePairRepository,
} = require('../repositories/async-storage-pair-repository.ts');

function createMemoryStorage(initialValue = null) {
  let value = initialValue;
  return {
    async getItem() {
      return value;
    },
    async setItem(_key, nextValue) {
      value = nextValue;
    },
    readRaw() {
      return value;
    },
  };
}

function assetInput(overrides = {}) {
  return {
    id: 'asset-1',
    jobId: 'job-1',
    pairId: 'pair-1',
    localUri: 'file:///document/jobs/job-1/generated/asset-1.png',
    format: 'square',
    layout: 'side-by-side',
    width: 1080,
    height: 1080,
    labelsEnabled: true,
    footerText: 'Johnson Painting Co.',
    sourceShotName: 'Living Room Wide',
    createdAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

test('creates, retrieves, and lists all generated assets newest first', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());
  const older = await repository.createAsset(assetInput());
  const newer = await repository.createAsset(
    assetInput({
      id: 'asset-2',
      pairId: 'pair-2',
      localUri: 'file:///document/jobs/job-1/generated/asset-2.png',
      format: 'portrait',
      layout: 'stacked',
      width: 1080,
      height: 1350,
      createdAt: '2026-07-13T11:00:00.000Z',
    }),
  );
  const otherJob = await repository.createAsset(
    assetInput({
      id: 'asset-other',
      jobId: 'job-2',
      pairId: 'pair-other',
      localUri: 'file:///document/jobs/job-2/generated/asset-other.png',
      createdAt: '2026-07-13T12:00:00.000Z',
    }),
  );

  assert.deepEqual(await repository.listAssets(), [otherJob, newer, older]);
  assert.deepEqual(await repository.listAssetsForJob('job-1'), [newer, older]);
  assert.deepEqual(await repository.getAsset('asset-2'), newer);
  assert.equal(await repository.getAsset('missing'), undefined);
});

test('normalizes optional text and can update metadata without changing identity', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());
  const created = await repository.createAsset(
    assetInput({ footerText: '  Johnson   Painting Co.  ', sourceShotName: '  Living Room  ' }),
  );
  assert.equal(created.footerText, 'Johnson Painting Co.');
  assert.equal(created.sourceShotName, 'Living Room');

  const updated = await repository.updateAsset('asset-1', {
    layout: 'stacked',
    labelsEnabled: false,
    footerText: null,
  });
  assert.equal(updated.id, created.id);
  assert.equal(updated.jobId, created.jobId);
  assert.equal(updated.pairId, created.pairId);
  assert.equal(updated.layout, 'stacked');
  assert.equal(updated.labelsEnabled, false);
  assert.equal(updated.footerText, undefined);
  assert.equal(updated.createdAt, created.createdAt);
  assert.ok(updated.updatedAt >= created.updatedAt);
  assert.equal(await repository.updateAsset('missing', {}), undefined);
});

test('rejects duplicate IDs and serializes concurrent creation', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());
  const results = await Promise.allSettled([
    repository.createAsset(assetInput()),
    repository.createAsset(assetInput({ pairId: 'pair-2' })),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal((await repository.listAssets()).length, 1);
});

test('deletes one asset without affecting its source identifiers or other assets', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());
  await repository.createAsset(assetInput());
  const retained = await repository.createAsset(
    assetInput({
      id: 'asset-2',
      pairId: 'pair-2',
      localUri: 'file:///document/jobs/job-1/generated/asset-2.png',
    }),
  );

  assert.equal(await repository.deleteAsset('asset-1'), true);
  assert.equal(await repository.deleteAsset('asset-1'), false);
  assert.deepEqual(await repository.listAssetsForJob('job-1'), [retained]);
  assert.equal(retained.pairId, 'pair-2');
});

test('unpairing source photos does not delete an already-generated asset', async () => {
  const pairRepository = new AsyncStoragePairRepository(createMemoryStorage());
  const assetRepository = new AsyncStorageGeneratedAssetRepository(
    createMemoryStorage(),
  );
  const pair = await pairRepository.createPair({
    id: 'pair-1',
    jobId: 'job-1',
    beforeMediaId: 'before-1',
    afterMediaId: 'after-1',
    createdAt: '2026-07-13T09:00:00.000Z',
  });
  const generatedAsset = await assetRepository.createAsset(assetInput());

  assert.equal(await pairRepository.deletePair(pair.id), true);

  assert.equal(await pairRepository.getPair(pair.id), undefined);
  assert.deepEqual(
    await assetRepository.getAsset(generatedAsset.id),
    generatedAsset,
  );
});

test('deletes only one job\'s generated assets', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());
  await repository.createAsset(assetInput());
  const retained = await repository.createAsset(
    assetInput({
      id: 'asset-other',
      jobId: 'job-2',
      pairId: 'pair-other',
      localUri: 'file:///document/jobs/job-2/generated/asset-other.png',
    }),
  );

  assert.equal(await repository.deleteAssetsForJob('job-1'), 1);
  assert.equal(await repository.deleteAssetsForJob('job-1'), 0);
  assert.deepEqual(await repository.listAssetsForJob('job-1'), []);
  assert.deepEqual(await repository.listAssetsForJob('job-2'), [retained]);
});

test('rejects unsupported formats, layouts, and mismatched output dimensions', async () => {
  const repository = new AsyncStorageGeneratedAssetRepository(createMemoryStorage());

  await assert.rejects(
    repository.createAsset(assetInput({ format: 'story' })),
    /format is invalid/i,
  );
  await assert.rejects(
    repository.createAsset(assetInput({ layout: 'slider' })),
    /layout is invalid/i,
  );
  await assert.rejects(
    repository.createAsset(assetInput({ width: 999 })),
    /must be 1080 x 1080 pixels/i,
  );
  await assert.rejects(
    repository.createAsset(
      assetInput({ localUri: 'file:///document/jobs/job-2/generated/asset-1.png' }),
    ),
    /must match its managed job and asset path/i,
  );
  await assert.rejects(
    repository.createAsset(
      assetInput({ localUri: 'file:///foreign/jobs/job-1/generated/asset-1.png' }),
    ),
    /must match its managed job and asset path/i,
  );
  await assert.rejects(
    repository.createAsset(assetInput({ id: '../asset-1' })),
    /characters that cannot be used/i,
  );
});

test('rejects malformed persisted data rather than silently dropping it', async (t) => {
  const valid = {
    ...assetInput(),
    assetType: 'before-after-image',
    updatedAt: '2026-07-13T10:00:00.000Z',
  };
  const malformedValues = [
    ['invalid JSON', '{not-json'],
    ['wrong root', JSON.stringify({ id: 'asset-1' })],
    ['incomplete record', JSON.stringify([{ id: 'asset-1' }])],
    ['invalid format', JSON.stringify([{ ...valid, format: 'story' }])],
    ['invalid layout', JSON.stringify([{ ...valid, layout: 'slider' }])],
    ['wrong dimensions', JSON.stringify([{ ...valid, width: 999 }])],
    [
      'mismatched managed URI',
      JSON.stringify([
        { ...valid, localUri: 'file:///document/jobs/job-2/generated/asset-1.png' },
      ]),
    ],
    [
      'matching suffix under a foreign root',
      JSON.stringify([
        {
          ...valid,
          localUri: 'file:///foreign/jobs/job-1/generated/asset-1.png',
        },
      ]),
    ],
    [
      'matching suffix under the cache root',
      JSON.stringify([
        {
          ...valid,
          localUri: 'file:///cache/jobs/job-1/generated/asset-1.png',
        },
      ]),
    ],
    ['unsafe storage ID', JSON.stringify([{ ...valid, id: '../asset-1' }])],
    ['unnormalized footer', JSON.stringify([{ ...valid, footerText: ' padded ' }])],
    ['duplicate IDs', JSON.stringify([valid, { ...valid, pairId: 'pair-2' }])],
  ];

  for (const [name, raw] of malformedValues) {
    await t.test(name, async () => {
      const repository = new AsyncStorageGeneratedAssetRepository(
        createMemoryStorage(raw),
      );
      await assert.rejects(repository.listAssets());
    });
  }
});

test('persists only the committed result of a concurrent duplicate race', async () => {
  const storage = createMemoryStorage();
  const repository = new AsyncStorageGeneratedAssetRepository(storage);
  await Promise.allSettled([
    repository.createAsset(assetInput()),
    repository.createAsset(assetInput({ pairId: 'pair-2' })),
  ]);

  const persisted = JSON.parse(storage.readRaw());
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].id, 'asset-1');
});
