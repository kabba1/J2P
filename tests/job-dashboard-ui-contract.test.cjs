/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

const dashboardSource = readRepositoryFile('app/(tabs)/(jobs)/[id]/index.tsx');
const stageCardSource = readRepositoryFile('components/stage-card.tsx');
const screenHeaderSource = readRepositoryFile('components/ui/screen-header.tsx');

function findBlock(source, pattern, description) {
  const block = source.match(pattern)?.[0];
  assert.ok(block, `${description} must remain rendered`);
  return block;
}

function findPressable(description, contentPattern) {
  const block = [...dashboardSource.matchAll(/<Pressable\b[\s\S]*?<\/Pressable>/g)]
    .map((match) => match[0])
    .find((candidate) => contentPattern.test(candidate));
  assert.ok(block, `${description} must remain rendered as a Pressable`);
  return block;
}

function findPrimaryButton(description, contentPattern) {
  const block = [...dashboardSource.matchAll(/<PrimaryButton\b[\s\S]*?\/>/g)]
    .map((match) => match[0])
    .find((candidate) => contentPattern.test(candidate));
  assert.ok(block, `${description} must remain rendered as a PrimaryButton`);
  return block;
}

function findStyle(source, styleName) {
  return findBlock(
    source,
    new RegExp(`(?:^|\\n)\\s*${styleName}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`),
    `${styleName} style`,
  );
}

