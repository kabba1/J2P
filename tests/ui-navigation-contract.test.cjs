/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');

function repositoryPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readRepositoryFile(relativePath) {
  return fs.readFileSync(repositoryPath(relativePath), 'utf8');
}

function tabScreenBlocks(source) {
  return [...source.matchAll(/<Tabs\.Screen\b[\s\S]*?(?=<Tabs\.Screen\b|<\/Tabs>)/g)]
    .map((match) => match[0]);
}

function tabName(block) {
  return block.match(/\bname="([^"]+)"/)?.[1];
}

test('preserves every existing route file and root stack registration', () => {
  const existingRouteFiles = [
    'app/_layout.tsx',
    'app/create-post.tsx',
    'app/generated-asset.tsx',
    'app/job-camera.tsx',
    'app/pair-review.tsx',
    'app/review.tsx',
    'app/(tabs)/_layout.tsx',
    'app/(tabs)/capture.tsx',
    'app/(tabs)/content.tsx',
    'app/(tabs)/settings.tsx',
    'app/(tabs)/(jobs)/_layout.tsx',
    'app/(tabs)/(jobs)/index.tsx',
    'app/(tabs)/(jobs)/new.tsx',
    'app/(tabs)/(jobs)/edit.tsx',
    'app/(tabs)/(jobs)/gallery.tsx',
    'app/(tabs)/(jobs)/media.tsx',
    'app/(tabs)/(jobs)/pair.tsx',
    'app/(tabs)/(jobs)/after-queue.tsx',
    'app/(tabs)/(jobs)/[id]/index.tsx',
  ];

  for (const routeFile of existingRouteFiles) {
    assert.ok(fs.existsSync(repositoryPath(routeFile)), `${routeFile} must remain present`);
  }

  const rootLayout = readRepositoryFile('app/_layout.tsx');
  const stackRegistrations = [
    '(tabs)',
    'job-camera',
    'review',
    'pair-review',
    'create-post',
    'generated-asset',
  ];
  for (const routeName of stackRegistrations) {
    assert.match(
      rootLayout,
      new RegExp(`<Stack\\.Screen\\s+name=["']${routeName.replace(/[()]/g, '\\$&')}["']`),
      `${routeName} must remain registered in the root stack`,
    );
  }
});

test('shows exactly Jobs, Capture, and Content while keeping Settings hidden', () => {
  const source = readRepositoryFile('app/(tabs)/_layout.tsx');
  const blocks = tabScreenBlocks(source);
  const visibleBlocks = blocks.filter((block) => !/\bhref:\s*null\b/.test(block));

  assert.deepEqual(visibleBlocks.map(tabName), ['(jobs)', 'capture', 'content']);
  assert.deepEqual(
    visibleBlocks.map((block) => block.match(/\btitle:\s*['"]([^'"]+)['"]/)?.[1]),
    ['Jobs', 'Capture', 'Content'],
  );

  const settingsBlock = blocks.find((block) => tabName(block) === 'settings');
  assert.ok(settingsBlock, 'Settings must remain registered as a tab route');
  assert.match(settingsBlock, /\bhref:\s*null\b/);
  assert.match(source, /initialRouteName="\(jobs\)"/);
  assert.match(source, /getTabBarLayout\(insets\.bottom\)/);
});

test('opens Settings from an accessible touch target on every visible tab root', () => {
  const tabRoots = [
    'app/(tabs)/(jobs)/index.tsx',
    'app/(tabs)/capture.tsx',
    'app/(tabs)/content.tsx',
  ];

  for (const tabRoot of tabRoots) {
    const source = readRepositoryFile(tabRoot);
    const settingsButtons = [...source.matchAll(/<Pressable\b[\s\S]*?<\/Pressable>/g)]
      .map((match) => match[0])
      .filter((block) => block.includes('accessibilityLabel="Open Settings"'));
    assert.equal(
      settingsButtons.length,
      1,
      `${tabRoot} must expose one labeled Settings button`,
    );
    const settingsButton = settingsButtons[0];
    assert.match(settingsButton, /accessibilityRole="button"/);
    assert.match(settingsButton, /router\.push\(['"]\/settings['"]\)/);
    assert.match(settingsButton, /styles\.settingsButton/);
    assert.match(settingsButton, /<Ionicons\b[^>]*name="settings-outline"/s);

    const settingsButtonStyle = source.match(
      /settingsButton:\s*\{([\s\S]*?)\n\s*\},/,
    )?.[1];
    assert.ok(settingsButtonStyle, `${tabRoot} must define the Settings button style`);
    assert.match(settingsButtonStyle, /minWidth:\s*TouchTarget\.minimum/);
    assert.match(settingsButtonStyle, /minHeight:\s*TouchTarget\.minimum/);
  }
});
