/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');

function readRepositoryFile(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function findStyle(source, styleName) {
  const style = source.match(
    new RegExp(`(?:^|\\n)\\s*${styleName}:\\s*\\{[\\s\\S]*?\\n\\s*\\},`),
  )?.[0];
  assert.ok(style, `${styleName} style must be defined`);
  return style;
}

function findArrowFunction(source, functionName) {
  const block = source.match(
    new RegExp(
      `const\\s+${functionName}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?\\n\\s{2}\\};`,
    ),
  )?.[0];
  assert.ok(block, `${functionName} function must remain present`);
  return block;
}

const jobCardSource = readRepositoryFile('components/job-card.tsx');
const jobFilterSource = readRepositoryFile('components/job-status-filter.tsx');
const jobFormSource = readRepositoryFile('components/job-form.tsx');
const stageControlSource = readRepositoryFile('components/stage-segmented-control.tsx');
const mediaGridItemSource = readRepositoryFile('components/media-grid-item.tsx');
const jobsSource = readRepositoryFile('app/(tabs)/(jobs)/index.tsx');
const gallerySource = readRepositoryFile('app/(tabs)/(jobs)/gallery.tsx');
const captureSource = readRepositoryFile('app/(tabs)/capture.tsx');
const cameraSource = readRepositoryFile('app/job-camera.tsx');

test('renders compact Job cards from optional real media without losing job details or counts', () => {
  assert.match(jobCardSource, /import\s*\{\s*Image\s*\}\s*from\s*['"]expo-image['"]/);
  assert.match(jobCardSource, /previewUri\?:\s*string/);
  assert.match(jobCardSource, /source=\{\{\s*uri:\s*previewUri\s*\}\}/);
  assert.match(jobCardSource, /styles\.photoPreview/);
  assert.match(jobCardSource, /styles\.photoFallback/);
  assert.match(findStyle(jobCardSource, 'photoFallbackLabel'), /color:\s*Colors\.textMuted/);
  assert.match(jobCardSource, /onError=/);
  assert.match(jobCardSource, /accessibilityLabel=\{`Open \$\{job\.name\}`\}/);
  assert.match(jobCardSource, /job\.customer/);
  assert.match(jobCardSource, /job\.serviceType/);
  assert.match(jobCardSource, /formatDate\(job\.createdAt\)/);
  assert.match(jobCardSource, /job\.archivedAt/);
  assert.match(jobCardSource, /label="Before"/);
  assert.match(jobCardSource, /label="Progress"/);
  assert.match(jobCardSource, /label="After"/);
  assert.match(jobCardSource, /counts\?\.before\s*\?\?\s*job\.beforeCount/);
  assert.match(jobCardSource, /counts\?\.progress\s*\?\?\s*job\.progressCount/);
  assert.match(jobCardSource, /counts\?\.after\s*\?\?\s*job\.afterCount/);
  assert.doesNotMatch(jobCardSource, /\biconBox\b|shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation/);
});

test('derives Jobs and Capture previews from existing media state while preserving entry points', () => {
  for (const source of [jobsSource, captureSource]) {
    assert.match(source, /from\s*['"]@\/utils\/job-dashboard-presentation['"]/);
    const mediaRead = source.match(/const\s*\{[^}]*\}\s*=\s*useMedia\(\)/s)?.[0];
    assert.ok(mediaRead, 'screen must read the existing media context');
    assert.match(mediaRead, /\bmedia\b/);
    assert.match(source, /selectLatestJobMedia\(/);
    assert.match(source, /previewUri=/);
  }

  assert.match(jobsSource, /accessibilityLabel="Search jobs"/);
  assert.match(jobsSource, /<JobStatusFilter/);
  assert.match(jobsSource, /label="New Job"/);
  assert.match(jobsSource, /accessibilityLabel="Open Settings"/);
  assert.match(jobsSource, />Settings<\/Text>/);
  assert.match(jobsSource, /refreshJobs\(jobs\.map\(\(job\)\s*=>\s*job\.id\)\)/);
  assert.match(
    jobsSource,
    /router\.push\(\{\s*pathname:\s*['"]\.\/\[id\]['"],\s*params:\s*\{\s*id:\s*item\.id\s*\}\s*\}\)/,
  );
  assert.match(jobsSource, /counts=\{countsForJob\(item\.id\)\}/);
  assert.match(
    jobsSource,
    /previewUri=\{selectLatestJobMedia\(media,\s*item\.id\)\?\.localUri\}/,
  );
  assert.match(findStyle(jobsSource, 'content'), /paddingHorizontal:\s*20/);
  assert.match(findStyle(jobsSource, 'wordmark'), /fontSize:\s*(?:2[4-9]|3[0-2])/);

  assert.match(captureSource, /selectMostRecentActiveJob\(jobs\)/);
  assert.match(captureSource, /accessibilityLabel="Open Settings"/);
  assert.match(captureSource, />Settings<\/Text>/);
  assert.match(captureSource, /value:\s*['"]before['"]/);
  assert.match(captureSource, /value:\s*['"]progress['"]/);
  assert.match(captureSource, /value:\s*['"]after['"]/);
  const captureOpenJob = findArrowFunction(captureSource, 'openJob');
  const captureOpenStage = findArrowFunction(captureSource, 'openStage');
  assert.match(
    captureOpenJob,
    /pathname:\s*['"]\/\(tabs\)\/\(jobs\)\/\[id\]['"][\s\S]*?params:\s*\{\s*id:\s*activeJob\.id\s*\}/,
  );
  assert.match(
    captureOpenStage,
    /pathname:\s*['"]\/gallery['"][\s\S]*?params:\s*\{\s*jobId:\s*activeJob\.id,\s*stage\s*\}/,
  );
  assert.match(captureSource, /selectLatestJobMedia\(media,\s*activeJob\.id\)/);
  assert.match(captureSource, /counts=\{countsForJob\(activeJob\.id\)\}/);
  assert.match(captureSource, /previewUri=\{latestMedia\?\.localUri\}/);
  assert.doesNotMatch(`${jobCardSource}\n${jobsSource}\n${captureSource}`, /picsum|https?:\/\/|require\([^)]*assets/i);
});

test('groups every existing job field inside one dark form panel and preserves keyboard behavior', () => {
  assert.match(jobFormSource, /style=\{styles\.formPanel\}/);
  assert.match(jobFormSource, /styles\.fieldGroup/);
  assert.doesNotMatch(jobFormSource, /styles\.fieldCard|fieldCard:/);
  assert.match(findStyle(jobFormSource, 'formPanel'), /backgroundColor:\s*Colors\.surface/);
  assert.match(findStyle(jobFormSource, 'formPanel'), /borderColor:\s*Colors\.border/);
  assert.match(findStyle(jobFormSource, 'inputRow'), /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(findStyle(jobFormSource, 'inputRow'), /borderColor:\s*Colors\.border/);
  assert.match(findStyle(jobFormSource, 'inputRow'), /minHeight:\s*44/);
  assert.match(jobFormSource, /placeholderTextColor=\{Colors\.textMuted\}/);

  for (const label of ['Job Name', 'Customer', 'Address', 'Service Type', 'Notes']) {
    assert.match(jobFormSource, new RegExp(`label=["']${label}["']`));
  }
  assert.match(jobFormSource, /maxLength=\{300\}/);
  assert.match(jobFormSource, /Job name is required\./);
  assert.match(jobFormSource, /await\s+onSubmit\(\{\s*name,\s*customer,\s*address,\s*serviceType,\s*notes\s*\}\)/s);
  assert.match(jobFormSource, /<KeyboardAvoidingView/);
  assert.match(jobFormSource, /keyboardShouldPersistTaps="handled"/);
  assert.match(jobFormSource, /automaticallyAdjustKeyboardInsets=\{Platform\.OS\s*===\s*['"]ios['"]\}/);
  assert.match(jobFormSource, /disabled=\{nameIsBlank\}/);
  assert.doesNotMatch(jobFormSource, /shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation/);
});

test('uses compact dark rails for job and stage selection without legacy shadows', () => {
  for (const source of [jobFilterSource, stageControlSource]) {
    assert.match(source, /style=\{styles\.compactRail\}/);
    assert.match(findStyle(source, 'compactRail'), /backgroundColor:\s*Colors\.surfaceRaised/);
    assert.match(findStyle(source, 'compactRail'), /borderColor:\s*Colors\.border/);
    assert.match(source, /accessibilityRole="tablist"/);
    assert.match(source, /accessibilityState=\{\{\s*selected\s*\}\}/);
    assert.match(source, /minHeight:\s*44/);
    assert.doesNotMatch(source, /shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation/);
  }

  assert.match(stageControlSource, /Before/);
  assert.match(stageControlSource, /Progress/);
  assert.match(stageControlSource, /After/);
  assert.match(findStyle(stageControlSource, 'selectedLabel'), /color:\s*Colors\.text/);
  assert.match(findStyle(jobFilterSource, 'selectedLabel'), /color:\s*Colors\.text/);
  assert.match(findStyle(jobFilterSource, 'selectedCount'), /color:\s*Colors\.text/);
});

test('keeps gallery tiles photo-led with visible labeled management and all existing routes', () => {
  const changeStage = findArrowFunction(gallerySource, 'changeStage');
  const openCamera = findArrowFunction(gallerySource, 'openCamera');
  const openAfterQueue = findArrowFunction(gallerySource, 'openAfterQueue');
  const mediaGridItem = gallerySource.match(/<MediaGridItem\b[\s\S]*?\/>/)?.[0];
  assert.ok(mediaGridItem, 'gallery media tile must remain rendered');

  assert.match(mediaGridItemSource, /source=\{\{\s*uri:\s*media\.localUri\s*\}\}/);
  assert.match(mediaGridItemSource, /accessibilityLabel=\{`Manage \$\{media\.shotName\s*\|\|\s*['"]photo['"]\}`\}/);
  assert.match(mediaGridItemSource, /accessibilityHint="Opens editing and deletion options"/);
  assert.match(mediaGridItemSource, />Manage</);
  assert.match(mediaGridItemSource, /Photo file missing/);
  assert.match(findStyle(mediaGridItemSource, 'manageLabel'), /color:\s*Colors\.text/);
  assert.doesNotMatch(mediaGridItemSource, /shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation/);

  assert.match(gallerySource, /const\s+columns\s*=\s*width\s*>=\s*700\s*\?\s*3\s*:\s*2/);
  assert.match(gallerySource, /<StageSegmentedControl\s+value=\{stage\}\s+onChange=\{changeStage\}\s*\/>/);
  assert.match(changeStage, /router\.setParams\(\{\s*jobId:\s*rawJobId,\s*stage:\s*nextStage\s*\}\)/);
  assert.match(
    openCamera,
    /pathname:\s*['"]\/job-camera['"][\s\S]*?params:\s*\{\s*jobId:\s*rawJobId,\s*stage\s*\}/,
  );
  assert.match(
    openAfterQueue,
    /pathname:\s*['"]\/after-queue['"][\s\S]*?params:\s*\{\s*jobId:\s*rawJobId\s*\}/,
  );
  assert.equal((mediaGridItem.match(/pathname:\s*['"]\/media['"]/g) ?? []).length, 2);
  assert.equal((mediaGridItem.match(/mediaId:\s*item\.id/g) ?? []).length, 2);
  assert.equal((mediaGridItem.match(/jobId:\s*job\.id/g) ?? []).length, 2);
  assert.match(findStyle(gallerySource, 'bottomAction'), /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(findStyle(gallerySource, 'bottomAction'), /borderTopColor:\s*Colors\.border/);
});

test('changes camera presentation only while preserving the complete real capture flow', () => {
  const captureFunction = findArrowFunction(cameraSource, 'capture');
  const routePushes = [...captureFunction.matchAll(/router\.push\(\{[\s\S]*?\n\s{8}\}\);/g)]
    .map((match) => match[0]);
  assert.equal(routePushes.length, 2, 'capture must keep matched and standard review routes');
  const pairReviewPush = routePushes.find((push) => /pathname:\s*['"]\/pair-review['"]/.test(push));
  const reviewPush = routePushes.find((push) => /pathname:\s*['"]\/review['"]/.test(push));
  assert.ok(pairReviewPush, 'matched capture must keep the pair-review route');
  assert.ok(reviewPush, 'standard capture must keep the review route');

  assert.match(cameraSource, /<CameraView/);
  assert.match(cameraSource, /ref=\{cameraRef\}/);
  assert.match(cameraSource, /style=\{StyleSheet\.absoluteFill\}/);
  assert.match(cameraSource, /cameraService\.capturePhoto\(cameraRef\.current,\s*facing,\s*zoom\)/);
  assert.match(captureFunction, /if\s*\(\s*captureInFlightRef\.current\s*\|\|/);
  assert.match(captureFunction, /captureInFlightRef\.current\s*=\s*true/);
  assert.match(
    captureFunction,
    /finally\s*\{\s*captureInFlightRef\.current\s*=\s*false;\s*setCapturing\(false\);\s*\}/,
  );
  assert.match(cameraSource, /BackHandler\.addEventListener\([\s\S]*?\(\)\s*=>\s*captureInFlightRef\.current/s);
  assert.match(cameraSource, /flash=\{flash\}/);
  assert.match(cameraSource, /zoom=\{zoom\}/);
  assert.match(cameraSource, /setFacing\(\(current\)\s*=>\s*\(current\s*===\s*['"]back['"]\s*\?\s*['"]front['"]\s*:\s*['"]back['"]\)\)/);
  assert.match(cameraSource, /<OpacitySlider/);
  assert.match(cameraSource, /<Switch/);
  assert.match(cameraSource, /ghostEnabled/);
  assert.match(cameraSource, /source=\{\{\s*uri:\s*beforeMedia\.localUri\s*\}\}/);
  assert.match(pairReviewPush, /jobId:\s*rawJobId/);
  assert.match(pairReviewPush, /beforeMediaId:\s*beforeMedia\.id/);
  assert.match(pairReviewPush, /\.\.\.\(pairId\s*\?\s*\{\s*pairId\s*\}\s*:\s*\{\}\)/);
  assert.match(pairReviewPush, /tempUri:\s*photo\.uri/);
  assert.match(pairReviewPush, /width:\s*String\(photo\.width\)/);
  assert.match(pairReviewPush, /height:\s*String\(photo\.height\)/);
  assert.match(pairReviewPush, /facing:\s*photo\.cameraFacing/);
  assert.match(pairReviewPush, /zoom:\s*String\(photo\.zoom\)/);
  assert.match(pairReviewPush, /capturedAt/);

  assert.match(reviewPush, /jobId:\s*rawJobId/);
  assert.match(reviewPush, /\bstage\s*,/);
  assert.match(reviewPush, /tempUri:\s*photo\.uri/);
  assert.match(reviewPush, /width:\s*String\(photo\.width\)/);
  assert.match(reviewPush, /height:\s*String\(photo\.height\)/);
  assert.match(reviewPush, /facing:\s*photo\.cameraFacing/);
  assert.match(reviewPush, /zoom:\s*String\(photo\.zoom\)/);
  assert.match(reviewPush, /capturedAt/);

  assert.doesNotMatch(cameraSource, /<StatusBar\s+style="dark"\s*\/>/);
  assert.match(findStyle(cameraSource, 'cameraScreen'), /backgroundColor:\s*Colors\.background/);
  assert.match(findStyle(cameraSource, 'cameraHeader'), /backgroundColor:\s*Colors\.surface/);
  assert.match(findStyle(cameraSource, 'cameraHeader'), /borderBottomColor:\s*Colors\.border/);
  assert.match(findStyle(cameraSource, 'capturePanel'), /backgroundColor:\s*Colors\.surface/);
  assert.match(findStyle(cameraSource, 'capturePanel'), /borderTopColor:\s*Colors\.border/);
  assert.match(findStyle(cameraSource, 'zoomButton'), /height:\s*44/);

  const imageSources = [...cameraSource.matchAll(/<Image\b[\s\S]*?\/>/g)].map((match) => match[0]);
  assert.equal(imageSources.length, 1, 'camera may render only the real matched Before ghost image');
  assert.match(imageSources[0], /source=\{\{\s*uri:\s*beforeMedia\.localUri\s*\}\}/);
});
