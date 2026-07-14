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

Module._resolveFilename = function resolveGeneratedAssetServiceTestModule(
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
  GeneratedAssetService,
} = require('../services/generated-asset-service.ts');

function jobRecord(overrides = {}) {
  return {
    id: 'job-1',
    name: 'Johnson House Interior Repaint',
    createdAt: '2026-07-13T09:00:00.000Z',
    updatedAt: '2026-07-13T09:00:00.000Z',
    beforeCount: 1,
    progressCount: 0,
    afterCount: 1,
    ...overrides,
  };
}

function pairRecord(overrides = {}) {
  return {
    id: 'pair-1',
    jobId: 'job-1',
    beforeMediaId: 'before-1',
    afterMediaId: 'after-1',
    createdAt: '2026-07-13T10:00:00.000Z',
    updatedAt: '2026-07-13T10:00:00.000Z',
    ...overrides,
  };
}

function mediaRecord(overrides = {}) {
  return {
    id: 'before-1',
    jobId: 'job-1',
    stage: 'before',
    mediaType: 'photo',
    localUri: 'file:///documents/jobs/job-1/before/before-1.jpg',
    shotName: 'Living Room Wide',
    createdAt: '2026-07-13T09:00:00.000Z',
    updatedAt: '2026-07-13T09:00:00.000Z',
    ...overrides,
  };
}

function assetRecord(overrides = {}) {
  return {
    id: 'asset-existing',
    jobId: 'job-1',
    pairId: 'pair-1',
    assetType: 'before-after-image',
    localUri: 'file:///documents/jobs/job-1/generated/asset-existing.png',
    format: 'square',
    layout: 'side-by-side',
    width: 1080,
    height: 1080,
    labelsEnabled: true,
    sourceShotName: 'Living Room Wide',
    createdAt: '2026-07-13T12:00:00.000Z',
    updatedAt: '2026-07-13T12:00:00.000Z',
    ...overrides,
  };
}

function assertAssetRestored(actual, expected) {
  assert.ok(actual);
  for (const [key, value] of Object.entries(expected)) {
    if (key !== 'updatedAt') {
      assert.deepEqual(actual[key], value, `restored field ${key}`);
    }
  }
  assert.ok(Date.parse(actual.updatedAt));
}

