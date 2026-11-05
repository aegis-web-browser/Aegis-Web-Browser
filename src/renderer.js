const DEFAULT_SETTINGS = {
  theme: 'dark',
  themePreset: 'total-black',
  backgroundStyle: 'none',
  interfaceDensity: 'comfortable',
  homepage: 'aegis://start',
  searchEngine: 'google',
  showBookmarksBar: true,
  blockTrackers: true,
  doNotTrack: true,
  blockLocationPrompts: true,
  virusTotalApiKey: '',
  firstRunComplete: false,
  restoreSession: false,
  startWallpaper: 'aurora',
  startShowClock: true,
  startShowRecents: true,
  compactTabs: false,
  accentTheme: 'teal',
  dockEnabled: true,
  startShowActions: true,
  animations: true,
  adblockEnabled: true,
  adblockCosmetic: true,
  adblockCommunityFilters: true,
  adblockAllowlist: [],
  uiRevision: 584,
  onboardingVersion: 0,
  aiEnabled: true,
  aiDefaultMode: 'web',
  aiProcessing: 'cloud-preferred',
  aiCloudEndpoint: '',
  browserLanguage: 'en',
  translationTarget: 'fr',
  translationCloudEndpoint: '',
  developerToolsEnabled: true,
  webrtcIpProtection: true,
  updateFeedUrl: '',
  githubRepository: '',
  adultFilterEnabled: false,
  autoCheckUpdates: true
};
let store = { bookmarks: [], history: [], settings: { ...DEFAULT_SETTINGS } };
let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let tabGroups = [];
let activeProfileId = 'default';
let activeProfilePartition = 'persist:main';
let profileMetadata = [];
const GROUP_COLORS = ['teal','blue','violet','rose','amber'];
let closedTabs = [];
let blockedCount = 0;
let toastTimer;
let findRequestId = null;
let passwordEntries = [];
let pendingCredential = null;
let credentialPromptState = null;
let vaultGateState = { mode: null, afterUnlock: null };
const credentialPromptSeen = new Map();
let lastCredentialCandidateKey = '';
let lastCredentialCandidateTime = 0;
let sessionSaveTimer = null;
let addressSuggestionIndex = -1;
let addressSuggestionItems = [];
let startClockTimer = null;
let commandPaletteItems = [];
let commandPaletteIndex = -1;
let draggedTabId = null;
let tabContextTargetId = null;
let readerFontSize = 19;
let focusModeActive = false;
let activeDownloadCount = 0;
let startSearchMode = 'web';
let adblockState = { enabled: true, cosmetic: true, allowlisted: false, total: 0, siteCount: 0, host: '' };
let onboardingStep = 0;
const INTERNAL_START_PAGE = 'aegis://start';
function isStartPageURL(value = '') {
  return /^aegis:\/\/start$/i.test(String(value || '').trim());
}
function displayAddress(value = '') {
  const url = String(value || '');
  return isStartPageURL(url) || url === 'about:blank' ? '' : url;
}
function sessionURL(value = '', tab = null) {
  if (tab?.internalStart) return INTERNAL_START_PAGE;
  return String(value || '');
}
function normalizeHomepageInput(input) {
  const value = String(input || '').trim();
  if (!value) return INTERNAL_START_PAGE;
  if (/^(aegis:\/\/start|start|home|accueil)$/i.test(value)) return INTERNAL_START_PAGE;
  return normalizeURL(value);
}
function isRestorableSessionURL(value = '') {
  return isStartPageURL(value) || /^https?:\/\//i.test(String(value || ''));
}
const $ = id => document.getElementById(id);
const $tabs = $('tabs');
const $webviews = $('webviews');
const $addressBar = $('address-bar');
const $starBtn = $('star-btn');
const $bookmarksBar = $('bookmarks-bar');
const $backBtn = $('back-btn');
const $forwardBtn = $('forward-btn');
const $reloadBtn = $('reload-btn');
const $siteInfo = $('site-info-btn');
const $overlay = $('overlay');
// Keep profile selection above the page and global overlay stacking contexts.
if ($('profile-popover')?.parentElement !== document.body) document.body.appendChild($('profile-popover'));
const panels = {
  bookmarks: $('panel-bookmarks'),
  history: $('panel-history'),
  downloads: $('panel-downloads'),
  privacy: $('panel-privacy'),
  adblock: $('panel-adblock'),
  ai: $('panel-ai'),
  translate: $('panel-translate'),
  passwords: $('panel-passwords'),
  settings: $('panel-settings'),
  update: $('panel-update'),
  security: $('panel-security'),
  notes: $('panel-notes'),
  menu: $('panel-menu')
};
function escapeHTML(value) {
  const div = document.createElement('div');
  div.textContent = String(value || '');
  return div.innerHTML;
}
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function isURL(input) {
  const value = input.trim();
  if (/^(https?:\/\/|file:\/\/)/i.test(value)) return true;
  if (/^localhost(:\d+)?(\/.*)?$/i.test(value)) return true;
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/i.test(value) && !value.includes(' ');
}
function uiLocale() { return (store?.settings?.browserLanguage || activeUiLanguage || 'en') === 'fr' ? 'fr-FR' : 'en-US'; }
function searchURL(query) {
  const encoded = encodeURIComponent(query.trim());
  switch (store.settings.searchEngine) {
    case 'duckduckgo': return `https://duckduckgo.com/?q=${encoded}`;
    case 'bing': return `https://www.bing.com/search?q=${encoded}`;
    default: return `https://www.google.com/search?q=${encoded}&hl=${store.settings.browserLanguage === 'fr' ? 'fr' : 'en'}&sourceid=chrome&ie=UTF-8`;
  }
}
function normalizeURL(input) {
  const value = String(input || '').trim();
  if (!value) return store.settings.homepage || DEFAULT_SETTINGS.homepage;
  if (isStartPageURL(value)) return INTERNAL_START_PAGE;
  if (isURL(value)) return /^(https?:\/\/|file:\/\/)/i.test(value) ? value : `https://${value}`;
  return searchURL(value);
}
function sessionPayload() {
  const publicTabs = tabs.filter(tab => !tab.private);
  const activePublicIndex = Math.max(0, publicTabs.findIndex(tab => tab.id === activeTabId));
  return {
    tabs: publicTabs.map(tab => ({
      url: sessionURL(safeWebviewURL(tab), tab),
      title: tab.tabEl.querySelector('.title')?.textContent || '',
      pinned: Boolean(tab.pinned),
      groupId: tab.groupId || null
    })),
    activeIndex: activePublicIndex,
    groups: tabGroups.map(group => ({ id:group.id, name:group.name, color:group.color, collapsed:Boolean(group.collapsed) }))
  };
}
async function persistSessionNow() {
  clearTimeout(sessionSaveTimer);
  sessionSaveTimer = null;
  try { await window.api.saveSession(sessionPayload()); } catch {}
}
function persistSessionSoon() {
  clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => { window.api.saveSession(sessionPayload()); }, 350);
}
function toggleTabMute(tab) {
  if (!tab) return;
  try {
    const next = !tab.webview.isAudioMuted();
    tab.webview.setAudioMuted(next);
    tab.muted = next;
    const audio = tab.tabEl.querySelector('.tab-audio');
    if (audio) { audio.textContent = next ? '×' : '♪'; audio.title = next ? (activeUiLanguage === 'fr' ? 'Réactiver le son' : 'Unmute') : (activeUiLanguage === 'fr' ? 'Couper le son' : 'Mute'); }
    tab.tabEl.classList.toggle('muted', next);
  } catch {}
}
function setLoadingState(active) {
  $('loading-progress')?.classList.toggle('loading', Boolean(active));
}
function updateStartClock() {
  const clock = $('start-clock');
  const date = $('start-date');
  if (!clock || !date) return;
  const now = new Date();
  clock.textContent = now.toLocaleTimeString(uiLocale(), { hour: '2-digit', minute: '2-digit' });
  date.textContent = now.toLocaleDateString(uiLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = $('start-greeting');
  if (greeting) {
    const h = now.getHours();
    greeting.textContent = activeUiLanguage === 'fr' ? (h < 6 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir') : (h < 6 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  }
}
function clearPendingNavigationFailure(tab = getActiveTab()) {
  if (!tab) return;
  if (tab.failureTimer) clearTimeout(tab.failureTimer);
  tab.failureTimer = null;
  tab.pendingFailure = null;
}
function clearBrowserError(tab = getActiveTab()) {
  if (tab) {
    tab.error = null;
    clearPendingNavigationFailure(tab);
  }
  $('error-page')?.classList.remove('show');
  $('error-page')?.setAttribute('aria-hidden', 'true');
  $('error-page')?.classList.remove('offline-mode');
  if ($('offline-run')) $('offline-run').hidden = true;
  window.AegisOfflineRun?.setVisible(false);
}
function scheduleBrowserError(tab, failure, delay = 1600) {
  if (!tab || tab.internalStart) return;
  clearPendingNavigationFailure(tab);
  tab.pendingFailure = failure;
  tab.failureTimer = setTimeout(() => {
    tab.failureTimer = null;
    const pending = tab.pendingFailure;
    tab.pendingFailure = null;
    if (!pending || tab.internalStart) return;
    let current = '';
    try { current = tab.webview?.getURL?.() || ''; } catch {}
    // A redirection or a second navigation may already have succeeded. In that case
    // the old provisional failure must never cover the real page with an error screen.
    const failedUrl = String(pending.url || '');
    const currentIsReal = /^https?:\/\//i.test(current) && current !== failedUrl;
    if (currentIsReal) return;
    try { if (tab.webview?.isLoading?.()) return; } catch {}
    tab.error = pending;
    tab.tabEl.querySelector('.title').textContent = 'Erreur de chargement';
    if (tab.id === activeTabId) {
      setLoadingState(false);
      showBrowserError(tab);
    }
  }, delay);
}
function showBrowserError(tab) {
  if (!tab || tab.id !== activeTabId || !tab.error) return;
  $('start-page')?.classList.remove('show');
  $('start-page')?.setAttribute('aria-hidden', 'true');
  const panel = $('error-page');
  panel?.classList.add('show');
  panel?.setAttribute('aria-hidden', 'false');
  $('error-page-text').textContent = tab.error.description || 'La page n’a pas pu être chargée.';
  $('error-page-url').textContent = tab.error.url || '';
  const networkFailure = Boolean(window.AegisOfflineRun?.isNetworkError(tab.error.code, navigator.onLine === false));
  if ($('offline-run')) $('offline-run').hidden = !networkFailure;
  panel?.classList.toggle('offline-mode', networkFailure);
  window.AegisOfflineRun?.setVisible(networkFailure, { privateMode: Boolean(tab.private) });
  document.body.classList.remove('start-visible');
}
function renderActiveSurface() {
  const tab = getActiveTab();
  const start = $('start-page');
  const error = $('error-page');
  if (!tab) {
    start?.classList.remove('show');
    error?.classList.remove('show');
    document.body.classList.remove('start-visible');
    return;
  }
  const showStart = Boolean(tab.internalStart);
  tab.webview.classList.toggle('active', !showStart && tab.id === activeTabId);
  start?.classList.toggle('show', showStart);
  start?.setAttribute('aria-hidden', showStart ? 'false' : 'true');
  error?.classList.remove('show');
  error?.setAttribute('aria-hidden', 'true');
  error?.classList.remove('offline-mode');
  if ($('offline-run')) $('offline-run').hidden = true;
  window.AegisOfflineRun?.setVisible(false);
  document.body.classList.toggle('start-visible', showStart);
  if (showStart) {
    setLoadingState(false);
    updateStartClock();
    renderStartDashboard();
    clearInterval(startClockTimer);
    startClockTimer = setInterval(updateStartClock, 30000);
    setTimeout(() => $('start-search-input')?.focus(), 50);
  } else {
    clearInterval(startClockTimer);
    startClockTimer = null;
    if (tab.error) showBrowserError(tab);
  }
}
function activateStartPage(tab = getActiveTab()) {
  if (!tab) return;
  tab.internalStart = true;
  tab.error = null;
  tab.webview.classList.remove('active');
  try {
    const current = tab.webview?.getURL?.() || '';
    if (current && current !== 'about:blank') tab.webview.loadURL('about:blank').catch(() => {});
  } catch {}
  tab.tabEl.querySelector('.title').textContent = tab.private ? 'Privé' : 'Nouvel onglet';
  tab.tabEl.querySelector('.favicon').style.background = '';
  if (tab.id === activeTabId) {
    $addressBar.value = '';
    if ($('start-search-input')) $('start-search-input').value = '';
    document.title = 'Aegis Start — Aegis Web 5.9.2-beta.2';
    renderActiveSurface();
    updateNavButtons();
    updateConnectionInfo();
    updateStarState();
  }
  persistSessionSoon();
}
function createTab(url, options = {}) {
  tabCounter += 1;
  const id = `tab-${tabCounter}`;
  const requestedURL = url || store.settings.homepage || DEFAULT_SETTINGS.homepage;
  const internalStart = isStartPageURL(requestedURL);
  const startURL = internalStart ? 'about:blank' : requestedURL;
  const isPrivate = Boolean(options.private);
  const isPinned = Boolean(options.pinned);
  const tabEl = document.createElement('div');
  tabEl.className = `tab${isPrivate ? ' private' : ''}${isPinned ? ' pinned' : ''}`;
  tabEl.draggable = true;
  tabEl.dataset.id = id;
  tabEl.innerHTML = `<div class="favicon"></div><div class="title">${isPrivate ? 'Privé' : 'Nouvel onglet'}</div><div class="tab-audio" title="Couper le son">♪</div><div class="close-tab" title="Fermer">×</div>`;
  tabEl.addEventListener('click', event => {
    if (event.target.classList.contains('close-tab')) closeTab(id);
    else if (event.target.classList.contains('tab-audio')) { event.stopPropagation(); toggleTabMute(tabs.find(tab => tab.id === id)); }
    else switchTab(id);
  });
  tabEl.addEventListener('auxclick', event => { if (event.button === 1) closeTab(id); });
  tabEl.addEventListener('dblclick', event => { if (!event.target.classList.contains('close-tab')) togglePinnedTab(tabs.find(tab => tab.id === id)); });
  tabEl.addEventListener('contextmenu', event => { event.preventDefault(); openTabContextMenu(id, event.clientX, event.clientY); });
  tabEl.addEventListener('dragstart', event => { draggedTabId = id; tabEl.classList.add('dragging'); event.dataTransfer.effectAllowed = 'move'; });
  tabEl.addEventListener('dragend', () => { draggedTabId = null; tabEl.classList.remove('dragging'); });
  tabEl.addEventListener('dragover', event => event.preventDefault());
  tabEl.addEventListener('drop', event => { event.preventDefault(); reorderTab(draggedTabId, id); });
  const webview = document.createElement('webview');
  webview.setAttribute('src', startURL);
  webview.setAttribute('partition', isPrivate ? 'aegis-private' : activeProfilePartition);
  webview.setAttribute('allowpopups', '');
  webview.dataset.id = id;
  const requestedGroupId = !isPrivate && !isPinned && tabGroups.some(group => group.id === options.groupId) ? options.groupId : null;
  const tabState = { id, tabEl, webview, private: isPrivate, pinned: isPinned, groupId: requestedGroupId, muted: false, internalStart, error: null, pendingFailure: null, failureTimer: null, lastCommittedUrl: internalStart ? INTERNAL_START_PAGE : startURL };
  tabs.push(tabState);
  syncTabDomOrder();
  $webviews.appendChild(webview);
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
  webview.addEventListener('page-title-updated', event => {
    if (tabState.internalStart) return;
    tabEl.querySelector('.title').textContent = event.title || (isPrivate ? 'Privé' : 'Nouvel onglet');
    persistSessionSoon();
    if (id === activeTabId) document.title = `${event.title || 'Nouvel onglet'} — Aegis Web`;
  });
  // HTML Fullscreen (YouTube, Vimeo, players, galleries, etc.)
  // The <webview> emits these events directly. Handling them here as well as
  // in the main process makes fullscreen reliable across sites and redirects.
  webview.addEventListener('enter-html-full-screen', () => {
    document.body.classList.add('html-fullscreen');
    closeFindBar(); closeAllPanels(); closeSitePopover(); closeAdblockPopover();
    let guestId = null;
    try { guestId = webview.getWebContentsId(); } catch {}
    window.api.setContentFullscreen?.(true, guestId).catch?.(() => {});
  });
  webview.addEventListener('leave-html-full-screen', () => {
    document.body.classList.remove('html-fullscreen');
    let guestId = null;
    try { guestId = webview.getWebContentsId(); } catch {}
    window.api.setContentFullscreen?.(false, guestId).catch?.(() => {});
  });

  webview.addEventListener('did-start-loading', () => {
    if (!tabState.internalStart) {
      tabState.error = null;
      clearPendingNavigationFailure(tabState);
    }
    if (id === activeTabId && !tabState.internalStart) {
      window.AegisOfflineRun?.setVisible(false);
      if ($('offline-run')) $('offline-run').hidden = true;
      $reloadBtn.textContent = '×';
      setLoadingState(true);
      $('error-page')?.classList.remove('show');
      $('error-page')?.setAttribute('aria-hidden', 'true');
    }
  });
  webview.addEventListener('did-stop-loading', () => {
    if (id === activeTabId) {
      $reloadBtn.textContent = '↻';
      setLoadingState(false);
    }
    updateNavButtons();
  });
  webview.addEventListener('did-navigate', event => {
    if (!tabState.internalStart && event.url) {
      tabState.lastCommittedUrl = event.url;
      tabState.error = null;
      clearPendingNavigationFailure(tabState);
      if (id === activeTabId) renderActiveSurface();
    }
    updateAddressIfActive(id, event.url);
    persistSessionSoon();
  });
  webview.addEventListener('did-navigate-in-page', event => {
    if (!tabState.internalStart && event.url) {
      tabState.lastCommittedUrl = event.url;
      tabState.error = null;
      clearPendingNavigationFailure(tabState);
      if (id === activeTabId) renderActiveSurface();
    }
    updateAddressIfActive(id, event.url);
    persistSessionSoon();
  });
  webview.addEventListener('did-finish-load', () => {
    if (tabState.internalStart) return;
    clearPendingNavigationFailure(tabState);
    tabState.error = null;
    if (id === activeTabId) renderActiveSurface();
    const current = webview.getURL();
    tabState.lastCommittedUrl = current || tabState.lastCommittedUrl;
    if (!isPrivate && /^https?:\/\//i.test(current)) addHistoryEntry(current, tabEl.querySelector('.title').textContent);
    if (id === activeTabId) refreshAdblockState().then(() => applyCosmeticAdblock(tabState));
    else applyCosmeticAdblock(tabState);
    updateNavButtons();
  });
  webview.addEventListener('dom-ready', () => {
    if (!tabState.internalStart) applyCosmeticAdblock(tabState);
  });
  webview.addEventListener('page-favicon-updated', event => {
    if (tabState.internalStart) return;
    if (event.favicons?.[0]) tabEl.querySelector('.favicon').style.background = `center / contain no-repeat url("${event.favicons[0].replace(/"/g, '%22')}")`;
  });
  webview.addEventListener('found-in-page', event => {
    const result = event.result;
    $('find-results').textContent = result.matches ? `${result.activeMatchOrdinal}/${result.matches}` : '0/0';
  });
  webview.addEventListener('ipc-message', event => {
    if (event.channel === 'aegis:credential-candidate' && !isPrivate) handleCredentialCandidate(event.args?.[0], webview, tabState);
    else if (event.channel === 'aegis:login-form-detected' && !isPrivate) handleLoginFormDetected(event.args?.[0], webview, tabState);
    else if (event.channel === 'aegis:fullscreen-change') {
      const active = Boolean(event.args?.[0]?.active);
      document.body.classList.toggle('html-fullscreen', active);
      if (active) { closeFindBar(); closeAllPanels(); closeSitePopover(); closeAdblockPopover(); hideCredentialPrompt(); }
      let guestId = null;
      try { guestId = webview.getWebContentsId(); } catch {}
      window.api.setContentFullscreen?.(active, guestId).catch?.(() => {});
    }
  });
  const audioEl = tabEl.querySelector('.tab-audio');
  webview.addEventListener('media-started-playing', () => audioEl?.classList.add('show'));
  webview.addEventListener('media-paused', () => { if (!webview.isAudioMuted()) audioEl?.classList.remove('show'); });
  webview.addEventListener('did-fail-load', event => {
    // Chromium emits provisional failures during normal redirects/cancellations.
    // Ignore those and delay real failures so a successful redirect can win.
    if (event.errorCode === -3 || event.isMainFrame === false || tabState.internalStart) return;
    scheduleBrowserError(tabState, {
      url: event.validatedURL || tabState.lastCommittedUrl || startURL,
      code: event.errorCode,
      description: event.errorDescription ? `${event.errorDescription} (${event.errorCode})` : `Erreur de chargement (${event.errorCode})`
    }, 1800);
  });
  persistSessionSoon();
  if (!options.background) {
    if (internalStart) {
      $addressBar.value = '';
      const startInput = $('start-search-input');
      if (startInput) startInput.value = '';
      hideAddressSuggestions();
    }
    switchTab(id);
  }
  return id;
}
function getActiveTab() { return tabs.find(tab => tab.id === activeTabId); }
function safeWebviewURL(tab) {
  if (!tab || tab.internalStart) return tab?.internalStart ? INTERNAL_START_PAGE : '';
  try { return tab.webview?.getURL?.() || tab.lastCommittedUrl || ''; }
  catch { return tab.lastCommittedUrl || ''; }
}
function safeCanGoBack(tab) {
  if (!tab || tab.internalStart) return false;
  try { return Boolean(tab.webview?.canGoBack?.()); } catch { return false; }
}
function safeCanGoForward(tab) {
  if (!tab || tab.internalStart) return false;
  try { return Boolean(tab.webview?.canGoForward?.()); } catch { return false; }
}
function switchTab(id) {
  const targetTab = tabs.find(tab => tab.id === id);
  const targetGroup = targetTab ? getTabGroup(targetTab.groupId) : null;
  if (targetGroup) targetGroup.collapsed = false;
  tabs.forEach(tab => {
    const active = tab.id === id;
    tab.tabEl.classList.toggle('active', active);
    tab.webview.classList.toggle('active', active && !tab.internalStart);
  });
  activeTabId = id;
  syncTabDomOrder();
  const tab = getActiveTab();
  if (!tab) return;
  $addressBar.value = tab.internalStart ? '' : displayAddress(safeWebviewURL(tab));
  document.title = `${tab.tabEl.querySelector('.title').textContent || 'Aegis Web'} — Aegis Web`;
  document.body.classList.toggle('private-mode', Boolean(tab.private));
  // Affiche d'abord la surface active. Ainsi Aegis Start ne peut jamais être
  // bloqué par une méthode Chromium appelée avant l'attachement du webview.
  renderActiveSurface();
  document.body.classList.add('aegis-ready');
  updateStarState();
  updateNavButtons();
  updateConnectionInfo();
  updateZoomLabel();
  hideAddressSuggestions();
  updateDockState();
  refreshAdblockState();
  persistSessionSoon();
}
function closeTab(id) {
  const index = tabs.findIndex(tab => tab.id === id);
  if (index < 0) return;
  const tab = tabs[index];
  const url = sessionURL(safeWebviewURL(tab), tab);
  if (url && !url.startsWith('about:')) {
    closedTabs.unshift({ url, title: tab.tabEl.querySelector('.title').textContent, private: Boolean(tab.private), groupId: tab.groupId || null });
    closedTabs = closedTabs.slice(0, 20);
  }
  tab.tabEl.remove();
  tab.webview.remove();
  tabs.splice(index, 1);
  syncTabDomOrder();
  updateDockState();
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
  if (tab.private && !tabs.some(item => item.private)) window.api.clearPrivateData();
  persistSessionSoon();
  if (!tabs.length) return void createTab();
  if (activeTabId === id) switchTab((tabs[index] || tabs[index - 1]).id);
}
function reopenClosedTab() {
  const closed = closedTabs.shift();
  if (closed) createTab(closed.url, { private: Boolean(closed.private), groupId: closed.groupId || null });
  else showToast('Aucun onglet fermé à rouvrir.');
}
function updateAddressIfActive(id, url) {
  if (id !== activeTabId) return;
  const tab = getActiveTab();
  $addressBar.value = tab?.internalStart ? '' : displayAddress(url);
  updateStarState();
  updateConnectionInfo();
}
function updateNavButtons() {
  const tab = getActiveTab();
  $backBtn.disabled = !safeCanGoBack(tab);
  $forwardBtn.disabled = !safeCanGoForward(tab);
}
function updateConnectionInfo() {
  const tab = getActiveTab();
  if (tab?.internalStart) {
    $siteInfo.classList.remove('secure');
    $siteInfo.textContent = '◇';
    $('site-popover-title').textContent = 'Aegis Start';
    $('site-popover-text').textContent = 'Page d’accueil locale intégrée à Aegis. Aucun site web n’est chargé tant que vous ne lancez pas une recherche.';
    return;
  }
  const url = safeWebviewURL(tab);
  const secure = /^https:\/\//i.test(url);
  $siteInfo.classList.toggle('secure', secure);
  $siteInfo.textContent = secure ? '◆' : '◇';
  $('site-popover-title').textContent = secure ? 'Connexion HTTPS' : 'Informations du site';
  if (!url || url === 'about:blank') $('site-popover-text').textContent = 'Aucune page chargée.';
  else if (secure) $('site-popover-text').textContent = 'La page utilise HTTPS. Cela chiffre la connexion, mais ne garantit pas que le site soit fiable.';
  else if (/^http:\/\//i.test(url)) $('site-popover-text').textContent = 'Cette page utilise HTTP sans chiffrement.';
  else $('site-popover-text').textContent = url;
}
function updateStarState() {
  const tab = getActiveTab();
  const url = tab ? sessionURL(safeWebviewURL(tab), tab) : '';
  const active = /^https?:\/\//i.test(url) && store.bookmarks.some(bookmark => bookmark.url === url);
  $starBtn.classList.toggle('active', active);
  $starBtn.textContent = active ? '★' : '☆';
}
async function addHistoryEntry(url, title) {
  store.history = await window.api.addHistory({ url, title });
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
}
function renderBookmarksBar() {
  $bookmarksBar.innerHTML = '';
  $bookmarksBar.classList.toggle('hidden', !store.settings.showBookmarksBar);
  if (!store.settings.showBookmarksBar) return;
  store.bookmarks.slice(0, 20).forEach(bookmark => {
    const chip = document.createElement('div');
    chip.className = 'bm-chip';
    chip.textContent = bookmark.title || bookmark.url;
    chip.title = bookmark.url;
    chip.addEventListener('click', () => navigateActive(bookmark.url));
    $bookmarksBar.appendChild(chip);
  });
}
function renderBookmarksPanel() {
  const container = $('bookmarks-list');
  container.innerHTML = '';
  const query = ($('bookmarks-filter')?.value || '').trim().toLowerCase();
  const items = store.bookmarks.filter(bookmark => !query || `${bookmark.title || ''} ${bookmark.url || ''}`.toLowerCase().includes(query));
  if (!items.length) return void (container.innerHTML = `<div class="empty-state">${store.bookmarks.length ? 'Aucun favori ne correspond à cette recherche.' : 'Aucun favori pour le moment.<br>Utilisez l’étoile dans la barre d’adresse pour en ajouter.'}</div>`);
  items.forEach(bookmark => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `<div class="dot"></div><div class="meta"><div class="t">${escapeHTML(bookmark.title || bookmark.url)}</div><div class="u">${escapeHTML(bookmark.url)}</div></div><div class="del">×</div>`;
    item.querySelector('.meta').addEventListener('click', () => { navigateActive(bookmark.url); closeAllPanels(); });
    item.querySelector('.del').addEventListener('click', async event => {
      event.stopPropagation();
      store.bookmarks = await window.api.removeBookmark(bookmark.url);
      renderBookmarksPanel(); renderBookmarksBar(); updateStarState();
    });
    container.appendChild(item);
  });
}
function renderHistoryPanel() {
  const container = $('history-list');
  container.innerHTML = '';
  const query = ($('history-filter')?.value || '').trim().toLowerCase();
  const items = store.history.filter(entry => !query || `${entry.title || ''} ${entry.url || ''}`.toLowerCase().includes(query)).slice(0, 300);
  if (!items.length) return void (container.innerHTML = `<div class="empty-state">${store.history.length ? 'Aucun résultat dans l’historique.' : 'L’historique est vide.'}</div>`);
  items.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'list-item';
    const date = new Date(entry.date);
    item.innerHTML = `<div class="dot"></div><div class="meta"><div class="t">${escapeHTML(entry.title || entry.url)}</div><div class="u">${escapeHTML(entry.url)} · ${date.toLocaleString(uiLocale())}</div></div>`;
    item.addEventListener('click', () => { navigateActive(entry.url); closeAllPanels(); });
    container.appendChild(item);
  });
}
function normalizeUiSearch(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();
}
function filterMenuPanel() {
  const term = normalizeUiSearch($('menu-filter')?.value);
  const root = $('panel-menu')?.querySelector('.menu-list');
  if (!root) return;
  const entries = [...root.children].filter(el => !el.classList.contains('version'));
  let hits = 0;
  for (const el of entries) {
    const action = el.classList.contains('menu-item') || el.classList.contains('zoom-row');
    const match = !term || (action && normalizeUiSearch(el.textContent).includes(term));
    el.classList.toggle('search-hidden', Boolean(term) && !match);
    if (term && action && match) hits++;
  }
  const empty = $('menu-filter-empty');
  empty?.classList.toggle('hidden', !term || hits !== 0);
}
function filterSettingsPanel() {
  const term = normalizeUiSearch($('settings-filter')?.value);
  const root = $('panel-settings')?.querySelector('.settings-body');
  if (!root) return;
  const children = [...root.children];
  const headers = [];
  let section = -1;
  const sections = new Map();
  for (const el of children) {
    if (el.classList.contains('settings-section-title')) { section++; headers.push(el); sections.set(section,[]); }
    else {
      const list=sections.get(section)||[];
      list.push(el);
      sections.set(section,list);
    }
  }
  let hits = 0;
  for (const [id, nodes] of sections) {
    const heading = headers[id];
    const headingMatch = Boolean(term && heading && normalizeUiSearch(heading.textContent).includes(term));
    let sectionHits = 0;
    for (const el of nodes) {
      // Search the visible label, descriptions, option labels, and control labels.
      const match = !term || headingMatch || normalizeUiSearch(el.textContent + ' ' + [...el.querySelectorAll('input,select,button')].map(n => n.placeholder||n.title||'').join(' ')).includes(term);
      // Keep save controls available even after filtering.
      const fixed = Boolean(el.querySelector('#save-settings-btn') || el.id === 'save-settings-btn');
      el.classList.toggle('search-hidden', Boolean(term) && !match && !fixed);
      if (term && match && !fixed) sectionHits++;
    }
    if (heading) heading.classList.toggle('search-hidden', Boolean(term) && !(headingMatch || sectionHits));
    hits+=sectionHits;
  }
  $('settings-filter-empty')?.classList.toggle('hidden', !term || hits !== 0);
}
function clearPanelSearch(name) {
  const id = name === 'menu' ? 'menu-filter' : 'settings-filter';
  const input=$(id);
  if (input) input.value='';
  if (name==='menu') filterMenuPanel(); else filterSettingsPanel();
}
function preparePanelSearch(name) {
  if (name !== 'menu' && name !== 'settings') return;
  clearPanelSearch(name);
  setTimeout(() => $(name === 'menu' ? 'menu-filter' : 'settings-filter')?.focus(),70);
}
function openPanel(name) {
  closeSitePopover();
  closeAdblockPopover();
  Object.values(panels).forEach(panel => panel.classList.remove('open'));
  panels[name]?.classList.add('open');
  $overlay.classList.add('show');
  preparePanelSearch(name);
}
function closeAllPanels() {
  closeAdblockPopover();
  Object.values(panels).forEach(panel => panel.classList.remove('open'));
  $overlay.classList.remove('show');
}
function openFindBar() {
  closeAllPanels();
  $('find-bar').classList.add('open');
  $('find-bar').setAttribute('aria-hidden', 'false');
  $('find-input').focus();
  $('find-input').select();
}
function closeFindBar() {
  const tab = getActiveTab();
  if (tab && findRequestId !== null) tab.webview.stopFindInPage('clearSelection');
  findRequestId = null;
  $('find-input').value = '';
  $('find-results').textContent = '0/0';
  $('find-bar').classList.remove('open');
  $('find-bar').setAttribute('aria-hidden', 'true');
}
function findInPage(forward = true, beginNewSession = false) {
  const text = $('find-input').value;
  const tab = getActiveTab();
  if (!tab || !text || tab.internalStart || tab.error) return;
  findRequestId = tab.webview.findInPage(text, { forward, findNext: beginNewSession });
}
async function changeZoom(delta) {
  const tab = getActiveTab();
  if (!tab) return;
  try {
    const current = await tab.webview.getZoomFactor();
    const next = Math.max(0.5, Math.min(2, Math.round((current + delta) * 10) / 10));
    tab.webview.setZoomFactor(next);
    updateZoomLabel(next);
  } catch {}
}
async function updateZoomLabel(value) {
  const tab = getActiveTab();
  if (!tab) return;
  try {
    const zoom = typeof value === 'number' ? value : await tab.webview.getZoomFactor();
    $('zoom-label').textContent = `${Math.round(zoom * 100)}%`;
  } catch { $('zoom-label').textContent = '100%'; }
}
function syncSettingsUI() {
  if ($('settings-language')) $('settings-language').value = store.settings.browserLanguage || 'en';
  if ($('settings-translation-target')) $('settings-translation-target').value = store.settings.translationTarget || 'fr';
  if ($('settings-translation-cloud-endpoint')) $('settings-translation-cloud-endpoint').value = store.settings.translationCloudEndpoint || '';
  if ($('settings-devtools-enabled')) $('settings-devtools-enabled').checked = store.settings.developerToolsEnabled !== false;
  if ($('settings-ai-processing')) $('settings-ai-processing').value = store.settings.aiProcessing || 'cloud-preferred';
  if ($('settings-ai-cloud-endpoint')) $('settings-ai-cloud-endpoint').value = store.settings.aiCloudEndpoint || '';
  $('settings-homepage').value = store.settings.homepage || DEFAULT_SETTINGS.homepage;
  $('settings-search').value = store.settings.searchEngine || 'google';
  if ($('settings-theme-preset')) $('settings-theme-preset').value = store.settings.themePreset || (store.settings.theme === 'light' ? 'total-white' : 'total-black');
  if ($('settings-background-style')) $('settings-background-style').value = store.settings.backgroundStyle || 'none';
  if ($('settings-density')) $('settings-density').value = store.settings.interfaceDensity || 'comfortable';
  $('settings-theme').value = store.settings.theme || 'dark';
  if ($('settings-adult-filter')) $('settings-adult-filter').checked = store.settings.adultFilterEnabled === true;
  $('settings-wallpaper').value = store.settings.startWallpaper || 'aurora';
  $('settings-bookmarks-bar').checked = store.settings.showBookmarksBar !== false;
  $('settings-restore-session').checked = store.settings.restoreSession === true;
  $('settings-start-clock').checked = store.settings.startShowClock !== false;
  $('settings-start-recents').checked = store.settings.startShowRecents !== false;
  $('settings-compact-tabs').checked = store.settings.compactTabs === true;
  $('settings-accent').value = store.settings.accentTheme || 'teal';
  $('settings-dock').checked = store.settings.dockEnabled !== false;
  $('settings-start-actions').checked = store.settings.startShowActions !== false;
  $('settings-animations').checked = store.settings.animations !== false;
  $('settings-adblock').checked = store.settings.adblockEnabled !== false;
  $('settings-adblock-cosmetic').checked = store.settings.adblockCosmetic !== false;
  $('settings-adblock-community').checked = store.settings.adblockCommunityFilters !== false;
  $('privacy-trackers').checked = store.settings.blockTrackers !== false;
  $('privacy-dnt').checked = store.settings.doNotTrack !== false;
  $('privacy-location').checked = store.settings.blockLocationPrompts !== false;
  if ($('privacy-webrtc-ip')) $('privacy-webrtc-ip').checked = store.settings.webrtcIpProtection !== false;
  if ($('settings-github-repository')) $('settings-github-repository').value = store.settings.githubRepository || '';
  if ($('settings-update-feed')) $('settings-update-feed').value = store.settings.updateFeedUrl || '';
  if ($('settings-auto-updates')) $('settings-auto-updates').checked = store.settings.autoCheckUpdates !== false;
  $('settings-vt-key').value = store.settings.virusTotalApiKey || '';
}
function applyTheme() {
  const lightPresets = new Set(['total-white','ivory','frost']);
  // Upgrade old onboarding profiles: theme was 'light' while preset remained 'total-black'.
  let preset = store.settings.themePreset || (store.settings.theme === 'light' ? 'total-white' : 'total-black');
  if (store.settings.theme === 'light' && !lightPresets.has(preset)) preset = 'total-white';
  const isLight = lightPresets.has(preset);
  store.settings.theme = isLight ? 'light' : 'dark';
  store.settings.themePreset = preset;
  document.body.classList.toggle('light', isLight);
  document.body.dataset.themePreset = preset;
  document.documentElement.style.colorScheme = isLight ? 'light' : 'dark';
  applyLayoutSettings();
}
function updateBlockedCount(count) {
  blockedCount = Number(count || 0);
  $('blocked-count').textContent = blockedCount > 999 ? '999+' : String(blockedCount);
  $('privacy-count-large').textContent = blockedCount.toLocaleString(uiLocale());
  if ($('start-blocked')) $('start-blocked').textContent = blockedCount > 999 ? '999+' : String(blockedCount);
}
function currentPageHost() {
  const tab = getActiveTab();
  if (!tab || tab.internalStart || tab.error) return '';
  try { return new URL(safeWebviewURL(tab)).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
}
function closeAdblockPopover() {
  const popover = $('adblock-popover');
  if (!popover) return;
  popover.classList.remove('open');
  popover.setAttribute('aria-hidden', 'true');
}
function positionAdblockPopover() {
  const button = $('adblock-btn');
  const popover = $('adblock-popover');
  if (!button || !popover) return;
  const rect = button.getBoundingClientRect();
  const width = 330;
  const left = Math.max(10, Math.min(window.innerWidth - width - 10, rect.right - width));
  popover.style.left = `${left}px`;
  popover.style.top = `${Math.min(window.innerHeight - 20, rect.bottom + 9)}px`;
}
async function toggleAdblockPopover(force) {
  const popover = $('adblock-popover');
  if (!popover) return;
  const open = typeof force === 'boolean' ? force : !popover.classList.contains('open');
  closeSitePopover();
  if (!open) return closeAdblockPopover();
  await refreshAdblockState();
  positionAdblockPopover();
  popover.classList.add('open');
  popover.setAttribute('aria-hidden', 'false');
}
function updateAdblockUI(state = adblockState) {
  adblockState = { ...adblockState, ...(state || {}) };
  const button = $('adblock-btn');
  const enabled = adblockState.enabled !== false;
  const host = currentPageHost();
  const allowlisted = Boolean(host && adblockState.allowlisted);
  button?.classList.toggle('active', enabled);
  button?.classList.toggle('paused', !enabled || allowlisted);
  if (button) button.title = activeUiLanguage === 'fr' ? (enabled ? (allowlisted ? `Aegis AdBlock en pause sur ${host} — ouvrir le menu` : 'Aegis AdBlock actif — ouvrir le menu') : 'Aegis AdBlock désactivé — ouvrir le menu') : (enabled ? (allowlisted ? `Aegis AdBlock paused on ${host} — open menu` : 'Aegis AdBlock active — open menu') : 'Aegis AdBlock disabled — open menu');
  const badge = $('adblock-badge');
  if (badge) badge.textContent = Number(adblockState.total || 0) > 999 ? '999+' : String(adblockState.total || 0);
  if ($('adblock-popover-enabled')) $('adblock-popover-enabled').checked = enabled;
  if ($('adblock-popover-status')) $('adblock-popover-status').textContent = activeUiLanguage === 'fr' ? (enabled ? (allowlisted ? 'En pause sur ce site' : 'Protection active') : 'Protection désactivée') : (enabled ? (allowlisted ? 'Paused on this site' : 'Protection active') : 'Protection disabled');
  if ($('adblock-popover-site-count')) $('adblock-popover-site-count').textContent = Number(adblockState.siteCount || 0).toLocaleString(uiLocale());
  if ($('adblock-popover-total')) $('adblock-popover-total').textContent = Number(adblockState.total || 0).toLocaleString(uiLocale());
  if ($('adblock-popover-host')) $('adblock-popover-host').textContent = host || (activeUiLanguage === 'fr' ? 'Aucun site' : 'No site');
  const quickSiteToggle = $('adblock-popover-site-toggle');
  if (quickSiteToggle) {
    quickSiteToggle.disabled = !host || !enabled;
    quickSiteToggle.textContent = activeUiLanguage === 'fr' ? (allowlisted ? 'Réactiver' : 'Autoriser') : (allowlisted ? 'Re-enable' : 'Allow');
  }
  const dock = $('dock-adblock-count');
  if (dock) dock.textContent = Number(adblockState.total || 0) > 99 ? '99+' : String(adblockState.total || 0);
  if ($('adblock-enabled')) $('adblock-enabled').checked = enabled;
  if ($('adblock-cosmetic')) $('adblock-cosmetic').checked = adblockState.cosmetic !== false;
  if ($('adblock-community')) $('adblock-community').checked = adblockState.communityFilters !== false;
  if ($('adblock-total-large')) $('adblock-total-large').textContent = Number(adblockState.total || 0).toLocaleString(uiLocale());
  if ($('adblock-status-kicker')) $('adblock-status-kicker').textContent = activeUiLanguage === 'fr' ? (enabled ? (allowlisted ? 'En pause sur ce site' : 'Protection active') : 'Protection désactivée') : (enabled ? (allowlisted ? 'Paused on this site' : 'Protection active') : 'Protection disabled');
  if ($('adblock-site-name')) $('adblock-site-name').textContent = host || (activeUiLanguage === 'fr' ? 'Aucun site ouvert' : 'No site open');
  if ($('adblock-site-stats')) { const n=Number(adblockState.siteCount||0); $('adblock-site-stats').textContent = activeUiLanguage === 'fr' ? `${n.toLocaleString(uiLocale())} élément${n>1?'s':''} bloqué${n>1?'s':''} sur ce site` : `${n.toLocaleString(uiLocale())} item${n===1?'':'s'} blocked on this site`; }
  const siteToggle = $('adblock-site-toggle');
  if (siteToggle) {
    siteToggle.disabled = !host;
    siteToggle.textContent = activeUiLanguage === 'fr' ? (allowlisted ? 'Réactiver sur ce site' : 'Autoriser sur ce site') : (allowlisted ? 'Re-enable on this site' : 'Allow on this site');
  }
  if ($('adblock-exception-count')) {
    const count = Array.isArray(store.settings.adblockAllowlist) ? store.settings.adblockAllowlist.length : 0;
    $('adblock-exception-count').textContent = `${count} ${activeUiLanguage === 'fr' ? `site${count>1?'s':''}` : `site${count===1?'':'s'}`}`;
  }
  if ($('settings-adblock')) $('settings-adblock').checked = enabled;
  if ($('settings-adblock-cosmetic')) $('settings-adblock-cosmetic').checked = adblockState.cosmetic !== false;
  if ($('settings-adblock-community')) $('settings-adblock-community').checked = adblockState.communityFilters !== false;
  const listStatus = $('adblock-list-status');
  if (listStatus) {
    if (adblockState.listError && !adblockState.communityRules) listStatus.textContent = `Mise à jour indisponible · ${adblockState.listError}`;
    else if (adblockState.communityRules) {
      const when = adblockState.listUpdatedAt ? new Date(adblockState.listUpdatedAt).toLocaleDateString(uiLocale()) : (activeUiLanguage === 'fr' ? 'cache local' : 'local cache');
      listStatus.textContent = activeUiLanguage === 'fr' ? `${Number(adblockState.communityRules).toLocaleString(uiLocale())} domaines · ${when}${adblockState.listError ? ' · mise à jour différée' : ''}` : `${Number(adblockState.communityRules).toLocaleString(uiLocale())} domains · ${when}${adblockState.listError ? ' · update deferred' : ''}`;
    } else listStatus.textContent = activeUiLanguage === 'fr' ? (adblockState.communityFilters === false ? 'Filtres communautaires désactivés' : 'Liste locale Aegis active') : (adblockState.communityFilters === false ? 'Community filters disabled' : 'Aegis local list active');
  }
}
async function refreshAdblockState() {
  try {
    const state = await window.api.getAdblockState(currentPageHost());
    if (state) updateAdblockUI(state);
    return state;
  } catch { return adblockState; }
}
function reloadActiveForAdblock() {
  const tab = getActiveTab();
  if (tab && !tab.internalStart && !tab.error) {
    try { tab.webview.reload(); } catch {}
  }
}
async function toggleAdblockGlobal(force) {
  const next = typeof force === 'boolean' ? force : !(adblockState.enabled !== false);
  try {
    const state = await window.api.setAdblockEnabled(next);
    store.settings.adblockEnabled = next;
    updateAdblockUI({ ...state, enabled: next, allowlisted: false });
    showToast(next ? 'Aegis AdBlock activé.' : 'Aegis AdBlock désactivé.');
    reloadActiveForAdblock();
  } catch { showToast('Impossible de modifier Aegis AdBlock.'); }
}
async function toggleAdblockCurrentSite() {
  const host = currentPageHost();
  if (!host) return showToast('Ouvrez un site pour créer une exception.');
  try {
    const state = await window.api.toggleAdblockSite(host);
    store.settings.adblockAllowlist = Array.isArray(store.settings.adblockAllowlist) ? [...store.settings.adblockAllowlist] : [];
    const normalized = host.replace(/^www\./, '');
    const i = store.settings.adblockAllowlist.indexOf(normalized);
    if (state.allowlisted && i < 0) store.settings.adblockAllowlist.push(normalized);
    if (!state.allowlisted && i >= 0) store.settings.adblockAllowlist.splice(i, 1);
    updateAdblockUI(state);
    showToast(state.allowlisted ? `AdBlock autorisé sur ${host}.` : `AdBlock réactivé sur ${host}.`);
    reloadActiveForAdblock();
  } catch { showToast('Impossible de modifier l’exception de ce site.'); }
}
async function setAdblockCommunityFilters(enabled) {
  try {
    const state = await window.api.setAdblockCommunityFilters(Boolean(enabled));
    store.settings.adblockCommunityFilters = Boolean(enabled);
    updateAdblockUI({ ...adblockState, ...state, communityFilters: Boolean(enabled) });
    showToast(enabled ? 'Filtres EasyList activés.' : 'Filtres EasyList désactivés.');
    reloadActiveForAdblock();
  } catch { showToast('Impossible de modifier les filtres communautaires.'); }
}
async function refreshAdblockLists() {
  const btn = $('adblock-refresh-lists');
  if (btn) { btn.disabled = true; btn.textContent = 'Mise à jour…'; }
  try {
    const state = await window.api.refreshAdblockLists();
    updateAdblockUI({ ...adblockState, ...state });
    showToast(state?.communityRules ? 'Filtres AdBlock mis à jour.' : 'Aucune mise à jour disponible.');
  } catch { showToast('Mise à jour des filtres impossible.'); }
  if (btn) { btn.disabled = false; btn.textContent = 'Mettre à jour'; }
}
async function setAdblockCosmetic(enabled) {
  try {
    await window.api.setAdblockCosmetic(Boolean(enabled));
    store.settings.adblockCosmetic = Boolean(enabled);
    adblockState.cosmetic = Boolean(enabled);
    updateAdblockUI(adblockState);
    if (enabled) applyCosmeticAdblock(getActiveTab()); else reloadActiveForAdblock();
  } catch { showToast('Impossible de modifier le masquage cosmétique.'); }
}
function applyCosmeticAdblock(tab = getActiveTab()) {
  if (!tab || tab.internalStart || tab.error) return;
  const host = (() => { try { return new URL(safeWebviewURL(tab)).hostname.toLowerCase().replace(/^www\./,''); } catch { return ''; } })();
  const allow = Array.isArray(store.settings.adblockAllowlist) && store.settings.adblockAllowlist.some(domain => host === domain || host.endsWith(`.${domain}`));
  const enabled = store.settings.adblockEnabled !== false;
  const cosmetic = store.settings.adblockCosmetic !== false;
  try { tab.webview.send('aegis:adblock-config', { enabled, cosmetic, allowlisted: allow }); } catch {}
  if (!host || allow || !enabled || !cosmetic) return;
  const css = `
    ins.adsbygoogle,[data-ad-client],[data-ad-slot],[data-ad-unit],[data-ad-format],[data-ad-container],
    [id^="google_ads_"],iframe[src*="doubleclick.net"],iframe[src*="googlesyndication.com"],
    [aria-label="Advertisement"],[aria-label="Publicité"],[data-testid*="ad-slot"],
    .advertisement,.advertisement-container,.advertisement-wrapper,.ad-slot,.ads-slot,.ad-container,.ads-container,
    [class^="ad-container"],[class*=" ad-container"],[class*=" advertisement"],[id^="ad_container"],[id^="ad-slot"] {
      display:none!important; visibility:hidden!important; height:0!important; min-height:0!important; max-height:0!important;
      margin:0!important; padding:0!important; border:0!important; overflow:hidden!important;
    }
    [data-aegis-ad-collapsed="1"] { display:none!important; height:0!important; min-height:0!important; margin:0!important; padding:0!important; border:0!important; }
  `;
  try { tab.webview.insertCSS(css).catch?.(() => {}); } catch {}
}
function closeSitePopover() {
  $('site-popover').classList.remove('open');
  $('site-popover').setAttribute('aria-hidden', 'true');
}
let virusTotalReportUrl = '';
function setVirusTotalPanelState(state, title, text) {
  const card = $('vt-status-card');
  card.className = `security-card ${state}`;
  $('vt-status-title').textContent = title;
  $('vt-status-text').textContent = text;
}
function showVirusTotalStats(stats) {
  const container = $('vt-stats');
  if (!stats) {
    container.classList.add('hidden');
    return;
  }
  $('vt-malicious').textContent = String(stats.malicious || 0);
  $('vt-suspicious').textContent = String(stats.suspicious || 0);
  $('vt-harmless').textContent = String(stats.harmless || 0);
  $('vt-undetected').textContent = String(stats.undetected || 0);
  container.classList.remove('hidden');
}
async function checkCurrentUrlWithVirusTotal() {
  const tab = getActiveTab();
  const url = safeWebviewURL(tab);
  if (!/^https?:\/\//i.test(url)) return showToast('Ouvrez d’abord un lien HTTP/HTTPS à analyser.');
  openPanel('security');
  $('vt-url').textContent = url;
  $('vt-open-report').disabled = true;
  virusTotalReportUrl = '';
  showVirusTotalStats(null);
  setVirusTotalPanelState('scanning', 'Analyse en cours…', store.settings.virusTotalApiKey ? 'Aegis interroge VirusTotal.' : 'Préparation du rapport VirusTotal.');
  const result = await window.api.checkVirusTotal(url);
  if (!result?.ok) {
    virusTotalReportUrl = result?.reportUrl || '';
    $('vt-open-report').disabled = !virusTotalReportUrl;
    setVirusTotalPanelState('bad', 'Analyse impossible', result?.error || 'Erreur inconnue.');
    return;
  }
  virusTotalReportUrl = result.reportUrl || '';
  $('vt-open-report').disabled = !virusTotalReportUrl;
  if (result.mode === 'report') {
    setVirusTotalPanelState('idle', 'Rapport VirusTotal disponible', 'Aucune clé API n’est configurée : ouvrez le rapport public, ou ajoutez une clé dans Paramètres pour une analyse automatique.');
    return;
  }
  if (result.mode === 'pending') {
    setVirusTotalPanelState('warn', 'Analyse toujours en cours', 'VirusTotal n’a pas terminé dans le délai d’attente. Le rapport peut être ouvert pour suivre le résultat.');
    showVirusTotalStats(result.stats);
    return;
  }
  const malicious = Number(result.stats?.malicious || 0);
  const suspicious = Number(result.stats?.suspicious || 0);
  showVirusTotalStats(result.stats);
  if (malicious > 0) {
    setVirusTotalPanelState('bad', 'Détections malveillantes', `${malicious} moteur(s) classent ce lien comme malveillant.`);
  } else if (suspicious > 0) {
    setVirusTotalPanelState('warn', 'Lien signalé comme suspect', `${suspicious} moteur(s) ont signalé ce lien comme suspect.`);
  } else {
    setVirusTotalPanelState('good', 'Aucune détection malveillante', 'VirusTotal ne signale aucune détection malveillante dans cette analyse. Cela ne garantit pas qu’un site soit sûr à 100 %.');
  }
}
async function createDesktopShortcutForCurrentPage() {
  const tab = getActiveTab();
  const url = tab?.internalStart ? '' : safeWebviewURL(tab);
  if (!/^https?:\/\//i.test(url)) return showToast('Cette page ne peut pas être ajoutée au Bureau.');
  const title = tab.tabEl.querySelector('.title')?.textContent || 'Lien Aegis';
  const result = await window.api.createDesktopLink({ url, title });
  if (result?.ok) showToast(`Raccourci créé sur le Bureau : ${result.name}`);
  else showToast(result?.error || 'Impossible de créer le raccourci.');
}
function currentPageOrigin() {
  const tab = getActiveTab();
  const url = tab?.internalStart ? '' : safeWebviewURL(tab);
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.origin : '';
  } catch { return ''; }
}
async function getVaultStatus() {
  try { return await window.api.passwordStatus(); }
  catch { return { ok:false, exists:false, unlocked:false, error:'Aegis Vault indisponible.' }; }
}
function closeVaultGate() {
  const gate = $('vault-gate');
  if (gate) { gate.classList.remove('open'); gate.setAttribute('aria-hidden','true'); }
  if ($('vault-master-password')) $('vault-master-password').value = '';
  if ($('vault-master-confirm')) $('vault-master-confirm').value = '';
  if ($('vault-gate-error')) $('vault-gate-error').textContent = '';
  vaultGateState = { mode:null, afterUnlock:null };
}
async function openVaultGate(afterUnlock = null) {
  const status = await getVaultStatus();
  if (status?.unlocked) { if (typeof afterUnlock === 'function') await afterUnlock(); return true; }
  const creating = !status?.exists;
  vaultGateState = { mode: creating ? 'create' : 'unlock', afterUnlock };
  $('vault-gate-title').textContent = creating ? 'Créer Aegis Vault' : 'Déverrouiller Aegis Vault';
  $('vault-gate-copy').textContent = creating
    ? 'Choisissez un mot de passe maître. Il chiffre votre coffre localement et n’est jamais envoyé ailleurs.'
    : 'Entrez votre mot de passe maître pour accéder aux identifiants enregistrés pendant cette session.';
  $('vault-gate-submit').textContent = creating ? 'Créer le coffre' : 'Déverrouiller';
  $('vault-confirm-row').classList.toggle('hidden', !creating);
  $('vault-master-password').setAttribute('autocomplete', creating ? 'new-password' : 'current-password');
  $('vault-gate-error').textContent = '';
  $('vault-gate').classList.add('open');
  $('vault-gate').setAttribute('aria-hidden','false');
  setTimeout(() => $('vault-master-password')?.focus(), 40);
  return false;
}
async function submitVaultGate() {
  const mode = vaultGateState.mode;
  if (!mode) return;
  const password = $('vault-master-password').value;
  const confirm = $('vault-master-confirm').value;
  if (password.length < 8) { $('vault-gate-error').textContent = 'Utilisez au moins 8 caractères.'; return; }
  if (mode === 'create' && password !== confirm) { $('vault-gate-error').textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
  const button = $('vault-gate-submit');
  button.disabled = true;
  $('vault-gate-error').textContent = '';
  let result;
  try { result = mode === 'create' ? await window.api.passwordCreateVault(password) : await window.api.passwordUnlockVault(password); }
  catch { result = { ok:false, error:'Opération impossible.' }; }
  button.disabled = false;
  if (!result?.ok) { $('vault-gate-error').textContent = result?.error || 'Impossible d’ouvrir le coffre.'; return; }
  const after = vaultGateState.afterUnlock;
  closeVaultGate();
  showToast(mode === 'create' ? 'Aegis Vault créé et déverrouillé.' : 'Aegis Vault déverrouillé.');
  await refreshPasswordManager().catch(() => {});
  if (typeof after === 'function') await after();
}
async function handleCredentialCandidate(candidate, webview, tabState = null) {
  if (!candidate || typeof candidate.password !== 'string' || !candidate.password) return;
  let origin = '';
  try {
    const parsed = new URL(String(candidate.origin || ''));
    if (!['http:', 'https:'].includes(parsed.protocol)) return;
    origin = parsed.origin;
    const pageOrigin = new URL(webview.getURL()).origin;
    if (pageOrigin !== origin) return;
  } catch { return; }
  const username = String(candidate.username || '').slice(0, 320);
  const password = String(candidate.password).slice(0, 4096);
  const key = `${origin}\n${username}\n${password}`;
  const now = Date.now();
  if (key === lastCredentialCandidateKey && now - lastCredentialCandidateTime < 3500) return;
  lastCredentialCandidateKey = key;
  lastCredentialCandidateTime = now;
  pendingCredential = { origin, username, password, label: String(candidate.label || '').slice(0, 160) };
  renderPendingCredential();
  let existing = null;
  try {
    const result = await window.api.passwordList();
    if (result?.ok) {
      passwordEntries = Array.isArray(result.entries) ? result.entries : [];
      existing = passwordEntries.find(entry => entry.origin === origin && (entry.username || '') === username) || null;
    }
  } catch {}
  if (tabState && tabState.id !== activeTabId) return;
  showCredentialPrompt({
    mode: 'save',
    title: existing ? 'Mettre à jour le mot de passe ?' : 'Enregistrer ce mot de passe ?',
    text: `${username || 'Connexion'} · ${credentialSiteLabel(origin)}`,
    acceptLabel: existing ? 'Mettre à jour' : 'Enregistrer',
    onAccept: async () => { await savePendingCredential(); hideCredentialPrompt(); }
  });
}
function credentialSiteLabel(origin) {
  try { return new URL(origin).hostname.replace(/^www\./, ''); } catch { return origin || 'ce site'; }
}
function hideCredentialPrompt() {
  credentialPromptState = null;
  const prompt = $('credential-prompt');
  if (!prompt) return;
  prompt.classList.remove('show');
  prompt.setAttribute('aria-hidden', 'true');
}
function showCredentialPrompt({ mode = 'fill', title, text, acceptLabel = 'Oui', onAccept } = {}) {
  const prompt = $('credential-prompt');
  if (!prompt) return;
  credentialPromptState = { mode, onAccept };
  $('credential-prompt-kicker').textContent = mode === 'save' ? 'Aegis Vault · Connexion détectée' : 'Aegis Vault · Identifiants disponibles';
  $('credential-prompt-title').textContent = title || 'Mot de passe';
  $('credential-prompt-text').textContent = text || '';
  $('credential-prompt-accept').textContent = acceptLabel;
  prompt.classList.add('show');
  prompt.setAttribute('aria-hidden', 'false');
}
async function handleLoginFormDetected(payload, webview, tabState) {
  if (!payload || !tabState || tabState.private || tabState.id !== activeTabId) return;
  let origin = '';
  try {
    origin = new URL(String(payload.origin || '')).origin;
    if (new URL(webview.getURL()).origin !== origin) return;
  } catch { return; }
  const now = Date.now();
  const seen = credentialPromptSeen.get(tabState.id) || {};
  if (seen.origin === origin && now - Number(seen.time || 0) < 20000) return;
  let result;
  try { result = await window.api.passwordList(); } catch { return; }
  if (!result?.ok) {
    if (result?.needsUnlock) {
      showCredentialPrompt({
        mode:'fill',
        title:'Déverrouiller Aegis Vault ?',
        text:`Des identifiants peuvent être enregistrés pour ${credentialSiteLabel(origin)}.`,
        acceptLabel:'Déverrouiller',
        onAccept: async () => { hideCredentialPrompt(); await openVaultGate(async () => { credentialPromptSeen.delete(tabState.id); await handleLoginFormDetected(payload, webview, tabState); }); }
      });
    }
    return;
  }
  if (!Array.isArray(result.entries)) return;
  passwordEntries = result.entries;
  const requestedUser = String(payload.username || '');
  const matches = passwordEntries.filter(entry => entry.origin === origin);
  if (!matches.length) return;
  const entry = matches.find(item => requestedUser && item.username === requestedUser) || matches[0];
  credentialPromptSeen.set(tabState.id, { origin, time: now, id: entry.id });
  showCredentialPrompt({
    mode: 'fill',
    title: 'Remplir les identifiants enregistrés ?',
    text: `${entry.username || 'Identifiant enregistré'} · ${credentialSiteLabel(origin)}`,
    acceptLabel: 'Remplir',
    onAccept: async () => { await fillCredential(entry.id); hideCredentialPrompt(); }
  });
}
function renderPendingCredential() {
  const card = $('password-pending-card');
  if (!card) return;
  if (!pendingCredential) {
    card.classList.remove('show');
    $('password-pending-origin').textContent = '';
    $('password-pending-user').textContent = '';
    return;
  }
  card.classList.add('show');
  $('password-pending-origin').textContent = pendingCredential.origin;
  $('password-pending-user').textContent = pendingCredential.username || 'Aucun identifiant détecté';
}
function setPasswordManagerAvailability(status = {}) {
  const card = $('password-storage-card');
  const title = $('password-storage-title');
  const text = $('password-storage-text');
  const action = $('password-vault-action');
  const exists = Boolean(status.exists);
  const unlocked = Boolean(status.unlocked);
  card.classList.toggle('password-storage-unavailable', !unlocked);
  card.classList.toggle('good', unlocked);
  if (!exists) {
    title.textContent = 'Aegis Vault non créé';
    text.textContent = 'Créez un coffre local chiffré avec votre propre mot de passe maître.';
    action.textContent = 'Créer'; action.disabled = false;
  } else if (!unlocked) {
    title.textContent = 'Aegis Vault verrouillé';
    text.textContent = 'Le coffre est chiffré localement et indépendant de Windows.';
    action.textContent = 'Déverrouiller'; action.disabled = false;
  } else {
    title.textContent = 'Aegis Vault déverrouillé';
    text.textContent = `${Number(status.count || passwordEntries.length || 0)} identifiant(s) · chiffrement AES-256-GCM local.`;
    action.textContent = 'Verrouiller'; action.disabled = false;
  }
  ['password-site','password-username','password-value','password-generate','password-manual-save','password-pending-save'].forEach(id => {
    const el=$(id); if(el) el.disabled=!unlocked;
  });
}
async function refreshPasswordManager() {
  const status = await getVaultStatus();
  let result = { entries:[] };
  if (status?.unlocked) {
    try { result = await window.api.passwordList(); } catch {}
  }
  passwordEntries = Array.isArray(result?.entries) ? result.entries : [];
  setPasswordManagerAvailability({ ...status, count: passwordEntries.length });
  const origin = currentPageOrigin();
  if (origin && !$('password-site').value.trim()) $('password-site').value = origin;
  renderPendingCredential();
  renderPasswordEntries();
}
function renderPasswordEntries() {
  const container = $('passwords-list');
  if (!container) return;
  container.innerHTML = '';
  const query = ($('password-search').value || '').trim().toLowerCase();
  const currentOrigin = currentPageOrigin();
  const filtered = passwordEntries.filter(entry => {
    if (!query) return true;
    return `${entry.origin || ''} ${entry.username || ''} ${entry.label || ''}`.toLowerCase().includes(query);
  });
  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state">${passwordEntries.length ? 'Aucun résultat.' : 'Aucun mot de passe enregistré.'}</div>`;
    return;
  }
  filtered.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'password-entry';
    const main = document.createElement('div');
    main.className = 'password-entry-main';
    const icon = document.createElement('div');
    icon.className = 'password-entry-icon';
    icon.textContent = 'K';
    const meta = document.createElement('div');
    meta.className = 'password-entry-meta';
    const origin = document.createElement('div');
    origin.className = 'password-entry-origin';
    origin.textContent = entry.label || entry.origin;
    origin.title = entry.origin;
    const user = document.createElement('div');
    user.className = 'password-entry-user';
    user.textContent = entry.username || 'Sans identifiant';
    meta.append(origin, user);
    main.append(icon, meta);
    const secret = document.createElement('div');
    secret.className = 'password-secret';
    secret.textContent = '••••••••••••';
    const actions = document.createElement('div');
    actions.className = 'password-entry-actions';
    const fill = document.createElement('button');
    fill.className = 'primary-btn';
    fill.textContent = 'Remplir';
    fill.disabled = !currentOrigin || currentOrigin !== entry.origin;
    fill.title = fill.disabled ? 'Ouvrez le domaine exact correspondant pour remplir ce mot de passe.' : 'Remplir la connexion sur la page actuelle';
    fill.addEventListener('click', () => fillCredential(entry.id));
    const copy = document.createElement('button');
    copy.className = 'secondary-btn';
    copy.textContent = 'Copier';
    copy.addEventListener('click', async () => {
      const result = await window.api.passwordCopy(entry.id);
      showToast(result?.ok ? 'Mot de passe copié.' : (result?.error || 'Copie impossible.'));
    });
    const reveal = document.createElement('button');
    reveal.className = 'secondary-btn';
    reveal.textContent = 'Afficher';
    reveal.addEventListener('click', async () => {
      if (reveal.dataset.revealed === '1') {
        reveal.dataset.revealed = '0';
        reveal.textContent = 'Afficher';
        secret.textContent = '••••••••••••';
        return;
      }
      const result = await window.api.passwordReveal(entry.id);
      if (!result?.ok) return showToast(result?.error || 'Impossible d’afficher le mot de passe.');
      reveal.dataset.revealed = '1';
      reveal.textContent = 'Masquer';
      secret.textContent = result.password;
      setTimeout(() => {
        if (reveal.isConnected) {
          reveal.dataset.revealed = '0';
          reveal.textContent = 'Afficher';
          secret.textContent = '••••••••••••';
        }
      }, 20000);
    });
    const remove = document.createElement('button');
    remove.className = 'secondary-btn password-delete';
    remove.textContent = 'Supprimer';
    remove.addEventListener('click', async () => {
      if (remove.dataset.confirm !== '1') {
        remove.dataset.confirm = '1';
        remove.textContent = 'Confirmer';
        setTimeout(() => {
          if (remove.isConnected && remove.dataset.confirm === '1') {
            remove.dataset.confirm = '0';
            remove.textContent = 'Supprimer';
          }
        }, 3500);
        return;
      }
      const result = await window.api.passwordRemove(entry.id);
      if (!result?.ok) return showToast(result?.error || 'Suppression impossible.');
      showToast('Mot de passe supprimé.');
      await refreshPasswordManager();
    });
    actions.append(fill, copy, reveal, remove);
    item.append(main, secret, actions);
    container.appendChild(item);
  });
}
function generatedPassword(length = 20) {
  const groups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*+-_=?.'
  ];
  const all = groups.join('');
  const pick = chars => {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    return chars[data[0] % chars.length];
  };
  const chars = groups.map(pick);
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    const j = data[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
async function saveManualCredential() {
  let origin = $('password-site').value.trim();
  if (origin && !/^https?:\/\//i.test(origin)) origin = `https://${origin}`;
  const username = $('password-username').value.trim();
  const password = $('password-value').value;
  let result = await window.api.passwordSave({ origin, username, password });
  if (!result?.ok && (result?.needsSetup || result?.needsUnlock)) {
    return openVaultGate(() => saveManualCredential());
  }
  if (!result?.ok) return showToast(result?.error || 'Enregistrement impossible.');
  $('password-value').value = '';
  showToast('Mot de passe enregistré dans le coffre Aegis.');
  await refreshPasswordManager();
}
async function savePendingCredential() {
  if (!pendingCredential) return;
  const credential = pendingCredential;
  let result = await window.api.passwordSave(credential);
  if (!result?.ok && (result?.needsSetup || result?.needsUnlock)) {
    return openVaultGate(() => savePendingCredential());
  }
  if (!result?.ok) return showToast(result?.error || 'Enregistrement impossible.');
  pendingCredential = null;
  renderPendingCredential();
  showToast('Connexion enregistrée dans Aegis.');
  await refreshPasswordManager();
}
async function fillCredential(id) {
  const tab = getActiveTab();
  const url = safeWebviewURL(tab);
  if (!tab || !url) return;
  let result = await window.api.passwordFill({ id, url });
  if (!result?.ok && result?.needsUnlock) return openVaultGate(() => fillCredential(id));
  if (!result?.ok) return showToast(result?.error || 'Remplissage impossible.');
  const data = JSON.stringify({ username: result.username || '', password: result.password || '' });
  const script = `(() => {
    const data = ${data};
    const visible = el => !!el && !el.disabled && !el.readOnly && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
    const inputs = [...document.querySelectorAll('input')].filter(visible);
    const password = inputs.find(el => el.type === 'password' && !/new-password/i.test(el.autocomplete || '')) || inputs.find(el => el.type === 'password');
    if (!password) return { ok:false, reason:'Aucun champ de mot de passe visible.' };
    let username = inputs.find(el => /^(username|email)$/i.test(el.autocomplete || ''));
    if (!username) username = inputs.find(el => el.type === 'email');
    if (!username) username = inputs.find(el => el.type !== 'password' && /user|login|email|account|ident/i.test((el.name || '') + ' ' + (el.id || '')));
    if (!username) {
      const candidates = inputs.filter(el => el !== password && el.type !== 'password' && ['text','email','tel',''].includes(el.type));
      username = candidates.filter(el => { try { return el.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING; } catch { return false; } }).pop();
    }
    const setValue = (el, value) => {
      if (!el) return;
      const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      descriptor?.set?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles:true }));
      el.dispatchEvent(new Event('change', { bubbles:true }));
    };
    if (username && data.username) setValue(username, data.username);
    setValue(password, data.password);
    password.focus();
    return { ok:true };
  })()`;
  try {
    const fillResult = await tab.webview.executeJavaScript(script, true);
    if (!fillResult?.ok) return showToast(fillResult?.reason || 'Aucun formulaire de connexion compatible trouvé.');
    closeAllPanels();
    hideCredentialPrompt();
    showToast('Identifiants remplis.');
  } catch {
    showToast('Impossible de remplir ce formulaire.');
  }
}
async function openPasswordManager() {
  openPanel('passwords');
  await refreshPasswordManager();
}
const downloadItems = new Map();
function formatBytes(bytes) {
  if (!bytes || bytes < 1) return '0 o';
  const units = ['o','Ko','Mo','Go'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}
function cycleTab(direction = 1) {
  if (tabs.length < 2) return;
  const current = Math.max(0, tabs.findIndex(tab => tab.id === activeTabId));
  const next = (current + direction + tabs.length) % tabs.length;
  switchTab(tabs[next].id);
}
function handleBrowserShortcut(action) {
  if ($('first-run').classList.contains('open')) return;
  const tab = getActiveTab();
  if (/^tab-[1-9]$/.test(action)) {
    const number = Number(action.slice(4));
    const target = number === 9 ? tabs[tabs.length - 1] : tabs[number - 1];
    if (target) switchTab(target.id);
    return;
  }
  switch (action) {
    case 'new-tab': createTab(); break;
    case 'close-tab': if (activeTabId) closeTab(activeTabId); break;
    case 'reopen-tab': reopenClosedTab(); break;
    case 'focus-address': $addressBar.focus(); $addressBar.select(); break;
    case 'reload': if (tab?.internalStart) renderActiveSurface(); else if (tab?.error && (tab.error.url || tab.lastCommittedUrl)) navigateActive(tab.error.url || tab.lastCommittedUrl); else tab?.webview.reload(); break;
    case 'find': if (!tab?.internalStart && !tab?.error) openFindBar(); break;
    case 'command-palette': openCommandPalette(); break;
    case 'tab-overview': openTabOverview(); break;
    case 'focus-mode': toggleFocusMode(); break;
    case 'reader': openReaderMode(); break;
    case 'notes': openNotes(); break;
    case 'translate': openTranslatePanel(); break;
    case 'developer-tools': openActiveDevTools(); break;
    case 'adblock': toggleAdblockGlobal(); break;
    case 'history': renderHistoryPanel(); openPanel('history'); break;
    case 'downloads': renderDownloadsList(); openPanel('downloads'); break;
    case 'bookmark': toggleCurrentBookmark(); break;
    case 'toggle-bookmarks-bar': toggleBookmarksBar(); break;
    case 'private-tab': createTab(undefined, { private: true }); break;
    case 'passwords': openPasswordManager(); break;
    case 'print': if (!tab?.internalStart && !tab?.error) tab?.webview.print(); break;
    case 'zoom-in': if (!tab?.internalStart) changeZoom(0.1); break;
    case 'zoom-out': if (!tab?.internalStart) changeZoom(-0.1); break;
    case 'zoom-reset': if (!tab?.internalStart) { tab?.webview.setZoomFactor(1); updateZoomLabel(1); } break;
    case 'next-tab': cycleTab(1); break;
    case 'previous-tab': cycleTab(-1); break;
    case 'app-fullscreen': window.api.toggleFullscreen(); break;
    case 'back': if (safeCanGoBack(tab)) tab.webview.goBack(); break;
    case 'forward': if (safeCanGoForward(tab)) tab.webview.goForward(); break;
  }
}
function setOnboardingStep(step) {
  onboardingStep = Math.max(0, Math.min(4, Number(step) || 0));
  document.querySelectorAll('.onboarding-page').forEach((page, index) => page.classList.toggle('active', index === onboardingStep));
  document.querySelectorAll('.onboarding-step-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index === onboardingStep);
    dot.classList.toggle('done', index < onboardingStep);
  });
  document.querySelectorAll('.onboarding-mini-progress i').forEach((dot, index) => dot.classList.toggle('active', index <= onboardingStep));
  const counter = $('onboarding-counter');
  if (counter) counter.textContent = activeUiLanguage === 'fr' ? `Étape ${onboardingStep + 1} sur 5` : `Step ${onboardingStep + 1} of 5`;
  $('first-run-back').disabled = onboardingStep === 0;
  $('first-run-next').classList.toggle('hidden', onboardingStep === 4);
  $('first-run-start').classList.toggle('hidden', onboardingStep !== 4);
}
function syncOnboardingChoices() {
  const theme = $('first-run-theme').value || 'dark';
  document.querySelectorAll('[data-theme-choice]').forEach(button => button.classList.toggle('active', button.dataset.themeChoice === theme));
  const accent = store.settings.accentTheme || 'teal';
  document.querySelectorAll('[data-first-accent]').forEach(button => button.classList.toggle('active', button.dataset.firstAccent === accent));
  const homepage = $('first-run-homepage').value || INTERNAL_START_PAGE;
  document.querySelectorAll('.homepage-choice').forEach(button => {
    const value = button.dataset.homepage;
    button.classList.toggle('active', value === 'custom' ? ![INTERNAL_START_PAGE,'https://www.google.com'].includes(homepage) : value === homepage);
  });
  $('first-run-homepage').classList.toggle('show', ![INTERNAL_START_PAGE,'https://www.google.com'].includes(homepage));
}
function showFirstRunConfiguration(force = false) {
  const overlay = $('first-run');
  if ($('first-run-language')) $('first-run-language').value = store.settings.browserLanguage || 'en';
  $('first-run-homepage').value = store.settings.homepage || DEFAULT_SETTINGS.homepage;
  $('first-run-search').value = store.settings.searchEngine || 'google';
  $('first-run-theme').value = store.settings.theme || 'dark';
  $('first-run-wallpaper').value = store.settings.startWallpaper || 'aurora';
  $('first-run-bookmarks').checked = store.settings.showBookmarksBar !== false;
  $('first-run-adblock').checked = store.settings.adblockEnabled !== false;
  $('first-run-trackers').checked = store.settings.blockTrackers !== false;
  $('first-run-dnt').checked = store.settings.doNotTrack !== false;
  $('first-run-dock').checked = store.settings.dockEnabled !== false;
  $('first-run-restore').checked = store.settings.restoreSession === true;
  $('first-run-vault').checked = force ? false : true;
  setOnboardingStep(0);
  syncOnboardingChoices();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}
async function completeFirstRun(useRecommended = false) {
  if (useRecommended) {
    if ($('first-run-language')) $('first-run-language').value = 'en';
    $('first-run-homepage').value = INTERNAL_START_PAGE;
    $('first-run-search').value = 'google';
    $('first-run-theme').value = 'dark';
    $('first-run-wallpaper').value = 'aurora';
    $('first-run-bookmarks').checked = true;
    $('first-run-adblock').checked = true;
    $('first-run-trackers').checked = true;
    $('first-run-dnt').checked = true;
    $('first-run-dock').checked = true;
    $('first-run-restore').checked = false;
    store.settings.accentTheme = 'teal';
  }
  const homepage = normalizeHomepageInput($('first-run-homepage').value || DEFAULT_SETTINGS.homepage);
  const setupVault = $('first-run-vault').checked;
  store.settings = await window.api.setSettings({
    homepage,
    browserLanguage: $('first-run-language')?.value || 'en',
    searchEngine: $('first-run-search').value,
    theme: $('first-run-theme').value,
    themePreset: $('first-run-theme').value === 'light' ? 'total-white' : 'total-black',
    startWallpaper: $('first-run-wallpaper').value,
    accentTheme: store.settings.accentTheme || 'teal',
    showBookmarksBar: $('first-run-bookmarks').checked,
    dockEnabled: $('first-run-dock').checked,
    restoreSession: $('first-run-restore').checked,
    adblockEnabled: $('first-run-adblock').checked,
    blockTrackers: $('first-run-trackers').checked,
    doNotTrack: $('first-run-dnt').checked,
    firstRunComplete: true,
    onboardingVersion: 580,
    uiRevision: 580
  });
  applyTheme();
  applyLayoutSettings();
  syncSettingsUI();
  renderBookmarksBar();
  $('first-run').classList.remove('open');
  $('first-run').setAttribute('aria-hidden', 'true');
  if (!tabs.length) createTab(homepage);
  else navigateActive(homepage);
  if (setupVault) setTimeout(() => openVaultGate(), 350);
}
async function openDownloadVirusTotal(download) {
  if (!download?.path || !download?.done || download?.state !== 'completed') return;
  showToast(uiMessage('Checking SHA-256 against VirusTotal…', 'Vérification du SHA-256 auprès de VirusTotal…'));
  let result;
  try {
    result = await window.api.virusTotalFileReport(download.path);
  } catch (error) {
    return showToast(uiMessage('VirusTotal unavailable: ', 'VirusTotal indisponible : ') + String(error?.message || error));
  }
  if (!result?.ok) {
    return showToast(result?.error || uiMessage('Unable to check this file.', 'Impossible de vérifier ce fichier.'));
  }
  if (result.mode === 'known' && result.reportUrl) {
    const positives = Number(result.stats?.malicious || 0) + Number(result.stats?.suspicious || 0);
    createTab(result.reportUrl);
    closeDownloadsPopover();
    showToast(positives > 0
      ? uiMessage(`VirusTotal: ${positives} detection(s) or warnings. Review the report.`, `VirusTotal : ${positives} détection(s) ou avertissement(s). Consultez le rapport.`)
      : uiMessage('VirusTotal report found. Zero detections does not guarantee safety.', 'Rapport VirusTotal trouvé. Aucune détection ne garantit pas l’innocuité.'));
    return;
  }
  if (result.mode === 'needs-key') {
    createTab(result.searchUrl || 'https://www.virustotal.com/gui/home/search');
    closeDownloadsPopover();
    showToast(uiMessage('No VT API key: opening hash search. If no report exists, upload manually. Nothing was sent.', 'Sans clé API VT : recherche de l’empreinte. Si aucun rapport n’existe, importez le fichier manuellement. Rien n’a été envoyé.'));
    return;
  }
  if (result.mode === 'unknown') {
    showToast(uiMessage('File not found in VirusTotal. Confirm a submission if you wish.', 'Fichier inconnu de VirusTotal. Confirmez l’envoi si vous le souhaitez.'));
    let submitted;
    try {
      submitted = await window.api.virusTotalSubmitFile(download.path, result.sha256);
    } catch (error) {
      return showToast(uiMessage('VirusTotal submission failed: ', 'Échec de l’envoi VirusTotal : ') + String(error?.message || error));
    }
    if (submitted?.cancelled) return showToast(uiMessage('Submission cancelled. No file sent.', 'Envoi annulé. Aucun fichier transmis.'));
    if (!submitted?.ok) return showToast(submitted?.error || uiMessage('Unable to submit file.', 'Impossible d’envoyer le fichier.'));
    closeDownloadsPopover();
    showToast(uiMessage('File submitted. Scan pending: use VT again later to view the report.', 'Fichier envoyé. Analyse en cours : utilisez de nouveau VT plus tard pour voir le rapport.'));
    return;
  }
  showToast(uiMessage('VirusTotal returned an unknown status.', 'Statut VirusTotal inconnu.'));
}
function renderDownloadsList() {
  const container = $('downloads-list');
  container.innerHTML = '';
  const values = [...downloadItems.values()].reverse();
  if (!values.length) return void (container.innerHTML = `<div class="empty-state">${uiMessage('No downloads in this session.','Aucun téléchargement dans cette session.')}</div>`);
  values.forEach(download => {
    const item = document.createElement('div');
    item.className = 'list-item download-list-item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'stretch';
    const pct = download.total ? Math.min(100, Math.round(download.received / download.total * 100)) : 0;
    const status = download.done ? (download.state === 'completed' ? uiMessage('Completed','Terminé') : uiMessage('Failed','Échec')) : `${pct}% · ${formatBytes(download.received)} / ${formatBytes(download.total)}`;
    const vt = download.done && download.state === 'completed' && download.path ? `<button class="download-vt-btn" type="button" title="${uiMessage('Check file with VirusTotal','Vérifier le fichier avec VirusTotal')}"><span>◇</span> VirusTotal</button>` : '';
    item.innerHTML = `<div class="download-list-head"><div class="dot"></div><div class="meta"><div class="t">${escapeHTML(download.filename)}</div><div class="u">${escapeHTML(status)}</div></div><div class="download-row-actions">${vt}${download.done&&download.path?`<button class="download-open-btn" type="button">${uiMessage('Open','Ouvrir')}</button>`:''}</div></div><div class="progress-bar"><div class="progress-fill" style="width:${download.done && download.state === 'completed' ? 100 : pct}%"></div></div>`;
    item.querySelector('.download-vt-btn')?.addEventListener('click', event => { event.stopPropagation(); openDownloadVirusTotal(download); });
    item.querySelector('.download-open-btn')?.addEventListener('click', event => { event.stopPropagation(); window.api.showItem(download.path); });
    container.appendChild(item);
  });
}

function closeDownloadsPopover() {
  const pop = $('downloads-popover');
  if (!pop) return;
  pop.classList.remove('open');
  pop.setAttribute('aria-hidden','true');
}
function positionDownloadsPopover() {
  const pop=$('downloads-popover'), btn=$('downloads-btn');
  if (!pop || !btn) return;
  const rect=btn.getBoundingClientRect();
  const width=Math.min(390, Math.max(280, window.innerWidth-24));
  const left=Math.max(12, Math.min(window.innerWidth-width-12, rect.right-width));
  pop.style.left=`${left}px`;
  pop.style.top=`${Math.min(window.innerHeight-120, rect.bottom+8)}px`;
}
function renderDownloadsPopover() {
  const container=$('downloads-popover-list');
  if (!container) return;
  const values=[...downloadItems.values()].reverse().slice(0,6);
  if (!values.length) {
    container.innerHTML=`<div class="downloads-popover-empty">${uiMessage('No downloads in this session yet.','Aucun téléchargement dans cette session.')}</div>`;
  } else {
    container.innerHTML='';
    values.forEach(download=>{
      const pct=download.total?Math.min(100,Math.round((Number(download.received||0)/Number(download.total||1))*100)):0;
      const done=Boolean(download.done);
      const status=done?(download.state==='completed'?uiMessage('Completed','Terminé'):uiMessage('Failed','Échec')):`${pct}% · ${formatBytes(download.received)} / ${formatBytes(download.total)}`;
      const item=document.createElement('div');
      item.className=`download-popover-item${done?' done':''}`;
      const canVt=done&&download.state==='completed'&&download.path;
      item.innerHTML=`<div class="download-file-icon"><svg viewBox="0 0 24 24"><path d="M7 3h7l3 3v15H7z"/><path d="M14 3v4h4"/></svg></div><div class="download-popover-meta"><b class="download-popover-title">${escapeHTML(download.filename||uiMessage('Download','Téléchargement'))}</b><div class="download-popover-status"><span>${escapeHTML(status)}</span></div><div class="download-popover-track"><i style="width:${done&&download.state==='completed'?100:pct}%"></i></div></div><div class="download-popover-actions">${canVt?`<button class="download-vt-icon" type="button" title="VirusTotal"><span>◇</span><b>VT</b></button>`:''}${done&&download.path?`<button class="download-open-icon" type="button" title="${uiMessage('Open file','Ouvrir le fichier')}">↗</button>`:''}</div>`;
      item.querySelector('.download-vt-icon')?.addEventListener('click',event=>{event.stopPropagation();openDownloadVirusTotal(download);});
      item.querySelector('.download-open-icon')?.addEventListener('click',event=>{event.stopPropagation();window.api.showItem(download.path);});
      container.appendChild(item);
    });
  }
  $('downloads-btn')?.classList.toggle('has-active',[...downloadItems.values()].some(item=>!item.done));
}

function toggleDownloadsPopover(force) {
  const pop=$('downloads-popover');
  if (!pop) return;
  const open=typeof force==='boolean'?force:!pop.classList.contains('open');
  closeAdblockPopover?.();
  if (!open) return closeDownloadsPopover();
  renderDownloadsPopover(); positionDownloadsPopover();
  pop.classList.add('open'); pop.setAttribute('aria-hidden','false');
}
async function toggleCurrentBookmark() {
  const tab = getActiveTab();
  if (!tab) return;
  const url = sessionURL(safeWebviewURL(tab), tab);
  if (!/^https?:\/\//i.test(url)) return showToast('Cette page ne peut pas être ajoutée aux favoris.');
  if (store.bookmarks.some(bookmark => bookmark.url === url)) {
    store.bookmarks = await window.api.removeBookmark(url);
    showToast('Favori supprimé.');
  } else {
    store.bookmarks = await window.api.addBookmark({ url, title: tab.tabEl.querySelector('.title').textContent });
    showToast('Ajouté aux favoris.');
  }
  updateStarState(); renderBookmarksBar(); renderBookmarksPanel(); renderStartDashboard();
}
async function toggleBookmarksBar() {
  store.settings = await window.api.setSettings({ showBookmarksBar: !store.settings.showBookmarksBar });
  renderBookmarksBar(); syncSettingsUI();
  showToast(store.settings.showBookmarksBar ? 'Barre de favoris affichée.' : 'Barre de favoris masquée.');
}
function applyLayoutSettings() {
  const density = store.settings.interfaceDensity || (store.settings.compactTabs ? 'compact' : 'comfortable');
  document.body.classList.toggle('compact-tabs', density === 'compact');
  document.body.dataset.density = density;
  document.body.classList.toggle('dock-visible', store.settings.dockEnabled !== false);
  document.body.classList.toggle('reduce-motion', store.settings.animations === false);
  document.body.dataset.accent = store.settings.accentTheme || 'teal';
  const start = $('start-page');
  if (start) {
    start.dataset.wallpaper = store.settings.startWallpaper || 'aurora';
    const preset = store.settings.themePreset || 'total-black';
    const pure = preset === 'total-black' || preset === 'total-white';
    start.dataset.backgroundStyle = pure ? 'none' : (store.settings.backgroundStyle || 'none');
  }
  const clock = $('start-clock-wrap');
  if (clock) clock.classList.toggle('hidden', store.settings.startShowClock === false);
  const recents = $('start-recents-wrap');
  if (recents) recents.classList.toggle('hidden', store.settings.startShowRecents === false);
  const actions = $('start-quick-actions');
  if (actions) actions.classList.toggle('hidden', store.settings.startShowActions === false);
  if ($('start-toggle-clock')) $('start-toggle-clock').checked = store.settings.startShowClock !== false;
  if ($('start-toggle-recents')) $('start-toggle-recents').checked = store.settings.startShowRecents !== false;
  if ($('start-toggle-actions')) $('start-toggle-actions').checked = store.settings.startShowActions !== false;
  if ($('start-toggle-dock')) $('start-toggle-dock').checked = store.settings.dockEnabled !== false;
  document.querySelectorAll('.accent-choice').forEach(btn => btn.classList.toggle('active', btn.dataset.accent === (store.settings.accentTheme || 'teal')));
  document.querySelectorAll('.wallpaper-choice').forEach(btn => btn.classList.toggle('active', btn.dataset.wallpaper === (store.settings.startWallpaper || 'aurora')));
}
function hostLabel(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return String(url || ''); }
}
function faviconLetter(url, title = '') {
  const host = hostLabel(url);
  return (title || host || '?').trim().charAt(0).toUpperCase() || '?';
}
function renderStartDashboard() {
  if (!$('start-page')) return;
  applyLayoutSettings();
  if ($('start-blocked')) $('start-blocked').textContent = blockedCount > 999 ? '999+' : String(blockedCount || 0);
  if ($('start-tab-count')) $('start-tab-count').textContent = String(tabs.length || 1);
  if ($('dock-tab-count')) $('dock-tab-count').textContent = String(tabs.length || 1);
  updateDockState();
  const shortcuts = $('start-shortcuts');
  if (shortcuts) {
    const base = [
      { title: 'Google', url: 'https://www.google.com/', glyph: 'G' },
      { title: 'YouTube', url: 'https://www.youtube.com/', glyph: '▶' },
      { title: 'Gmail', url: 'https://mail.google.com/', glyph: 'M' },
      { title: 'Drive', url: 'https://drive.google.com/', glyph: '◆' }
    ];
    const seen = new Set(base.map(x => hostLabel(x.url)));
    for (const item of store.bookmarks) {
      const host = hostLabel(item.url);
      if (!host || seen.has(host) || !/^https?:\/\//i.test(item.url || '')) continue;
      base.push({ title: item.title || host, url: item.url, glyph: faviconLetter(item.url, item.title) });
      seen.add(host);
      if (base.length >= 8) break;
    }
    shortcuts.innerHTML = '';
    base.forEach(item => {
      const button = document.createElement('button');
      button.className = 'start-shortcut';
      button.title = item.url;
      button.innerHTML = `<span class="shortcut-icon">${escapeHTML(item.glyph)}</span><span>${escapeHTML(item.title)}</span>`;
      button.addEventListener('click', () => navigateActive(item.url));
      shortcuts.appendChild(button);
    });
  }
  const recents = $('start-recents');
  if (recents) {
    const unique = [];
    const seen = new Set();
    for (const item of store.history) {
      if (!/^https?:\/\//i.test(item.url || '') || seen.has(item.url)) continue;
      seen.add(item.url);
      unique.push(item);
      if (unique.length >= 5) break;
    }
    recents.innerHTML = '';
    if (!unique.length) {
      recents.innerHTML = '<div class="start-empty">Tes dernières pages apparaîtront ici.</div>';
    } else {
      unique.forEach(item => {
        const card = document.createElement('button');
        card.className = 'recent-card';
        const when = item.date ? new Date(item.date).toLocaleDateString(uiLocale(), { day: 'numeric', month: 'short' }) : '';
        card.innerHTML = `<span class="recent-glyph">${escapeHTML(faviconLetter(item.url, item.title))}</span><span class="recent-main"><b>${escapeHTML(item.title || hostLabel(item.url))}</b><small>${escapeHTML(hostLabel(item.url))}</small></span><span class="recent-date">${escapeHTML(when)}</span>`;
        card.addEventListener('click', () => navigateActive(item.url));
        recents.appendChild(card);
      });
    }
  }
  const pulseShield = $('start-pulse-shield-value');
  if (pulseShield) pulseShield.textContent = blockedCount > 999 ? '999+' : String(blockedCount || 0);
  const pulseDownloads = $('start-pulse-download-value');
  if (pulseDownloads) {
    const values = [...downloadItems.values()];
    const active = values.filter(item => !item.done).length;
    pulseDownloads.textContent = active ? `${active} active` : `${values.filter(item => item.done).length} recent`;
  }
  const pulseAi = $('start-pulse-ai-value');
  if (pulseAi) {
    const cloud = Boolean(aiStatusState?.cloudConfigured) && (store.settings.aiProcessing || 'cloud-preferred') !== 'local-only';
    pulseAi.textContent = cloud ? 'Online' : (aiStatusState?.installed ? 'Local ready' : 'Ready');
  }
}
async function setStartWallpaper(name) {
  const allowed = ['aurora','midnight','sunset','frost','graphite'];
  const value = allowed.includes(name) ? name : 'aurora';
  store.settings = await window.api.setSettings({ startWallpaper: value });
  applyLayoutSettings();
  syncSettingsUI();
}
function toggleStartCustomizer(force) {
  const panel = $('start-customizer');
  if (!panel) return;
  const open = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
}
// Dedicated in-app dialogs: Electron does not reliably implement window.prompt().
function askAegisText(title, initial='') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'aegis-dialog-overlay';
    overlay.innerHTML = `<form class="aegis-dialog"><h3></h3><input type="text" required maxlength="40"/><div class="aegis-dialog-actions"><button type="button" data-cancel>Annuler</button><button type="submit">Valider</button></div></form>`;
    const form = overlay.querySelector('form'), input=overlay.querySelector('input');
    overlay.querySelector('h3').textContent = title;
    input.value = String(initial || '');
    let done=false;
    const finish = value => { if(done) return; done=true; overlay.remove(); window.removeEventListener('keydown', onKey, true); resolve(value); };
    const onKey = e => { if(e.key === 'Escape') {e.stopImmediatePropagation(); e.preventDefault(); finish(null);} };
    window.addEventListener('keydown',onKey,true);
    overlay.querySelector('[data-cancel]').addEventListener('click',()=>finish(null));
    overlay.addEventListener('mousedown', e=> {if(e.target===overlay)finish(null);});
    form.addEventListener('submit',e=>{e.preventDefault();finish(input.value.trim().slice(0,40)||null);});
    document.body.appendChild(overlay); input.focus(); input.select();
  });
}
async function confirmAegis(title) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');overlay.className='aegis-dialog-overlay';
    overlay.innerHTML='<div class="aegis-dialog"><h3></h3><div class="aegis-dialog-actions"><button type="button" data-no>Annuler</button><button type="button" data-yes>Confirmer</button></div></div>';
    overlay.querySelector('h3').textContent=title;
    let done=false; const finish=v=>{if(done)return;done=true;overlay.remove();window.removeEventListener('keydown',onKey,true);resolve(v);};
    const onKey=e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();finish(false);}};
    window.addEventListener('keydown',onKey,true);
    overlay.querySelector('[data-no]').addEventListener('click',()=>finish(false));
    overlay.querySelector('[data-yes]').addEventListener('click',()=>finish(true));
    overlay.addEventListener('mousedown',e=>{if(e.target===overlay)finish(false);});
    document.body.appendChild(overlay);overlay.querySelector('[data-yes]').focus();
  });
}
function groupColorValue(color='teal') {
  return { teal:'#00d99a', blue:'#5f7fff', violet:'#9b70ff', rose:'#ff6f9f', amber:'#f5b942' }[color] || '#00d99a';
}
function getTabGroup(id) { return tabGroups.find(group => group.id === id) || null; }
function syncTabDomOrder() {
  $tabs.innerHTML = '';
  const appendTab = tab => {
    const group = getTabGroup(tab.groupId);
    tab.tabEl.classList.toggle('grouped', Boolean(group));
    tab.tabEl.style.setProperty('--tab-group-color', group ? groupColorValue(group.color) : 'transparent');
    if (group) tab.tabEl.dataset.group = group.id; else delete tab.tabEl.dataset.group;
    $tabs.appendChild(tab.tabEl);
  };
  tabs.filter(tab => tab.pinned).forEach(appendTab);
  tabs.filter(tab => !tab.pinned && !getTabGroup(tab.groupId)).forEach(appendTab);
  tabGroups.forEach(group => {
    const members = tabs.filter(tab => !tab.pinned && tab.groupId === group.id);
    if (!members.length) return;
    const pill = document.createElement('button');
    pill.className = `tab-group-pill${group.collapsed ? ' collapsed' : ''}${members.some(tab => tab.id === activeTabId) ? ' has-active' : ''}`;
    pill.type = 'button';
    pill.dataset.groupId = group.id;
    pill.style.setProperty('--group-color', groupColorValue(group.color));
    pill.innerHTML = `<i></i><span>${escapeHTML(group.name)}</span><b>${members.length}</b>`;
    pill.title = group.collapsed ? 'Déplier le groupe' : 'Replier le groupe';
    pill.addEventListener('click', () => { group.collapsed = !group.collapsed; syncTabDomOrder(); persistSessionSoon(); });
    pill.addEventListener('dblclick', event => { event.preventDefault(); renameTabGroup(group.id); });
    pill.addEventListener('contextmenu', async event => { event.preventDefault(); if (await confirmAegis(`Supprimer le groupe « ${group.name} » ? Les onglets resteront ouverts.`)) deleteTabGroup(group.id); });
    $tabs.appendChild(pill);
    if (!group.collapsed) members.forEach(appendTab);
  });
}
async function createTabGroup(tab = getActiveTab()) {
  if (!tab || tab.private || tab.pinned) return showToast('Les onglets privés ou épinglés ne peuvent pas être groupés.');
  const name = await askAegisText('Nom du nouveau groupe', 'Nouveau groupe');
  if (!name) return;
  const id = `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
  const group = { id, name:name.slice(0,40), color:GROUP_COLORS[tabGroups.length % GROUP_COLORS.length], collapsed:false };
  tabGroups.push(group);
  tab.groupId = id;
  syncTabDomOrder(); persistSessionSoon(); showToast(`Groupe « ${group.name} » créé.`);
}
function moveTabToGroup(tab, groupId) {
  if (!tab || tab.private || tab.pinned) return showToast('Cet onglet ne peut pas être groupé.');
  const group = getTabGroup(groupId);
  if (!group) return;
  tab.groupId = group.id;
  group.collapsed = false;
  syncTabDomOrder(); persistSessionSoon();
}
function ungroupTab(tab) {
  if (!tab?.groupId) return;
  tab.groupId = null;
  syncTabDomOrder(); persistSessionSoon();
}
async function renameTabGroup(groupId) {
  const group = getTabGroup(groupId); if (!group) return;
  const next = await askAegisText('Renommer le groupe', group.name);
  if (!next) return;
  group.name = next.slice(0,40); syncTabDomOrder(); persistSessionSoon();
}
function deleteTabGroup(groupId) {
  tabs.forEach(tab => { if (tab.groupId === groupId) tab.groupId = null; });
  tabGroups = tabGroups.filter(group => group.id !== groupId);
  syncTabDomOrder(); persistSessionSoon();
}

function reorderTab(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const from = tabs.findIndex(tab => tab.id === fromId);
  const to = tabs.findIndex(tab => tab.id === toId);
  if (from < 0 || to < 0) return;
  const [moved] = tabs.splice(from, 1);
  tabs.splice(to, 0, moved);
  tabs = [...tabs.filter(item => item.pinned), ...tabs.filter(item => !item.pinned)];
  syncTabDomOrder();
  persistSessionSoon();
}
function togglePinnedTab(tab = getActiveTab()) {
  if (!tab) return;
  tab.pinned = !tab.pinned;
  if (tab.pinned) tab.groupId = null;
  tab.tabEl.classList.toggle('pinned', tab.pinned);
  tabs = [...tabs.filter(item => item.pinned), ...tabs.filter(item => !item.pinned)];
  syncTabDomOrder();
  persistSessionSoon();
  showToast(tab.pinned ? 'Onglet épinglé.' : 'Onglet désépinglé.');
}
function duplicateTab(tab = getActiveTab()) {
  if (!tab) return;
  const url = sessionURL(safeWebviewURL(tab), tab) || INTERNAL_START_PAGE;
  createTab(url, { private: Boolean(tab.private), groupId: tab.groupId || null });
}
function closeOtherTabs(tab = getActiveTab()) {
  if (!tab) return;
  [...tabs].filter(item => item.id !== tab.id && !item.pinned).forEach(item => closeTab(item.id));
  switchTab(tab.id);
}
function openTabContextMenu(id, x, y) {
  const tab = tabs.find(item => item.id === id);
  const menu = $('tab-context-menu');
  if (!tab || !menu) return;
  tabContextTargetId = id;
  const pin = menu.querySelector('[data-tab-action="pin"]');
  if (pin) pin.textContent = tab.pinned ? 'Désépingler l’onglet' : 'Épingler l’onglet';
  const mute = menu.querySelector('[data-tab-action="mute"]');
  if (mute) mute.textContent = tab.muted ? 'Réactiver le son' : 'Couper le son';
  const groupBox = $('tab-context-groups');
  if (groupBox) {
    groupBox.innerHTML = '';
    tabGroups.forEach(group => {
      const button = document.createElement('button');
      button.dataset.tabAction = `group:${group.id}`;
      button.innerHTML = `<span class="group-action-dot" style="background:${groupColorValue(group.color)}"></span>${escapeHTML(group.name)}${tab.groupId === group.id ? ' ✓' : ''}`;
      button.addEventListener('click', () => handleTabContextAction(button.dataset.tabAction));
      groupBox.appendChild(button);
    });
  }
  const newGroup = menu.querySelector('[data-tab-action="new-group"]');
  const ungroup = menu.querySelector('[data-tab-action="ungroup"]');
  if (newGroup) newGroup.disabled = tab.private || tab.pinned;
  if (ungroup) { ungroup.disabled = !tab.groupId; ungroup.style.display = tab.groupId ? '' : 'none'; }
  menu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  menu.style.top = `${Math.max(8, Math.min(y, window.innerHeight - 430))}px`;
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
}
function hideTabContextMenu() {
  const menu = $('tab-context-menu');
  menu?.classList.remove('open');
  menu?.setAttribute('aria-hidden', 'true');
  tabContextTargetId = null;
}
function handleTabContextAction(action) {
  const tab = tabs.find(item => item.id === tabContextTargetId);
  if (!tab) return hideTabContextMenu();
  if (action === 'pin') togglePinnedTab(tab);
  else if (action === 'duplicate') duplicateTab(tab);
  else if (action === 'mute') toggleTabMute(tab);
  else if (action === 'new-group') createTabGroup(tab);
  else if (action === 'ungroup') ungroupTab(tab);
  else if (String(action || '').startsWith('group:')) moveTabToGroup(tab, String(action).slice(6));
  else if (action === 'close-others') closeOtherTabs(tab);
  else if (action === 'close') closeTab(tab.id);
  hideTabContextMenu();
}
function cleanTrackingUrl(value) {
  try {
    const url = new URL(value);
    const drop = ['gclid','dclid','fbclid','msclkid','mc_cid','mc_eid','igshid','si','ref_src'];
    [...url.searchParams.keys()].forEach(key => {
      if (/^utm_/i.test(key) || drop.includes(key.toLowerCase())) url.searchParams.delete(key);
    });
    return url.toString();
  } catch { return String(value || ''); }
}
async function copyCleanCurrentUrl() {
  const tab = getActiveTab();
  if (!tab || tab.internalStart) return showToast('Aucune URL web à copier.');
  const url = safeWebviewURL(tab);
  if (!/^https?:\/\//i.test(url)) return showToast('Cette page n’a pas d’URL HTTP/HTTPS.');
  const clean = cleanTrackingUrl(url);
  await window.api.copyText(clean);
  showToast(clean === url ? 'URL copiée.' : 'URL nettoyée des paramètres de suivi et copiée.');
}
async function openReaderMode() {
  const tab = getActiveTab();
  if (!tab || tab.internalStart) return showToast('Le mode lecture s’active sur une page web.');
  try {
    const data = await tab.webview.executeJavaScript(`(() => {
      const root = document.querySelector('article') || document.querySelector('main') || document.body;
      const title = document.querySelector('h1')?.innerText || document.title || location.hostname;
      const text = (root?.innerText || '').replace(/\\n{3,}/g,'\\n\\n').trim();
      return { title, text, url: location.href };
    })()`, true);
    if (!data?.text || data.text.length < 180) return showToast('Pas assez de contenu lisible détecté sur cette page.');
    $('reader-title').textContent = data.title || 'Mode lecture';
    const article = $('reader-content');
    article.innerHTML = '';
    const h1 = document.createElement('h1');
    h1.textContent = data.title || 'Mode lecture';
    const meta = document.createElement('div');
    meta.className = 'reader-source';
    meta.textContent = hostLabel(data.url || '');
    article.append(h1, meta);
    String(data.text).split(/\\n\\n+/).slice(0, 240).forEach(part => {
      const text = part.trim();
      if (!text) return;
      const p = document.createElement('p');
      p.textContent = text;
      article.appendChild(p);
    });
    article.style.fontSize = `${readerFontSize}px`;
    $('reader-overlay').classList.add('open');
    $('reader-overlay').setAttribute('aria-hidden', 'false');
  } catch {
    showToast('Impossible d’activer le mode lecture sur cette page.');
  }
}
function closeReaderMode() {
  $('reader-overlay')?.classList.remove('open');
  $('reader-overlay')?.setAttribute('aria-hidden', 'true');
}
function openNotes() {
  closeAllPanels();
  const area = $('notes-textarea');
  if (area) area.value = localStorage.getItem(`aegis:notes:${activeProfileId}`) || '';
  openPanel('notes');
  setTimeout(() => area?.focus(), 80);
}
function saveNotes() {
  const area = $('notes-textarea');
  if (!area) return;
  localStorage.setItem(`aegis:notes:${activeProfileId}`, area.value);
  if ($('notes-status')) $('notes-status').textContent = `Enregistré · ${new Date().toLocaleTimeString(uiLocale(),{hour:'2-digit',minute:'2-digit'})}`;
}

async function setAccentTheme(name) {
  const allowed = ['teal','blue','violet','rose','amber'];
  const value = allowed.includes(name) ? name : 'teal';
  store.settings = await window.api.setSettings({ accentTheme: value });
  applyLayoutSettings();
  syncSettingsUI();
}
function updateDockState() {
  const count = $('dock-tab-count');
  if (count) count.textContent = String(Math.max(1, tabs.length));
  const tab = getActiveTab();
  document.querySelectorAll('[data-dock-action]').forEach(button => button.classList.remove('active'));
  const activeAction = tab?.internalStart ? 'home' : '';
  if (activeAction) document.querySelector(`[data-dock-action="${activeAction}"]`)?.classList.add('active');
  $('aegis-dock')?.classList.toggle('focus-hidden', focusModeActive);
}
function toggleFocusMode(force) {
  focusModeActive = typeof force === 'boolean' ? force : !focusModeActive;
  document.body.classList.toggle('focus-mode', focusModeActive);
  $('focus-exit')?.classList.toggle('show', focusModeActive);
  closeAllPanels();
  closeCommandPalette();
  closeTabOverview();
  if (focusModeActive) showToast('Mode Focus activé · F9 pour quitter.');
  else showToast('Mode Focus désactivé.');
  updateDockState();
}
function openTabOverview() {
  closeAllPanels();
  closeCommandPalette();
  hideAddressSuggestions();
  const overlay = $('tab-overview');
  if (!overlay) return;
  renderTabOverview();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden','false');
  const filter = $('overview-filter');
  if (filter) { filter.value=''; setTimeout(() => filter.focus(), 40); }
}
function closeTabOverview() {
  $('tab-overview')?.classList.remove('open');
  $('tab-overview')?.setAttribute('aria-hidden','true');
}
function renderTabOverview(query = '') {
  const grid = $('overview-grid');
  if (!grid) return;
  const q = String(query || '').trim().toLowerCase();
  const items = tabs.filter(tab => {
    const title = tab.tabEl.querySelector('.title')?.textContent || '';
    const url = sessionURL(safeWebviewURL(tab), tab);
    return !q || `${title} ${url} ${hostLabel(url)}`.toLowerCase().includes(q);
  });
  grid.innerHTML = '';
  if ($('overview-count')) $('overview-count').textContent = `${items.length} onglet${items.length > 1 ? 's' : ''}`;
  if (!items.length) {
    grid.innerHTML = '<div class="overview-empty">Aucun onglet ne correspond à cette recherche.</div>';
    return;
  }
  items.forEach(tab => {
    const title = tab.tabEl.querySelector('.title')?.textContent || 'Nouvel onglet';
    const url = sessionURL(safeWebviewURL(tab), tab);
    const card = document.createElement('button');
    card.className = `overview-tab-card${tab.id === activeTabId ? ' current' : ''}${tab.pinned ? ' pinned' : ''}`;
    card.innerHTML = `<span class="overview-preview"><i>${escapeHTML(faviconLetter(url,title))}</i><em>${tab.internalStart ? 'Aegis Start' : escapeHTML(hostLabel(url) || 'Page web')}</em></span><span class="overview-tab-meta"><b>${escapeHTML(title)}</b><small>${escapeHTML(tab.internalStart ? 'aegis://start' : url)}</small></span><span class="overview-badges">${tab.private ? '<i>PRIVÉ</i>' : ''}${tab.pinned ? '<i>ÉPINGLÉ</i>' : ''}</span><span class="overview-card-close" title="Fermer">×</span>`;
    card.addEventListener('click', event => {
      if (event.target.classList.contains('overview-card-close')) {
        event.stopPropagation();
        closeTab(tab.id);
        renderTabOverview($('overview-filter')?.value || '');
        return;
      }
      switchTab(tab.id);
      closeTabOverview();
    });
    card.addEventListener('dblclick', () => { togglePinnedTab(tab); renderTabOverview($('overview-filter')?.value || ''); });
    grid.appendChild(card);
  });
}
function updateDownloadDockBadge() {
  const badge = $('dock-download-badge');
  if (!badge) return;
  badge.textContent = activeDownloadCount > 9 ? '9+' : (activeDownloadCount ? String(activeDownloadCount) : '');
  badge.classList.toggle('show', activeDownloadCount > 0);
}
function commandActionItems() {
  const tab = getActiveTab();
  const actions = [
    ['new-tab','Nouvel onglet','Créer un nouvel onglet','Ctrl T',() => createTab()],
    ['private-tab','Nouvel onglet privé','Navigation privée Aegis','Ctrl ⇧ N',() => createTab(undefined,{private:true})],
    ['home','Aegis Start','Revenir au nouvel onglet','',() => navigateActive(INTERNAL_START_PAGE)],
    ['overview','Vue d’ensemble des onglets','Afficher tous les onglets ouverts','Ctrl ⇧ A',() => openTabOverview()],
    ['focus','Mode Focus',focusModeActive ? 'Quitter l’interface minimale' : 'Masquer les éléments non essentiels','F9',() => toggleFocusMode()],
    ['duplicate','Dupliquer l’onglet','Créer une copie de l’onglet actuel','',() => duplicateTab()],
    ['pin',tab?.pinned ? 'Désépingler l’onglet' : 'Épingler l’onglet','Garder cet onglet compact à gauche','',() => togglePinnedTab()],
    ['adblock',adblockState.enabled ? 'Désactiver Aegis AdBlock' : 'Activer Aegis AdBlock','Basculer le bloqueur de publicités natif','',() => toggleAdblockGlobal()],
    ['ai','Aegis AI','Recherche Web + synthèse locale','',() => openAiPanel()],
    ['reader','Mode lecture','Extraire le texte principal de la page','',() => openReaderMode()],
    ['notes','Notes rapides','Ouvrir le bloc-notes local','',() => openNotes()],
    ['bookmarks','Favoris','Ouvrir la bibliothèque de favoris','Ctrl D',() => { renderBookmarksPanel(); openPanel('bookmarks'); }],
    ['history','Historique','Voir les pages visitées','Ctrl H',() => { renderHistoryPanel(); openPanel('history'); }],
    ['downloads','Téléchargements','Afficher les téléchargements','Ctrl J',() => { renderDownloadsList(); openPanel('downloads'); }],
    ['passwords','Mots de passe','Ouvrir Aegis Vault','',() => openPasswordManager()],
    ['clean-url','Copier l’URL sans trackers','Retirer UTM, fbclid, gclid…','',() => copyCleanCurrentUrl()],
    ['bookmark','Ajouter / retirer des favoris','Basculer le favori pour la page','Ctrl D',() => toggleCurrentBookmark()],
    ['settings','Paramètres','Personnalisation et confidentialité','',() => { syncSettingsUI(); openPanel('settings'); }]
  ];
  return actions.map(([id,title,subtitle,shortcut,run]) => ({ id,title,subtitle,shortcut,run,kind:'commande' }));
}
function openCommandPalette(prefill = '') {
  closeAllPanels();
  hideAddressSuggestions();
  hideTabContextMenu();
  const palette = $('command-palette');
  palette.classList.add('open');
  palette.setAttribute('aria-hidden','false');
  $('command-input').value = prefill;
  renderCommandPalette(prefill);
  setTimeout(() => { $('command-input').focus(); $('command-input').setSelectionRange(prefill.length,prefill.length); }, 30);
}
function closeCommandPalette() {
  $('command-palette')?.classList.remove('open');
  $('command-palette')?.setAttribute('aria-hidden','true');
  commandPaletteItems = [];
  commandPaletteIndex = -1;
}
function renderCommandPalette(value = '') {
  const raw = String(value || '').trim();
  const q = raw.toLowerCase();
  const tabsOnly = q.startsWith('@tabs');
  const term = tabsOnly ? q.slice(5).trim() : q;
  const tabItems = tabs.map(tab => ({
    id:`switch-${tab.id}`,
    title: tab.tabEl.querySelector('.title')?.textContent || 'Onglet',
    subtitle: tab.internalStart ? 'Aegis Start' : (hostLabel(safeWebviewURL(tab)) || 'Page web'),
    shortcut: tab.pinned ? 'ÉPINGLÉ' : '',
    kind:'onglet',
    run:() => switchTab(tab.id)
  }));
  let items = tabItems;
  if (!tabsOnly) {
    const bookmarkItems = store.bookmarks.slice(0,40).map((item,index) => ({
      id:`bookmark-${index}`, title:item.title || hostLabel(item.url), subtitle:item.url, shortcut:'FAVORI', kind:'favori', run:() => navigateActive(item.url)
    }));
    const seenHistory = new Set();
    const historyItems = [];
    for (const item of store.history) {
      if (!/^https?:\/\//i.test(item.url || '') || seenHistory.has(item.url)) continue;
      seenHistory.add(item.url);
      historyItems.push({ id:`history-${historyItems.length}`, title:item.title || hostLabel(item.url), subtitle:item.url, shortcut:'RÉCENT', kind:'historique', run:() => navigateActive(item.url) });
      if (historyItems.length >= 35) break;
    }
    items = [...tabItems, ...commandActionItems(), ...bookmarkItems, ...historyItems];
  }
  if (term) items = items.filter(item => `${item.title} ${item.subtitle} ${item.kind}`.toLowerCase().includes(term));
  if (!tabsOnly && raw) {
    const target = normalizeURL(raw);
    items.unshift({
      id:'direct-search',
      title:isURL(raw) ? `Ouvrir ${raw}` : `Rechercher « ${raw} »`,
      subtitle:isURL(raw) ? target : `Recherche avec ${store.settings.searchEngine || 'google'}`,
      shortcut:'ENTRÉE', kind:'recherche', run:() => navigateActive(target)
    });
  }
  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.kind}:${item.title}:${item.subtitle}`;
    if (seen.has(key)) continue;
    seen.add(key); deduped.push(item);
  }
  commandPaletteItems = deduped.slice(0,14);
  commandPaletteIndex = commandPaletteItems.length ? 0 : -1;
  const box = $('command-results');
  box.innerHTML = '';
  if (!commandPaletteItems.length) {
    box.innerHTML = '<div class="command-empty">Aucun résultat.</div>';
    return;
  }
  const glyphs = { onglet:'▦', commande:'⌘', favori:'★', historique:'↶', recherche:'⌕' };
  commandPaletteItems.forEach((item,index) => {
    const row = document.createElement('button');
    row.className = `command-result${index===0?' selected':''}`;
    row.innerHTML = `<span class="command-glyph">${glyphs[item.kind] || '⌘'}</span><span class="command-main"><b>${escapeHTML(item.title)}</b><small>${escapeHTML(item.subtitle)}</small></span>${item.shortcut?`<kbd>${escapeHTML(item.shortcut)}</kbd>`:''}`;
    row.addEventListener('mouseenter',() => selectCommandResult(index));
    row.addEventListener('click',() => executeCommandResult(index));
    box.appendChild(row);
  });
}
function selectCommandResult(index) {
  if (!commandPaletteItems.length) return;
  commandPaletteIndex = (index + commandPaletteItems.length) % commandPaletteItems.length;
  [...document.querySelectorAll('.command-result')].forEach((row,i) => row.classList.toggle('selected',i===commandPaletteIndex));
  document.querySelectorAll('.command-result')[commandPaletteIndex]?.scrollIntoView({block:'nearest'});
}
function executeCommandResult(index = commandPaletteIndex) {
  const item = commandPaletteItems[index];
  if (!item) return;
  closeCommandPalette();
  item.run();
}
function activeProfileMeta() { return profileMetadata.find(profile => profile.id === activeProfileId) || { id:activeProfileId, name:'Principal', color:'teal' }; }
function renderProfileButton() {
  const profile = activeProfileMeta();
  if ($('profile-name')) $('profile-name').textContent = profile.name || 'Profil';
  if ($('profile-avatar')) {
    $('profile-avatar').textContent = String(profile.name || 'P').trim().charAt(0).toUpperCase() || 'P';
    $('profile-avatar').style.setProperty('--profile-color', groupColorValue(profile.color || 'teal'));
  }
}
function renderProfilePopover() {
  const list = $('profile-list'); if (!list) return;
  list.innerHTML = '';
  profileMetadata.forEach(profile => {
    const row = document.createElement('div');
    row.className = `profile-row${profile.id === activeProfileId ? ' active' : ''}`;
    row.innerHTML = `<button class="profile-switch" data-profile-id="${escapeHTML(profile.id)}"><i style="--profile-color:${groupColorValue(profile.color)}">${escapeHTML(String(profile.name||'P').charAt(0).toUpperCase())}</i><span><b>${escapeHTML(profile.name)}</b><small>${profile.id === activeProfileId ? 'Profil actif' : 'Changer de profil'}</small></span>${profile.id === activeProfileId ? '<em>✓</em>' : ''}</button><div class="profile-row-actions"><button data-profile-rename="${escapeHTML(profile.id)}" title="Renommer">✎</button>${profile.id !== 'default' && profile.id !== activeProfileId ? `<button data-profile-delete="${escapeHTML(profile.id)}" title="Supprimer">×</button>` : ''}</div>`;
    list.appendChild(row);
  });
  list.querySelectorAll('[data-profile-id]').forEach(button => button.addEventListener('click', () => switchToProfile(button.dataset.profileId)));
  list.querySelectorAll('[data-profile-rename]').forEach(button => button.addEventListener('click', async event => {
    event.stopPropagation();
    const id = button.dataset.profileRename;
    const current = profileMetadata.find(p => p.id === id); if (!current) return;
    const name = await askAegisText('Nouveau nom du profil', current.name); if (!name) return;
    const result = await window.api.renameProfile({ id, name });
    if (result?.ok) { profileMetadata = result.profiles || profileMetadata; renderProfileButton(); renderProfilePopover(); }
    else showToast(result?.error || 'Impossible de renommer le profil.');
  }));
  list.querySelectorAll('[data-profile-delete]').forEach(button => button.addEventListener('click', async event => {
    event.stopPropagation();
    const id = button.dataset.profileDelete;
    const current = profileMetadata.find(p => p.id === id); if (!current) return;
    if (!await confirmAegis(`Supprimer le profil « ${current.name} » ? Son historique, ses cookies et ses données locales seront effacés.`)) return;
    const result = await window.api.deleteProfile(id);
    if (result?.ok) { profileMetadata = result.profiles || profileMetadata; renderProfilePopover(); showToast('Profil supprimé.'); }
    else showToast(result?.error || 'Impossible de supprimer le profil.');
  }));
}
function toggleProfilePopover(force) {
  const pop = $('profile-popover'); if (!pop) return;
  const open = typeof force === 'boolean' ? force : !pop.classList.contains('open');
  if (open) renderProfilePopover();
  pop.classList.toggle('open', open); pop.setAttribute('aria-hidden', open ? 'false' : 'true');
}
function destroyTabsForProfileSwitch() {
  clearTimeout(sessionSaveTimer); sessionSaveTimer = null;
  tabs.forEach(tab => { try { tab.tabEl.remove(); tab.webview.remove(); } catch {} });
  tabs = []; activeTabId = null; tabCounter = 0; closedTabs = []; tabGroups = []; passwordEntries = [];
  $tabs.innerHTML = '';
}
function applyProfileStore(loaded) {
  // Important: never recurse. Rehydrate the renderer from the selected profile.
  store = {
    bookmarks: Array.isArray(loaded?.bookmarks) ? loaded.bookmarks : [],
    history: Array.isArray(loaded?.history) ? loaded.history : [],
    settings: { ...DEFAULT_SETTINGS, ...(loaded?.settings || {}) }
  };
  tabGroups = Array.isArray(loaded?.tabGroups) ? loaded.tabGroups.map(g => ({...g})) : [];
  activeProfileId = loaded?.activeProfileId || 'default';
  activeProfilePartition = loaded?.profilePartition || (activeProfileId === 'default' ? 'persist:main' : `persist:aegis-profile-${activeProfileId}`);
  profileMetadata = Array.isArray(loaded?.profiles) ? loaded.profiles : [];
}
function restoreTabsForProfile(loaded) {
  const restored = (store.settings.restoreSession === true || (Array.isArray(loaded?.tabGroups) && loaded.tabGroups.length > 0)) && Array.isArray(loaded?.session) ? loaded.session.filter(item => isRestorableSessionURL(item?.url || '')).slice(0, 20) : [];
  if (restored.length) {
    restored.forEach((item, index) => createTab(item.url, { background:index !== 0, pinned:Boolean(item.pinned), groupId:item.groupId || null }));
    const publicTabs = tabs.filter(tab => !tab.private);
    const target = publicTabs[Math.max(0, Math.min(Number(loaded?.activeSessionIndex || 0), publicTabs.length - 1))];
    if (target) switchTab(target.id);
  } else createTab(store.settings.homepage);
}
async function switchToProfile(id) {
  closeAllPanels(); hideTabContextMenu(); toggleStartCustomizer(false); closeCommandPalette();
  if (!id || id === activeProfileId) { toggleProfilePopover(false); return; }
  await persistSessionNow();
  try { await window.api.clearPrivateData(); } catch {}
  const result = await window.api.switchProfile(id);
  if (!result?.ok || !result.store) return showToast(result?.error || 'Impossible de changer de profil.');
  destroyTabsForProfileSwitch();
  applyProfileStore(result.store);
  const notes = $('notes-area'); if (notes) notes.value = localStorage.getItem(`aegis:notes:${activeProfileId}`) || '';
  aiRenderHistory();
  applyInterfaceLanguage(store.settings.browserLanguage || 'en');
  applyTheme(); syncSettingsUI(); void updateAdultFilterStatus(); renderBookmarksBar(); renderStartDashboard(); updateDockState();
  renderProfileButton(); renderProfilePopover(); toggleProfilePopover(false);
  restoreTabsForProfile(result.store);
  showToast(`Profil « ${activeProfileMeta().name} » activé.`);
}
async function createUserProfile() {
  const name = await askAegisText('Nom du nouveau profil', 'Nouveau profil'); if (!name) return;
  const result = await window.api.createProfile({ name });
  if (!result?.ok) return showToast(result?.error || 'Impossible de créer le profil.');
  profileMetadata = result.profiles || profileMetadata;
  await switchToProfile(result.profile.id);
}
$('profile-btn')?.addEventListener('click', event => { event.stopPropagation(); if (!$('profile-popover')?.classList.contains('open')) closeAllPanels(); toggleProfilePopover(); });
$('profile-add-btn')?.addEventListener('click', createUserProfile);
$('group-add-btn')?.addEventListener('click', () => createTabGroup(getActiveTab()));
$('profile-popover-close')?.addEventListener('click', () => toggleProfilePopover(false));

