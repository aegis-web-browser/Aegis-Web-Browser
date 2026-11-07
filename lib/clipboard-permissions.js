'use strict';

/**
 * Permission policy for webpages loaded in Aegis Web's isolated <webview>.
 * Only allow writing plain/sanitized content to the system clipboard.
 * Never grant clipboard-read or unsanitized/raw clipboard access.
 * Secure (HTTPS) document origin and webview guest are both required.
 */
const CLIPBOARD_WRITE_PERMISSION = 'clipboard-sanitized-write';

function isSecureWebOrigin(origin) {
  if (typeof origin !== 'string' || !origin.trim()) return false;
  try {
    const target = new URL(origin);
    if (target.username || target.password) return false;
    if (target.protocol === 'https:') return true;
    return target.protocol === 'http:' &&
      (target.hostname === 'localhost' || target.hostname === '127.0.0.1' || target.hostname === '[::1]');
  } catch { return false; }
}
function isWebviewGuest(contents) {
  if (!contents || typeof contents.getType !== 'function') return false;
  try { return !contents.isDestroyed?.() && contents.getType() === 'webview'; }
  catch { return false; }
}
function clipboardPermissionAllowed(contents, permission, requestingOrigin, details) {
  if (permission !== CLIPBOARD_WRITE_PERMISSION || !isWebviewGuest(contents)) return false;
  // Respect the requesting frame's origin when Electron supplies it.
  // Never replace an explicitly unsafe origin with a secure parent page URL.
  const origin = typeof requestingOrigin === 'string' && requestingOrigin
    ? requestingOrigin
    : (typeof details?.requestingUrl === 'string' && details.requestingUrl
      ? details.requestingUrl
      : contents.getURL?.());
  return isSecureWebOrigin(origin);
}

module.exports = { CLIPBOARD_WRITE_PERMISSION, isSecureWebOrigin, isWebviewGuest, clipboardPermissionAllowed };
