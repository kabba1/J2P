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

Module._resolveFilename = function resolvePolishTestModule(request, parent, isMain, options) {
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
  getAfterQueuePrimaryAction,
  selectLatestPair,
} = require('../utils/after-queue-state.ts');
const { getTabBarLayout } = require('../utils/tab-bar-layout.ts');

test('adds a minimum bottom cushion when Android reports no bottom inset', () => {
  assert.deepEqual(getTabBarLayout(0), {
    height: 72,
    paddingBottom: 8,
  });
  assert.deepEqual(getTabBarLayout(-20), {
    height: 72,
    paddingBottom: 8,
  });
});

test('adds the full system-navigation inset below the standard tab content', () => {
  assert.deepEqual(getTabBarLayout(24), {
    height: 88,
    paddingBottom: 24,
  });
});

test('offers Add Before Photos when the job has no Before photos', () => {
  assert.deepEqual(
    getAfterQueuePrimaryAction({
      total: 0,
      remaining: 0,
      hasNextUnmatched: false,
      hasSavedPair: false,
    }),
    {
      kind: 'add-before',
      label: 'Add Before Photos',
      disabled: false,
    },
  );
});

test('offers the next capture while an available Before photo remains unmatched', () => {
  assert.deepEqual(
    getAfterQueuePrimaryAction({
      total: 3,
      remaining: 2,
      hasNextUnmatched: true,
      hasSavedPair: true,
    }),
    {
      kind: 'start-next',
      label: 'Start Next After Shot',
      disabled: false,
    },
  );
});

test('offers a saved comparison instead of a disabled button when matching is complete', () => {
  assert.deepEqual(
    getAfterQueuePrimaryAction({
      total: 3,
      remaining: 0,
      hasNextUnmatched: false,
      hasSavedPair: true,
    }),
    {
      kind: 'view-pair',
      label: 'View Latest Before & After',
      disabled: false,
    },
  );
});

test('reports unavailable source files without presenting a working capture action', () => {
  assert.deepEqual(
    getAfterQueuePrimaryAction({
      total: 3,
      remaining: 1,
      hasNextUnmatched: false,
      hasSavedPair: true,
    }),
    {
      kind: 'unavailable',
      label: 'After Shot Unavailable',
      disabled: true,
    },
  );
});

test('selects the newest saved pair regardless of context insertion order', () => {
  const older = { id: 'pair-old', createdAt: '2026-07-12T18:00:00.000Z' };
  const newer = { id: 'pair-new', createdAt: '2026-07-13T18:00:00.000Z' };

  assert.equal(selectLatestPair([older, newer]).id, 'pair-new');
  assert.equal(selectLatestPair([newer, older]).id, 'pair-new');
  assert.equal(selectLatestPair([]), undefined);
});
