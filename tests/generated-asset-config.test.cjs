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

Module._resolveFilename = function resolveGeneratedAssetConfigTestModule(
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
  GENERATED_ASSET_FOOTER_MAX_LENGTH,
  getGeneratedAssetDimensions,
  getGeneratedAssetRelativePath,
  normalizeFooterText,
} = require('../utils/generated-asset.ts');
const {
  isGeneratedAssetFormat,
  isGeneratedAssetLayout,
} = require('../types/generated-asset.ts');

test('maps supported formats to exact target dimensions', () => {
  assert.deepEqual(getGeneratedAssetDimensions('square'), {
    width: 1080,
    height: 1080,
  });
  assert.deepEqual(getGeneratedAssetDimensions('portrait'), {
    width: 1080,
    height: 1350,
  });
  assert.throws(() => getGeneratedAssetDimensions('story'), /format is invalid/i);
});

test('accepts only the milestone formats and layouts', () => {
  assert.equal(isGeneratedAssetFormat('square'), true);
  assert.equal(isGeneratedAssetFormat('portrait'), true);
  assert.equal(isGeneratedAssetFormat('story'), false);
  assert.equal(isGeneratedAssetLayout('side-by-side'), true);
  assert.equal(isGeneratedAssetLayout('stacked'), true);
  assert.equal(isGeneratedAssetLayout('slider'), false);
});

test('trims, collapses, limits, and removes blank footer text', () => {
  assert.equal(normalizeFooterText('  Johnson   Painting\n Co.  '), 'Johnson Painting Co.');
  assert.equal(normalizeFooterText('   '), undefined);
  assert.equal(normalizeFooterText(undefined), undefined);
  assert.equal(
    normalizeFooterText('x'.repeat(GENERATED_ASSET_FOOTER_MAX_LENGTH + 20)).length,
    GENERATED_ASSET_FOOTER_MAX_LENGTH,
  );
});

test('constructs only safe generated PNG relative paths', () => {
  assert.equal(
    getGeneratedAssetRelativePath('job-1', 'asset_1'),
    'jobs/job-1/generated/asset_1.png',
  );
  assert.throws(
    () => getGeneratedAssetRelativePath('../job-1', 'asset-1'),
    /Job ID contains characters/i,
  );
  assert.throws(
    () => getGeneratedAssetRelativePath('job-1', 'asset/other'),
    /Asset ID contains characters/i,
  );
});
