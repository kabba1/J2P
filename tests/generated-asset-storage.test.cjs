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

Module._resolveFilename = function resolveGeneratedAssetStorageTestModule(
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

function createFileSystemHarness() {
  const entries = new Map();

  function cleanUri(uri) {
    const parsed = new URL(uri);
    const pathname = path.posix.normalize(parsed.pathname).replace(/\/$/, '') || '/';
    return `file://${pathname}`;
  }

  function joinUri(first, rest) {
    let uri = typeof first === 'string' ? first : first.uri;
    for (const part of rest) {
      const value = typeof part === 'string' ? part : part.uri;
      uri = `${uri.replace(/\/$/, '')}/${value.replace(/^\/+/, '')}`;
    }
    return cleanUri(uri);
  }

  function relative(from, to) {
    const fromPath = new URL(cleanUri(from)).pathname;
    const toPath = new URL(cleanUri(to)).pathname;
    return path.posix.relative(fromPath, toPath);
  }

  class FakeDirectory {
    constructor(first, ...rest) {
      this.uri = joinUri(first, rest);
    }

    get exists() {
      return entries.get(this.uri)?.type === 'directory';
    }

    create() {
      const parts = new URL(this.uri).pathname.split('/').filter(Boolean);
      let current = 'file://';
      for (const part of parts) {
        current = cleanUri(`${current}/${part}`);
        entries.set(current, { type: 'directory' });
      }
    }

    delete() {
      for (const uri of [...entries.keys()]) {
        if (uri === this.uri || uri.startsWith(`${this.uri}/`)) {
          entries.delete(uri);
        }
      }
    }
  }

  class FakeFile {
    constructor(first, ...rest) {
      this.uri = joinUri(first, rest);
    }

    get exists() {
      return entries.get(this.uri)?.type === 'file';
    }

    get size() {
      return entries.get(this.uri)?.size ?? 0;
    }

    get extension() {
      return path.posix.extname(new URL(this.uri).pathname);
    }

    copy(destination) {
      if (!this.exists) throw new Error('Source missing.');
      entries.set(destination.uri, { type: 'file', size: this.size });
    }

    delete() {
      entries.delete(this.uri);
    }
  }

  const Paths = {
    document: { uri: 'file:///document' },
    cache: { uri: 'file:///cache' },
    normalize: cleanUri,
    relative,
    isAbsolute(value) {
      return value.startsWith('/') || /^[A-Za-z]:/.test(value);
    },
  };

  return {
    module: { Directory: FakeDirectory, File: FakeFile, Paths },
    putFile(uri, size = 100) {
      entries.set(cleanUri(uri), { type: 'file', size });
    },
    putDirectory(uri) {
      entries.set(cleanUri(uri), { type: 'directory' });
    },
    exists(uri) {
      return entries.has(cleanUri(uri));
    },
    size(uri) {
      return entries.get(cleanUri(uri))?.size;
    },
  };
}

const fileSystem = createFileSystemHarness();

Module._load = function loadGeneratedAssetStorageTestModule(request, parent, isMain) {
  if (request === 'expo-file-system') {
    return fileSystem.module;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  ExpoGeneratedAssetStorage,
  GeneratedAssetStorageError,
} = require('../services/generated-asset-storage.ts');

test('persists a temporary render to the exact managed PNG path', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  fileSystem.putFile('file:///cache/render-1.png', 840);

  const uri = await storage.persistRenderedAsset(
    'file:///cache/render-1.png',
    'job-1',
    'asset-1',
  );

  assert.equal(uri, 'file:///document/jobs/job-1/generated/asset-1.png');
  assert.equal(fileSystem.exists(uri), true);
  assert.equal(fileSystem.size(uri), 840);
  assert.equal(await storage.getExistingManagedAssetUri('job-1', 'asset-1'), uri);
  assert.equal(await storage.fileExists(uri), true);
});

test('does not overwrite an already-persisted generated asset', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  fileSystem.putFile('file:///cache/render-existing.png', 999);
  const existingUri =
    'file:///document/jobs/job-1/generated/asset-existing.png';
  fileSystem.putFile(existingUri, 120);

  await assert.rejects(
    storage.persistRenderedAsset(
      'file:///cache/render-existing.png',
      'job-1',
      'asset-existing',
    ),
    (error) =>
      error instanceof GeneratedAssetStorageError && error.code === 'copy-failed',
  );

  assert.equal(fileSystem.exists(existingUri), true);
  assert.equal(fileSystem.size(existingUri), 120);
});

