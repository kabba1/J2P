/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const dashboardSource = fs.readFileSync(
  path.join(repositoryRoot, 'app/(tabs)/(jobs)/[id]/index.tsx'),
  'utf8',
);

function findStyle(styleName) {
  const block = dashboardSource.match(
    new RegExp(`(?:^|\\n)\\s*${styleName}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`),
  )?.[0];
  assert.ok(block, `${styleName} style must exist`);
  return block;
}

test('keeps job identity attached to a fixed-height photo hero', () => {
  const heroBlock = dashboardSource.match(
    /<View style=\{styles\.heroMedia\}>[\s\S]*?<View style=\{styles\.heroContent\}>[\s\S]*?<\/View>\s*<\/View>/,
  )?.[0];
  assert.ok(heroBlock, 'hero content must be rendered inside the photo hero');

  assert.match(findStyle('heroMedia'), /height:\s*300/);
  assert.doesNotMatch(findStyle('heroMedia'), /aspectRatio:/);
  assert.match(findStyle('heroContent'), /position:\s*['"]absolute['"]/);
  assert.match(findStyle('heroContent'), /bottom:\s*0/);
  assert.match(findStyle('heroContent'), /backgroundColor:\s*['"]rgba\(/);
  assert.doesNotMatch(dashboardSource, /LinearGradient|BlurView/);
});

test('keeps missing-photo status readable in the foreground panel', () => {
  const fallbackBlock = dashboardSource.match(
    /<View style=\{styles\.heroFallback\}>[\s\S]*?<\/View>/,
  )?.[0];
  assert.ok(fallbackBlock, 'hero fallback must remain rendered');
  assert.doesNotMatch(fallbackBlock, /Photo unavailable|No job photos yet/);

  const contentBlock = dashboardSource.match(
    /<View style=\{styles\.heroContent\}>[\s\S]*?<Text[\s\S]*?style=\{styles\.jobName\}>/,
  )?.[0];
  assert.ok(contentBlock, 'hero foreground panel must remain rendered');
  assert.match(contentBlock, /styles\.heroStatus/);
  assert.match(contentBlock, />\s*Photo unavailable\s*</);
  assert.match(contentBlock, />\s*No job photos yet\s*</);
});

test('keeps long job identity compact while preserving full accessibility text', () => {
  assert.match(
    dashboardSource,
    /<Text\s+accessibilityLabel=\{job\.name\}\s+maxFontSizeMultiplier=\{1\.2\}\s+numberOfLines=\{2\}\s+style=\{styles\.jobName\}>/,
  );
  assert.match(findStyle('jobName'), /fontSize:\s*28/);
  assert.match(findStyle('jobName'), /lineHeight:\s*34/);

  const metadataRow = dashboardSource.match(
    /function\s+MetadataRow\b[\s\S]*?\n\}/,
  )?.[0];
  assert.ok(metadataRow, 'MetadataRow must exist');
  assert.match(metadataRow, /accessibilityLabel=\{`\$\{label\}:\s*\$\{value\}`\}/);
  assert.match(metadataRow, /maxFontSizeMultiplier=\{1\.2\}/);
  assert.match(metadataRow, /numberOfLines=\{1\}/);
});

test('puts capture progress before secondary notes and options', () => {
  const captureIndex = dashboardSource.indexOf('styles.stageRow');
  const recentIndex = dashboardSource.indexOf('>Recent shots<');
  const continueIndex = dashboardSource.indexOf('>Continue capture<');
  const matchIndex = dashboardSource.indexOf('>Match after photos<');
  const generatedIndex = dashboardSource.indexOf('>Generated Content<');
  const notesIndex = dashboardSource.indexOf('styles.notesRegion');
  const optionsIndex = dashboardSource.indexOf('>Job options<');

  assert.ok(captureIndex >= 0, 'capture stage rail must remain rendered');
  assert.ok(recentIndex > captureIndex, 'recent shots must follow the stage rail');
  assert.ok(continueIndex > recentIndex, 'continue capture must follow recent shots');
  assert.ok(matchIndex > continueIndex, 'matching must follow continue capture');
  assert.ok(generatedIndex > matchIndex, 'generated content must follow capture flow');
  assert.ok(notesIndex > generatedIndex, 'job notes must follow generated content');
  assert.ok(optionsIndex > notesIndex, 'job options must follow notes');
});

test('integrates dashboard navigation into the photo hero instead of spending a second row', () => {
  assert.doesNotMatch(dashboardSource, /title="Job Dashboard"/);
  assert.match(dashboardSource, /style=\{styles\.heroTopBar\}/);
  assert.match(dashboardSource, /accessibilityLabel="Go back"/);
  assert.match(dashboardSource, /accessibilityLabel="Edit job"/);
  assert.match(findStyle('heroTopBar'), /position:\s*['"]absolute['"]/);
  assert.match(findStyle('heroTopBar'), /top:\s*0/);
  assert.match(findStyle('heroTopButton'), /width:\s*44/);
  assert.match(findStyle('heroTopButton'), /height:\s*44/);
  const hitSlopMatches = dashboardSource.match(/hitSlop=\{8\}/g) ?? [];
  assert.ok(hitSlopMatches.length >= 2, 'both hero navigation actions need hit slop');
  assert.match(dashboardSource, /maxFontSizeMultiplier=\{1\.2\}[\s\S]*?style=\{styles\.heroTopTitle\}/);
  assert.doesNotMatch(dashboardSource, />Capture progress</);
  assert.match(findStyle('content'), /gap:\s*14/);
});
