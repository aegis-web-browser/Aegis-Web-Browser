'use strict';

/** Validate a redirected update URL before allowing its download. */
function trustedUpdateUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) {
    throw new Error('Invalid update URL.');
  }
  let url;
  try { url = new URL(value); }
  catch { throw new Error('Invalid update URL.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
    throw new Error('Update downloads require HTTPS without embedded credentials.');
  }
  return url;
}

/** Require GitHub release asset checksum, never silently fall back to unverified files. */
function requiredUpdateSha256(value) {
  const digest = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error('Update blocked: release asset has no valid SHA-256 digest.');
  }
  return digest;
}

module.exports = { trustedUpdateUrl, requiredUpdateSha256 };