$('new-tab-btn').addEventListener('click', () => createTab());
$('tab-search-btn')?.addEventListener('click', () => openCommandPalette('@tabs '));
$backBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (safeCanGoBack(tab)) tab.webview.goBack();
});
$forwardBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (safeCanGoForward(tab)) tab.webview.goForward();
});
$reloadBtn.addEventListener('click', () => {
  const tab = getActiveTab();
  if (!tab) return;
  if (tab.internalStart) return renderActiveSurface();
  if (tab.error) {
    const retry = tab.error.url || tab.lastCommittedUrl;
    if (retry) navigateActive(retry);
    return;
  }
  tab.webview.isLoading() ? tab.webview.stop() : tab.webview.reload();
});
async function navigateActive(input) {
  const target = normalizeURL(input);
  // A direct Google account URL must not be shown in an embedded Electron WebView.
  // External authentication sessions cannot be imported into Aegis.
  try {
    const u = new URL(target);
    if (u.protocol === 'https:' && u.hostname.toLowerCase() === 'accounts.google.com') {
      window.api.openExternal(target).then(() => showToast(uiMessage(
        'Google sign-in opened in your default browser. The session is not shared with Aegis.',
        'Connexion Google ouverte dans votre navigateur par défaut. Cette session n’est pas partagée avec Aegis.'
      ))).catch(() => showToast(uiMessage('System browser unavailable.', 'Navigateur par défaut indisponible.')));
      return;
    }
  } catch {}
  let tab = getActiveTab();
  hideAddressSuggestions();
  if (!tab) {
    createTab(target);
    return;
  }
  if (isStartPageURL(target)) {
    activateStartPage(tab);
    return;
  }
  tab.internalStart = false;
  tab.error = null;
  tab.webview.classList.add('active');
  tab.lastCommittedUrl = target;
  $addressBar.value = displayAddress(target);
  renderActiveSurface();
  updateConnectionInfo();
  updateStarState();
  try {
    // Do not await loadURL here: Chromium may reject the provisional navigation
    // during a perfectly normal redirect while the final page is already loading.
    // did-fail-load is the single source of truth for user-visible failures.
    const navigation = tab.webview.loadURL(target);
    navigation?.catch?.(() => {});
  } catch (error) {
    console.error('Navigation Aegis impossible:', error);
    scheduleBrowserError(tab, { url: target, code: 0, description: 'Aegis n’a pas réussi à lancer la navigation.' }, 1800);
  }
}
function hideAddressSuggestions() {
  addressSuggestionItems = [];
  addressSuggestionIndex = -1;
  const box = $('address-suggestions');
  if (!box) return;
  box.classList.remove('open');
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = '';
}
function selectAddressSuggestion(index) {
  const rows = [...document.querySelectorAll('.address-suggestion')];
  if (!rows.length) return;
  addressSuggestionIndex = Math.max(0, Math.min(index, rows.length - 1));
  rows.forEach((row, i) => row.classList.toggle('selected', i === addressSuggestionIndex));
  rows[addressSuggestionIndex]?.scrollIntoView({ block: 'nearest' });
}
function renderAddressSuggestions(value) {
  const box = $('address-suggestions');
  if (!box) return;
  const query = String(value || '').trim();
  if (!query) return hideAddressSuggestions();
  const lower = query.toLowerCase();
  const items = [];
  const seen = new Set();
  const direct = isURL(query);
  items.push({
    title: direct ? `Ouvrir ${query}` : `Rechercher « ${query} »`,
    subtitle: direct ? normalizeURL(query) : `Recherche ${store.settings.searchEngine === 'duckduckgo' ? 'DuckDuckGo' : store.settings.searchEngine === 'bing' ? 'Bing' : 'Google'}`,
    value: query,
    icon: direct ? '↗' : '⌕',
    kind: direct ? 'adresse' : 'recherche'
  });
  const candidates = [
    ...store.bookmarks.map(item => ({ ...item, kind: 'favori', icon: '★' })),
    ...store.history.slice(0, 160).map(item => ({ ...item, kind: 'historique', icon: '↺' }))
  ];
  for (const item of candidates) {
    const url = String(item.url || '');
    const title = String(item.title || url);
    if (!url || seen.has(url)) continue;
    if (!`${title} ${url}`.toLowerCase().includes(lower)) continue;
    seen.add(url);
    items.push({ title, subtitle: url, value: url, icon: item.icon, kind: item.kind });
    if (items.length >= 7) break;
  }
  addressSuggestionItems = items;
  addressSuggestionIndex = -1;
  box.innerHTML = '';
  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'address-suggestion';
    row.innerHTML = `<div class="address-suggestion-icon">${escapeHTML(item.icon)}</div><div class="address-suggestion-main"><div class="address-suggestion-title">${escapeHTML(item.title)}</div><div class="address-suggestion-url">${escapeHTML(item.subtitle)}</div></div><div class="address-suggestion-kind">${escapeHTML(item.kind)}</div>`;
    row.addEventListener('mousedown', event => event.preventDefault());
    row.addEventListener('click', () => navigateActive(item.value));
    row.addEventListener('mouseenter', () => selectAddressSuggestion(index));
    box.appendChild(row);
  });
  box.classList.add('open');
  box.setAttribute('aria-hidden', 'false');
}
$('home-btn').addEventListener('click', () => navigateActive(store.settings.homepage || DEFAULT_SETTINGS.homepage));
$addressBar.addEventListener('input', () => renderAddressSuggestions($addressBar.value));
$addressBar.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' && addressSuggestionItems.length) {
    event.preventDefault();
    selectAddressSuggestion((addressSuggestionIndex + 1) % addressSuggestionItems.length);
    return;
  }
  if (event.key === 'ArrowUp' && addressSuggestionItems.length) {
    event.preventDefault();
    selectAddressSuggestion(addressSuggestionIndex <= 0 ? addressSuggestionItems.length - 1 : addressSuggestionIndex - 1);
    return;
  }
  if (event.key === 'Escape') {
    hideAddressSuggestions();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const selected = addressSuggestionIndex >= 0 ? addressSuggestionItems[addressSuggestionIndex] : null;
    navigateActive(selected?.value ?? $addressBar.value);
  }
});
$addressBar.addEventListener('focus', () => {
  $addressBar.select();
  if ($addressBar.value.trim()) renderAddressSuggestions($addressBar.value);
});
$addressBar.addEventListener('blur', () => setTimeout(hideAddressSuggestions, 120));
$('start-search-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('start-search-input');
  const value = String(input?.value || '').trim();
  if (!value) return;
  if (startSearchMode === 'ai') {
    if (input) input.value = '';
    await openAiPanel();
    setTimeout(() => submitAiQuestion(value), 60);
    return;
  }
  navigateActive(value);
});
function setStartSearchMode(mode = 'web') {
  startSearchMode = mode === 'ai' ? 'ai' : 'web';
  document.querySelectorAll('[data-start-search-mode]').forEach(button => button.classList.toggle('active', button.dataset.startSearchMode === startSearchMode));
  const input = $('start-search-input');
  if (input) input.placeholder = startSearchMode === 'ai' ? uiMessage('Ask Aegis AI anything…','Demande quelque chose à Aegis AI…') : uiMessage('Search Google or enter an address','Rechercher sur Google ou saisir une adresse');
  input?.focus();
}
document.querySelectorAll('[data-start-search-mode]').forEach(button => button.addEventListener('click', () => setStartSearchMode(button.dataset.startSearchMode)));
$('start-brand-home')?.addEventListener('click', () => activateStartPage());
$('start-open-history')?.addEventListener('click', () => { renderHistoryPanel(); openPanel('history'); });
$('start-pulse-shield')?.addEventListener('click', () => { syncSettingsUI(); openPanel('privacy'); });
$('start-pulse-download')?.addEventListener('click', () => toggleDownloadsPopover(true));
$('start-pulse-ai')?.addEventListener('click', () => openAiPanel());
$('start-customize-btn')?.addEventListener('click', event => { event.stopPropagation(); toggleStartCustomizer(); });
$('start-customizer-close')?.addEventListener('click', () => toggleStartCustomizer(false));
document.querySelectorAll('.wallpaper-choice').forEach(button => button.addEventListener('click', () => setStartWallpaper(button.dataset.wallpaper)));
document.querySelectorAll('.accent-choice').forEach(button => button.addEventListener('click', () => setAccentTheme(button.dataset.accent)));
$('start-toggle-clock')?.addEventListener('change', async event => { store.settings = await window.api.setSettings({ startShowClock: event.target.checked }); applyLayoutSettings(); });
$('start-toggle-recents')?.addEventListener('change', async event => { store.settings = await window.api.setSettings({ startShowRecents: event.target.checked }); applyLayoutSettings(); });
$('start-toggle-actions')?.addEventListener('change', async event => { store.settings = await window.api.setSettings({ startShowActions: event.target.checked }); applyLayoutSettings(); });
$('start-toggle-dock')?.addEventListener('change', async event => { store.settings = await window.api.setSettings({ dockEnabled: event.target.checked }); applyLayoutSettings(); });
$('error-retry').addEventListener('click', () => {
  const tab = getActiveTab();
  const url = tab?.error?.url || tab?.lastCommittedUrl;
  if (url) navigateActive(url);
});
$('error-home').addEventListener('click', () => activateStartPage());
$starBtn.addEventListener('click', toggleCurrentBookmark);
$('bookmarks-btn').addEventListener('click', () => { renderBookmarksPanel(); openPanel('bookmarks'); });
$('downloads-btn').addEventListener('click', event => { event.stopPropagation(); toggleDownloadsPopover(); });
$('downloads-menu').addEventListener('click', () => { renderDownloadsList(); openPanel('downloads'); });
$('desktop-link-btn').addEventListener('click', createDesktopShortcutForCurrentPage);
$('adblock-btn')?.addEventListener('click', event => { event.stopPropagation(); toggleAdblockPopover(); });
$('adblock-btn')?.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); toggleAdblockPopover(true); });
$('adblock-popover-enabled')?.addEventListener('change', async event => { await toggleAdblockGlobal(event.target.checked); await refreshAdblockState(); positionAdblockPopover(); });
$('adblock-popover-site-toggle')?.addEventListener('click', async event => { event.stopPropagation(); await toggleAdblockCurrentSite(); await refreshAdblockState(); positionAdblockPopover(); });
$('adblock-popover-settings')?.addEventListener('click', () => { closeAdblockPopover(); refreshAdblockState().then(() => openPanel('adblock')); });
$('vt-btn').addEventListener('click', checkCurrentUrlWithVirusTotal);
$('privacy-btn').addEventListener('click', () => { syncSettingsUI(); openPanel('privacy'); });
$('adblock-enabled')?.addEventListener('change', event => toggleAdblockGlobal(event.target.checked));
$('adblock-cosmetic')?.addEventListener('change', event => setAdblockCosmetic(event.target.checked));
$('adblock-community')?.addEventListener('change', event => setAdblockCommunityFilters(event.target.checked));
$('adblock-refresh-lists')?.addEventListener('click', refreshAdblockLists);
$('adblock-site-toggle')?.addEventListener('click', toggleAdblockCurrentSite);
$('adblock-reset-stats')?.addEventListener('click', async () => { await window.api.resetAdblockStats(); updateAdblockUI({ ...adblockState, total:0, siteCount:0 }); showToast('Statistiques AdBlock réinitialisées.'); });
$('menu-btn').addEventListener('click', () => openPanel('menu'));
$('history-btn').addEventListener('click', () => { renderHistoryPanel(); openPanel('history'); });
$('passwords-btn').addEventListener('click', openPasswordManager);
$('password-vault-action')?.addEventListener('click', async () => {
  const status = await getVaultStatus();
  if (status?.unlocked) { await window.api.passwordLockVault(); passwordEntries=[]; await refreshPasswordManager(); showToast('Aegis Vault verrouillé.'); }
  else await openVaultGate();
});
$('vault-gate-submit')?.addEventListener('click', submitVaultGate);
$('vault-gate-cancel')?.addEventListener('click', closeVaultGate);
$('vault-master-password')?.addEventListener('keydown', event => { if (event.key === 'Enter') submitVaultGate(); if (event.key === 'Escape') closeVaultGate(); });
$('vault-master-confirm')?.addEventListener('keydown', event => { if (event.key === 'Enter') submitVaultGate(); if (event.key === 'Escape') closeVaultGate(); });

