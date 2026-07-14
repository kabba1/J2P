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

Module._resolveFilename = function resolveJobListTestModule(request, parent, isMain, options) {
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

const { filterJobs, selectMostRecentActiveJob } = require('../utils/job-list.ts');

function job(overrides = {}) {
  return {
    id: 'job-1',
    name: 'Johnson House',
    customer: 'Sarah Johnson',
    address: '123 Maple Avenue',
    serviceType: 'Interior Painting',
    notes: 'Living room and hall',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
    beforeCount: 0,
    progressCount: 0,
    afterCount: 0,
    ...overrides,
  };
}

const jobs = [
  job(),
  job({
    id: 'job-2',
    name: 'Miller Driveway',
    customer: 'Chris Miller',
    address: '9 Oak Road',
    serviceType: 'Pressure Washing',
    notes: 'Front drive',
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T10:00:00.000Z',
  }),
  job({
    id: 'job-3',
    name: 'Archived Salon',
    customer: 'Oak Street Salon',
    address: '44 Pine Street',
    serviceType: 'Commercial Refresh',
    notes: 'Reception area',
    archivedAt: '2026-07-15T10:00:00.000Z',
    createdAt: '2026-07-15T10:00:00.000Z',
    updatedAt: '2026-07-15T10:00:00.000Z',
  }),
];

test('filters Active, Archived, and All jobs without mutating the source list', () => {
  assert.deepEqual(filterJobs(jobs, { status: 'active', query: '' }).map((item) => item.id), [
    'job-1',
    'job-2',
  ]);
  assert.deepEqual(filterJobs(jobs, { status: 'archived', query: '' }).map((item) => item.id), [
    'job-3',
  ]);
  assert.equal(filterJobs(jobs, { status: 'all', query: '' }).length, 3);
  assert.equal(jobs.length, 3);
});

test('search is trimmed and case-insensitive across job fields', () => {
  const cases = [
    ['  millER  ', 'job-2'],
    ['SARAH', 'job-1'],
    ['maple', 'job-1'],
    ['pressure', 'job-2'],
    ['front drive', 'job-2'],
  ];

  for (const [query, expectedId] of cases) {
    const result = filterJobs(jobs, { status: 'all', query });
    assert.deepEqual(result.map((item) => item.id), [expectedId]);
  }
});

test('search and lifecycle status filters combine', () => {
  assert.equal(filterJobs(jobs, { status: 'active', query: 'salon' }).length, 0);
  assert.deepEqual(
    filterJobs(jobs, { status: 'archived', query: 'salon' }).map((item) => item.id),
    ['job-3'],
  );
});

test('selects the newest-created active job and ignores archived jobs', () => {
  assert.equal(selectMostRecentActiveJob(jobs).id, 'job-2');
  assert.equal(
    selectMostRecentActiveJob(jobs.map((item) => ({ ...item, archivedAt: item.createdAt }))),
    undefined,
  );
});

test('uses job ID as a deterministic tie breaker for equally new active jobs', () => {
  const sameTime = [job({ id: 'job-z' }), job({ id: 'job-a' })];
  assert.equal(selectMostRecentActiveJob(sameTime).id, 'job-a');
});
