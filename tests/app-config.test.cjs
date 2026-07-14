/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const appConfig = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'app.json'), 'utf8'),
);

function getPluginOptions(pluginName) {
  const matches = appConfig.expo.plugins.filter(
    (plugin) => Array.isArray(plugin) && plugin[0] === pluginName,
  );
  assert.equal(matches.length, 1, `${pluginName} must be configured exactly once.`);
  return matches[0][1];
}

test('camera config excludes microphone permission for the photo-only workflow', () => {
  const camera = getPluginOptions('expo-camera');

  assert.equal(
    camera.cameraPermission,
    'Allow JobToPost to take photos for your jobs.',
  );
  assert.equal(camera.microphonePermission, false);
  assert.equal(camera.recordAudioAndroid, false);
});

test('media-library config is add-only and disables automatic granular reads', () => {
  const mediaLibrary = getPluginOptions('expo-media-library');

  assert.equal(mediaLibrary.photosPermission, false);
  assert.equal(
    mediaLibrary.savePhotosPermission,
    'Allow JobToPost to save finished Before and After posts to your photos.',
  );
  assert.deepEqual(mediaLibrary.granularPermissions, []);
});

test('Android config blocks every media-library read permission', () => {
  const blocked = new Set(appConfig.expo.android.blockedPermissions);
  const requiredBlocks = [
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_MEDIA_AUDIO',
    'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  ];

  for (const permission of requiredBlocks) {
    assert.equal(blocked.has(permission), true, `${permission} must remain blocked.`);
  }
});