$('credential-prompt-accept')?.addEventListener('click', async () => {
  const action = credentialPromptState?.onAccept;
  if (typeof action !== 'function') return hideCredentialPrompt();
  const btn = $('credential-prompt-accept');
  if (btn) btn.disabled = true;
  try { await action(); } finally { if (btn) btn.disabled = false; }
});
$('credential-prompt-dismiss')?.addEventListener('click', hideCredentialPrompt);
$('credential-prompt-close')?.addEventListener('click', hideCredentialPrompt);
$('password-pending-save').addEventListener('click', savePendingCredential);
$('password-pending-dismiss').addEventListener('click', () => { pendingCredential = null; renderPendingCredential(); });
$('password-manual-save').addEventListener('click', saveManualCredential);
$('password-generate').addEventListener('click', () => {
  $('password-value').value = generatedPassword();
  $('password-value').focus();
  showToast('Mot de passe fort généré.');
});
$('password-search').addEventListener('input', renderPasswordEntries);
$('open-downloads-folder').addEventListener('click', () => window.api.openDownloadsFolder());
$('downloads-popover-close')?.addEventListener('click', closeDownloadsPopover);
$('downloads-popover-folder')?.addEventListener('click', () => { window.api.openDownloadsFolder(); closeDownloadsPopover(); });
$('downloads-popover-all')?.addEventListener('click', () => { closeDownloadsPopover(); renderDownloadsList(); openPanel('downloads'); });
$('bookmarks-filter')?.addEventListener('input', renderBookmarksPanel);
$('history-filter')?.addEventListener('input', renderHistoryPanel);
$('clear-downloads-list')?.addEventListener('click', () => { for (const [id,item] of downloadItems) if (item.done) downloadItems.delete(id); renderDownloadsList(); showToast('Téléchargements terminés retirés de la liste.'); });

