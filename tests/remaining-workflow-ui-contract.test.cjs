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

function findElement(source, elementName, contentPattern, description) {
  const element = [...source.matchAll(new RegExp(`<${elementName}\\b[\\s\\S]*?(?:\\/>|</${elementName}>)`, 'g'))]
    .map((match) => match[0])
    .find((candidate) => contentPattern.test(candidate));
  assert.ok(element, `${description} must remain rendered`);
  return element;
}

const queueSource = readRepositoryFile('app/(tabs)/(jobs)/after-queue.tsx');
const pairReviewSource = readRepositoryFile('app/pair-review.tsx');
const pairSource = readRepositoryFile('app/(tabs)/(jobs)/pair.tsx');
const comparisonSource = readRepositoryFile('components/comparison-view.tsx');
const generatedCardSource = readRepositoryFile('components/generated-asset-card.tsx');
const contentSource = readRepositoryFile('app/(tabs)/content.tsx');
const createPostSource = readRepositoryFile('app/create-post.tsx');
const generatedAssetSource = readRepositoryFile('app/generated-asset.tsx');
const reviewSource = readRepositoryFile('app/review.tsx');
const mediaSource = readRepositoryFile('app/(tabs)/(jobs)/media.tsx');
const metadataFormSource = readRepositoryFile('components/photo-metadata-form.tsx');
const settingsSource = readRepositoryFile('app/(tabs)/settings.tsx');