function createHarness(options = {}) {
  const events = [];
  const warnings = [];
  let job = options.job === undefined ? jobRecord() : options.job;
  let pair = options.pair === undefined ? pairRecord() : options.pair;
  const before = options.before === undefined ? mediaRecord() : options.before;
  const after = options.after === undefined
    ? mediaRecord({
        id: 'after-1',
        stage: 'after',
        localUri: 'file:///documents/jobs/job-1/after/after-1.jpg',
      })
    : options.after;
  const media = new Map(
    [before, after, ...(options.additionalMedia ?? [])]
      .filter(Boolean)
      .map((record) => [record.id, record]),
  );
  const zeroByteFiles = new Set(options.zeroByteFiles ?? []);
  const files = new Set([
    ...(options.files ?? [before?.localUri, after?.localUri].filter(Boolean)),
    ...zeroByteFiles,
  ]);
  const assets = new Map(
    (options.assets ?? []).map((asset) => [asset.id, { ...asset }]),
  );
  let jobReadCount = 0;
  let pairReadCount = 0;

  const dependencies = {
    jobRepository: {
      async getJob(id) {
        jobReadCount += 1;
        events.push(`job:get:${id}`);
        if (options.jobReadErrorAfterFirstRead && jobReadCount > 1) {
          throw options.jobReadErrorAfterFirstRead;
        }
        return job?.id === id ? job : undefined;
      },
    },
    pairRepository: {
      async getPair(id) {
        pairReadCount += 1;
        events.push(`pair:get:${id}`);
        if (options.pairAfterFirstRead && pairReadCount > 1) {
          return options.pairAfterFirstRead;
        }
        return pair?.id === id ? pair : undefined;
      },
    },
    mediaRepository: {
      async getMedia(id) {
        events.push(`media:get:${id}`);
        return media.get(id);
      },
    },
    assetRepository: {
      async listAssetsForJob(jobId) {
        events.push(`metadata:list-job:${jobId}`);
        return [...assets.values()].filter((asset) => asset.jobId === jobId);
      },
      async getAsset(id) {
        return assets.get(id);
      },
      async createAsset(input) {
        events.push('metadata:create');
        if (options.metadataError) throw options.metadataError;
        const created = {
          ...input,
          assetType: 'before-after-image',
          createdAt: input.createdAt,
          updatedAt: '2026-07-13T12:00:00.000Z',
        };
        assets.set(created.id, created);
        return created;
      },
      async deleteAsset(id) {
        events.push(`metadata:delete:${id}`);
        if (options.metadataDeleteError) throw options.metadataDeleteError;
        return assets.delete(id);
      },
      async deleteAssetsForJob(jobId) {
        events.push(`metadata:delete-job:${jobId}`);
        if (options.metadataDeleteJobError) {
          throw options.metadataDeleteJobError;
        }
        if (options.metadataDeleteJobNoop) {
          return 0;
        }
        let deleted = 0;
        for (const [id, asset] of assets) {
          if (asset.jobId === jobId) {
            assets.delete(id);
            deleted += 1;
          }
        }
        if (options.metadataDeleteJobAfterMutationError) {
          throw options.metadataDeleteJobAfterMutationError;
        }
        return deleted;
      },
    },
    storage: {
      async persistRenderedAsset(tempUri, jobId, assetId) {
        events.push(`persist:${tempUri}`);
        if (options.persistError) throw options.persistError;
        const uri = `file:///documents/jobs/${jobId}/generated/${assetId}.png`;
        if (!options.persistentMissing) {
          files.add(uri);
          zeroByteFiles.delete(uri);
        }
        return uri;
      },
      async getExistingManagedAssetUri(jobId, assetId) {
        const uri = `file:///documents/jobs/${jobId}/generated/${assetId}.png`;
        events.push(`managed:resolve:${uri}`);
        return files.has(uri) ? uri : undefined;
      },
      async deleteGeneratedAssetFile(uri) {
        events.push(`persistent:delete:${uri}`);
        if (options.fileDeleteError) throw options.fileDeleteError;
        files.delete(uri);
        zeroByteFiles.delete(uri);
      },
      async deleteTemporaryRenderedAsset(uri) {
        events.push(`temporary:delete:${uri}`);
        if (options.tempDeleteError) throw options.tempDeleteError;
        files.delete(uri);
        zeroByteFiles.delete(uri);
      },
      async deleteGeneratedAssetsDirectory(jobId) {
        events.push(`directory:delete:${jobId}`);
        if (options.directoryDeleteError) throw options.directoryDeleteError;
        for (const uri of files) {
          if (uri.includes(`/jobs/${jobId}/generated/`)) {
            files.delete(uri);
            zeroByteFiles.delete(uri);
          }
        }
      },
      async fileExists(uri) {
        events.push(`file:exists:${uri}`);
        return files.has(uri) && !zeroByteFiles.has(uri);
      },
    },
    createAssetId: () => 'asset-new',
    now: () => '2026-07-13T12:00:00.000Z',
    warn(message, caughtError) {
      warnings.push({ message, caughtError });
    },
  };

  const service = new GeneratedAssetService(dependencies);

  function renderer(renderOptions = {}) {
    return {
      async render(input) {
        events.push('render');
        if (renderOptions.error) throw renderOptions.error;
        const uri = 'file:///cache/asset-new.png';
        if (!renderOptions.missing) {
          files.add(uri);
          zeroByteFiles.delete(uri);
        }
        return {
          uri,
          width: renderOptions.width ?? (input.format === 'square' ? 1080 : 1080),
          height: renderOptions.height ?? (input.format === 'square' ? 1080 : 1350),
        };
      },
    };
  }

  return {
    service,
    renderer,
    events,
    warnings,
    files,
    assets,
    setJob(value) {
      job = value;
    },
    setPair(value) {
      pair = value;
    },
  };
}