test('derives the dashboard hero, recent shots, and next capture stage from real job media', () => {
  assert.match(dashboardSource, /from\s*['"]@\/utils\/job-dashboard-presentation['"]/);
  const mediaContextRead = findBlock(
    dashboardSource,
    /const\s*\{[^}]*\}\s*=\s*useMedia\(\)/s,
    'media context read',
  );
  assert.match(mediaContextRead, /\bmedia\b/);
  assert.match(mediaContextRead, /\bcountsForJob\b/);
  assert.match(
    dashboardSource,
    /const\s+latestMedia\s*=\s*selectLatestJobMedia\(media,\s*job\.id\)/,
  );
  assert.match(
    dashboardSource,
    /const\s+nextCaptureStage\s*=\s*getNextCaptureStage\(counts\)/,
  );
  assert.match(dashboardSource, /recentMedia\s*=\s*media[\s\S]*?\.filter\([\s\S]*?item\.jobId\s*===\s*job\.id[\s\S]*?\.sort\([\s\S]*?right\.createdAt\.localeCompare\(left\.createdAt\)[\s\S]*?\.slice\(0,\s*3\)/);
});

test('renders a real expo-image hero with honest metadata and a deliberate no-photo fallback', () => {
  assert.match(dashboardSource, /import\s*\{\s*Image\s*\}\s*from\s*['"]expo-image['"]/);
  const heroBlock = findBlock(
    dashboardSource,
    /<View\s+style=\{styles\.hero\}>[\s\S]*?<\/View>\s*\n\s*\n\s*\{job\.archivedAt/,
    'photo hero',
  );
  assert.match(heroBlock, /source=\{\{\s*uri:\s*latestMedia\.localUri\s*\}\}/);
  assert.match(heroBlock, /contentFit="cover"/);
  assert.match(heroBlock, /<Text\s+style=\{styles\.jobName\}>\{job\.name\}<\/Text>/);
  assert.match(dashboardSource, /styles\.heroFallback/);
  assert.match(dashboardSource, /name="camera-outline"/);
  assert.match(dashboardSource, /job\.serviceType\s*\?/);
  assert.match(dashboardSource, /job\.customer\s*\?/);
  assert.match(dashboardSource, /job\.address\s*\?/);
  assert.match(dashboardSource, /formatDate\(job\.createdAt\)/);
  assert.match(dashboardSource, /job\.notes\s*\?/);

  const contentStyle = findStyle(dashboardSource, 'content');
  const heroStyle = findStyle(dashboardSource, 'hero');
  const scrimStyle = findStyle(dashboardSource, 'heroScrim');
  assert.match(contentStyle, /padding:\s*20/);
  assert.match(heroStyle, /marginHorizontal:\s*-20/);
  assert.doesNotMatch(heroStyle, /maxHeight|overflow:\s*['"]hidden['"]/);

  const heroMediaStyle = findStyle(dashboardSource, 'heroMedia');
  const heroContentStyle = findStyle(dashboardSource, 'heroContent');
  assert.match(heroMediaStyle, /aspectRatio:\s*4\s*\/\s*3/);
  assert.match(heroMediaStyle, /overflow:\s*['"]hidden['"]/);
  assert.match(heroContentStyle, /backgroundColor:\s*Colors\.surface/);
  assert.doesNotMatch(heroContentStyle, /maxHeight|minHeight:\s*['"]100%['"]|position:\s*['"]absolute['"]/);
  assert.match(scrimStyle, /backgroundColor:\s*['"]rgba\(15,\s*20,\s*27,/);
  assert.match(scrimStyle, /pointerEvents:\s*['"]none['"]/);
  assert.doesNotMatch(heroBlock, /pointerEvents=/);

  const metadataRow = findBlock(
    dashboardSource,
    /function\s+MetadataRow\b[\s\S]*?\n\}/,
    'hero metadata row',
  );
  assert.match(metadataRow, /color=\{Colors\.textMuted\}/);
});

test('uses file checks and image errors to show deliberate missing-photo fallbacks', () => {
  const mediaContextRead = findBlock(
    dashboardSource,
    /const\s*\{[^}]*\}\s*=\s*useMedia\(\)/s,
    'media context read',
  );
  assert.match(mediaContextRead, /\bfileExists\b/);
  assert.match(
    dashboardSource,
    /const\s*\[unavailableMediaIds,\s*setUnavailableMediaIds\]\s*=\s*useState<Set<string>>\(new Set\(\)\)/,
  );
  assert.match(dashboardSource, /const\s+refreshDashboardMedia\s*=\s*useCallback\(async\s*\(jobId:\s*string\)/);
  assert.match(dashboardSource, /await\s+fileExists\(item\.localUri\)/);
  assert.match(dashboardSource, /setUnavailableMediaIds\(\s*new Set\(/);
  assert.match(
    dashboardSource,
    /latestMedia\s*&&\s*!unavailableMediaIds\.has\(latestMedia\.id\)/,
  );
  assert.match(dashboardSource, /onError=\{\(\)\s*=>\s*markMediaUnavailable\(latestMedia\.id\)\}/);
  assert.match(dashboardSource, /unavailableMediaIds\.has\(item\.id\)\s*\?/);
  assert.match(dashboardSource, /onError=\{\(\)\s*=>\s*markMediaUnavailable\(item\.id\)\}/);
  assert.match(dashboardSource, />Photo unavailable</);
});

test('keeps all three stages tappable inside one compact stage rail', () => {
  for (const [label, stage] of [
    ['Before', 'before'],
    ['Progress', 'progress'],
    ['After', 'after'],
  ]) {
    assert.match(
      dashboardSource,
      new RegExp(`stage=["']${label}["'][\\s\\S]*?openGallery\\(["']${stage}["']\\)`),
    );
  }
  assert.match(dashboardSource, /styles\.stageDivider/);
  const stageRowStyle = findStyle(dashboardSource, 'stageRow');
  assert.match(stageRowStyle, /backgroundColor:\s*Colors\.surface/);
  assert.match(stageRowStyle, /borderColor:\s*Colors\.border/);

  assert.match(stageCardSource, /TouchTarget\.minimum/);
  assert.match(stageCardSource, /Colors\.surface/);
  assert.match(stageCardSource, /Colors\.text/);
  assert.match(stageCardSource, /Colors\.textMuted/);
  assert.match(stageCardSource, /Colors\.border/);
  assert.match(stageCardSource, /fontVariant:\s*\['tabular-nums'\]/);
  assert.match(stageCardSource, /height:\s*3/);
  const stageCardStyle = findStyle(stageCardSource, 'card');
  assert.match(stageCardStyle, /minWidth:\s*TouchTarget\.minimum/);
  assert.match(stageCardStyle, /minHeight:\s*132/);
  assert.doesNotMatch(stageCardSource, /iconCircle|shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation/);
});

test('renders up to three image-first recent shots linked to the existing media detail route', () => {
  assert.match(dashboardSource, />Recent shots</);
  assert.match(dashboardSource, /recentMedia\.map\(\(item\)\s*=>/);
  const recentShot = findPressable('recent shot', /source=\{\{\s*uri:\s*item\.localUri\s*\}\}/);
  assert.match(recentShot, /item\.shotName\s*\|\|\s*['"]Untitled photo['"]/);
  assert.match(recentShot, /stageLabel\(item\.stage\)/);
  assert.match(recentShot, /color:\s*stageColors\[item\.stage\]/);
  assert.match(recentShot, /formatDate\(item\.createdAt\)/);
  assert.match(recentShot, /pathname:\s*['"]\/media['"]/);
  const routeParams = findBlock(
    recentShot,
    /params:\s*\{[^}]*\}/,
    'recent-shot media detail parameters',
  );
  assert.match(routeParams, /mediaId:\s*item\.id/);
  assert.match(routeParams, /jobId:\s*job\.id/);
});

test('makes the tested next stage dominant while preserving the secondary match flow', () => {
  const continueCapture = findPressable('Continue capture', />Continue capture</);
  assert.match(continueCapture, /Next:\s*\{nextCaptureLabel\}/);
  assert.match(continueCapture, /onPress=\{\(\)\s*=>\s*openGallery\(nextCaptureStage\)\}/);
  assert.match(continueCapture, /name="camera"/);
  assert.match(continueCapture, /accessibilityLabel=\{`Continue capture\. Next:\s*\$\{nextCaptureLabel\}`\}/);

  const continueStyle = findStyle(dashboardSource, 'continueCaptureButton');
  const continueSubtitleStyle = findStyle(dashboardSource, 'continueCaptureSubtitle');
  assert.match(continueStyle, /minHeight:\s*72/);
  assert.match(continueStyle, /backgroundColor:\s*Colors\.primary/);
  assert.match(continueSubtitleStyle, /color:\s*Colors\.onPrimary/);
  assert.doesNotMatch(continueSubtitleStyle, /opacity:/);

  const matchAfter = findPressable('Match after photos', />Match after photos</);
  assert.match(matchAfter, /onPress=\{openAfterQueue\}/);
  assert.match(matchAfter, /accessibilityHint="Open the list of Before photos that need matching After photos"/);
  assert.match(dashboardSource, /pathname:\s*['"]\/after-queue['"]/);

  const matchStyle = findStyle(dashboardSource, 'matchCard');
  assert.match(matchStyle, /minHeight:\s*72/);
  assert.match(matchStyle, /borderColor:\s*Colors\.primary/);
  assert.match(matchStyle, /backgroundColor:\s*Colors\.surface/);

  const stageRailIndex = dashboardSource.indexOf('styles.stageRow');
  const recentShotsIndex = dashboardSource.indexOf('>Recent shots<');
  const continueCaptureIndex = dashboardSource.indexOf('>Continue capture<');
  const matchAfterIndex = dashboardSource.indexOf('>Match after photos<');
  const generatedContentIndex = dashboardSource.indexOf('>Generated Content<');
  const jobOptionsIndex = dashboardSource.indexOf('>Job options<');
  assert.ok(stageRailIndex < recentShotsIndex);
  assert.ok(recentShotsIndex < continueCaptureIndex);
  assert.ok(continueCaptureIndex < matchAfterIndex);
  assert.ok(matchAfterIndex < generatedContentIndex);
  assert.ok(generatedContentIndex < jobOptionsIndex);
});

test('removes the redundant capture summary while preserving every dashboard action', () => {
  assert.doesNotMatch(dashboardSource, /Shot List/);
  assert.doesNotMatch(dashboardSource, /Start Capture/);

  const dashboardHeader = findBlock(
    dashboardSource,
    /<ScreenHeader\b[\s\S]*?title="Job Dashboard"[\s\S]*?\/>/,
    'dashboard header',
  );
  assert.match(dashboardHeader, /onBack=\{\(\)\s*=>\s*router\.back\(\)\}/);
  assert.match(dashboardHeader, /actionLabel="Edit"/);
  assert.match(dashboardHeader, /onAction=\{\(\)\s*=>\s*router\.push\(\{\s*pathname:\s*['"]\/edit['"]/);
  assert.match(screenHeaderSource, /accessibilityRole="button"/);
  assert.match(screenHeaderSource, /accessibilityLabel="Go back"/);
  assert.match(findStyle(screenHeaderSource, 'iconButton'), /minHeight:\s*44/);

  const openContent = findPressable('Open Content', />Open Content</);
  assert.match(openContent, /onPress=\{openContent\}/);
  assert.match(
    dashboardSource,
    /const\s+openContent\s*=\s*\(\)\s*=>\s*\{\s*router\.push\(['"]\/content['"]\)/,
  );

  const generatedAsset = findPressable(
    'latest generated asset',
    /openGeneratedAsset\(latestGeneratedAsset\.id\)/,
  );
  assert.match(generatedAsset, /accessibilityLabel="Open latest generated post for this job"/);
  assert.match(
    dashboardSource,
    /const\s+openGeneratedAsset\s*=\s*\(assetId:\s*string\)\s*=>\s*\{\s*router\.push\(\{\s*pathname:\s*['"]\/generated-asset['"]\s*,\s*params:\s*\{\s*assetId\s*\}/,
  );

  const restore = findPressable('Restore job', /accessibilityLabel="Restore job"/);
  assert.match(restore, /onPress=\{\(\)\s*=>\s*void handleRestore\(\)\}/);
  assert.match(dashboardSource, /const\s+handleRestore\s*=\s*async[\s\S]*?restoreJob\(job\.id\)/);

  const archive = findPrimaryButton('Archive Job', /label="Archive Job"/);
  assert.match(archive, /setArchiveVisible\(true\)/);
  const archiveDialog = findBlock(
    dashboardSource,
    /<ConfirmDialog\b[\s\S]*?visible=\{archiveVisible\}[\s\S]*?\/>/,
    'archive confirmation',
  );
  assert.match(archiveDialog, /onConfirm=\{\(\)\s*=>\s*void handleArchive\(\)\}/);
  assert.match(dashboardSource, /const\s+handleArchive\s*=\s*async[\s\S]*?archiveJob\(job\.id\)/);

  const deleteButton = findPrimaryButton('Delete Job', /label="Delete Job"/);
  assert.match(deleteButton, /onPress=\{confirmDelete\}/);
  const deleteConfirmation = findPressable(
    'Confirm delete job',
    /accessibilityLabel="Confirm delete job"/,
  );
  assert.match(deleteConfirmation, /onPress=\{\(\)\s*=>\s*void handleDelete\(\)\}/);
  assert.match(dashboardSource, /const\s+handleDelete\s*=\s*async[\s\S]*?deleteJob\(job\.id\)/);
});
