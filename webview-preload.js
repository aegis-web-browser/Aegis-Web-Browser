const { ipcRenderer } = require('electron');
let lastSent = { key: '', time: 0 };
function visibleInput(input) {
  if (!input || input.disabled || input.readOnly) return false;
  const style = window.getComputedStyle(input);
  return style.display !== 'none' && style.visibility !== 'hidden';
}
function findUsername(form, passwordInput) {
  const inputs = [...form.querySelectorAll('input')].filter(visibleInput);
  const explicit = inputs.find(input => /^(username|email)$/i.test(input.autocomplete || ''));
  if (explicit) return explicit.value || '';
  const email = inputs.find(input => input.type === 'email');
  if (email) return email.value || '';
  const named = inputs.find(input => /user|login|email|account|ident/i.test(`${input.name || ''} ${input.id || ''}`));
  if (named && named.type !== 'password') return named.value || '';
  const beforePassword = inputs.filter(input => input !== passwordInput && input.type !== 'password' && ['text','email','tel',''].includes(input.type)).filter(input => {
    try { return input.compareDocumentPosition(passwordInput) & Node.DOCUMENT_POSITION_FOLLOWING; } catch { return false; }
  }).pop();
  return beforePassword?.value || '';
}
function captureForm(form) {
  if (!form || typeof form.querySelectorAll !== 'function') return;
  const passwords = [...form.querySelectorAll('input[type="password"]')].filter(visibleInput);
  const passwordInput = passwords.find(input => input.value) || passwords[0];
  if (!passwordInput || !passwordInput.value) return;
  if (!/^https?:$/.test(location.protocol)) return;
  const candidate = {
    origin: location.origin,
    username: findUsername(form, passwordInput),
    password: passwordInput.value,
    label: document.title || location.hostname
  };
  const key = `${candidate.origin}\n${candidate.username}\n${candidate.password}`;
  const now = Date.now();
  if (key === lastSent.key && now - lastSent.time < 3000) return;
  lastSent = { key, time: now };
  ipcRenderer.sendToHost('aegis:credential-candidate', candidate);
}
document.addEventListener('submit', event => captureForm(event.target), true);
document.addEventListener('click', event => {
  const button = event.target?.closest?.('button,input[type="submit"]');
  if (!button) return;
  const form = button.form || button.closest?.('form') || document;
  captureForm(form);
}, true);
document.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  const form = event.target?.form || event.target?.closest?.('form') || document;
  captureForm(form);
}, true);
function aegisIsEditableTarget(target) {
  if (!target) return false;
  const tag = String(target.tagName || '').toLowerCase();
  return target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
}
function aegisLargestVideo() {
  const videos = [...document.querySelectorAll('video')].filter(video => {
    const rect = video.getBoundingClientRect();
    const style = getComputedStyle(video);
    return rect.width > 80 && rect.height > 45 && style.display !== 'none' && style.visibility !== 'hidden';
  });
  videos.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return (br.width * br.height) - (ar.width * ar.height);
  });
  return videos[0] || null;
}
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  if (aegisIsEditableTarget(document.activeElement)) return;
  const video = aegisLargestVideo();
  if (!video) return;
  if (event.code === 'Space') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (video.paused || video.ended) video.play().catch(() => {});
    else video.pause();
    return;
  }
  // Ne capture pas la touche F : YouTube/Vimeo et les autres lecteurs gèrent
  // eux-mêmes leur raccourci plein écran. Aegis relaie ensuite l'état fullscreen
  // au BrowserWindow, ce qui évite de casser les contrôles natifs du site.
}, true);

// ---- Aegis 5.2: reliable HTML fullscreen bridge --------------------------
let aegisLastFullscreen = null;
function aegisReportFullscreen() {
  const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  if (active === aegisLastFullscreen) return;
  aegisLastFullscreen = active;
  try { ipcRenderer.sendToHost('aegis:fullscreen-change', { active }); } catch {}
}
document.addEventListener('fullscreenchange', aegisReportFullscreen, true);
document.addEventListener('webkitfullscreenchange', aegisReportFullscreen, true);
window.addEventListener('pagehide', () => {
  if (aegisLastFullscreen) {
    aegisLastFullscreen = false;
    try { ipcRenderer.sendToHost('aegis:fullscreen-change', { active: false }); } catch {}
  }
});

// ---- Aegis Vault: detect login screens and offer saved credentials -------
let aegisLoginDetectionKey = '';
let aegisLoginDetectionAt = 0;
function aegisDetectLoginForm() {
  if (!/^https?:$/.test(location.protocol)) return;
  const passwords = [...document.querySelectorAll('input[type="password"]')].filter(visibleInput);
  const loginPassword = passwords.find(input => !/new-password/i.test(input.autocomplete || ''));
  if (!loginPassword) return;
  const form = loginPassword.form || loginPassword.closest?.('form') || document.body;
  const username = form ? findUsername(form, loginPassword) : '';
  const key = `${location.origin}\n${username}\n${document.title}`;
  const now = Date.now();
  if (key === aegisLoginDetectionKey && now - aegisLoginDetectionAt < 12000) return;
  aegisLoginDetectionKey = key;
  aegisLoginDetectionAt = now;
  try {
    ipcRenderer.sendToHost('aegis:login-form-detected', {
      origin: location.origin,
      username: String(username || '').slice(0, 320),
      label: String(document.title || location.hostname).slice(0, 160)
    });
  } catch {}
}
function aegisScheduleLoginDetection() {
  clearTimeout(aegisScheduleLoginDetection.timer);
  aegisScheduleLoginDetection.timer = setTimeout(aegisDetectLoginForm, 280);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(aegisDetectLoginForm, 120), { once: true });
