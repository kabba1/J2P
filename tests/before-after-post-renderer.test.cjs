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

Module._resolveFilename = function resolveRendererTestModule(
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

Module._load = function loadRendererTestModule(request, parent, isMain) {
  if (request === 'expo-image') {
    return {
      Image: {
        async loadAsync() {
          throw new Error('Tests inject image inspection.');
        },
      },
    };
  }
  if (request === 'react-native') {
    return {
      PixelRatio: { get: () => 1 },
      Platform: { OS: 'android' },
      View: class View {},
    };
  }
  if (request === 'react-native-view-shot') {
    return {
      async captureRef() {
        throw new Error('Tests inject view capture.');
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  BeforeAfterPostRenderError,
  ViewShotBeforeAfterPostRenderer,
} = require('../services/before-after-post-renderer.ts');

function renderInput(overrides = {}) {
  return {
    assetId: 'asset-1',
    jobId: 'job-1',
    pairId: 'pair-1',
    beforeUri: 'file:///document/jobs/job-1/before/before.jpg',
    afterUri: 'file:///document/jobs/job-1/after/after.jpg',
    format: 'portrait',
    layout: 'side-by-side',
    labelsEnabled: true,
    ...overrides,
  };
}

function rendererHarness(overrides = {}) {
  const captures = [];
  const inspections = [];
  const currentTarget = {};
  const target = {
    ref: { current: currentTarget },
    isReady: () => true,
    matchesInput: () => true,
    ...overrides.target,
  };
  const dependencies = {
    async captureView(ref, options) {
      captures.push({ ref, options });
      return 'file:///cache/rendered.png';
    },
    getPixelRatio: () => 3,
    getPlatform: () => 'android',
    async inspectImage(uri) {
      inspections.push(uri);
      return { width: 1080, height: 1350 };
    },
    waitForPaint: async () => undefined,
    ...overrides.dependencies,
  };

  return {
    captures,
    inspections,
    renderer: new ViewShotBeforeAfterPostRenderer(target, dependencies),
    target,
  };
}

test('Android requests the exact output pixel dimensions and returns decoded dimensions', async () => {
  const harness = rendererHarness({
    dependencies: {
      getPixelRatio: () => 2.625,
      getPlatform: () => 'android',
    },
  });

  const rendered = await harness.renderer.render(renderInput());

  assert.deepEqual(rendered, {
    uri: 'file:///cache/rendered.png',
    width: 1080,
    height: 1350,
  });
  assert.equal(harness.captures.length, 1);
  assert.equal(harness.captures[0].ref, harness.target.ref);
  assert.deepEqual(harness.captures[0].options, {
    format: 'png',
    result: 'tmpfile',
    quality: 1,
    width: 1080,
    height: 1350,
  });
  assert.deepEqual(harness.inspections, ['file:///cache/rendered.png']);
});

test('iOS converts target pixels to points using PixelRatio before capture', async () => {
  const harness = rendererHarness({
    dependencies: {
      getPixelRatio: () => 3,
      getPlatform: () => 'ios',
      async inspectImage() {
        return { width: 1080, height: 1080 };
      },
    },
  });

  const rendered = await harness.renderer.render(renderInput({ format: 'square' }));

  assert.equal(harness.captures[0].options.width, 360);
  assert.equal(harness.captures[0].options.height, 360);
  assert.equal(rendered.width, 1080);
  assert.equal(rendered.height, 1080);
});

test('returns the dimensions decoded from the PNG instead of assuming the target size', async () => {
  const harness = rendererHarness({
    dependencies: {
      async inspectImage() {
        return { width: 720, height: 900 };
      },
    },
  });

  const rendered = await harness.renderer.render(renderInput());

  assert.deepEqual(rendered, {
    uri: 'file:///cache/rendered.png',
    width: 720,
    height: 900,
  });
});

test('fails closed when the preview no longer matches the render input after painting', async () => {
  let matches = true;
  const harness = rendererHarness({
    target: {
      matchesInput: () => matches,
    },
    dependencies: {
      async waitForPaint() {
        matches = false;
      },
    },
  });

  await assert.rejects(
    harness.renderer.render(renderInput()),
    (error) =>
      error instanceof BeforeAfterPostRenderError && error.code === 'not-ready',
  );
  assert.equal(harness.captures.length, 0);
});

test('returns zero dimensions when the PNG cannot be decoded so the service rejects it', async () => {
  const harness = rendererHarness({
    dependencies: {
      async inspectImage() {
        throw new Error('decode failed');
      },
    },
  });

  const rendered = await harness.renderer.render(renderInput());

  assert.deepEqual(rendered, {
    uri: 'file:///cache/rendered.png',
    width: 0,
    height: 0,
  });
});