function generateInput(renderer, overrides = {}) {
  return {
    jobId: 'job-1',
    pairId: 'pair-1',
    format: 'portrait',
    layout: 'side-by-side',
    labelsEnabled: true,
    footerText: '  Johnson   Painting Co.  ',
    renderer,
    ...overrides,
  };
}

test('renders, persists, verifies, and commits an independent generated asset', async () => {
  const harness = createHarness();

  const created = await harness.service.generate(
    generateInput(harness.renderer()),
  );

  assert.equal(created.id, 'asset-new');
  assert.equal(created.width, 1080);
  assert.equal(created.height, 1350);
  assert.equal(created.footerText, 'Johnson Painting Co.');
  assert.equal(created.sourceShotName, 'Living Room Wide');
  assert.ok(created.localUri.endsWith('/jobs/job-1/generated/asset-new.png'));
  assert.ok(harness.files.has(created.localUri));
  assert.ok(!harness.files.has('file:///cache/asset-new.png'));
  assert.ok(
    harness.files.has('file:///documents/jobs/job-1/before/before-1.jpg'),
  );
  assert.ok(
    harness.files.has('file:///documents/jobs/job-1/after/after-1.jpg'),
  );

  harness.setPair(undefined);
  assert.deepEqual(harness.assets.get(created.id), created);
});

test('rejects missing jobs, invalid source stages, and missing source files before render', async (t) => {
  await t.test('job missing', async () => {
    const harness = createHarness({ job: null });
    await assert.rejects(
      harness.service.generate(generateInput(harness.renderer())),
      (error) => error.code === 'job-not-found',
    );
    assert.ok(!harness.events.includes('render'));
  });

  await t.test('After stage invalid', async () => {
    const harness = createHarness({
      after: mediaRecord({
        id: 'after-1',
        stage: 'progress',
        localUri: 'file:///documents/jobs/job-1/progress/after-1.jpg',
      }),
    });
    await assert.rejects(
      harness.service.generate(generateInput(harness.renderer())),
      (error) => error.code === 'after-media-not-found',
    );
    assert.ok(!harness.events.includes('render'));
  });

  await t.test('Before file missing', async () => {
    const afterUri = 'file:///documents/jobs/job-1/after/after-1.jpg';
    const harness = createHarness({ files: [afterUri] });
    await assert.rejects(
      harness.service.generate(generateInput(harness.renderer())),
      (error) => error.code === 'source-file-missing',
    );
    assert.ok(!harness.events.includes('render'));
  });
});

test('does not persist metadata when the renderer output is missing or wrong-sized', async (t) => {
  await t.test('temporary output missing', async () => {
    const harness = createHarness();
    await assert.rejects(
      harness.service.generate(generateInput(harness.renderer({ missing: true }))),
      (error) => error.code === 'render-output-invalid',
    );
    assert.ok(!harness.events.some((event) => event.startsWith('persist:')));
    assert.ok(!harness.events.includes('metadata:create'));
  });

  await t.test('dimensions invalid', async () => {
    const harness = createHarness();
    await assert.rejects(
      harness.service.generate(
        generateInput(harness.renderer({ width: 720, height: 900 })),
      ),
      (error) => error.code === 'render-output-invalid',
    );
    assert.ok(harness.events.includes('temporary:delete:file:///cache/asset-new.png'));
    assert.ok(!harness.events.includes('metadata:create'));
  });
});

test('rolls back persistent and temporary files when metadata creation fails', async () => {
  const harness = createHarness({ metadataError: new Error('storage unavailable') });

  await assert.rejects(
    harness.service.generate(generateInput(harness.renderer())),
    (error) => error.code === 'metadata-failed',
  );

  const persistentUri =
    'file:///documents/jobs/job-1/generated/asset-new.png';
  assert.ok(harness.events.includes(`persistent:delete:${persistentUri}`));
  assert.ok(harness.events.includes('temporary:delete:file:///cache/asset-new.png'));
  assert.ok(!harness.files.has(persistentUri));
  assert.equal(harness.assets.size, 0);
});

