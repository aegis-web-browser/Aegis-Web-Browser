'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { trustedUpdateUrl, requiredUpdateSha256 } = require('../lib/update-security');

test('secure GitHub asset URL is allowed', () => {
  assert.equal(trustedUpdateUrl('https://github.com/aegis-web-browser/Aegis-Web-Browser/releases/download/5.9.0/test.zip').protocol, 'https:');
});
test('HTTPS signed download redirects are allowed', () => {
  assert.equal(trustedUpdateUrl('https://release-assets.githubusercontent.com/some-asset?token=abc').hostname, 'release-assets.githubusercontent.com');
});
test('HTTP and non-web schemes are rejected', () => {
  for (const value of ['http://example.com/update.zip', 'file:///tmp/update.zip', 'javascript:alert(1)', 'data:text/plain,test']) {
    assert.throws(() => trustedUpdateUrl(value), /HTTPS/);
  }
});
test('embedded credentials and malformed URLs are rejected', () => {
  for (const value of ['https://alice:secret@example.com/u.zip', '', 'not a URL', 'https://']) {
    assert.throws(() => trustedUpdateUrl(value), /Invalid|HTTPS/);
  }
});
test('valid 64-character SHA-256 is accepted case-insensitively', () => {
  assert.equal(requiredUpdateSha256('A'.repeat(64)), 'a'.repeat(64));
});
test('missing and malformed checksums are blocked', () => {
  for (const value of ['', undefined, 'sha256:nope', 'xyz'.repeat(22), '1'.repeat(63)]) {
    assert.throws(() => requiredUpdateSha256(value), /SHA-256/);
  }
});
