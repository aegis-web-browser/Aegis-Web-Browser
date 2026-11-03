'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions } = require('../lib/version');

test('historic four-part versions compare correctly', () => {
  assert.equal(compareVersions('5.8.5.1', '5.8.5.0'), 1);
  assert.equal(compareVersions('5.9.0', '5.8.5.1'), 1);
  assert.equal(compareVersions('5.8.5.1', '5.9.0'), -1);
});
test('stable release is newer than beta and release candidate', () => {
  assert.equal(compareVersions('5.9.0', '5.9.0-beta.1'), 1);
  assert.equal(compareVersions('5.9.0-beta.1', '5.9.0'), -1);
  assert.equal(compareVersions('5.9.0-rc.1', '5.9.0-beta.9'), 1);
});
test('prerelease identifiers compare correctly', () => {
  assert.equal(compareVersions('5.9.0-beta.2', '5.9.0-beta.1'), 1);
  assert.equal(compareVersions('v5.9.0-beta.1', '5.9.0-beta.1'), 0);
});