test('rejects a pair that changes during rendering and cleans the temporary file', async () => {
  const replacementAfter = mediaRecord({
    id: 'after-2',
    stage: 'after',
    localUri: 'file:///documents/jobs/job-1/after/after-2.jpg',
  });
  const harness = createHarness({
    additionalMedia: [replacementAfter],
    pairAfterFirstRead: pairRecord({ afterMediaId: 'after-2' }),
    files: [
      'file:///documents/jobs/job-1/before/before-1.jpg',
      'file:///documents/jobs/job-1/after/after-1.jpg',
      replacementAfter.localUri,
    ],
  });

  await assert.rejects(
    harness.service.generate(generateInput(harness.renderer())),
    (error) => error.code === 'source-changed',
  );

  assert.ok(harness.events.includes('temporary:delete:file:///cache/asset-new.png'));
  assert.ok(!harness.events.some((event) => event.startsWith('persist:')));
});

test('deletes metadata even when an individual generated file is already missing', async () => {
  const existing = assetRecord();
  const harness = createHarness({ assets: [existing] });

  const deleted = await harness.service.deleteAsset(existing.id);

  assert.equal(deleted, true);
  assert.equal(harness.assets.size, 0);
  assert.ok(harness.events.includes(`metadata:delete:${existing.id}`));
});

test('deletes an individual zero-byte generated file and its metadata', async () => {
  const existing = assetRecord();
  const harness = createHarness({
    assets: [existing],
    zeroByteFiles: [existing.localUri],
  });

  const deleted = await harness.service.deleteAsset(existing.id);

  assert.equal(deleted, true);
  assert.equal(harness.files.has(existing.localUri), false);
  assert.equal(harness.assets.has(existing.id), false);
  assert.ok(
    harness.events.includes(`persistent:delete:${existing.localUri}`),
  );
  assert.ok(
    !harness.events.includes(`file:exists:${existing.localUri}`),
    'delete verification must not use the non-empty-file usability check',
  );
});

test('keeps metadata when a zero-byte managed file remains after a delete error', async () => {
  const existing = assetRecord();
  const harness = createHarness({
    assets: [existing],
    zeroByteFiles: [existing.localUri],
    fileDeleteError: new Error('file is locked'),
  });

  await assert.rejects(
    harness.service.deleteAsset(existing.id),
    (error) => error.code === 'delete-failed',
  );

  assert.equal(harness.files.has(existing.localUri), true);
  assert.deepEqual(harness.assets.get(existing.id), existing);
  assert.equal(
    harness.events.filter(
      (event) => event === `managed:resolve:${existing.localUri}`,
    ).length,
    2,
  );
  assert.ok(!harness.events.includes(`metadata:delete:${existing.id}`));
  assert.ok(!harness.events.includes(`file:exists:${existing.localUri}`));
});

test('never deletes a different managed file referenced by mismatched metadata', async () => {
  const otherUri = 'file:///documents/jobs/job-2/generated/asset-other.png';
  const mismatched = assetRecord({ localUri: otherUri });
  const harness = createHarness({ assets: [mismatched], files: [otherUri] });

  const deleted = await harness.service.deleteAsset(mismatched.id);

  assert.equal(deleted, true);
  assert.equal(harness.files.has(otherUri), true);
  assert.ok(!harness.events.includes(`persistent:delete:${otherUri}`));
  assert.equal(harness.warnings.length, 1);
});

test('job cleanup removes only that job metadata and does not block on directory failure', async () => {
  const first = assetRecord();
  const other = assetRecord({
    id: 'asset-other',
    jobId: 'job-2',
    pairId: 'pair-2',
    localUri: 'file:///documents/jobs/job-2/generated/asset-other.png',
  });
  const harness = createHarness({
    assets: [first, other],
    directoryDeleteError: new Error('directory busy'),
  });

  const deletedCount = await harness.service.deleteAssetsForJob('job-1');

  assert.equal(deletedCount, 1);
  assert.equal(harness.assets.has(first.id), false);
  assert.deepEqual(harness.assets.get(other.id), other);
  assert.equal(harness.warnings.length, 1);
});