let browserUpdateState = { currentVersion:'5.9.2-beta.2', latestVersion:'5.9.2-beta.2', available:false, status:'idle', configured:false, error:'' };
function renderUpdateUI(state = browserUpdateState) {
  browserUpdateState = { ...browserUpdateState, ...(state || {}) };
  const btn=$('update-btn');
  const available=Boolean(browserUpdateState.available);
  btn?.classList.toggle('hidden', !available);
  if (btn) btn.textContent = available ? `MAJ ${browserUpdateState.latestVersion || ''}`.trim() : 'MAJ';
  const badge=$('update-current-version'); if (badge) badge.textContent = `Aegis Web ${browserUpdateState.currentVersion || '5.9.2-beta.2'}`;
  const title=$('update-title'), copy=$('update-copy'), action=$('update-action'), install=$('update-install'), progress=$('update-progress'), bar=$('update-progress-bar');
  if (!title || !copy) return;
  const st=browserUpdateState.status;
  if (st==='checking') { title.textContent='Recherche de mise à jour…'; copy.textContent='Aegis vérifie la dernière version disponible.'; }
  else if (st==='available') { title.textContent=`Aegis Web ${browserUpdateState.latestVersion} est disponible`; copy.textContent='La mise à jour peut être téléchargée directement dans Aegis.'; }
  else if (st==='downloading') { title.textContent='Téléchargement de la mise à jour…'; copy.textContent='Tu peux continuer à naviguer pendant le téléchargement.'; }
  else if (st==='ready') { title.textContent='Mise à jour prête'; copy.textContent='Aegis peut installer la nouvelle version puis redémarrer.'; }
  else if (st==='current') { title.textContent='Aegis est à jour'; copy.textContent=`Version actuelle : ${browserUpdateState.currentVersion}.`; }
  else if (st==='not-configured') { title.textContent='Dépôt GitHub non configuré'; copy.textContent='Renseigne owner/repository dans Paramètres → GitHub repository. Aucune clé API n’est nécessaire pour un dépôt public.'; }
  else if (st==='error') { title.textContent='Mise à jour indisponible'; copy.textContent=browserUpdateState.error || 'Impossible de joindre le serveur de mise à jour.'; }
  else { title.textContent='Mises à jour Aegis'; copy.textContent='Vérification automatique au démarrage.'; }
  if (action) { action.classList.toggle('hidden', !(st==='available'||st==='current'||st==='error'||st==='not-configured'||st==='idle')); action.textContent = st==='available' ? 'Télécharger' : 'Vérifier maintenant'; }
  if (install) install.classList.toggle('hidden', st!=='ready');
  if (progress) progress.classList.toggle('hidden', st!=='downloading');
  if (bar && st!=='downloading') bar.style.width='0%';
}
async function openUpdatePanel() {
  closeAllPanels(); openPanel('update');
  try { renderUpdateUI(await window.api.getUpdateStatus()); } catch {}
}