else setTimeout(aegisDetectLoginForm, 120);

// ---- Aegis AdBlock cosmetic cleanup --------------------------------------
let aegisCosmeticConfig = { enabled: true, cosmetic: true, allowlisted: false };
const AEGIS_AD_SELECTORS = [
  'ins.adsbygoogle','[data-ad-client]','[data-ad-slot]','[data-ad-unit]','[data-ad-format]',
  '[id^="google_ads_"]','iframe[id*="google_ads_iframe"]','iframe[name^="google_ads_iframe"]','iframe[src*="doubleclick.net"]','iframe[src*="googlesyndication.com"]',
  '[aria-label="Advertisement"]','[aria-label="Publicité"]','[data-testid*="ad-slot"]','[data-ad-container]',
  '.advertisement','.advertisement-container','.advertisement-wrapper','.ad-slot','.ads-slot','.ad-container','.ads-container','.ad-placeholder','.ads-placeholder','[class*="ad-placeholder"]','[class*="ad_wrapper"]','[class*="ad-wrapper"]','div[id^="div-gpt-ad"]','[data-google-query-id]',
  '[class*=" ad-container"]','[class^="ad-container"]','[class*=" advertisement"]','[id^="ad_container"]','[id^="ad-slot"]'
].join(',');
function aegisCollapseAdElement(element) {
  if (!(element instanceof Element) || element === document.body || element === document.documentElement) return;
  try {
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('height', '0', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('max-height', '0', 'important');
    element.style.setProperty('margin', '0', 'important');
    element.style.setProperty('padding', '0', 'important');
    element.style.setProperty('border', '0', 'important');
    element.setAttribute('data-aegis-ad-collapsed', '1');
    let parent = element.parentElement;
    for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
      if (parent === document.body || parent === document.documentElement) break;
      const childElements = [...parent.children].filter(child => {
        try { return getComputedStyle(child).display !== 'none'; } catch { return true; }
      });
      const hint = `${parent.id || ''} ${parent.className || ''}`.toLowerCase();
      const adHint = /(^|[\s_-])(ad|ads|advert|advertisement|sponsor)([\s_-]|$)/.test(hint);
      if (adHint || childElements.length <= 1) {
        const rect = parent.getBoundingClientRect();
        if (rect.height <= 520 && rect.width <= Math.max(1400, innerWidth)) {
          parent.style.setProperty('display', 'none', 'important');
          parent.style.setProperty('height', '0', 'important');
          parent.style.setProperty('min-height', '0', 'important');
          parent.style.setProperty('margin', '0', 'important');
          parent.style.setProperty('padding', '0', 'important');
          parent.setAttribute('data-aegis-ad-collapsed', '1');
        }
      } else break;
    }
  } catch {}
}
function aegisRunCosmeticCleanup(root = document) {
  if (!aegisCosmeticConfig.enabled || !aegisCosmeticConfig.cosmetic || aegisCosmeticConfig.allowlisted) return;
  try {
    if (root instanceof Element && root.matches?.(AEGIS_AD_SELECTORS)) aegisCollapseAdElement(root);
    root.querySelectorAll?.(AEGIS_AD_SELECTORS).forEach(aegisCollapseAdElement);
  } catch {}
}
ipcRenderer.on('aegis:adblock-config', (_event, state) => {
  aegisCosmeticConfig = { ...aegisCosmeticConfig, ...(state || {}) };
  if (aegisCosmeticConfig.enabled && aegisCosmeticConfig.cosmetic && !aegisCosmeticConfig.allowlisted) aegisRunCosmeticCleanup(document);
});
let aegisDomTimer = null;
const aegisObserver = new MutationObserver(mutations => {
  if (aegisCosmeticConfig.enabled && aegisCosmeticConfig.cosmetic && !aegisCosmeticConfig.allowlisted) {
    for (const mutation of mutations) for (const node of mutation.addedNodes) if (node instanceof Element) aegisRunCosmeticCleanup(node);
  }
  clearTimeout(aegisDomTimer);
  aegisDomTimer = setTimeout(aegisScheduleLoginDetection, 180);
});
function aegisStartObservers() {
  if (!document.documentElement) return setTimeout(aegisStartObservers, 60);
  try { aegisObserver.observe(document.documentElement, { childList: true, subtree: true }); } catch {}
  setTimeout(() => aegisRunCosmeticCleanup(document), 180);
}
aegisStartObservers();