test('keeps Content refresh, routing, and PNG-only deletion while using complete image-led cards and a labeled Settings action', () => {
  assert.match(contentSource, /useFocusEffect\([\s\S]*?void\s+load\(\)/);
  assert.match(contentSource, /const\s+columns\s*=\s*width\s*>=\s*720\s*\?\s*2\s*:\s*1/);
  assert.match(contentSource, /await\s+fileExists\(asset\.localUri\)/);
  assert.match(contentSource, /router\.push\(\{\s*pathname:\s*['"]\/generated-asset['"],\s*params:\s*\{\s*assetId:\s*item\.id\s*\}\s*\}\)/);
  assert.match(contentSource, /await\s+deleteAsset\(assetToDelete\.id\)/);
  assert.match(contentSource, /This removes only the finished PNG\. Your job photos and saved pair will stay unchanged\./);
  assert.match(contentSource, /accessibilityLabel="Open Settings"/);
  assert.match(contentSource, /<Text\s+style=\{styles\.settingsLabel\}>Settings<\/Text>/);
  assert.match(findStyle(contentSource, 'content'), /paddingHorizontal:\s*20/);

  const image = findElement(generatedCardSource, 'Image', /asset\.localUri/, 'generated post image');
  assert.match(image, /source=\{\{\s*uri:\s*asset\.localUri\s*\}\}/);
  assert.match(image, /contentFit="contain"/);
  assert.match(image, /onError=\{onImageError\}/);
  assert.match(image, /aspectRatio:\s*asset\.width\s*\/\s*asset\.height/);
  assert.match(generatedCardSource, /accessibilityHint="Open the generated post"/);
  assert.match(generatedCardSource, /accessibilityLabel=\{`Delete generated post for \$\{jobName\}`\}/);
  assert.match(generatedCardSource, />Delete Post<\/Text>/);
});

test('retains the adjustable comparison slider while using dark tonal controls and semantic Before and After labels', () => {
  assert.match(comparisonSource, /PanResponder\.create\(/);
  assert.match(comparisonSource, /accessibilityRole="adjustable"/);
  assert.match(comparisonSource, /accessibilityValue=\{\{\s*min:\s*0,\s*max:\s*100,\s*now:\s*splitPercentage\s*\}\}/);
  assert.match(comparisonSource, /accessibilityActions=\{\[\{\s*name:\s*['"]increment['"]\s*\},\s*\{\s*name:\s*['"]decrement['"]\s*\}\]\}/);
  assert.match(comparisonSource, /splitRef\.current\s*\+\s*0\.1/);
  assert.match(comparisonSource, /splitRef\.current\s*-\s*0\.1/);
  assert.match(findStyle(comparisonSource, 'handle'), /width:\s*52/);
  assert.match(findStyle(comparisonSource, 'handle'), /height:\s*52/);
  assert.match(findStyle(comparisonSource, 'beforeBadge'), /borderColor:\s*Colors\.before/);
  assert.match(findStyle(comparisonSource, 'beforeBadgeText'), /color:\s*Colors\.before/);
  assert.match(findStyle(comparisonSource, 'afterBadge'), /borderColor:\s*Colors\.after/);
  assert.match(findStyle(comparisonSource, 'afterBadgeText'), /color:\s*Colors\.after/);
});

test('preserves the dynamic After queue actions, file checks, and every camera and pair route parameter', () => {
  assert.match(queueSource, /getAfterQueuePrimaryAction/);
  assert.match(queueSource, /selectLatestPair/);
  assert.match(queueSource, /await\s+fileExists\(record\.localUri\)/);
  assert.match(queueSource, /const\s+primaryAction\s*=\s*getAfterQueuePrimaryAction\(\{[\s\S]*?total,[\s\S]*?remaining,[\s\S]*?hasNextUnmatched:[\s\S]*?hasSavedPair:/);
  assert.match(queueSource, /pathname:\s*['"]\/job-camera['"][\s\S]*?jobId,[\s\S]*?stage:\s*['"]after['"][\s\S]*?captureMode:\s*['"]matched-after['"][\s\S]*?beforeMediaId:\s*before\.id/);
  assert.match(queueSource, /pathname:\s*['"]\/pair['"],\s*params:\s*\{\s*jobId,\s*pairId:\s*pair\.id\s*\}/);
  assert.match(queueSource, /pathname:\s*['"]\/gallery['"],\s*params:\s*\{\s*jobId,\s*stage:\s*['"]before['"]\s*\}/);
  assert.match(queueSource, /primaryAction\.kind\s*===\s*['"]add-before['"]/);
  assert.match(queueSource, /primaryAction\.kind\s*===\s*['"]start-next['"]/);
  assert.match(queueSource, /primaryAction\.kind\s*===\s*['"]view-pair['"]/);
  assert.match(findStyle(queueSource, 'queueCard'), /backgroundColor:\s*Colors\.surface/);
  assert.match(findStyle(queueSource, 'bottomAction'), /backgroundColor:\s*Colors\.surfaceRaised/);
});

test('preserves pair-review cleanup, Android back interception, metadata, replacement, and dismiss behavior', () => {
  assert.match(pairReviewSource, /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/);
  assert.match(pairReviewSource, /if\s*\(!saving\)\s*setConfirmDiscard\(true\)/);
  assert.match(pairReviewSource, /const\s+discardAndReturn\s*=\s*useCallback\(async\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(tempUri\)\s*await\s+discardTemporaryCapture\(tempUri\);[\s\S]*?router\.dismiss\(2\);[\s\S]*?\},\s*\[discardTemporaryCapture,\s*router,\s*tempUri\]\)/);
  assert.match(pairReviewSource, /const\s+retake\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+discardTemporaryCapture\(tempUri\);[\s\S]*?router\.back\(\);[\s\S]*?\};/);
  assert.match(pairReviewSource, /const\s+approve\s*=\s*async\s*\(\)\s*=>\s*\{[\s\S]*?await\s+saveMatchedAfter\(\{[\s\S]*?tempUri,[\s\S]*?jobId,[\s\S]*?beforeMediaId:\s*before\.id,[\s\S]*?replacePairId,[\s\S]*?capturedAt,[\s\S]*?shotName:\s*before\.shotName,[\s\S]*?width,[\s\S]*?height,[\s\S]*?cameraFacing,[\s\S]*?zoom,[\s\S]*?\}\);[\s\S]*?router\.dismiss\(2\);/);
  assert.match(pairReviewSource, /approvalInFlight\.current/);
  assert.match(pairReviewSource, /contentFit="contain"/);
  assert.match(pairReviewSource, />Retake After<\/Text>/);
  assert.match(pairReviewSource, /label=\{replacePairId\s*\?\s*['"]Approve Replacement['"]\s*:\s*['"]Approve Pair['"]\}/);
  assert.match(findStyle(pairReviewSource, 'comparisonCard'), /overflow:\s*['"]hidden['"]/);
  assert.match(findStyle(pairReviewSource, 'comparisonCard'), /padding:\s*0/);
  assert.match(findStyle(pairReviewSource, 'modeButton'), /minHeight:\s*44/);
});

test('keeps pair detail source validation, replacement payloads, generated-asset independence, and the two-step unpair/delete choice', () => {
  assert.match(pairSource, /await\s+deletePair\(pair\.id\)/);
  assert.match(pairSource, /setConfirmDeleteAfter\(Boolean\(after\)\)/);
  assert.match(pairSource, /await\s+deleteMedia\(after\.id\)/);
  assert.match(pairSource, /onCancel=\{finishKeepingAfter\}/);
  assert.match(pairSource, /pathname:\s*['"]\/job-camera['"][\s\S]*?jobId:\s*pair\.jobId[\s\S]*?stage:\s*['"]after['"][\s\S]*?captureMode:\s*['"]matched-after['"][\s\S]*?beforeMediaId:\s*pair\.beforeMediaId[\s\S]*?pairId:\s*pair\.id/);
  assert.match(pairSource, /pathname:\s*['"]\/create-post['"],\s*params:\s*\{\s*pairId:\s*pair\.id,\s*jobId:\s*pair\.jobId\s*\}/);
  assert.match(pairSource, /assetsForJob\(pair\.jobId\)\.filter\([\s\S]*?asset\.pairId\s*===\s*pair\.id/);
  assert.match(pairSource, /source=\{\{\s*uri:\s*latestAsset\.localUri\s*\}\}/);
  assert.match(pairSource, /pathname:\s*['"]\/generated-asset['"],\s*params:\s*\{\s*assetId\s*\}/);
  assert.match(findStyle(pairSource, 'matchedBadge'), /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(findStyle(pairSource, 'comparisonCard'), /overflow:\s*['"]hidden['"]/);
  assert.match(findStyle(pairSource, 'modeButton'), /minHeight:\s*44/);
});

test('makes captured photos and the primary Use Photo action dominant without changing cleanup, metadata, or navigation', () => {
  assert.match(reviewSource, /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/);
  assert.match(reviewSource, /await\s+discardTemporaryCapture\(tempUri\)/);
  assert.match(reviewSource, /await\s+saveCapturedPhoto\(\{[\s\S]*?tempUri,[\s\S]*?jobId,[\s\S]*?stage,[\s\S]*?capturedAt,[\s\S]*?shotName,[\s\S]*?note,[\s\S]*?width,[\s\S]*?height,[\s\S]*?cameraFacing:\s*facing,[\s\S]*?zoom/);
  assert.match(reviewSource, /if\s*\(action\s*===\s*['"]another['"]\)\s*router\.back\(\)/);
  assert.match(reviewSource, /else\s+router\.dismiss\(2\)/);
  assert.match(reviewSource, /keyboardShouldPersistTaps="handled"/);
  assert.match(reviewSource, /automaticallyAdjustKeyboardInsets=\{Platform\.OS\s*===\s*['"]ios['"]\}/);
  assert.ok(
    reviewSource.indexOf('accessibilityLabel="Use photo"') <
      reviewSource.indexOf('style={styles.secondaryActionRow}'),
    'Use Photo must be the full-width primary action above the compact secondary row',
  );
  assert.match(findStyle(reviewSource, 'primaryAction'), /width:\s*['"]100%['"]/);
  assert.match(findStyle(reviewSource, 'primaryAction'), /minHeight:\s*(?:5[6-9]|[6-9]\d)/);
  assert.match(findStyle(reviewSource, 'secondaryActionRow'), /flexDirection:\s*['"]row['"]/);
  assert.match(findStyle(reviewSource, 'photo'), /backgroundColor:\s*Colors\.surfaceRaised/);
});

test('keeps media editing, pair warnings, keyboard handling, save/delete behavior, and semantic metadata inputs', () => {
  assert.match(mediaSource, /const\s+activePair\s*=\s*pairs\.find/);
  assert.match(mediaSource, /Its Before and After pairing will also be removed\./);
  assert.match(mediaSource, /await\s+updateMedia\(record\.id,\s*\{\s*shotName,\s*note,\s*stage\s*\}\)/);
  assert.match(mediaSource, /router\.dismissTo\(\{\s*pathname:\s*['"]\/gallery['"],\s*params:\s*\{\s*jobId:\s*updated\.jobId,\s*stage:\s*updated\.stage\s*\}\s*\}\)/);
  assert.match(mediaSource, /await\s+deleteMedia\(record\.id\)/);
  assert.match(mediaSource, /keyboardShouldPersistTaps="handled"/);
  assert.match(mediaSource, /style=\{styles\.metadataWorkspace\}/);
  assert.match(findStyle(mediaSource, 'photo'), /backgroundColor:\s*Colors\.surfaceRaised/);

  assert.match(metadataFormSource, />Shot name<\/Text>/);
  assert.match(metadataFormSource, />Note<\/Text>/);
  assert.match(metadataFormSource, /maxLength=\{80\}/);
  assert.match(metadataFormSource, /maxLength=\{300\}/);
  assert.match(metadataFormSource, /onChangeText=\{onChangeShotName\}/);
  assert.match(metadataFormSource, /onChangeText=\{onChangeNote\}/);
  assert.match(metadataFormSource, /placeholderTextColor=\{Colors\.textTertiary\}/g);
  assert.match(findStyle(metadataFormSource, 'input'), /minHeight:\s*44/);
  assert.match(findStyle(metadataFormSource, 'input'), /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(findStyle(metadataFormSource, 'input'), /borderColor:\s*Colors\.border/);
});

test('keeps the complete post composition and safeguards inside one dark customization panel', () => {
  assert.match(createPostSource, /createBeforeAfterPostRenderer\(\{[\s\S]*?ref:\s*compositionRef,[\s\S]*?isReady:[\s\S]*?matchesInput:/);
  assert.match(createPostSource, /current\.beforeUri\s*===\s*input\.beforeUri/);
  assert.match(createPostSource, /current\.afterUri\s*===\s*input\.afterUri/);
  assert.match(createPostSource, /current\.format\s*===\s*input\.format/);
  assert.match(createPostSource, /current\.layout\s*===\s*input\.layout/);
  assert.match(createPostSource, /current\.labelsEnabled\s*===\s*input\.labelsEnabled/);
  assert.match(createPostSource, /current\.footerText\s*===\s*normalizeFooterText\(input\.footerText\)/);
  assert.match(createPostSource, /const\s+retryPreview\s*=\s*useCallback/);
  assert.match(createPostSource, /setPreviewAttempt\(\(current\)\s*=>\s*current\s*\+\s*1\)/);
  assert.match(createPostSource, /setSourceRevision\(\(current\)\s*=>\s*current\s*\+\s*1\)/);
  assert.match(createPostSource, /BackHandler\.addEventListener\(['"]hardwareBackPress['"],\s*\(\)\s*=>\s*true\)/);
  assert.match(createPostSource, /const\s+webGenerationUnavailable\s*=\s*Platform\.OS\s*===\s*['"]web['"]/);
  assert.match(createPostSource, /onBack=\{generationInFlight\s*\?\s*undefined\s*:\s*leaveBuilder\}/);
  assert.match(createPostSource, /behavior=\{Platform\.OS\s*===\s*['"]ios['"]\s*\?\s*['"]padding['"]\s*:\s*['"]height['"]\}/);
  assert.match(createPostSource, /automaticallyAdjustKeyboardInsets=\{Platform\.OS\s*===\s*['"]ios['"]\}/);
  assert.match(createPostSource, /keyboardShouldPersistTaps="handled"/);
  assert.match(createPostSource, /paddingBottom:\s*Math\.max\(insets\.bottom,\s*Spacing\.md\)/);
  assert.match(createPostSource, /const\s+createPost\s*=\s*async\s*\(\)\s*=>\s*\{\s*if\s*\(\s*!job\s*\|\|\s*!pair\s*\|\|\s*!before\s*\|\|\s*!after\s*\|\|\s*!sourceAvailable\s*\|\|\s*!previewReady\s*\|\|\s*generating\s*\)\s*return;/);
  assert.match(createPostSource, /Keyboard\.dismiss\(\);[\s\S]*?await\s+generateAsset\(\{[\s\S]*?jobId:\s*job\.id,[\s\S]*?pairId:\s*pair\.id,[\s\S]*?format,[\s\S]*?layout,[\s\S]*?labelsEnabled,[\s\S]*?footerText,[\s\S]*?renderer,[\s\S]*?\}\)/);
  assert.match(createPostSource, /router\.replace\(\{\s*pathname:\s*['"]\/generated-asset['"],\s*params:\s*\{\s*assetId:\s*asset\.id\s*\}\s*\}\)/);

  const composition = findElement(
    createPostSource,
    'BeforeAfterPostComposition',
    /beforeUri=\{before\.localUri\}/,
    'post composition preview',
  );
  for (const prop of [
    /ref=\{compositionRef\}/,
    /beforeUri=\{before\.localUri\}/,
    /afterUri=\{after\.localUri\}/,
    /format=\{format\}/,
    /layout=\{layout\}/,
    /labelsEnabled=\{labelsEnabled\}/,
    /footerText=\{footerText\}/,
    /onReadyChange=\{onReadyChange\}/,
    /onLoadError=\{handlePreviewError\}/,
  ]) assert.match(composition, prop);

  assert.match(createPostSource, /style=\{styles\.customizationPanel\}/);
  assert.equal((createPostSource.match(/style=\{styles\.customizationSection\}/g) ?? []).length, 4);
  assert.equal((createPostSource.match(/style=\{styles\.customizationDivider\}/g) ?? []).length, 3);
  assert.match(findStyle(createPostSource, 'customizationPanel'), /backgroundColor:\s*Colors\.surface/);
  assert.match(findStyle(createPostSource, 'retryPreviewButton'), /minHeight:\s*44/);
  assert.match(createPostSource, /trackColor=\{\{\s*false:\s*Colors\.surfaceMuted,\s*true:\s*Colors\.primary\s*\}\}/);
  assert.match(createPostSource, /placeholderTextColor=\{Colors\.textTertiary\}/);
});

test('keeps generated PNG saving, sharing, permission recovery, versioning, deletion, and source independence', () => {
  assert.match(generatedAssetSource, /setAsset\(record\)/);
  assert.match(generatedAssetSource, /source=\{\{\s*uri:\s*asset\.localUri\s*\}\}/);
  assert.match(generatedAssetSource, /contentFit="contain"/);
  assert.match(generatedAssetSource, /aspectRatio:\s*asset\.width\s*\/\s*asset\.height/);
  assert.match(generatedAssetSource, /generatedAssetExportService\.saveToPhotos\(asset\.localUri\)/);
  assert.match(generatedAssetSource, /result\.status\s*===\s*['"]permission-denied['"]/);
  assert.match(generatedAssetSource, /setOfferSettings\(!result\.canAskAgain\)/);
  assert.match(generatedAssetSource, /Photo access was not granted\. Tap Save to Photos to try again\./);
  assert.match(generatedAssetSource, /Photo access is blocked\. Open device Settings to allow it\./);
  assert.match(generatedAssetSource, /generatedAssetExportService\.openSettings\(\)/);
  assert.match(generatedAssetSource, /generatedAssetExportService\.share\(asset\.localUri\)/);
  assert.match(generatedAssetSource, /label="Save to Photos"/);
  assert.match(generatedAssetSource, /label="Share"/);
  assert.match(generatedAssetSource, />Create Another<\/Text>/);
  assert.match(generatedAssetSource, /pathname:\s*['"]\/create-post['"],[\s\S]*?params:\s*\{\s*jobId:\s*asset\.jobId,\s*pairId:\s*asset\.pairId\s*\}/);
  assert.match(generatedAssetSource, />Delete Generated Post<\/Text>/);
  assert.match(generatedAssetSource, /disabled=\{assetFileUnavailable\s*\|\|\s*sharing\}/);
  assert.match(generatedAssetSource, /disabled=\{assetFileUnavailable\s*\|\|\s*saving\}/);
  assert.match(generatedAssetSource, /if\s*\(!asset\s*\|\|\s*deleting\s*\|\|\s*saving\s*\|\|\s*sharing\)\s*return/);
  assert.match(generatedAssetSource, /await\s+deleteAsset\(asset\.id\)/);
  assert.match(generatedAssetSource, /This removes only the finished PNG\. The original job photos and pair will stay unchanged\./);
  assert.match(findStyle(generatedAssetSource, 'previewCard'), /padding:\s*0/);
  assert.match(findStyle(generatedAssetSource, 'versionButton'), /minHeight:\s*44/);
  assert.match(findStyle(generatedAssetSource, 'settingsAction'), /minHeight:\s*44/);
});

test('preserves all Settings storage, privacy, permission, gallery, cloud, and account wording in compact dark groups', () => {
  for (const exactCopy of [
    'Original photos stay on this device',
    'Storage, privacy, and app behavior.',
    'Storage & Data',
    'Accepted job photos are copied into JobToPost’s private app storage. Other apps cannot browse that folder directly.',
    'No automatic cloud backup',
    'JobToPost does not upload original photos or generated posts to a server.',
    'Local-only files can be lost',
    'Uninstalling JobToPost, clearing its app storage, or losing this phone may permanently remove job originals that were not exported elsewhere.',
    'Archiving keeps everything',
    'Archiving only moves a job out of the Active list. Its photos, saved pairs, and generated posts stay in JobToPost.',
    'Saving a post does not save originals',
    'Save to Photos copies a finished generated post. It does not copy that job’s original Before, Progress, or After photos.',
    'Deleting a job removes its managed files',
    'Deleting a job removes its original photos, saved pairs, and generated posts from JobToPost on this device.',
    'Backup tools are still coming',
    'Export All Originals, complete job archives, and automatic original-photo copies are not available yet. Until then, treat JobToPost originals as local-only.',
    'Requested only when you begin capturing a job photo.',
    'Requested only when you explicitly save a finished generated post to your device photo library.',
    'What Each Action Does',
    'Permissions',
    'Camera',
    'Photos',
  ]) assert.ok(settingsSource.includes(exactCopy), `Settings must preserve: ${exactCopy}`);

  assert.match(findStyle(settingsSource, 'content'), /paddingHorizontal:\s*20/);
  assert.match(findStyle(settingsSource, 'card'), /backgroundColor:\s*Colors\.surfaceRaised/);
  assert.match(findStyle(settingsSource, 'divider'), /StyleSheet\.hairlineWidth/);
  assert.doesNotMatch(settingsSource, /headingIcon|infoIcon|warningIcon/);
});

test('removes legacy light app-chrome literals and visible shadows from every Task 5 surface', () => {
  const scopedSources = [
    queueSource,
    pairReviewSource,
    pairSource,
    comparisonSource,
    generatedCardSource,
    contentSource,
    createPostSource,
    generatedAssetSource,
    reviewSource,
    mediaSource,
    metadataFormSource,
    settingsSource,
  ].join('\n');

  assert.doesNotMatch(
    scopedSources,
    /#(?:FAFAFB|EAF7EC|E9F7EC|E5E7EB|F8FBFF|FFF4E5|B7D1FF|C8CED8|9FC4FF|DDEAFF|9AA3B2|9098A8|151515)\b/i,
  );
  assert.doesNotMatch(
    scopedSources,
    /\b(?:shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation)\s*:/,
  );
});
