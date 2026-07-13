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

Module._resolveFilename = function resolvePairTestModule(request, parent, isMain, options) {
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

Module._load = function loadPairTestModule(request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};

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

function pairInput(overrides = {}) {
  return {
    id: 'pair-1',
    jobId: 'job-1',
    beforeMediaId: 'before-1',
    afterMediaId: 'after-1',
    createdAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

test('creates, gets, finds, and lists pairs for one job newest first', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());

  const older = await repository.createPair(pairInput());
  const newer = await repository.createPair(
    pairInput({
      id: 'pair-2',
      beforeMediaId: 'before-2',
      afterMediaId: 'after-2',
      createdAt: '2026-07-13T11:00:00.000Z',
    }),
  );
  await repository.createPair(
    pairInput({
      id: 'pair-other-job',
      jobId: 'job-2',
      beforeMediaId: 'before-other-job',
      afterMediaId: 'after-other-job',
    }),
  );

  assert.deepEqual(await repository.listPairsForJob('job-1'), [newer, older]);
  assert.deepEqual(await repository.getPair('pair-1'), older);
  assert.deepEqual(await repository.findPairForBefore('before-2'), newer);
  assert.deepEqual(await repository.findPairForAfter('after-2'), newer);
  assert.equal(await repository.getPair('missing-pair'), undefined);
});

test('rejects duplicate pair, Before, and After IDs', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  await repository.createPair(pairInput());

  await assert.rejects(
    repository.createPair(
      pairInput({ beforeMediaId: 'before-new', afterMediaId: 'after-new' }),
    ),
    /pair with this ID already exists/i,
  );
  await assert.rejects(
    repository.createPair(
      pairInput({ id: 'pair-new-before', afterMediaId: 'after-new' }),
    ),
    /Before photo already has a matched After photo/i,
  );
  await assert.rejects(
    repository.createPair(
      pairInput({ id: 'pair-new-after', beforeMediaId: 'before-new' }),
    ),
    /After photo is already assigned to another pair/i,
  );
});

test('serializes concurrent creates so only one pair can claim a Before photo', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());

  const results = await Promise.allSettled([
    repository.createPair(pairInput()),
    repository.createPair(
      pairInput({ id: 'pair-2', afterMediaId: 'after-2' }),
    ),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal((await repository.listPairsForJob('job-1')).length, 1);
});

test('replaces the After photo without changing pair identity or creation time', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  const created = await repository.createPair(pairInput());

  const updated = await repository.replaceAfterMedia('pair-1', 'after-replacement');

  assert.equal(updated.id, created.id);
  assert.equal(updated.beforeMediaId, created.beforeMediaId);
  assert.equal(updated.afterMediaId, 'after-replacement');
  assert.equal(updated.createdAt, created.createdAt);
  assert.ok(updated.updatedAt >= created.updatedAt);
  assert.equal(await repository.findPairForAfter('after-1'), undefined);
  assert.deepEqual(await repository.findPairForAfter('after-replacement'), updated);
  assert.equal(await repository.replaceAfterMedia('missing-pair', 'after-unused'), undefined);
});

test('rejects replacement with an After photo used by another pair', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  await repository.createPair(pairInput());
  await repository.createPair(
    pairInput({
      id: 'pair-2',
      beforeMediaId: 'before-2',
      afterMediaId: 'after-2',
    }),
  );

  await assert.rejects(
    repository.replaceAfterMedia('pair-1', 'after-2'),
    /After photo is already assigned to another pair/i,
  );
});

test('deletes one pair by ID and reports whether it existed', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  await repository.createPair(pairInput());

  assert.equal(await repository.deletePair('pair-1'), true);
  assert.equal(await repository.deletePair('pair-1'), false);
  assert.equal(await repository.getPair('pair-1'), undefined);
});

test('deletes pairs when either referenced media item is removed', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  await repository.createPair(pairInput());
  await repository.createPair(
    pairInput({
      id: 'pair-2',
      beforeMediaId: 'before-2',
      afterMediaId: 'after-2',
    }),
  );

  assert.equal(await repository.deletePairsForMedia('before-1'), 1);
  assert.equal(await repository.deletePairsForMedia('after-2'), 1);
  assert.equal(await repository.deletePairsForMedia('missing-media'), 0);
  assert.deepEqual(await repository.listPairsForJob('job-1'), []);
});

test('deletes every pair for one job without changing another job', async () => {
  const repository = new AsyncStoragePairRepository(createMemoryStorage());
  await repository.createPair(pairInput());
  const retained = await repository.createPair(
    pairInput({
      id: 'pair-job-2',
      jobId: 'job-2',
      beforeMediaId: 'before-job-2',
      afterMediaId: 'after-job-2',
    }),
  );

  assert.equal(await repository.deletePairsForJob('job-1'), 1);
  assert.equal(await repository.deletePairsForJob('job-1'), 0);
  assert.deepEqual(await repository.listPairsForJob('job-1'), []);
  assert.deepEqual(await repository.listPairsForJob('job-2'), [retained]);
});

test('rejects malformed persisted data instead of silently accepting it', async (t) => {
  const malformedValues = [
    ['invalid JSON', '{not-json'],
    ['wrong root shape', JSON.stringify({ id: 'not-an-array' })],
    ['invalid record', JSON.stringify([{ id: 'incomplete-pair' }])],
    [
      'duplicate IDs',
      JSON.stringify([
        {
          id: 'pair-duplicate',
          jobId: 'job-1',
          beforeMediaId: 'before-1',
          afterMediaId: 'after-1',
          createdAt: '2026-07-13T10:00:00.000Z',
          updatedAt: '2026-07-13T10:00:00.000Z',
        },
        {
          id: 'pair-duplicate',
          jobId: 'job-1',
          beforeMediaId: 'before-2',
          afterMediaId: 'after-2',
          createdAt: '2026-07-13T10:00:00.000Z',
          updatedAt: '2026-07-13T10:00:00.000Z',
        },
      ]),
    ],
  ];

  for (const [name, raw] of malformedValues) {
    await t.test(name, async () => {
      const repository = new AsyncStoragePairRepository(createMemoryStorage(raw));
      await assert.rejects(repository.listPairsForJob('job-1'));
    });
  }
});

test('writes valid JSON containing only the committed result of a concurrent race', async () => {
  const storage = createMemoryStorage();
  const repository = new AsyncStoragePairRepository(storage);

  await Promise.allSettled([
    repository.createPair(pairInput()),
    repository.createPair(pairInput({ id: 'pair-2', afterMediaId: 'after-2' })),
  ]);

  const persisted = JSON.parse(storage.readRaw());
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].beforeMediaId, 'before-1');
});