$('clear-history-btn').addEventListener('click', async () => {
  store.history = await window.api.clearHistory();
  renderHistoryPanel();
  showToast('Historique effacé.');
});
$('menu-filter')?.addEventListener('input',filterMenuPanel);
$('settings-filter')?.addEventListener('input',filterSettingsPanel);
for (const id of ['menu-filter','settings-filter']) {
  $(id)?.addEventListener('keydown',event => {
    if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); $(id).value=''; id==='menu-filter'?filterMenuPanel():filterSettingsPanel(); }
  });
}
document.querySelectorAll('[data-clear-search]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.clearSearch; if (!$(id))return;
  $(id).value=''; id==='menu-filter'?filterMenuPanel():filterSettingsPanel(); $(id).focus();
}));
$('menu-newtab').addEventListener('click', () => { createTab(); closeAllPanels(); });
$('menu-private').addEventListener('click', () => { createTab(undefined, { private: true }); closeAllPanels(); });
$('menu-reopen').addEventListener('click', () => { reopenClosedTab(); closeAllPanels(); });
$('menu-find').addEventListener('click', openFindBar);
$('menu-command').addEventListener('click', () => openCommandPalette());
$('menu-overview')?.addEventListener('click', () => { closeAllPanels(); openTabOverview(); });
$('menu-focus')?.addEventListener('click', () => { closeAllPanels(); toggleFocusMode(); });
$('menu-adblock')?.addEventListener('click', () => { closeAllPanels(); refreshAdblockState().then(() => openPanel('adblock')); });
$('menu-reader').addEventListener('click', () => { closeAllPanels(); openReaderMode(); });
$('menu-notes').addEventListener('click', openNotes);
$('menu-duplicate').addEventListener('click', () => { duplicateTab(); closeAllPanels(); });
$('menu-pin').addEventListener('click', () => { togglePinnedTab(); closeAllPanels(); });
$('menu-clean-url').addEventListener('click', () => { copyCleanCurrentUrl(); closeAllPanels(); });
$('menu-print').addEventListener('click', () => { const tab=getActiveTab(); if (tab && !tab.internalStart && !tab.error) tab.webview.print(); else showToast('Ouvrez une page web à imprimer.'); closeAllPanels(); });
$('menu-zoom-in').addEventListener('click', () => changeZoom(0.1));
$('menu-zoom-out').addEventListener('click', () => changeZoom(-0.1));
$('menu-zoom-reset').addEventListener('click', () => { getActiveTab()?.webview.setZoomFactor(1); updateZoomLabel(1); });
$('menu-fullscreen').addEventListener('click', () => { window.api.toggleFullscreen(); closeAllPanels(); });
$('menu-homepage-set').addEventListener('click', async () => {
  const tab = getActiveTab();
  const url = tab?.internalStart ? INTERNAL_START_PAGE : safeWebviewURL(tab);
  if (url && (isStartPageURL(url) || /^https?:\/\//i.test(url))) {
    store.settings = await window.api.setSettings({ homepage: url });
    syncSettingsUI();
    showToast('Page d’accueil mise à jour.');
  }
  closeAllPanels();
});
$('menu-settings').addEventListener('click', () => { syncSettingsUI(); openPanel('settings'); });
$('menu-support')?.addEventListener('click', () => { window.api.openSupport(); closeAllPanels(); });
$('support-settings-btn')?.addEventListener('click', () => window.api.openSupport());
$('update-btn')?.addEventListener('click', openUpdatePanel);
$('menu-update')?.addEventListener('click', openUpdatePanel);
$('update-action')?.addEventListener('click', async () => { const st=browserUpdateState.status; renderUpdateUI(st==='available'?{status:'downloading'}:{status:'checking'}); const result=st==='available'?await window.api.downloadUpdate():await window.api.checkUpdates(true); renderUpdateUI(result); });
$('update-install')?.addEventListener('click', async () => { $('update-install').disabled=true; $('update-install').textContent='Installation…'; const result=await window.api.installUpdate(); if (!result?.ok) { $('update-install').disabled=false; $('update-install').textContent='Installer et redémarrer'; showToast(result?.error||'Impossible d’installer la mise à jour.'); } });
$('save-settings-btn').addEventListener('click', async () => {
  store.settings = await window.api.setSettings({
    browserLanguage: $('settings-language')?.value || 'en',
    translationTarget: $('settings-translation-target')?.value || 'fr',
    translationCloudEndpoint: $('settings-translation-cloud-endpoint')?.value.trim() || '',
    developerToolsEnabled: $('settings-devtools-enabled')?.checked !== false,
    aiProcessing: $('settings-ai-processing')?.value || 'cloud-preferred',
    aiCloudEndpoint: $('settings-ai-cloud-endpoint')?.value.trim() || '',
    homepage: normalizeHomepageInput($('settings-homepage').value),
    searchEngine: $('settings-search').value,
    themePreset: $('settings-theme-preset')?.value || 'total-black',
    backgroundStyle: $('settings-background-style')?.value || 'none',
    interfaceDensity: $('settings-density')?.value || 'comfortable',
    theme: ['total-white','ivory','frost'].includes($('settings-theme-preset')?.value) ? 'light' : 'dark',
    startWallpaper: $('settings-wallpaper').value,
    startShowClock: $('settings-start-clock').checked,
    startShowRecents: $('settings-start-recents').checked,
    compactTabs: $('settings-compact-tabs').checked,
    accentTheme: $('settings-accent').value,
    dockEnabled: $('settings-dock').checked,
    startShowActions: $('settings-start-actions').checked,
    animations: $('settings-animations').checked,
    adblockEnabled: $('settings-adblock').checked,
    adblockCosmetic: $('settings-adblock-cosmetic').checked,
    adblockCommunityFilters: $('settings-adblock-community').checked,
    virusTotalApiKey: $('settings-vt-key').value.trim(),
    showBookmarksBar: $('settings-bookmarks-bar').checked,
    restoreSession: $('settings-restore-session').checked,
    webrtcIpProtection: $('privacy-webrtc-ip')?.checked !== false,
    githubRepository: $('settings-github-repository')?.value.trim() || '',
    updateFeedUrl: '',
    adultFilterEnabled: $('settings-adult-filter')?.checked === true,
    autoCheckUpdates: $('settings-auto-updates')?.checked !== false
  });
  await window.api.setAdblockEnabled(store.settings.adblockEnabled !== false);
  await window.api.setAdblockCosmetic(store.settings.adblockCosmetic !== false);
  await window.api.setAdblockCommunityFilters(store.settings.adblockCommunityFilters !== false);
  await refreshAdblockState();
  applyInterfaceLanguage(store.settings.browserLanguage || 'en'); applyTheme(); renderBookmarksBar(); syncSettingsUI(); renderStartDashboard(); closeAllPanels(); showToast('Paramètres enregistrés.');
});
// Apply look immediately without requiring the user to discover the Save button.
$('settings-theme-preset')?.addEventListener('change', async event => {
  const themePreset = event.target.value;
  store.settings.themePreset=themePreset;
  store.settings.theme=['total-white','ivory','frost'].includes(themePreset)?'light':'dark';
  applyTheme();
  try { store.settings=await window.api.setSettings({themePreset,theme:store.settings.theme}); }
  catch(error){showToast('Impossible d’enregistrer le thème : '+String(error?.message||error));}
});
$('settings-accent')?.addEventListener('change', event => setAccentTheme(event.target.value));
$('settings-adult-filter')?.addEventListener('change', async event => {
  const enabled=event.target.checked;
  try {
    store.settings=await window.api.setSettings({adultFilterEnabled:enabled});
    showToast(enabled?'Filtre activé. Mise à jour de la liste en cours.':'Filtre anti-pornographie désactivé.');
    await updateAdultFilterStatus();
  } catch(error) { event.target.checked=!enabled; showToast('Erreur : '+String(error?.message||error)); }
});
$('adult-filter-refresh')?.addEventListener('click', async () => {
  if(store.settings.adultFilterEnabled!==true)return showToast('Active le filtre pour actualiser la liste.');
  const button=$('adult-filter-refresh');button.disabled=true;
  try { await window.api.refreshAdultFilter(); await updateAdultFilterStatus(); }
  finally { button.disabled=false; }
});
window.api.onAdultFilterStatus?.(() => { void updateAdultFilterStatus(); });
async function updateAdultFilterStatus() {
  try {
    const data=await window.api.getAdultFilterStatus();
    if ($('adult-filter-status')) $('adult-filter-status').textContent = data.enabled ?
      `${Number(data.domains||0).toLocaleString('fr-FR')} domaines dans la liste · ${data.updatedAt?'mise à jour '+new Date(data.updatedAt).toLocaleDateString('fr-FR'):'liste complète pas encore téléchargée'}` : 'Filtre désactivé';
  } catch { if ($('adult-filter-status')) $('adult-filter-status').textContent='État indisponible'; }
}
$('settings-language')?.addEventListener('change', event => { applyInterfaceLanguage(event.target.value || 'en'); });
$('first-run-language')?.addEventListener('change', event => { store.settings.browserLanguage = event.target.value || 'en'; applyInterfaceLanguage(store.settings.browserLanguage); });
$('privacy-trackers').addEventListener('change', async event => {
  store.settings = await window.api.setSettings({ blockTrackers: event.target.checked });
  showToast(event.target.checked ? 'Protection anti‑tracking activée.' : 'Protection anti‑tracking désactivée.');
});
$('privacy-dnt').addEventListener('change', async event => {
  store.settings = await window.api.setSettings({ doNotTrack: event.target.checked });
});
$('privacy-location').addEventListener('change', async event => {
  store.settings = await window.api.setSettings({ blockLocationPrompts: event.target.checked });
  showToast(event.target.checked ? 'Demandes de localisation bloquées sans popup.' : 'Les sites pourront à nouveau demander votre position.');
});
$('privacy-webrtc-ip')?.addEventListener('change', async event => { store.settings = await window.api.setSettings({ webrtcIpProtection: event.target.checked }); showToast(event.target.checked ? 'Protection WebRTC activée · redémarrage requis.' : 'Protection WebRTC désactivée · redémarrage requis.'); });
$('clear-browsing-data').addEventListener('click', async () => {
  await window.api.clearBrowsingData();
  updateBlockedCount(0);
  showToast('Cookies et cache effacés.');
});
$('vt-open-report').addEventListener('click', () => {
  if (virusTotalReportUrl) createTab(virusTotalReportUrl);
  closeAllPanels();
});
$siteInfo.addEventListener('click', event => {
  event.stopPropagation();
  updateConnectionInfo();
  const popover = $('site-popover');
  popover.classList.toggle('open');
  popover.setAttribute('aria-hidden', popover.classList.contains('open') ? 'false' : 'true');
});
document.addEventListener('click', event => {
  if (!$('site-popover').contains(event.target) && event.target !== $siteInfo) closeSitePopover();
  if (!$('adblock-popover')?.contains(event.target) && event.target !== $('adblock-btn')) closeAdblockPopover();
  if (!$('tab-context-menu')?.contains(event.target)) hideTabContextMenu();
  if (!$('profile-popover')?.contains(event.target) && !$('profile-btn')?.contains(event.target)) toggleProfilePopover(false);
  if (!$('start-customizer')?.contains(event.target) && event.target !== $('start-customize-btn')) toggleStartCustomizer(false);
});
$overlay.addEventListener('click', closeAllPanels);
document.querySelectorAll('.close-panel').forEach(button => button.addEventListener('click', closeAllPanels));
$('command-input')?.addEventListener('input', event => renderCommandPalette(event.target.value));
$('command-input')?.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown') { event.preventDefault(); selectCommandResult(commandPaletteIndex + 1); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); selectCommandResult(commandPaletteIndex - 1); }
  else if (event.key === 'Enter') { event.preventDefault(); executeCommandResult(); }
  else if (event.key === 'Escape') { event.preventDefault(); closeCommandPalette(); }
});
$('command-palette')?.addEventListener('mousedown', event => { if (event.target === $('command-palette')) closeCommandPalette(); });
$('reader-close')?.addEventListener('click', closeReaderMode);
$('reader-font-down')?.addEventListener('click', () => { readerFontSize = Math.max(15, readerFontSize - 1); $('reader-content').style.fontSize = `${readerFontSize}px`; });
$('reader-font-up')?.addEventListener('click', () => { readerFontSize = Math.min(28, readerFontSize + 1); $('reader-content').style.fontSize = `${readerFontSize}px`; });
$('notes-textarea')?.addEventListener('input', saveNotes);
$('notes-clear')?.addEventListener('click', () => { $('notes-textarea').value=''; saveNotes(); showToast('Notes effacées.'); });
document.querySelectorAll('[data-tab-action]').forEach(button => button.addEventListener('click', () => handleTabContextAction(button.dataset.tabAction)));