test('transactional job deletion removes target metadata before deleting the job', async () => {
  const first = assetRecord();
  const other = assetRecord({
    id: 'asset-other',
    jobId: 'job-2',
    pairId: 'pair-2',
    localUri: 'file:///documents/jobs/job-2/generated/asset-other.png',
  });
  const harness = createHarness({
    assets: [first, other],
    files: [
      'file:///documents/jobs/job-1/before/before-1.jpg',
      'file:///documents/jobs/job-1/after/after-1.jpg',
      first.localUri,
      other.localUri,
    ],
  });

  const deleted = await harness.service.deleteJobWithAssets('job-1', async () => {
    assert.equal(harness.assets.has(first.id), false);
    assert.deepEqual(harness.assets.get(other.id), other);
    harness.setJob(undefined);
    return true;
  });

  assert.equal(deleted, true);
  assert.equal(harness.assets.has(first.id), false);
  assert.deepEqual(harness.assets.get(other.id), other);
  assert.equal(harness.files.has(first.localUri), false);
  assert.equal(harness.files.has(other.localUri), true);
  assert.ok(harness.events.includes('directory:delete:job-1'));
});

test('transactional job deletion restores generated metadata when the job remains', async (t) => {
  await t.test('operation reports failure', async () => {
    const first = assetRecord();
    const other = assetRecord({
      id: 'asset-other',
      jobId: 'job-2',
      pairId: 'pair-2',
      localUri: 'file:///documents/jobs/job-2/generated/asset-other.png',
    });
    const harness = createHarness({ assets: [first, other] });

    const deleted = await harness.service.deleteJobWithAssets(
      'job-1',
      async () => false,
    );

    assert.equal(deleted, false);
    assertAssetRestored(harness.assets.get(first.id), first);
    assert.deepEqual(harness.assets.get(other.id), other);
    assert.ok(!harness.events.includes('directory:delete:job-1'));
  });

  await t.test('operation throws', async () => {
    const first = assetRecord();
    const failure = new Error('job storage unavailable');
    const harness = createHarness({ assets: [first] });

    await assert.rejects(
      harness.service.deleteJobWithAssets('job-1', async () => {
        throw failure;
      }),
      (error) => error === failure,
    );

    assertAssetRestored(harness.assets.get(first.id), first);
    assert.ok(!harness.events.includes('directory:delete:job-1'));
  });
});

test('transactional job deletion trusts a successful callback when follow-up verification fails', async () => {
  const first = assetRecord();
  const verificationError = new Error('job repository read unavailable');
  const harness = createHarness({
    assets: [first],
    files: [
      'file:///documents/jobs/job-1/before/before-1.jpg',
      'file:///documents/jobs/job-1/after/after-1.jpg',
      first.localUri,
    ],
    jobReadErrorAfterFirstRead: verificationError,
  });

  const deleted = await harness.service.deleteJobWithAssets(
    'job-1',
    async () => true,
  );

  assert.equal(deleted, true);
  assert.equal(harness.assets.has(first.id), false);
  assert.equal(harness.files.has(first.localUri), false);
  assert.ok(harness.events.includes('directory:delete:job-1'));
  assert.deepEqual(harness.warnings, [
    {
      message:
        'The deleted job could not be checked after its repository confirmed deletion.',
      caughtError: verificationError,
    },
  ]);
});

test('transactional job deletion restores metadata immediately when its callback returns false', async () => {
  const first = assetRecord();
  const harness = createHarness({
    assets: [first],
    jobReadErrorAfterFirstRead: new Error('follow-up read should not run'),
  });

  const deleted = await harness.service.deleteJobWithAssets(
    'job-1',
    async () => false,
  );

  assert.equal(deleted, false);
  assertAssetRestored(harness.assets.get(first.id), first);
  assert.equal(
    harness.events.filter((event) => event === 'job:get:job-1').length,
    1,
  );
  assert.ok(!harness.events.includes('directory:delete:job-1'));
});

