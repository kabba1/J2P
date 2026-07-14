/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const repositoryRoot = path.resolve(__dirname, '..');

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

const {
  Colors,
  ExportColors,
  Radius,
  TouchTarget,
} = require('../constants/theme.ts');

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function rgbChannelToLinear(channel) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor);
  assert.ok(match, `${hexColor} must be a six-digit hex color`);
  const [, red, green, blue] = match;
  return (
    0.2126 * rgbChannelToLinear(Number.parseInt(red, 16))
    + 0.7152 * rgbChannelToLinear(Number.parseInt(green, 16))
    + 0.0722 * rgbChannelToLinear(Number.parseInt(blue, 16))
  );
}

function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

test('exports the approved dark application palette exactly', () => {
  const expectedColors = {
    background: '#0F141B',
    surface: '#151B23',
    surfaceRaised: '#1B2430',
    surfaceMuted: '#202A36',
    text: '#F7F9FC',
    textMuted: '#A5AFBD',
    textTertiary: '#737E8C',
    primary: '#0868F7',
    primaryPressed: '#005AD6',
    primarySoft: '#10294A',
    border: '#2A323C',
    danger: '#F04438',
    dangerSoft: '#35191D',
    before: '#0868F7',
    progress: '#FF941A',
    after: '#42B963',
    shadow: '#000000',
    onPrimary: '#FFFFFF',
  };

  assert.deepEqual(
    Object.fromEntries(
      Object.keys(expectedColors).map((token) => [token, Colors[token]]),
    ),
    expectedColors,
  );
});

test('meets the approved contrast thresholds on the app background', () => {
  assert.ok(
    contrastRatio(Colors.text, Colors.background) >= 7,
    'primary text must have at least 7:1 contrast on the app background',
  );
  assert.ok(
    contrastRatio(Colors.textMuted, Colors.background) >= 4.5,
    'muted text must have at least 4.5:1 contrast on the app background',
  );
  assert.ok(
    contrastRatio(Colors.primary, Colors.background) >= 3,
    'primary blue must have at least 3:1 contrast on the app background',
  );
});

test('exports the approved touch target and corner radii', () => {
  assert.equal(TouchTarget.minimum, 44);
  assert.deepEqual(
    { sm: Radius.sm, md: Radius.md, lg: Radius.lg },
    { sm: 8, md: 12, lg: 16 },
  );
});

test('keeps generated post colors on an explicit light export palette', () => {
  assert.deepEqual(ExportColors, {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceMuted: '#F0F3F7',
    text: '#0B1220',
    border: '#E1E5EA',
    primary: '#0868F7',
    onPrimary: '#FFFFFF',
  });

  const compositionSource = readRepositoryFile(
    'components/before-after-post-composition.tsx',
  );
  assert.match(compositionSource, /import\s*\{[^}]*ExportColors[^}]*\}\s*from\s*['\"]@\/constants\/theme['\"]/s);
  assert.match(compositionSource, /ExportColors\.surfaceMuted/);
  assert.match(compositionSource, /ExportColors\.surface/);
  assert.match(compositionSource, /ExportColors\.text/);
  assert.match(compositionSource, /ExportColors\.border/);
  assert.match(compositionSource, /ExportColors\.primary/);
  assert.match(compositionSource, /ExportColors\.onPrimary/);
  assert.doesNotMatch(compositionSource, /\bColors\./);
});

test('uses explicit dark navigation and shared chrome tokens', () => {
  const rootLayout = readRepositoryFile('app/_layout.tsx');
  assert.match(rootLayout, /\bDarkTheme\b/);
  assert.match(rootLayout, /background:\s*Colors\.background/);
  assert.match(rootLayout, /card:\s*Colors\.surface/);
  assert.match(rootLayout, /text:\s*Colors\.text/);
  assert.match(rootLayout, /border:\s*Colors\.border/);
  assert.match(rootLayout, /notification:\s*Colors\.danger/);
  assert.match(rootLayout, /<StatusBar\s+style="light"\s*\/>/);

  const tabLayout = readRepositoryFile('app/(tabs)/_layout.tsx');
  assert.match(tabLayout, /tabBarActiveTintColor:\s*Colors\.primary/);
  assert.match(tabLayout, /tabBarInactiveTintColor:\s*Colors\.textMuted/);
  assert.match(tabLayout, /borderTopColor:\s*Colors\.border/);
  assert.match(tabLayout, /backgroundColor:\s*Colors\.surface/);

  const screenContainer = readRepositoryFile('components/ui/screen-container.tsx');
  assert.match(screenContainer, /backgroundColor:\s*Colors\.background/);

  const screenHeader = readRepositoryFile('components/ui/screen-header.tsx');
  assert.match(screenHeader, /backgroundColor:\s*Colors\.background/);
  assert.match(screenHeader, /color:\s*Colors\.text/);
  assert.match(screenHeader, /color=\{Colors\.primary\}/);

  const primaryButton = readRepositoryFile('components/ui/primary-button.tsx');
  assert.match(primaryButton, /backgroundColor:\s*Colors\.primary/);
  assert.match(primaryButton, /backgroundColor:\s*Colors\.primaryPressed/);
  assert.match(primaryButton, /color=\{Colors\.onPrimary\}/);
  assert.match(primaryButton, /color:\s*Colors\.onPrimary/);
  assert.doesNotMatch(primaryButton, /\bshadow(?:Color|Offset|Opacity|Radius)\b|\belevation\b/);

  const emptyState = readRepositoryFile('components/ui/empty-state.tsx');
  assert.match(emptyState, /backgroundColor:\s*Colors\.surface/);
  assert.match(emptyState, /borderColor:\s*Colors\.border/);
  assert.match(emptyState, /color:\s*Colors\.text/);
  assert.match(emptyState, /color:\s*Colors\.textMuted/);

  const confirmDialog = readRepositoryFile('components/ui/confirm-dialog.tsx');
  assert.match(confirmDialog, /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(confirmDialog, /borderColor:\s*Colors\.border/);
  assert.match(confirmDialog, /color=\{Colors\.onPrimary\}/);
  assert.match(confirmDialog, /color:\s*Colors\.onPrimary/);
});