test('rejects missing renders and unsafe path identifiers', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  await assert.rejects(
    storage.persistRenderedAsset('file:///cache/missing.png', 'job-1', 'asset-2'),
    (error) => error instanceof GeneratedAssetStorageError && error.code === 'source-missing',
  );
  fileSystem.putFile('file:///cache/render-unsafe.png', 100);
  await assert.rejects(
    storage.persistRenderedAsset('file:///cache/render-unsafe.png', '../job', 'asset-2'),
    (error) => error instanceof GeneratedAssetStorageError && error.code === 'invalid-path',
  );
});

test('deletes only exact managed generated PNGs and treats missing files idempotently', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  const generatedUri = 'file:///document/jobs/job-3/generated/asset-3.png';
  fileSystem.putFile(generatedUri, 100);

  await storage.deleteGeneratedAssetFile(generatedUri);
  assert.equal(fileSystem.exists(generatedUri), false);
  await storage.deleteGeneratedAssetFile(generatedUri);

  const unsafeUris = [
    'file:///document/jobs/job-3/before/media-1.png',
    'file:///document/jobs/job-3/generated/asset-3.jpg',
    'file:///document/jobs/job-3/generated/nested/asset-3.png',
    'file:///cache/asset-3.png',
    'file:///document/jobs/job-3/generated/../before/media-1.png',
  ];
  for (const uri of unsafeUris) {
    await assert.rejects(
      storage.deleteGeneratedAssetFile(uri),
      (error) => error instanceof GeneratedAssetStorageError && error.code === 'invalid-path',
    );
  }
});

test('deletes one job generated directory without touching source media or another job', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  const removed = 'file:///document/jobs/job-delete/generated/asset-1.png';
  const source = 'file:///document/jobs/job-delete/before/media-1.jpg';
  const retained = 'file:///document/jobs/job-keep/generated/asset-2.png';
  fileSystem.putDirectory('file:///document/jobs/job-delete/generated');
  fileSystem.putFile(removed, 100);
  fileSystem.putFile(source, 100);
  fileSystem.putFile(retained, 100);

  await storage.deleteGeneratedAssetsDirectory('job-delete');
  await storage.deleteGeneratedAssetsDirectory('job-delete');

  assert.equal(fileSystem.exists(removed), false);
  assert.equal(fileSystem.exists(source), true);
  assert.equal(fileSystem.exists(retained), true);
});

test('cleans only temporary cache renders and reports empty files as unusable', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  const temporary = 'file:///cache/render-cleanup.png';
  const persistent = 'file:///document/jobs/job-1/generated/asset-keep.png';
  const empty = 'file:///document/jobs/job-1/generated/asset-empty.png';
  fileSystem.putFile(temporary, 100);
  fileSystem.putFile(persistent, 100);
  fileSystem.putFile(empty, 0);

  await storage.deleteTemporaryRenderedAsset(temporary);
  await storage.deleteTemporaryRenderedAsset(persistent);

  assert.equal(fileSystem.exists(temporary), false);
  assert.equal(fileSystem.exists(persistent), true);
  assert.equal(await storage.fileExists(empty), false);
  assert.equal(
    await storage.getExistingManagedAssetUri('job-1', 'asset-empty'),
    empty,
  );
});

test('resolves and deletes an existing zero-byte managed generated file', async () => {
  const storage = new ExpoGeneratedAssetStorage();
  const empty = 'file:///document/jobs/job-empty/generated/asset-empty.png';
  fileSystem.putFile(empty, 0);

  const managedUri = await storage.getExistingManagedAssetUri(
    'job-empty',
    'asset-empty',
  );
  assert.equal(managedUri, empty);
  assert.equal(await storage.fileExists(empty), false);

  await storage.deleteGeneratedAssetFile(managedUri);

  assert.equal(fileSystem.exists(empty), false);
  assert.equal(
    await storage.getExistingManagedAssetUri('job-empty', 'asset-empty'),
    undefined,
  );
});
