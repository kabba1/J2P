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

Module._resolveFilename = function resolveJobTestModule(request, parent, isMain, options) {
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

Module._load = function loadJobTestModule(request, parent, isMain) {
  if (request === '@react-native-async-storage/async-storage') {
    return {};
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { AsyncStorageJobRepository } = require('../repositories/async-storage-job-repository.ts');

function createMemoryStorage(initialValue = null) {
  let value = initialValue;
  let writes = 0;
  return {
    async getItem() {
      return value;
    },
    async setItem(_key, nextValue) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      value = nextValue;
      writes += 1;
    },
    readRaw() {
      return value;
    },
    writeCount() {
      return writes;
    },
  };
}

function jobRecord(overrides = {}) {
  return {
    id: 'job-1',
    name: 'Johnson House',
    customer: 'Sarah Johnson',
    address: '123 Main Street',
    serviceType: 'Interior Painting',
    notes: 'Main floor',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
    beforeCount: 2,
    progressCount: 1,
    afterCount: 3,
    ...overrides,
  };
}

test('loads legacy v1 jobs without archivedAt as active and sorts newest first', async () => {
  const older = jobRecord();
  const newer = jobRecord({
    id: 'job-2',
    name: 'Newer Job',
    createdAt: '2026-07-13T12:00:00.000Z',
    updatedAt: '2026-07-13T12:00:00.000Z',
  });
  const repository = new AsyncStorageJobRepository(
    createMemoryStorage(JSON.stringify([older, newer])),
  );

  const jobs = await repository.listJobs();
  assert.deepEqual(jobs.map((job) => job.id), ['job-2', 'job-1']);
  assert.equal(jobs[0].archivedAt, undefined);
  assert.equal(jobs[1].archivedAt, undefined);
});

test('archives idempotently, survives restart, and preserves every existing field', async () => {
  const original = jobRecord();
  const storage = createMemoryStorage(JSON.stringify([original]));
  const repository = new AsyncStorageJobRepository(storage);

  const archived = await repository.archiveJob(original.id);
  assert.ok(archived);
  assert.match(archived.archivedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(archived.createdAt, original.createdAt);
  assert.equal(archived.name, original.name);
  assert.equal(archived.beforeCount, original.beforeCount);
  assert.equal(storage.writeCount(), 1);

  const repeated = await repository.archiveJob(original.id);
  assert.deepEqual(repeated, archived);
  assert.equal(storage.writeCount(), 1);

  const reopened = new AsyncStorageJobRepository(storage);
  assert.deepEqual(await reopened.getJob(original.id), archived);
});

test('restores idempotently and persists the active state', async () => {
  const archived = jobRecord({ archivedAt: '2026-07-14T10:00:00.000Z' });
  const storage = createMemoryStorage(JSON.stringify([archived]));
  const repository = new AsyncStorageJobRepository(storage);

  const restored = await repository.restoreJob(archived.id);
  assert.ok(restored);
  assert.equal(restored.archivedAt, undefined);
  assert.equal(restored.createdAt, archived.createdAt);
  assert.equal(restored.name, archived.name);
  assert.equal(storage.writeCount(), 1);

  const repeated = await repository.restoreJob(archived.id);
  assert.deepEqual(repeated, restored);
  assert.equal(storage.writeCount(), 1);

  const reopened = new AsyncStorageJobRepository(storage);
  assert.equal((await reopened.getJob(archived.id)).archivedAt, undefined);
});

test('archive and restore return undefined for a missing job without writing', async () => {
  const storage = createMemoryStorage(JSON.stringify([jobRecord()]));
  const repository = new AsyncStorageJobRepository(storage);

  assert.equal(await repository.archiveJob('job-missing'), undefined);
  assert.equal(await repository.restoreJob('job-missing'), undefined);
  assert.equal(storage.writeCount(), 0);
});

test('serializes concurrent edit and archive mutations without losing either result', async () => {
  const storage = createMemoryStorage(JSON.stringify([jobRecord()]));
  const repository = new AsyncStorageJobRepository(storage);

  await Promise.all([
    repository.updateJob('job-1', { name: 'Updated Name' }),
    repository.archiveJob('job-1'),
  ]);

  const saved = await repository.getJob('job-1');
  assert.equal(saved.name, 'Updated Name');
  assert.ok(saved.archivedAt);
});

test('rejects malformed or duplicate persisted job records instead of dropping them', async (t) => {
  const cases = [
    ['invalid JSON', '{', /could not be read/i],
    ['wrong root', JSON.stringify({ jobs: [] }), /expected format/i],
    [
      'invalid archivedAt',
      JSON.stringify([jobRecord({ archivedAt: 'not-a-date' })]),
      /expected format/i,
    ],
    [
      'duplicate IDs',
      JSON.stringify([jobRecord(), jobRecord({ name: 'Duplicate' })]),
      /duplicate IDs/i,
    ],
  ];

  for (const [name, raw, expected] of cases) {
    await t.test(name, async () => {
      const repository = new AsyncStorageJobRepository(createMemoryStorage(raw));
      await assert.rejects(repository.listJobs(), expected);
    });
  }
});

test('continues accepting valid mutations after an earlier mutation fails', async () => {
  const storage = createMemoryStorage(JSON.stringify([jobRecord()]));
  const repository = new AsyncStorageJobRepository(storage);

  await assert.rejects(repository.updateJob('bad/id', { name: 'Nope' }), /Job ID/i);
  const archived = await repository.archiveJob('job-1');
  assert.ok(archived.archivedAt);
});