$('overview-close')?.addEventListener('click', closeTabOverview);
$('overview-new-tab')?.addEventListener('click', () => { closeTabOverview(); createTab(); });
$('overview-filter')?.addEventListener('input', event => renderTabOverview(event.target.value));
$('overview-filter')?.addEventListener('keydown', event => { if (event.key === 'Escape') closeTabOverview(); });
$('tab-overview')?.addEventListener('mousedown', event => { if (event.target === $('tab-overview')) closeTabOverview(); });
$('focus-exit')?.addEventListener('click', () => toggleFocusMode(false));
document.querySelectorAll('[data-dock-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.dockAction;
  if (action === 'home') navigateActive(INTERNAL_START_PAGE);
  else if (action === 'overview') openTabOverview();
  else if (action === 'adblock') { refreshAdblockState().then(() => openPanel('adblock')); }
  else if (action === 'ai') openAiPanel();
  else if (action === 'bookmarks') { renderBookmarksPanel(); openPanel('bookmarks'); }
  else if (action === 'history') { renderHistoryPanel(); openPanel('history'); }
  else if (action === 'downloads') { renderDownloadsList(); openPanel('downloads'); }
  else if (action === 'notes') openNotes();
  else if (action === 'focus') toggleFocusMode();
  else if (action === 'settings') { syncSettingsUI(); openPanel('settings'); }
}));
document.querySelectorAll('[data-start-action]').forEach(button => button.addEventListener('click', () => {
  const action = button.dataset.startAction;
  if (action === 'private') createTab(undefined,{private:true});
  else if (action === 'overview') openTabOverview();
  else if (action === 'commands') openCommandPalette();
  else if (action === 'notes') openNotes();
  else if (action === 'adblock') { refreshAdblockState().then(() => openPanel('adblock')); }
  else if (action === 'ai') openAiPanel();
  else if (action === 'focus') toggleFocusMode();
}));
$('find-input').addEventListener('input', () => findInPage(true, true));
$('find-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') findInPage(!event.shiftKey, false);
  if (event.key === 'Escape') closeFindBar();
});
$('find-prev').addEventListener('click', () => findInPage(false, false));
$('find-next').addEventListener('click', () => findInPage(true, false));
$('find-close').addEventListener('click', closeFindBar);
$('first-run-next')?.addEventListener('click', () => setOnboardingStep(onboardingStep + 1));
$('first-run-back')?.addEventListener('click', () => setOnboardingStep(onboardingStep - 1));
$('first-run-start')?.addEventListener('click', () => completeFirstRun(false));
$('first-run-skip')?.addEventListener('click', () => completeFirstRun(true));
document.querySelectorAll('.onboarding-step-dot').forEach(button => button.addEventListener('click', () => setOnboardingStep(Number(button.dataset.onboardingStep))));
document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
  $('first-run-theme').value = button.dataset.themeChoice;
  document.body.classList.toggle('light', button.dataset.themeChoice === 'light');
  syncOnboardingChoices();
}));
document.querySelectorAll('[data-first-accent]').forEach(button => button.addEventListener('click', () => {
  store.settings.accentTheme = button.dataset.firstAccent;
  document.body.dataset.accent = button.dataset.firstAccent;
  syncOnboardingChoices();
}));
document.querySelectorAll('.homepage-choice').forEach(button => button.addEventListener('click', () => {
  const value = button.dataset.homepage;
  if (value !== 'custom') $('first-run-homepage').value = value;
  else if ([INTERNAL_START_PAGE,'https://www.google.com'].includes($('first-run-homepage').value)) $('first-run-homepage').value = 'https://';
  syncOnboardingChoices();
  if (value === 'custom') setTimeout(() => $('first-run-homepage').focus(), 20);
}));
$('first-run-homepage')?.addEventListener('input', syncOnboardingChoices);
$('restart-onboarding-btn')?.addEventListener('click', () => { closeAllPanels(); showFirstRunConfiguration(true); });
window.api.onDownloadStarted(data => {
  downloadItems.set(data.id, { ...data, received: 0, done: false });
  activeDownloadCount += 1; updateDownloadDockBadge();
  renderDownloadsList(); renderDownloadsPopover();
  // Chrome-like behavior: surface the download immediately without opening the full panel.
  requestAnimationFrame(() => toggleDownloadsPopover(true));
  showToast(uiMessage(`Download started: ${data.filename}`, `Téléchargement démarré : ${data.filename}`));
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
});
window.api.onDownloadProgress(data => {
  if (!downloadItems.has(data.id)) return;
  downloadItems.set(data.id, { ...downloadItems.get(data.id), ...data });
  renderDownloadsList(); renderDownloadsPopover();
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
});
window.api.onDownloadDone(data => {
  downloadItems.set(data.id, { ...(downloadItems.get(data.id) || {}), ...data, done: true });
  activeDownloadCount = Math.max(0, activeDownloadCount - 1); updateDownloadDockBadge();
  renderDownloadsList(); renderDownloadsPopover();
  if ($('start-page')?.classList.contains('show')) renderStartDashboard();
  showToast(data.state === 'completed' ? uiMessage(`Download complete: ${data.filename}`, `Téléchargement terminé : ${data.filename}`) : uiMessage(`Download failed: ${data.filename}`, `Échec du téléchargement : ${data.filename}`));
});
window.api.onBlockedCount(updateBlockedCount);
window.api.onAdblockBlocked(data => {
  const host = currentPageHost();
  const siteCount = data?.site === host ? Number(data.siteCount || 0) : Number(adblockState.siteCount || 0);
  updateAdblockUI({ ...adblockState, total: Number(data?.total || 0), siteCount });
});
window.api.onAdblockListStatus?.(data => updateAdblockUI({ ...adblockState, ...(data || {}), communityRules: Number(data?.loaded || adblockState.communityRules || 0), listUpdatedAt: Number(data?.updatedAt || adblockState.listUpdatedAt || 0), listError: String(data?.error || '') }));
window.api.onOpenTab(url => { if (/^https?:\/\//i.test(url)) createTab(url); });
window.api.onBrowserShortcut(handleBrowserShortcut);
window.api.onGoogleLoginExternal?.(data => {
  if (data?.success) showToast(uiMessage('Google sign-in opened in your default browser. The session will not be shared with Aegis.', 'Connexion Google ouverte dans votre navigateur par défaut. Cette session ne sera pas partagée avec Aegis.'));
  else showToast(uiMessage('Unable to open the system browser.', 'Impossible d’ouvrir le navigateur par défaut.'));
});
window.api.onTabCrashed(data => {
  const tab = tabs.find(item => { try { return item.webview.getWebContentsId() === data?.id; } catch { return false; } });
  if (!tab) return;
  tab.tabEl.classList.add('crashed');
  if (!tab.internalStart) {
    tab.error = {
      url: safeWebviewURL(tab) || '',
      code: 0,
      description: `L’onglet s’est arrêté (${data?.reason || 'erreur inconnue'}).`
    };
    if (tab.id === activeTabId) showBrowserError(tab);
  }
  showToast('Un onglet a planté. Vous pouvez le relancer immédiatement.');
});
window.api.onHtmlFullscreen(active => {
  document.body.classList.toggle('html-fullscreen', active);
  if (active) { closeFindBar(); closeAllPanels(); closeSitePopover(); closeAdblockPopover(); closeTabOverview(); closeCommandPalette(); }
});
window.api.onWindowFullscreen?.(active => {
  document.body.classList.toggle('window-fullscreen', active);
  if (active) { closeFindBar(); closeAllPanels(); closeSitePopover(); closeAdblockPopover(); closeTabOverview(); closeCommandPalette(); }
});
window.addEventListener('resize', () => { if ($('adblock-popover')?.classList.contains('open')) positionAdblockPopover(); });
window.addEventListener('keydown', event => {
  const ctrl = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  let action = '';
  if (ctrl && key === 't' && !event.shiftKey) action = 'new-tab';
  else if (ctrl && key === 'w') action = 'close-tab';
  else if (ctrl && event.shiftKey && key === 't') action = 'reopen-tab';
  else if (ctrl && key === 'l' && !event.shiftKey) action = 'focus-address';
  else if (ctrl && key === 'r') action = 'reload';
  else if (ctrl && key === 'f') action = 'find';
  else if (ctrl && key === 'k' && !event.shiftKey) action = 'command-palette';
  else if (ctrl && event.shiftKey && key === 'a') action = 'tab-overview';
  else if (ctrl && event.shiftKey && key === 'e') action = 'notes';
  else if (ctrl && event.shiftKey && key === 'u') action = 'adblock';
  else if (ctrl && key === 'h') action = 'history';
  else if (ctrl && key === 'j') action = 'downloads';
  else if (ctrl && key === 'd') action = 'bookmark';
  else if (ctrl && event.shiftKey && key === 'b') action = 'toggle-bookmarks-bar';
  else if (ctrl && event.shiftKey && key === 'n') action = 'private-tab';
  else if (ctrl && event.shiftKey && key === 'l') action = 'passwords';
  else if (ctrl && key === 'p') action = 'print';
  else if (ctrl && /^[1-9]$/.test(key)) action = `tab-${key}`;
  else if (ctrl && event.shiftKey && key === 'tab') action = 'previous-tab';
  else if (ctrl && key === 'tab') action = 'next-tab';
  else if (ctrl && ['+','='].includes(event.key)) action = 'zoom-in';
  else if (ctrl && event.key === '-') action = 'zoom-out';
  else if (ctrl && event.key === '0') action = 'zoom-reset';
  else if (event.key === 'F12' || (ctrl && event.shiftKey && key === 'i')) action = 'developer-tools';
  else if (ctrl && event.shiftKey && key === 'y') action = 'translate';
  else if (event.key === 'F9') action = 'focus-mode';
  else if (event.key === 'F11') action = 'app-fullscreen';
  else if (event.altKey && event.key === 'ArrowLeft') action = 'back';
  else if (event.altKey && event.key === 'ArrowRight') action = 'forward';
  if (action) { event.preventDefault(); handleBrowserShortcut(action); }
  else if (event.key === 'Escape') { closeTabOverview(); hideAddressSuggestions(); closeFindBar(); closeAllPanels(); closeSitePopover(); closeAdblockPopover(); hideTabContextMenu(); toggleStartCustomizer(false); closeCommandPalette(); closeReaderMode(); }
});
window.addEventListener('resize', () => { if ($('downloads-popover')?.classList.contains('open')) positionDownloadsPopover(); });
document.addEventListener('click', event => { const pop=$('downloads-popover'),btn=$('downloads-btn'); if (pop?.classList.contains('open') && !pop.contains(event.target) && !btn?.contains(event.target)) closeDownloadsPopover(); });
(async () => {
  // 5.5.2: never inherit a visible utility panel on startup.
  closeAllPanels();
  const loaded = await window.api.getStore();
  applyProfileStore(loaded);
  applyInterfaceLanguage(store.settings.browserLanguage || 'en');
  blockedCount = await window.api.getBlockedCount();
  updateBlockedCount(blockedCount);
  await refreshAdblockState();
  applyTheme(); syncSettingsUI(); void updateAdultFilterStatus(); renderBookmarksBar(); renderDownloadsList(); renderStartDashboard(); updateDockState(); updateDownloadDockBadge(); renderProfileButton();
  const needsOnboarding = Number(store.settings.onboardingVersion || 0) < 550;
  if (needsOnboarding) {
    showFirstRunConfiguration(false);
  } else if (store.settings.firstRunComplete) {
    const restored = (store.settings.restoreSession === true || (Array.isArray(loaded?.tabGroups) && loaded.tabGroups.length > 0)) && Array.isArray(loaded?.session) ? loaded.session.filter(item => isRestorableSessionURL(item?.url || '')).slice(0, 20) : [];
    if (restored.length) {
      restored.forEach((item, index) => createTab(item.url, { background: index !== 0, pinned: Boolean(item.pinned), groupId: item.groupId || null }));
      const publicTabs = tabs.filter(tab => !tab.private);
      const target = publicTabs[Math.max(0, Math.min(Number(loaded?.activeSessionIndex || 0), publicTabs.length - 1))];
      if (target) switchTab(target.id);
    } else createTab(store.settings.homepage);
  } else showFirstRunConfiguration(false);
})();

// ---- Aegis i18n + Fast Translate + DevTools 5.5 ----
const UI_FR_EN = {"Première configuration": "First setup", "Votre Aegis": "Your Aegis", "Bienvenue": "Welcome", "Apparence": "Appearance", "Style & ambiance": "Style & atmosphere", "Recherche & accueil": "Search & home", "Protection": "Protection", "Finaliser": "Finish", "Interface & Vault": "Interface & Vault", "Étape 1 sur 5": "Step 1 of 5", "Utiliser les réglages recommandés": "Use recommended settings", "Bienvenue dans Aegis": "Welcome to Aegis", "Un navigateur à votre image.": "A browser made yours.", "Quelques réglages suffisent pour préparer votre espace. Tout restera modifiable plus tard dans les Paramètres.": "A few settings are enough to prepare your space. Everything can be changed later in Settings.", "Rechercher ou saisir une adresse": "Search or enter an address", "Intégré": "Built in", "Vie privée": "Privacy", "Contrôlable": "Under your control", "Choisissez votre ambiance.": "Choose your style.", "Le style s’applique instantanément à l’interface et à Aegis Start.": "Your style applies instantly to the interface and Aegis Start.", "Mode": "Mode", "Sombre": "Dark", "Noir profond": "Deep black", "Clair": "Light", "Lumineux": "Bright", "Couleur d’accent": "Accent color", "Bleu": "Blue", "Ambre": "Amber", "Fond Aegis Start": "Aegis Start background", "Décidez comment vous commencez.": "Choose how you start.", "Choisissez votre moteur de recherche et ce qu’Aegis affiche quand vous ouvrez le navigateur.": "Choose your search engine and what Aegis shows when the browser opens.", "Moteur de recherche": "Search engine", "Page d’accueil": "Home page", "Recommandé": "Recommended", "Page classique": "Classic page", "Personnalisée": "Custom", "Votre URL": "Your URL", "Votre niveau de protection.": "Choose your protection level.", "Ces protections peuvent être modifiées à tout moment, globalement ou site par site.": "These protections can be changed at any time, globally or per site.", "Bloque les publicités et masque leurs emplacements.": "Blocks ads and hides their empty placeholders.", "Anti-tracking": "Anti-tracking", "Bloque les domaines de suivi connus.": "Blocks known tracking domains.", "Demande aux sites de limiter le suivi lorsque cela est pertinent.": "Asks sites to limit tracking when applicable.", "Derniers réglages": "Final settings", "Prêt à naviguer.": "Ready to browse.", "Affinez l’interface puis démarrez Aegis. Le coffre de mots de passe peut être créé immédiatement ou plus tard.": "Fine-tune the interface, then start Aegis. The password vault can be created now or later.", "Barre de favoris": "Bookmarks bar", "Toujours visible sous l’adresse.": "Always visible below the address bar.", "Accès rapide aux outils sur le côté.": "Quick access to tools on the side.", "Restaurer la session": "Restore session", "Rouvre vos onglets publics au prochain démarrage.": "Reopens your public tabs on the next launch.", "Configurer Aegis Vault après l’assistant": "Set up Aegis Vault after setup", "Créer votre coffre de mots de passe local et chiffré.": "Create your local encrypted password vault.", "Configuration prête": "Setup ready", "Vous pourrez relancer cet assistant depuis Paramètres.": "You can run this setup again from Settings.", "Retour": "Back", "Continuer": "Continue", "Ouvrir Aegis": "Open Aegis", "Onglets": "Tabs", "Personnaliser": "Customize", "Aujourd’hui": "Today", "Entrée": "Enter", "Privé": "Private", "Nouvel onglet": "New tab", "Vue d’ensemble": "Overview", "Commandes": "Commands", "Notes": "Notes", "Bloc-notes local": "Local notepad", "Protection native": "Native protection", "Recherche IA": "Local research", "Interface minimale": "Minimal interface", "Reprendre": "Continue browsing", "Historique": "History", "Protection Aegis active": "Aegis protection active", "adresse ·": "address ·", "commandes ·": "commands ·", "nouvel onglet": "new tab", "Ambiance": "Background", "Afficher l’horloge": "Show clock", "Afficher les sites récents": "Show recent sites", "Afficher les actions rapides": "Show quick actions", "Impossible d’afficher cette page": "Unable to display this page", "La page n’a pas pu être chargée.": "The page could not be loaded.", "Réessayer": "Try again", "Accueil": "Home", "Navigation": "Navigation", "Bibliothèque": "Library", "Favoris": "Bookmarks", "Effacer": "Clear", "Fichiers": "Files", "Téléchargements": "Downloads", "Ouvrir le dossier": "Open folder", "Nettoyer la liste": "Clear list", "Protection active": "Protection active", "requêtes publicitaires bloquées": "ad requests blocked", "Bloquer les publicités": "Block ads", "Bloque les publicités et les requêtes publicitaires indésirables.": "Blocks ads and unwanted advertising requests.", "Site actuel": "Current site", "Aucun site ouvert": "No site open", "0 élément bloqué sur ce site": "0 items blocked on this site", "Autoriser sur ce site": "Allow on this site", "Masquage cosmétique": "Cosmetic filtering", "Retire aussi les emplacements publicitaires visibles après le chargement.": "Also removes visible ad placeholders after loading.", "Filtres communautaires EasyList": "EasyList community filters", "Complète les règles Aegis avec les domaines publicitaires issus d’EasyList.": "Complements Aegis rules with advertising domains from EasyList.", "Liste locale Aegis uniquement": "Aegis local list only", "Mettre à jour": "Update", "Réseau": "Network", "Domaines publicitaires et requêtes tierces suspectes": "Ad domains and suspicious third-party requests", "Exceptions": "Exceptions", "0 site": "0 sites", "Réinitialiser les statistiques": "Reset statistics", "Si un site fonctionne mal, vous pouvez mettre la protection en pause uniquement pour ce domaine. Les filtres communautaires complètent les règles Aegis.": "If a site breaks, you can pause protection only for that domain. Community filters complement Aegis rules.", "Confidentialité": "Privacy", "Requêtes de suivi bloquées": "Tracking requests blocked", "La protection intégrée limite les traqueurs connus et complète Aegis AdBlock.": "Built-in protection limits known trackers and complements Aegis AdBlock.", "Bloquer les traqueurs connus": "Block known trackers", "Protection basique contre certains domaines analytiques et publicitaires.": "Basic protection against known analytics and advertising domains.", "Envoyer “Do Not Track”": "Send “Do Not Track”", "Ajoute l’en-tête DNT=1 aux requêtes web.": "Adds the DNT=1 header to web requests.", "Bloquer les demandes de localisation": "Block location requests", "Activé par défaut : les demandes de position sont refusées silencieusement, sans popup répétitive.": "Enabled by default: location requests are silently denied without repeated popups.", "Effacer cookies et cache": "Clear cookies and cache", "Analyse de lien": "Link scan", "Aucune analyse": "No scan yet", "Ouvrez une page HTTP/HTTPS puis utilisez le bouton VT.": "Open an HTTP/HTTPS page, then use the VT button.", "Malveillant": "Malicious", "Suspect": "Suspicious", "Sans détection": "No detection", "Non détecté": "Undetected", "VirusTotal agrège les résultats de plusieurs moteurs. Zéro détection ne constitue pas une garantie absolue de sécurité.": "VirusTotal aggregates results from multiple engines. Zero detections is not an absolute guarantee of safety.", "Ouvrir le rapport VirusTotal": "Open VirusTotal report", "Aegis Intelligence": "Aegis Intelligence", "100 % local après installation": "100% local after installation", "Votre assistant de recherche intégré.": "Your built-in research assistant.", "Aegis choisit automatiquement un modèle adapté à votre PC. Les réponses sont générées localement ; seules les recherches Web consultent Internet.": "Aegis automatically chooses a model suited to your PC. Answers are generated locally; only web searches access the Internet.", "Profil recommandé": "Recommended profile", "Analyse…": "Analyzing…", "Mémoire": "Memory", "Processeur": "Processor", "Modèle local": "Local model", "Le moteur et le modèle sont téléchargés une seule fois, puis fonctionnent hors ligne. Aucun prompt n’est envoyé à un service d’IA distant.": "The engine and model are downloaded once, then work offline. No prompt is sent to a remote AI service.", "Installer Aegis AI": "Install Aegis AI", "Supprimer le modèle local": "Remove local model", "Préparation…": "Preparing…", "Annuler": "Cancel", "Nouvelle discussion": "New chat", "Cette page": "This page", "Sélection": "Selection", "Que veux-tu savoir ?": "What do you want to know?", "Je peux chercher sur le Web à ta place, résumer la page actuelle ou répondre entièrement hors ligne.": "I can search the web for you, summarize the current page, or answer fully offline.", "Résumer cette page": "Summarize this page", "Expliquer simplement": "Explain simply", "Points importants": "Key points", "Recherche…": "Searching…", "· moteur local": "· local engine", "Envoyer": "Send", "L’inférence reste sur cet ordinateur.": "Inference stays on this computer.", "Gérer": "Manage", "Mots de passe": "Passwords", "Coffre Aegis autonome, chiffré avec votre mot de passe maître.": "Independent Aegis vault, encrypted with your master password.", "Déverrouiller": "Unlock", "Connexion détectée": "Login detected", "Enregistrer": "Save", "Ignorer": "Ignore", "Ajouter ou mettre à jour": "Add or update", "Site": "Site", "Identifiant": "Username", "Mot de passe": "Password", "Générer": "Generate", "Enregistrer dans Aegis": "Save in Aegis", "Enregistrés": "Saved", "Notes rapides": "Quick notes", "Un bloc-notes local pour garder une idée, une URL ou une tâche pendant la navigation. Le contenu reste sur cet ordinateur.": "A local notepad for keeping an idea, URL, or task while browsing. Content stays on this computer.", "Enregistré localement": "Saved locally", "Paramètres": "Settings", "Thème": "Theme", "Fond du nouvel onglet": "New tab background", "Bloque les domaines et requêtes publicitaires directement dans le moteur réseau.": "Blocks advertising domains and requests directly in the network engine.", "Masque les emplacements publicitaires restant dans les pages compatibles.": "Hides remaining ad placeholders on compatible pages.", "Met à jour en arrière-plan une liste de domaines publicitaires communautaire.": "Updates a community list of advertising domains in the background.", "Clé API VirusTotal": "VirusTotal API key", "(optionnelle)": "(optional)", "Sans clé API, le bouton VT ouvre le rapport public correspondant au lien. Avec une clé API, Aegis lance automatiquement l’analyse et affiche le résultat. La clé reste enregistrée localement dans le profil Aegis.": "Without an API key, the VT button opens the public report for the link. With a key, Aegis automatically runs the analysis and displays the result. The key remains stored locally in your Aegis profile.", "Afficher les favoris sous la barre d’adresse.": "Show bookmarks below the address bar.", "Reprendre la session au démarrage": "Restore session on startup", "Désactivé par défaut : Aegis s’ouvre directement sur Aegis Start.": "Disabled by default: Aegis opens directly on Aegis Start.", "Horloge sur Aegis Start": "Clock on Aegis Start", "Afficher l’heure et la date sur le nouvel onglet.": "Show time and date on the new tab page.", "Sites récents sur Aegis Start": "Recent sites on Aegis Start", "Afficher les dernières pages visitées dans le tableau de bord.": "Show recently visited pages on the dashboard.", "Onglets compacts": "Compact tabs", "Réduit la largeur des onglets pour les grosses sessions.": "Reduces tab width for large sessions.", "Actions rapides sur l’accueil": "Quick actions on Home", "Affiche les raccourcis Privé, Onglets, Commandes, Notes et Focus.": "Shows Private, Tabs, Commands, Notes and Focus shortcuts.", "Animations d’interface": "Interface animations", "Désactivez-les pour une interface plus sobre et plus légère.": "Disable them for a simpler and lighter interface.", "Assistant local": "Local assistant", "Détection automatique du modèle selon votre PC.": "Automatically selects the model according to your PC.", "Relancer l’assistant de configuration": "Run setup again", "Menu": "Menu", "Nouvel onglet privé": "New private tab", "Rouvrir l’onglet fermé": "Reopen closed tab", "Rechercher dans la page": "Find in page", "Palette de commandes": "Command palette", "Vue d’ensemble des onglets": "Tab overview", "Mode Focus": "Focus mode", "1 clic": "1 click", "Mode lecture": "Reader mode", "Imprimer": "Print", "Plein écran": "Full screen", "Dupliquer l’onglet": "Duplicate tab", "Épingler / désépingler l’onglet": "Pin / unpin tab", "Copier l’URL sans trackers": "Copy URL without trackers", "Utiliser la page actuelle comme accueil": "Use current page as Home", "Stable · profil isolé": "Stable · isolated profile", "Tout ce qui est ouvert": "Everything open", "+ Nouvel onglet": "+ New tab", "0 onglet": "0 tabs", "Double-clic sur un onglet = épingler": "Double-click a tab to pin it", "Quitter Focus": "Exit Focus", "↑ ↓ naviguer": "↑ ↓ navigate", "Entrée exécuter": "Enter to run", "@tabs onglets": "@tabs tabs", "Épingler l’onglet": "Pin tab", "Dupliquer": "Duplicate", "Couper / réactiver le son": "Mute / unmute", "Fermer les autres onglets": "Close other tabs", "Fermer": "Close", "← Retour": "← Back", "bloqué sur ce site": "blocked on this site", "au total": "total", "Aucun site": "No site", "Autoriser": "Allow", "Paramètres AdBlock": "AdBlock settings", "Déverrouiller le coffre": "Unlock vault", "Entrez votre mot de passe maître. Il n’est envoyé nulle part et reste uniquement utilisé en mémoire pendant cette session.": "Enter your master password. It is never sent anywhere and is only kept in memory during this session.", "Mot de passe maître": "Master password", "Confirmer": "Confirm", "Aegis Vault utilise AES-256-GCM avec une clé dérivée par scrypt. Si vous oubliez le mot de passe maître, Aegis ne peut pas récupérer le contenu du coffre.": "Aegis Vault uses AES-256-GCM with a key derived using scrypt. If you forget the master password, Aegis cannot recover the vault contents.", "Oui": "Yes", "Non": "No", "Informations du site": "Site information", "Aucune page chargée.": "No page loaded.", "Rechercher dans les onglets": "Search tabs", "Nouvel onglet (Ctrl+T)": "New tab (Ctrl+T)", "Précédent": "Back", "Suivant": "Forward", "Actualiser (Ctrl+R)": "Reload (Ctrl+R)", "Informations de connexion": "Connection information", "Ajouter aux favoris": "Add bookmark", "Créer un raccourci de cette page sur le Bureau": "Create a desktop shortcut for this page", "Vérifier ce lien avec VirusTotal": "Check this link with VirusTotal", "Protection Aegis": "Aegis protection", "Rechercher sur Google ou saisir une adresse": "Search Google or enter an address", "Vue des onglets": "Tab overview", "Résultat précédent": "Previous result", "Résultat suivant": "Next result", "Rechercher dans les favoris": "Search bookmarks", "Rechercher dans l’historique": "Search history", "Demander quelque chose à Aegis AI…": "Ask Aegis AI…", "email ou nom d’utilisateur": "email or username", "Rechercher un site ou un identifiant": "Search a site or username", "Écris ici…": "Write here…", "Collez votre clé API VirusTotal": "Paste your VirusTotal API key", "Rechercher parmi les onglets…": "Search tabs…", "Quitter le mode Focus (F9)": "Exit Focus mode (F9)", "Chercher un onglet ou lancer une commande…": "Find a tab or run a command…", "Activer ou désactiver AdBlock": "Enable or disable AdBlock", "8 caractères minimum": "8 characters minimum", "Répétez le mot de passe maître": "Repeat the master password", "https://exemple.com": "https://example.com"};
UI_FR_EN['Profil isolé : cette fenêtre utilise bien la nouvelle version']='Isolated profile: this window is running the new version';
UI_FR_EN['Accès rapide à l’accueil, aux onglets et aux bibliothèques.']='Quick access to Home, tabs and libraries.';
UI_FR_EN['Langue']='Language';
UI_FR_EN['Langue du navigateur']='Browser language';
UI_FR_EN['Change la langue de l’interface Aegis et la langue préférée envoyée aux sites. Certains sites peuvent nécessiter un rechargement.']='Changes Aegis interface language and the preferred language sent to websites. Some sites may require a reload.';
UI_FR_EN['Langue cible par défaut pour la traduction locale']='Default translation target';
UI_FR_EN['Outils de développement']='Developer Tools';
UI_FR_EN['Active F12, Ctrl+Shift+I et Inspecter l’élément pour les pages web.']='Enable F12, Ctrl+Shift+I and Inspect Element for web pages.';
UI_FR_EN['Traduction locale']='Fast Translate';
UI_FR_EN['Traduire']='Translate';
UI_FR_EN['Traduction locale privée']='Fast cloud translation';
UI_FR_EN['Utilise votre modèle Aegis AI installé. Le texte n’est envoyé à aucune API de traduction.']='Uses LibreTranslate through your Aegis Cloud service for fast translation.';
UI_FR_EN['De']='From';
UI_FR_EN['Vers']='To';
UI_FR_EN['Détecter automatiquement']='Detect automatically';
UI_FR_EN['Inverser les langues']='Swap languages';
UI_FR_EN['Traduire la sélection']='Translate selection';
UI_FR_EN['Traduire la page']='Translate page';
UI_FR_EN['Texte']='Text';
UI_FR_EN['Collez ou saisissez le texte à traduire…']='Paste or type text to translate…';
UI_FR_EN['Traduire en local']='Translate now';
UI_FR_EN['Prêt · modèle local']='Ready · LibreTranslate API';
UI_FR_EN['Traduction']='Translation';
UI_FR_EN['La traduction apparaîtra ici…']='Translation will appear here…';
UI_FR_EN['Copier la traduction']='Copy translation';
UI_FR_EN['Vider']='Clear';
UI_FR_EN['Extraire le texte de la page']='Extract page text';
UI_FR_EN['Traduire toute la page']='Translate entire page';
UI_FR_EN['Afficher l’original']='Show original';
UI_FR_EN['Préparation de la page…']='Preparing page…';
UI_FR_EN['Traduction de la page…']='Translating page…';
UI_FR_EN['Page traduite localement']='Page translated with LibreTranslate';
UI_FR_EN['Page restaurée']='Original page restored';
UI_FR_EN['Langue de l’interface Aegis. Vous pourrez la modifier plus tard dans Paramètres.']='Aegis interface language. You can change it later in Settings.';
UI_FR_EN['Traitement IA']='AI processing';
UI_FR_EN['Cloud en priorité']='Cloud preferred';
UI_FR_EN['Local uniquement']='Local only';
UI_FR_EN['Le mode cloud est plus rapide et ne dépend pas des performances du PC. Le modèle local reste disponible comme secours hors ligne.']='Cloud mode is faster and does not depend on the PC. Local AI remains available as an offline fallback.';
UI_FR_EN['Endpoint Aegis AI cloud']='Aegis AI cloud endpoint';
UI_FR_EN['Une IA cloud publique nécessite un backend Aegis hébergé. Le navigateur n’intègre jamais de secret fournisseur. Sans endpoint configuré, Aegis continue automatiquement avec le modèle local.']='A public cloud AI needs a hosted Aegis backend. The browser never embeds a provider secret. If no endpoint is configured, Aegis automatically keeps using the local model.';
UI_FR_EN['Afficher tous les téléchargements']='Show all downloads';
UI_FR_EN['Traduction']='Translation';
UI_FR_EN['Langue cible par défaut']='Default translation target';
UI_FR_EN['Endpoint cloud de traduction']='Translation cloud endpoint';
UI_FR_EN['optionnel si Aegis AI Cloud est configuré']='optional if Aegis AI Cloud is configured';
UI_FR_EN['Aegis Translate utilise LibreTranslate via le backend Aegis Cloud. Votre clé API LibreTranslate reste sur le serveur et n’est jamais intégrée au navigateur.']='Aegis Translate uses LibreTranslate through the Aegis Cloud backend. Your LibreTranslate API key stays on the server and is never embedded in the browser.';
UI_FR_EN['Traduction propulsée par LibreTranslate']='LibreTranslate-powered translation';
UI_FR_EN['Traduction rapide via votre service Aegis Cloud. La clé API LibreTranslate reste sur le serveur.']='Fast translation through your Aegis Cloud service. The LibreTranslate API key stays on the server.';
UI_FR_EN['Traduire maintenant']='Translate now';
UI_FR_EN['Prêt · API LibreTranslate']='Ready · LibreTranslate API';
UI_FR_EN['Aucun téléchargement dans cette session.']='No downloads in this session yet.';
const UI_EN_FR = Object.fromEntries(Object.entries(UI_FR_EN).map(([fr,en]) => [en,fr]));
const i18nTextBase = new WeakMap();
const i18nAttrBase = new WeakMap();
let activeUiLanguage = 'en';
function mappedUiString(value, lang = activeUiLanguage) {
  const raw = String(value ?? '');
  const trimmed = raw.trim();
  if (!trimmed) return raw;
  const mapped = lang === 'fr' ? (UI_EN_FR[trimmed] || trimmed) : (UI_FR_EN[trimmed] || trimmed);
  if (mapped === trimmed) return raw;
  return raw.replace(trimmed, mapped);
}
function localizeNode(node) {
  if (!node) return;
  if (node.nodeType === Node.TEXT_NODE) {
    if (!i18nTextBase.has(node)) i18nTextBase.set(node, String(node.nodeValue || ''));
    const base=i18nTextBase.get(node); const trimmed=String(base).trim();
    let english = UI_FR_EN[trimmed] || trimmed;
    let target = activeUiLanguage === 'fr' ? (UI_EN_FR[english] || trimmed) : english;
    node.nodeValue = trimmed ? String(base).replace(trimmed,target) : base;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const attrs=['title','placeholder','aria-label'];
  if (!i18nAttrBase.has(node)) i18nAttrBase.set(node, Object.fromEntries(attrs.map(a=>[a,node.getAttribute(a)])));
  const baseAttrs=i18nAttrBase.get(node);
  for (const attr of attrs) {
    const base=baseAttrs[attr]; if (!base) continue;
    const english=UI_FR_EN[base] || base;
    node.setAttribute(attr, activeUiLanguage === 'fr' ? (UI_EN_FR[english] || base) : english);
  }
  for (const child of [...node.childNodes]) localizeNode(child);
}
function applyInterfaceLanguage(lang='en') {
  activeUiLanguage = lang === 'fr' ? 'fr' : 'en';
  document.documentElement.lang = activeUiLanguage;
  localizeNode(document.body);
  if ($('onboarding-counter')) $('onboarding-counter').textContent = activeUiLanguage === 'fr' ? `Étape ${onboardingStep + 1} sur 5` : `Step ${onboardingStep + 1} of 5`;
}
const i18nObserver = new MutationObserver(mutations => {
  for (const mutation of mutations) for (const node of mutation.addedNodes) localizeNode(node);
});
i18nObserver.observe(document.documentElement, { childList:true, subtree:true });
function uiMessage(en,fr) { return activeUiLanguage === 'fr' ? fr : en; }

function openActiveDevTools() {
  if (store.settings.developerToolsEnabled === false) return showToast(uiMessage('Developer Tools are disabled in Settings.','Les outils de développement sont désactivés dans Paramètres.'));
  const tab=getActiveTab();
  if (!tab || tab.internalStart || tab.error) return showToast(uiMessage('Open a web page first.','Ouvrez d’abord une page web.'));
  let id=null; try { id=tab.webview.getWebContentsId(); } catch {}
  if (!id) return showToast(uiMessage('Developer Tools are not available for this tab yet.','Les outils de développement ne sont pas encore disponibles pour cet onglet.'));
  window.api.openDevTools(id).then(result=>{ if (!result?.ok) showToast(result?.error || uiMessage('Unable to open Developer Tools.','Impossible d’ouvrir les outils de développement.')); });
}

const TRANSLATE_NAMES={auto:'Detect automatically',en:'English',fr:'Français',es:'Español',de:'Deutsch',it:'Italiano',pt:'Português'};
let translateBusy=false;
async function openTranslatePanel(prefill='') {
  closeAllPanels(); openPanel('translate');
  if ($('translate-target')) $('translate-target').value = store.settings.translationTarget || (store.settings.browserLanguage === 'fr' ? 'en' : 'fr');
  if (prefill && $('translate-input')) $('translate-input').value = prefill;
  setTimeout(()=>$('translate-input')?.focus(),60);
}
async function translateCurrentSelection() {
  const ctx=await captureAiPageContext(true);
  if (!ctx.text) return showToast(uiMessage('Select some text on the page first.','Sélectionnez d’abord du texte sur la page.'));
  await openTranslatePanel(ctx.text);
  runFastTranslation();
}
async function translateCurrentPage() {
  const ctx=await captureAiPageContext(false);
  if (!ctx.text) return showToast(uiMessage('No readable page text was found.','Aucun texte lisible n’a été trouvé sur la page.'));
  await openTranslatePanel(ctx.text.slice(0,14000));
  runFastTranslation();
}
let livePageTranslateBusy=false;
function setPageTranslateProgress(percent,label='') {
  const wrap=$('translate-page-progress'), fill=$('translate-page-progress-fill'), value=$('translate-page-progress-percent'), text=$('translate-page-progress-label');
  if (!wrap) return;
  wrap.classList.remove('hidden');
  const pct=Math.max(0,Math.min(100,Math.round(Number(percent)||0)));
  if (fill) fill.style.width=`${pct}%`;
  if (value) value.textContent=`${pct}%`;
  if (text && label) text.textContent=label;
}
function setLiveTranslateButtons(active,busy=false) {
  const run=$('translate-page-live'), restore=$('translate-page-restore');
  if (run) { run.disabled=busy; run.textContent=busy ? uiMessage('Translating page…','Traduction de la page…') : uiMessage('Translate entire page','Traduire toute la page'); }
  if (restore) restore.disabled=busy || !active;
}
async function collectPageTranslationNodes(tab) {
  const script=`(() => {
    try {
      if (window.__aegisPageTranslation?.active) {
        const st=window.__aegisPageTranslation;
        st.nodes.forEach((node,i)=>{ if(node&&node.isConnected&&st.originals[i]!==undefined) node.nodeValue=st.originals[i]; });
      }
      const root=document.querySelector('article,main,[role="main"]')||document.body;
      const state={nodes:[],originals:[],active:false};
      const out=[]; let total=0;
      const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','OBJECT','CANVAS','SVG','CODE','PRE','TEXTAREA','INPUT','SELECT','OPTION']);
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
        const parent=node.parentElement; if(!parent||skip.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        const raw=String(node.nodeValue||''); const text=raw.replace(/\\s+/g,' ').trim();
        if(text.length<2||text.length>900) return NodeFilter.FILTER_REJECT;
        try { const cs=getComputedStyle(parent); if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0) return NodeFilter.FILTER_REJECT; } catch {}
        if(parent.closest('[contenteditable="true"],script,style,noscript,code,pre,textarea,input,select')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }});
      let node;
      while((node=walker.nextNode()) && out.length<260 && total<32000){
        const text=String(node.nodeValue||'').replace(/\\s+/g,' ').trim();
        if(!text) continue;
        const id=state.nodes.length; state.nodes.push(node); state.originals.push(node.nodeValue); out.push({id,text}); total+=text.length;
      }
      window.__aegisPageTranslation=state;
      return {ok:true,items:out,totalChars:total,title:document.title||location.hostname,url:location.href};
    } catch(error){ return {ok:false,error:String(error?.message||error),items:[]}; }
  })()`;
  return tab.webview.executeJavaScript(script,true);
}
async function applyPageTranslationBatch(tab,items) {
  const payload=JSON.stringify(Array.isArray(items)?items:[]);
  const script=`(() => {
    const st=window.__aegisPageTranslation; if(!st) return false;
    const items=${payload};
    for(const item of items){
      const id=Number(item.id), node=st.nodes[id]; if(!node||!node.isConnected) continue;
      const original=String(st.originals[id]??node.nodeValue??'');
      const lead=(original.match(/^\\s*/)||[''])[0], tail=(original.match(/\\s*$/)||[''])[0];
      node.nodeValue=lead+String(item.text||'').trim()+tail;
    }
    st.active=true; return true;
  })()`;
  return tab.webview.executeJavaScript(script,true);
}
async function translatePageInPlace() {
  if (livePageTranslateBusy) return;
  const tab=getActiveTab();
  if(!tab||tab.internalStart||tab.error) return showToast(uiMessage('Open a web page first.','Ouvrez d’abord une page web.'));
  livePageTranslateBusy=true; setLiveTranslateButtons(false,true); setPageTranslateProgress(2,uiMessage('Preparing page…','Préparation de la page…'));
  try {
    const collected=await collectPageTranslationNodes(tab);
    const items=Array.isArray(collected?.items)?collected.items:[];
    if(!collected?.ok||!items.length) throw new Error(collected?.error||uiMessage('No readable page text was found.','Aucun texte lisible n’a été trouvé sur la page.'));
    const batches=[]; let current=[],chars=0;
    for(const item of items){
      if(current.length>=45 || (chars+item.text.length>28000 && current.length)){ batches.push(current); current=[]; chars=0; }
      current.push(item); chars+=item.text.length;
    }
    if(current.length) batches.push(current);
    const target=$('translate-target')?.value||store.settings.translationTarget||'fr';
    const source=$('translate-source')?.value||'auto';
    let done=0;
    const queue=[...batches];
    const workers=Array.from({length:Math.min(3,queue.length)},async()=>{
      while(queue.length){
        const batch=queue.shift();
        const result=await window.api.translatePageBatch({items:batch,source,target});
        if(result?.needsConfig) throw new Error(result?.error||uiMessage('Configure translation in Settings.','Configurez la traduction dans Paramètres.'));
        if(!result?.ok) throw new Error(result?.error||uiMessage('Page translation failed.','La traduction de la page a échoué.'));
        await applyPageTranslationBatch(tab,result.items);
        done+=batch.length;
        setPageTranslateProgress((done/items.length)*100,`${uiMessage('Translating page…','Traduction de la page…')} ${done}/${items.length}`);
      }
    });
    await Promise.all(workers);
    setPageTranslateProgress(100,uiMessage('Page translated with LibreTranslate','Page traduite avec LibreTranslate'));
    setLiveTranslateButtons(true,false);
    showToast(uiMessage('Page translated with LibreTranslate.','Page traduite avec LibreTranslate.'));
  } catch(error){
    setLiveTranslateButtons(false,false);
    if($('translate-status')) $('translate-status').textContent=String(error?.message||error);
    showToast(String(error?.message||error));
  } finally { livePageTranslateBusy=false; }
}
async function restoreTranslatedPage() {
  const tab=getActiveTab(); if(!tab||tab.internalStart) return;
  try {
    const ok=await tab.webview.executeJavaScript(`(() => { const st=window.__aegisPageTranslation; if(!st)return false; st.nodes.forEach((node,i)=>{if(node&&node.isConnected&&st.originals[i]!==undefined)node.nodeValue=st.originals[i];}); delete window.__aegisPageTranslation; return true; })()`,true);
    if(ok){ setLiveTranslateButtons(false,false); $('translate-page-progress')?.classList.add('hidden'); showToast(uiMessage('Original page restored.','Page restaurée.')); }
  } catch {}
}
async function runFastTranslation() {
  if (translateBusy) return;
  const text=String($('translate-input')?.value||'').trim(); if (!text) return;
  translateBusy=true; $('translate-run').disabled=true;
  if ($('translate-status')) $('translate-status').textContent=uiMessage('Translating with LibreTranslate…','Traduction avec LibreTranslate…');
  try {
    const result=await window.api.translateFast({text,source:$('translate-source')?.value||'auto',target:$('translate-target')?.value||'fr'});
    if (result?.needsConfig) {
      if ($('translate-status')) $('translate-status').textContent=result.error||uiMessage('Configure translation in Settings.','Configurez la traduction dans Paramètres.');
      return;
    }
    if (!result?.ok) throw new Error(result?.error||uiMessage('Translation failed.','Échec de la traduction.'));
    $('translate-output').value=result.text||'';
    if ($('translate-status')) $('translate-status').textContent=uiMessage('Done · LibreTranslate API','Terminé · API LibreTranslate');
  } catch(error) { if ($('translate-status')) $('translate-status').textContent=String(error?.message||error); }
  finally { translateBusy=false; $('translate-run').disabled=false; }
}
$('translate-btn')?.addEventListener('click',()=>openTranslatePanel());
$('menu-translate')?.addEventListener('click',()=>{closeAllPanels();openTranslatePanel();});
$('menu-devtools')?.addEventListener('click',()=>{closeAllPanels();openActiveDevTools();});
$('translate-run')?.addEventListener('click',runFastTranslation);
$('translate-selection')?.addEventListener('click',translateCurrentSelection);
$('translate-page')?.addEventListener('click',translateCurrentPage);
$('translate-page-live')?.addEventListener('click',translatePageInPlace);
$('translate-page-restore')?.addEventListener('click',restoreTranslatedPage);
$('translate-swap')?.addEventListener('click',()=>{const a=$('translate-source'),b=$('translate-target'); if(!a||!b)return; const from=a.value==='auto'?(store.settings.browserLanguage||'en'):a.value; const to=b.value; a.value=to; b.value=from;});
$('translate-copy')?.addEventListener('click',()=>{const text=$('translate-output')?.value||''; if(text) window.api.copyText(text).then(()=>showToast(uiMessage('Translation copied.','Traduction copiée.')));});
$('translate-clear')?.addEventListener('click',()=>{if($('translate-input'))$('translate-input').value='';if($('translate-output'))$('translate-output').value='';});
window.api.onTranslateSelection?.(data=>{openTranslatePanel(String(data?.text||''));});
// ---- end Aegis 5.5 tools ----

// ---- Aegis AI 5.5 ----
let aiStatusState = null;
let aiMode = 'web';
let aiBusy = false;
let aiRequestSerial = 0;
let aiManageMode = false;
let aiCurrentStream = null;

function formatAiBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '';
  const units = ['o','Ko','Mo','Go'];
  const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i >= 3 ? 1 : 0)} ${units[i]}`;
}
function aiHistoryLoad() {
  try {
    const parsed = JSON.parse(localStorage.getItem(`aegis:ai-history-v1:${activeProfileId}`) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch { return []; }
}
function aiHistorySave(items) {
  try { localStorage.setItem(`aegis:ai-history-v1:${activeProfileId}`, JSON.stringify(items.slice(-40))); } catch {}
}
function aiAttachSources(item, sources = []) {
  if (!item || !Array.isArray(sources) || !sources.length) return;
  item.querySelector('.ai-sources')?.remove();
  const sourceWrap = document.createElement('div');
  sourceWrap.className = 'ai-sources';
  sources.slice(0, 6).forEach((source, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${index + 1}. ${source.title || source.url || 'Source'}`;
    button.title = source.url || '';
    button.addEventListener('click', () => { if (/^https?:\/\//i.test(source.url || '')) createTab(source.url); });
    sourceWrap.appendChild(button);
  });
  const meta = item.querySelector('.ai-message-meta');
  if (meta) item.insertBefore(sourceWrap, meta); else item.appendChild(sourceWrap);
}
function aiAppendMessage(role, text, sources = [], persist = true) {
  const list = $('ai-messages');
  if (!list) return null;
  list.querySelector('.ai-empty')?.remove();
  const item = document.createElement('div');
  item.className = `ai-message ${role === 'user' ? 'user' : 'assistant'}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = String(text || '');
  item.appendChild(bubble);
  const meta = document.createElement('div');
  meta.className = 'ai-message-meta';
  meta.textContent = role === 'user' ? uiMessage('You','Vous') : 'Aegis AI';
  item.appendChild(meta);
  aiAttachSources(item, sources);
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
  if (persist) {
    const history = aiHistoryLoad();
    history.push({ role, text: String(text || '').slice(0, 20000), sources: (sources || []).slice(0, 6), time: Date.now() });
    aiHistorySave(history);
  }
  return { item, bubble, meta };
}
function aiPersistAssistantMessage(text, sources = []) {
  const history = aiHistoryLoad();
  history.push({ role:'assistant', text:String(text || '').slice(0,20000), sources:(sources || []).slice(0,6), time:Date.now() });
  aiHistorySave(history);
}
function aiFinalizeCurrentStream(result = {}) {
  const stream = aiCurrentStream;
  if (!stream) return;
  const answer = String(result.answer || stream.bubble?.textContent || '').trim() || 'Je n’ai pas obtenu de réponse exploitable.';
  if (stream.bubble) stream.bubble.textContent = answer;
  aiAttachSources(stream.item, result.sources || []);
  if (stream.meta) {
    const speed = Number(result.tokensPerSecond || 0);
    const elapsed = Number(result.elapsedMs || 0);
    const engine = result.engine === 'cloud' ? uiMessage('online','en ligne') : uiMessage('local','local');
    stream.meta.textContent = result.engine === 'cloud'
      ? `Aegis AI · ${engine}${elapsed > 0 ? ` · ${(elapsed/1000).toFixed(1)} s` : ''}`
      : (speed > 0 ? `Aegis AI · ${engine} · ~${speed} tok/s · ${(elapsed/1000).toFixed(1)} s` : `Aegis AI · ${engine}`);
  }
  aiPersistAssistantMessage(answer, result.sources || []);
  aiCurrentStream = null;
}
function aiRenderHistory() {
  const list = $('ai-messages');
  if (!list) return;
  list.innerHTML = '';
  const history = aiHistoryLoad();
  if (!history.length) {
    list.innerHTML = '<div class="ai-empty"><div class="ai-empty-orb">AI</div><h3>Que veux-tu savoir ?</h3><p>I can research the web, summarize the current page, or use the local model as an offline fallback.</p><div class="ai-suggestions"><button data-ai-suggestion="Résume la page actuelle">Résumer cette page</button><button data-ai-suggestion="Explique-moi simplement ce que je suis en train de lire">Expliquer simplement</button><button data-ai-suggestion="Quels sont les points importants de cette page ?">Points importants</button></div></div>';
    bindAiSuggestionButtons();
    return;
  }
  history.forEach(msg => aiAppendMessage(msg.role, msg.text, msg.sources || [], false));
}
function aiSetActivity(show, label = '') {
  $('ai-activity')?.classList.toggle('hidden', !show);
  if (label && $('ai-activity-label')) $('ai-activity-label').textContent = label;
  $('ai-stop-btn')?.classList.toggle('hidden', !show);
  if ($('ai-send-btn')) $('ai-send-btn').disabled = show;
  $('ai-btn')?.classList.toggle('busy', show);
}
function aiSetMode(mode) {
  const allowed = ['web','local','page','selection'];
  aiMode = allowed.includes(mode) ? mode : 'web';
  document.querySelectorAll('[data-ai-mode]').forEach(button => button.classList.toggle('active', button.dataset.aiMode === aiMode));
  const labels = { web: 'Web', local: 'Local', page: 'Cette page', selection: 'Sélection' };
  if ($('ai-mode-label')) $('ai-mode-label').textContent = labels[aiMode] || 'Web';
  if (store?.settings && ['web','local','page'].includes(aiMode)) {
    store.settings.aiDefaultMode = aiMode;
    window.api.setSettings({ aiDefaultMode: aiMode }).then(settings => { store.settings = settings; }).catch(() => {});
  }
}
async function captureAiPageContext(selectionOnly = false) {
  const tab = getActiveTab();
  if (!tab || tab.internalStart) return { text: '', url: '', title: '' };
  try {
    const script = selectionOnly ? `(() => ({text:String(window.getSelection?.()?.toString?.()||'').trim(),url:location.href,title:document.title||location.hostname}))()` : `(() => { const root=document.querySelector('article,main,[role="main"]')||document.body; const text=String(root?.innerText||document.body?.innerText||'').replace(/\\s+/g,' ').trim().slice(0,18000); return {text,url:location.href,title:document.title||location.hostname}; })()`;
    const result = await tab.webview.executeJavaScript(script, true);
    return result && typeof result === 'object' ? result : { text:'', url:safeWebviewURL(tab), title:tab.tabEl.querySelector('.title')?.textContent||'' };
  } catch {
    return { text:'', url:safeWebviewURL(tab), title:tab.tabEl.querySelector('.title')?.textContent||'' };
  }
}
function updateAiStatusUI(status) {
  aiStatusState = status || aiStatusState || {};
  const installed = Boolean(aiStatusState?.installed);
  const cloudConfigured = Boolean(aiStatusState?.cloudConfigured) && (store.settings.aiProcessing || 'cloud-preferred') !== 'local-only';
  const ready = cloudConfigured || installed;
  $('ai-btn')?.classList.toggle('ready', ready);
  document.querySelector('[data-dock-action="ai"]')?.classList.toggle('ready', ready);
  if ($('settings-ai-status')) {
    const perf = Number(aiStatusState?.lastPerformance?.tokensPerSecond || 0);
    const backend = String(aiStatusState?.backend || 'cpu').toUpperCase();
    $('settings-ai-status').textContent = cloudConfigured
      ? uiMessage('Online AI configured · local fallback available.','IA en ligne configurée · secours local disponible.')
      : (installed ? `${aiStatusState.selected?.model || uiMessage('Local model','Modèle local')} · ${backend}${perf > 0 ? ` · ~${perf} tok/s` : ''}` : uiMessage('Cloud endpoint not configured · local model available on demand.','Endpoint cloud non configuré · modèle local disponible à la demande.'));
  }
  const hardware = aiStatusState?.hardware || {};
  const selected = aiStatusState?.selected || hardware.profile || {};
  if ($('ai-recommended-profile')) $('ai-recommended-profile').textContent = `${selected.label || hardware.recommended || 'Auto'} · ${selected.size || ''}`.trim();
  if ($('ai-hardware-ram')) $('ai-hardware-ram').textContent = hardware.ramGB ? `${hardware.ramGB} Go` : '—';
  if ($('ai-hardware-cpu')) $('ai-hardware-cpu').textContent = hardware.cores ? `${hardware.cores} threads · ${String(hardware.cpu || '').replace(/\s+/g,' ').slice(0,35)}` : '—';
  if ($('ai-recommended-model')) $('ai-recommended-model').textContent = selected.model || '—';
  if ($('ai-model-name')) $('ai-model-name').textContent = selected.model || 'Aegis AI';
  if ($('ai-model-profile')) $('ai-model-profile').textContent = cloudConfigured ? uiMessage('ONLINE · local fallback ready','EN LIGNE · secours local prêt') : `${selected.label || aiStatusState.profile || 'Local'} · ${(aiStatusState.backend || 'cpu').toUpperCase()} · ${aiStatusState.running ? uiMessage('engine active','moteur actif') : uiMessage('ready locally','prêt en local')}`;
  if (ready && !aiManageMode) {
    $('ai-setup-view')?.classList.add('hidden');
    $('ai-chat-view')?.classList.remove('hidden');
    aiRenderHistory();
  } else {
    $('ai-setup-view')?.classList.remove('hidden');
    $('ai-chat-view')?.classList.add('hidden');
    if ($('ai-install-btn')) $('ai-install-btn').textContent = installed ? uiMessage('Reinstall recommended local model','Réinstaller le modèle local recommandé') : `${uiMessage('Install local fallback','Installer le secours local')}${selected.size ? ` · ${selected.size}` : ''}`;
    $('ai-remove-btn')?.classList.toggle('hidden', !installed);
  }
}
async function refreshAiStatus() {
  try {
    const status = await window.api.aiStatus();
    updateAiStatusUI(status);
    return status;
  } catch (error) {
    if ($('settings-ai-status')) $('settings-ai-status').textContent = 'État indisponible.';
    return null;
  }
}
async function openAiPanel(options = {}) {
  aiManageMode = Boolean(options.manage);
  closeAllPanels();
  openPanel('ai');
  aiSetMode(store?.settings?.aiDefaultMode || aiMode || 'web');
  const status = await refreshAiStatus();
  if ((status?.cloudConfigured || status?.installed) && !aiManageMode) {
    if (!status?.cloudConfigured && status?.installed) window.api.aiStart().then(result => { if (result?.ok) refreshAiStatus(); }).catch(() => {});
    setTimeout(() => $('ai-input')?.focus(), 80);
  }
}
function updateAiInstallProgress(data = {}) {
  const phase = String(data.phase || '');
  const active = ['download','extract','starting'].includes(phase);
  const box = $('ai-install-progress');
  box?.setAttribute('aria-hidden', active || phase === 'error' ? 'false' : 'true');
  if ($('ai-progress-label')) $('ai-progress-label').textContent = data.error ? data.error : (data.label || 'Préparation…');
  if ($('ai-progress-percent')) $('ai-progress-percent').textContent = `${Number(data.percent || 0)}%`;
  if ($('ai-progress-fill')) $('ai-progress-fill').style.width = `${Number(data.percent || 0)}%`;
  if ($('ai-progress-size')) $('ai-progress-size').textContent = data.total ? `${formatAiBytes(data.downloaded)} / ${formatAiBytes(data.total)}` : '';
  if ($('ai-install-btn')) $('ai-install-btn').disabled = active;
  $('ai-btn')?.classList.toggle('busy', active);
  if (phase === 'ready') { aiManageMode = false; refreshAiStatus(); showToast('Aegis AI est installé et prêt.'); }
}
async function installAiRecommended() {
  if (!window.api.aiInstall) return;
  updateAiInstallProgress({ phase:'download', label:'Préparation de l’installation locale…', percent:0 });
  const result = await window.api.aiInstall('auto');
  if (!result?.ok) {
    updateAiInstallProgress({ phase:'error', label:result?.error || 'Installation impossible.', error:result?.error || 'Installation impossible.', percent:0 });
    return;
  }
  aiManageMode = false;
  await refreshAiStatus();
}
async function removeAiLocal() {
  if (!confirm('Supprimer le moteur et le modèle Aegis AI de cet ordinateur ?')) return;
  const result = await window.api.aiRemove();
  if (result?.ok) { localStorage.removeItem(`aegis:ai-history-v1:${activeProfileId}`); aiManageMode = false; await refreshAiStatus(); showToast('Aegis AI a été supprimé.'); }
  else showToast(result?.error || 'Suppression impossible.');
}
async function submitAiQuestion(rawQuestion = '') {
  if (aiBusy) return;
  const input = $('ai-input');
  const question = String(rawQuestion || input?.value || '').trim();
  if (!question) return;
  const aiReady = (Boolean(aiStatusState?.cloudConfigured) && (store.settings.aiProcessing || 'cloud-preferred') !== 'local-only') || Boolean(aiStatusState?.installed);
  if (!aiReady) { await openAiPanel({manage:true}); return; }
  if (input) input.value = '';
  aiAppendMessage('user', question);
  aiBusy = true;
  const serial = ++aiRequestSerial;
  const requestId = `${Date.now()}-${serial}`;
  const placeholder = aiAppendMessage('assistant', '…', [], false);
  aiCurrentStream = placeholder ? { requestId, ...placeholder } : null;
  aiSetActivity(true, aiMode === 'web' ? uiMessage('Searching the web…','Recherche Web…') : uiMessage('Preparing context…','Préparation du contexte…'));
  let context = { text:'', url:'', title:'' };
  if (aiMode === 'page') context = await captureAiPageContext(false);
  else if (aiMode === 'selection') {
    context = await captureAiPageContext(true);
    if (!context.text) {
      aiSetActivity(false);
      aiBusy = false;
      if (aiCurrentStream?.item) aiCurrentStream.item.remove();
      aiCurrentStream = null;
      aiAppendMessage('assistant', 'Aucun texte n’est sélectionné sur la page. Sélectionne un passage puis réessaie.');
      return;
    }
  }
  try {
    const result = await window.api.aiAsk({ requestId, question, language: store.settings.browserLanguage || 'en', mode:aiMode, context:context.text || '', url:context.url || '', title:context.title || '' });
    if (serial !== aiRequestSerial) return;
    if (result?.needsInstall) { if (aiCurrentStream?.item) aiCurrentStream.item.remove(); aiCurrentStream=null; aiManageMode=true; updateAiStatusUI(result.status); return; }
    if (!result?.ok) {
      if (aiCurrentStream?.bubble) aiCurrentStream.bubble.textContent = `Je n’ai pas pu terminer cette demande : ${result?.error || 'erreur inconnue'}.`;
      if (aiCurrentStream) aiPersistAssistantMessage(aiCurrentStream.bubble?.textContent || '', []);
      aiCurrentStream = null;
    } else aiFinalizeCurrentStream(result);
  } catch (error) {
    if (serial === aiRequestSerial) {
      const text = `Erreur du moteur local : ${error?.message || error}`;
      if (aiCurrentStream?.bubble) aiCurrentStream.bubble.textContent = text; else aiAppendMessage('assistant', text);
      if (aiCurrentStream) aiPersistAssistantMessage(text, []);
      aiCurrentStream = null;
    }
  } finally {
    if (serial === aiRequestSerial) { aiBusy=false; aiSetActivity(false); refreshAiStatus(); }
  }
}
function stopAiQuestion() {
  aiRequestSerial += 1;
  aiBusy = false;
  aiSetActivity(false);
  window.api.aiStop?.();
  if (aiCurrentStream) {
    const partial = String(aiCurrentStream.bubble?.textContent || '').trim();
    if (partial && partial !== '…') aiPersistAssistantMessage(partial, []);
    else aiCurrentStream.item?.remove();
    aiCurrentStream = null;
  }
  showToast('Génération Aegis AI interrompue.');
}
function bindAiSuggestionButtons() {
  document.querySelectorAll('[data-ai-suggestion]').forEach(button => {
    if (button.dataset.aiBound === '1') return;
    button.dataset.aiBound = '1';
    button.addEventListener('click', () => {
      const text = button.dataset.aiSuggestion || button.textContent || '';
      if (/résume|points importants/i.test(text)) aiSetMode('page');
      submitAiQuestion(text);
    });
  });
}
$('ai-btn')?.addEventListener('click', () => openAiPanel());
$('menu-ai')?.addEventListener('click', () => { closeAllPanels(); openAiPanel(); });
$('settings-ai-manage')?.addEventListener('click', () => { closeAllPanels(); openAiPanel({manage:true}); });
$('ai-install-btn')?.addEventListener('click', installAiRecommended);
$('ai-cancel-install')?.addEventListener('click', () => window.api.aiCancelInstall?.());
$('ai-remove-btn')?.addEventListener('click', removeAiLocal);
$('ai-manage-btn')?.addEventListener('click', () => { aiManageMode = true; updateAiStatusUI(aiStatusState); });
$('ai-new-chat')?.addEventListener('click', () => { localStorage.removeItem(`aegis:ai-history-v1:${activeProfileId}`); aiRenderHistory(); $('ai-input')?.focus(); });
$('ai-composer')?.addEventListener('submit', event => { event.preventDefault(); submitAiQuestion(); });
$('ai-stop-btn')?.addEventListener('click', stopAiQuestion);
$('ai-input')?.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitAiQuestion(); } });
document.querySelectorAll('[data-ai-mode]').forEach(button => button.addEventListener('click', () => aiSetMode(button.dataset.aiMode)));
window.api.onAiProgress?.(updateAiInstallProgress);
window.api.onAiActivity?.(data => { if (aiBusy && data?.label) aiSetActivity(true, data.label); });
window.api.onAiStream?.(data => {
  if (!aiCurrentStream || data?.requestId !== aiCurrentStream.requestId) return;
  if (data.type === 'replace' && typeof data.text === 'string') {
    aiCurrentStream.bubble.textContent = data.text || '…';
    const list = $('ai-messages'); if (list) list.scrollTop = list.scrollHeight;
  } else if (data.type === 'error' && data.error) {
    aiCurrentStream.bubble.textContent = `Erreur : ${data.error}`;
  }
});
setTimeout(() => refreshAiStatus(), 900);
// ---- end Aegis AI ----

window.api.onUpdateStatus?.(state => renderUpdateUI(state));
window.api.onUpdateProgress?.(data => {
  const percent=Math.max(0,Math.min(100,Number(data?.percent||0)));
  const bar=$('update-progress-bar'); if (bar) bar.style.width=`${percent}%`;
  const label=$('update-progress-label'); if (label) label.textContent=`${percent}%`;
});

window.api.getUpdateStatus?.().then(renderUpdateUI).catch(() => {});