test('transactional job deletion restores metadata when a failed callback cannot be verified', async () => {
  const first = assetRecord();
  const operationError = new Error('job deletion write failed');
  const harness = createHarness({
    assets: [first],
    jobReadErrorAfterFirstRead: new Error('job repository read unavailable'),
  });

  await assert.rejects(
    harness.service.deleteJobWithAssets('job-1', async () => {
      throw operationError;
    }),
    (error) =>
      error.code === 'delete-failed' &&
      /could not be verified/i.test(error.message),
  );

  assertAssetRestored(harness.assets.get(first.id), first);
  assert.ok(!harness.events.includes('directory:delete:job-1'));
});

test('transactional job deletion treats a removed job as success even if its operation throws', async () => {
  const first = assetRecord();
  const harness = createHarness({ assets: [first] });

  const deleted = await harness.service.deleteJobWithAssets('job-1', async () => {
    harness.setJob(undefined);
    throw new Error('write completed before the adapter reported an error');
  });

  assert.equal(deleted, true);
  assert.equal(harness.assets.has(first.id), false);
  assert.ok(harness.events.includes('directory:delete:job-1'));
});

test('transactional job deletion rolls back partial metadata cleanup before calling the job operation', async () => {
  const first = assetRecord();
  const other = assetRecord({
    id: 'asset-other',
    jobId: 'job-2',
    pairId: 'pair-2',
    localUri: 'file:///documents/jobs/job-2/generated/asset-other.png',
  });
  const harness = createHarness({
    assets: [first, other],
    metadataDeleteJobAfterMutationError: new Error('metadata write interrupted'),
  });
  let jobOperationCalled = false;

  await assert.rejects(
    harness.service.deleteJobWithAssets('job-1', async () => {
      jobOperationCalled = true;
      return true;
    }),
    (error) => error.code === 'delete-failed',
  );

  assert.equal(jobOperationCalled, false);
  assertAssetRestored(harness.assets.get(first.id), first);
  assert.deepEqual(harness.assets.get(other.id), other);
});

test('transactional job deletion does not delete the job while target metadata remains', async () => {
  const first = assetRecord();
  const other = assetRecord({
    id: 'asset-other',
    jobId: 'job-2',
    pairId: 'pair-2',
    localUri: 'file:///documents/jobs/job-2/generated/asset-other.png',
  });
  const harness = createHarness({
    assets: [first, other],
    metadataDeleteJobNoop: true,
  });
  let jobOperationCalled = false;

  await assert.rejects(
    harness.service.deleteJobWithAssets('job-1', async () => {
      jobOperationCalled = true;
      return true;
    }),
    (error) => error.code === 'delete-failed',
  );

  assert.equal(jobOperationCalled, false);
  assert.deepEqual(harness.assets.get(first.id), first);
  assert.deepEqual(harness.assets.get(other.id), other);
});

test('generated file cleanup failure does not block a verified successful job deletion', async () => {
  const first = assetRecord();
  const harness = createHarness({
    assets: [first],
    directoryDeleteError: new Error('directory busy'),
  });

  const deleted = await harness.service.deleteJobWithAssets('job-1', async () => {
    harness.setJob(undefined);
    return true;
  });

  assert.equal(deleted, true);
  assert.equal(harness.assets.has(first.id), false);
  assert.equal(harness.warnings.length, 1);
});

test('transactional job deletion is a no-op for an already missing job', async () => {
  const first = assetRecord();
  const harness = createHarness({ job: null, assets: [first] });
  let jobOperationCalled = false;

  const deleted = await harness.service.deleteJobWithAssets('job-1', async () => {
    jobOperationCalled = true;
    return true;
  });

  assert.equal(deleted, false);
  assert.equal(jobOperationCalled, false);
  assert.deepEqual(harness.assets.get(first.id), first);
});
