/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repositoryRoot = path.resolve(__dirname, '..');
const appConfig = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'app.json'), 'utf8'),
);
const easConfig = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, 'eas.json'), 'utf8'),
);

test('Android app identity and EAS project link stay explicit', () => {
  assert.equal(appConfig.expo.owner, 'kabba94');
  assert.equal(appConfig.expo.android.package, 'com.kabba1.jobtopost');
  assert.equal(appConfig.expo.android.versionCode, 1);
  assert.match(appConfig.expo.extra.eas.projectId, /^[0-9a-f-]{36}$/);
});

test('EAS preview is an installable APK and production remains a store bundle', () => {
  assert.equal(easConfig.cli.appVersionSource, 'remote');
  assert.equal(easConfig.build.development.developmentClient, true);
  assert.equal(easConfig.build.development.distribution, 'internal');
  assert.equal(easConfig.build.development.android.buildType, 'apk');
  assert.equal(easConfig.build.preview.distribution, 'internal');
  assert.equal(easConfig.build.preview.android.buildType, 'apk');
  assert.equal(easConfig.build.production.autoIncrement, true);
  assert.equal(easConfig.build.production.android.buildType, 'app-bundle');
});
