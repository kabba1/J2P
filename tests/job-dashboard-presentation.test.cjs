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

Module._resolveFilename = function resolveDashboardPresentationTestModule(
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

const {
  getNextCaptureStage,
  selectLatestJobMedia,
} = require('../utils/job-dashboard-presentation.ts');

function media(overrides = {}) {
  return {
    id: 'media-1',
    jobId: 'job-1',
    stage: 'before',
    mediaType: 'photo',
    localUri: 'file:///jobs/job-1/before/media-1.jpg',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

test('selects the newest media for the requested job regardless of insertion order', () => {
  const older = media({ id: 'older', createdAt: '2026-07-13T10:00:00.000Z' });
  const newer = media({ id: 'newer', createdAt: '2026-07-14T10:00:00.000Z' });
  const otherJob = media({
    id: 'other-job-newest',
    jobId: 'job-2',
    createdAt: '2026-07-15T10:00:00.000Z',
  });

  assert.equal(selectLatestJobMedia([newer, otherJob, older], 'job-1'), newer);
  assert.equal(selectLatestJobMedia([older, otherJob, newer], 'job-1'), newer);
});

test('returns undefined when the requested job has no media', () => {
  assert.equal(selectLatestJobMedia([media({ jobId: 'job-2' })], 'job-1'), undefined);
  assert.equal(selectLatestJobMedia([], 'job-1'), undefined);
});

test('chooses the next valid capture stage across the job lifecycle', () => {
  const cases = [
    [{ before: 0, progress: 0, after: 0 }, 'before'],
    [{ before: 1, progress: 0, after: 0 }, 'progress'],
    [{ before: 1, progress: 2, after: 0 }, 'after'],
    [{ before: 1, progress: 2, after: 3 }, 'progress'],
  ];

  for (const [counts, expectedStage] of cases) {
    assert.equal(getNextCaptureStage(counts), expectedStage);
  }
});
