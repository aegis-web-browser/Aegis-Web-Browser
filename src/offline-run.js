'use strict';

/**
 * Aegis Run: original, dependency-free offline runner.
 * No network requests, no external images, no account, no telemetry.
 * The deterministic game engine is also available through require() for unit tests.
 */
(() => {
  const WIDTH = 720;
  const HEIGHT = 232;
  const GROUND = 188;
  const PLAYER_X = 92;
  const NETWORK_ERRORS = new Set([-2, -7, -101, -102, -105, -106, -109, -118, -130, -137]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function isNetworkError(code, browserOffline = false) {
    return browserOffline === true || NETWORK_ERRORS.has(Number(code));
  }
  function createState() {
    return {
      mode: 'ready', distance: 0, bonus: 0, score: 0, level: 1, speed: 255,
      spawnIn: 1, obstacles: [], tokens: [], jumpY: 0, velocityY: 0,
      duck: false, frames: 0
    };
  }
  function start(state) {
    Object.assign(state, createState(), { mode: 'running' });
    return state;
  }
  function jump(state) {
    if (state.mode === 'ready' || state.mode === 'over') start(state);
    else if (state.mode === 'paused') state.mode = 'running';
    if (state.mode === 'running' && state.jumpY === 0) {
      state.duck = false;
      state.velocityY = -635;
    }
  }
  function duck(state, active) {
    if (state.mode === 'running') state.duck = Boolean(active) && state.jumpY === 0;
    else state.duck = false;
  }
  function playerBounds(state) {
    const height = state.duck && state.jumpY === 0 ? 25 : 44;
    return { x: PLAYER_X, y: GROUND - height + state.jumpY, w: 35, h: height };
  }
  function intersects(a, b) {
    const inset = 5;
    return a.x + inset < b.x + b.w - inset &&
      a.x + a.w - inset > b.x + inset &&
      a.y + inset < b.y + b.h - inset &&
      a.y + a.h - inset > b.y + inset;
  }
  function step(state, seconds, random = Math.random) {
    if (state.mode !== 'running') return state;
    const dt = clamp(Number(seconds) || 0, 0, 0.04);
    if (!dt) return state;
    state.frames += 1;
    state.distance += dt * state.speed;
    state.score = Math.floor(state.distance / 18) + state.bonus;
    state.level = Math.floor(state.score / 120) + 1;
    state.speed = 255 + Math.min(210, state.score * 0.58);

    if (state.jumpY !== 0 || state.velocityY !== 0) {
      state.velocityY += 1710 * dt;
      state.jumpY += state.velocityY * dt;
      if (state.jumpY >= 0) {
        state.jumpY = 0;
        state.velocityY = 0;
      }
    }

    const travel = state.speed * dt;
    for (const item of state.obstacles) item.x -= travel;
    for (const item of state.tokens) item.x -= travel;
    state.obstacles = state.obstacles.filter(item => item.x + item.w > -20);
    state.tokens = state.tokens.filter(item => item.x + item.w > -20);

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      const rand = clamp(Number(random()) || 0, 0, 0.9999);
      const type = rand < 0.25 && state.score > 40 ? 'drone' : 'pillar';
      const height = type === 'drone' ? 24 : (rand > 0.78 ? 43 : 32);
      const width = type === 'drone' ? 42 : (rand > 0.78 ? 31 : 26);
      state.obstacles.push({
        x: WIDTH + 25, y: type === 'drone' ? GROUND - 54 : GROUND - height,
        w: width, h: height, type
      });
      if (rand > 0.47) {
        state.tokens.push({ x: WIDTH + 135, y: GROUND - 115, w: 18, h: 18 });
      }
      state.spawnIn = 0.95 + clamp(Number(random()) || 0, 0, 0.9999) * 0.6;
    }

    const player = playerBounds(state);
    for (const token of state.tokens) {
      if (intersects(player, token)) {
        state.bonus += 20;
        state.score += 20;
        token.x = -100;
      }
    }
    state.tokens = state.tokens.filter(item => item.x > -40);
    for (const obstacle of state.obstacles) {
      if (intersects(player, obstacle)) {
        state.mode = 'over';
        state.duck = false;
        break;
      }
    }
    return state;
  }

  const api = { WIDTH, HEIGHT, GROUND, isNetworkError, createState, start, jump, duck, step, playerBounds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  const root = document.getElementById('offline-run');
  if (!root) return;
  const canvas = document.getElementById('offline-run-canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'aegis-offline-run-best-v1';
  const state = createState();
  let visible = false;
  let privateMode = false;
  let best = 0;
  let previous = 0;
  let frame = 0;

  function getBest() {
    if (privateMode) return 0;
    try { return Math.max(0, Math.floor(Number(localStorage.getItem(STORAGE_KEY)) || 0)); }
    catch { return 0; }
  }
  function saveBest() {
    if (privateMode || state.score <= best) return;
    best = state.score;
    try { localStorage.setItem(STORAGE_KEY, String(best)); } catch {}
  }
  function updateLabels() {
    $('offline-run-score').textContent = String(state.score).padStart(4, '0');
    $('offline-run-best').textContent = String(Math.max(state.score, best)).padStart(4, '0');
    $('offline-run-level').textContent = String(state.level);
    const status = $('offline-run-status');
    const play = $('offline-run-start');
    const labels = {
      ready: ['Prêt pour le décollage ?', 'Jouer'],
      running: ['Saute les obstacles, esquive les drones et attrape les étoiles.', 'Pause'],
      paused: ['En pause · prêt à reprendre', 'Reprendre'],
      over: ['Partie terminée · retente ta chance !', 'Rejouer']
    };
    const [message, button] = labels[state.mode];
    status.textContent = message;
    play.textContent = button;
    $('offline-run-jump').disabled = state.mode === 'paused';
    $('offline-run-duck').disabled = state.mode === 'paused';
  }
  function paint() {
    const light = document.body.classList.contains('light');
    const night = light ? '#e7f4fb' : '#101f38';
    const horizon = light ? '#b5e8db' : '#172b45';
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, night);
    grad.addColorStop(1, horizon);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const drift = (state.distance * 0.12) % (WIDTH + 80);
    for (let i = 0; i < 24; i++) {
      const x = ((i * 137 + 49 - drift) % (WIDTH + 80) + WIDTH + 80) % (WIDTH + 80) - 30;
      const y = 17 + (i * 37) % 104;
      ctx.fillStyle = light ? 'rgba(34,94,120,.16)' : 'rgba(198,230,247,.36)';
      ctx.fillRect(x, y, i % 4 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
    }
    // Background skyline and scrolling floor.
    ctx.fillStyle = light ? '#a9d7cf' : '#223955';
    for (let i = 0; i < 13; i++) {
      const x = i * 77 - ((state.distance * 0.27) % 77);
      const height = 28 + (i * 37) % 44;
      ctx.fillRect(x, GROUND - height, 48, height);
    }
    ctx.fillStyle = light ? '#348c7f' : '#60dac2';
    ctx.fillRect(0, GROUND, WIDTH, 3);
    ctx.fillStyle = light ? 'rgba(26,85,93,.16)' : 'rgba(126,197,213,.14)';
    for (let i = 0; i < 18; i++) {
      const x = i * 49 - ((state.distance * 0.92) % 49);
      ctx.fillRect(x, GROUND + 16, 24, 2);
      ctx.fillRect(x + 15, GROUND + 35, 11, 2);
    }

    for (const token of state.tokens) {
      ctx.save();
      ctx.translate(token.x + 9, token.y + 9);
      ctx.rotate((state.frames % 100) / 26);
      ctx.fillStyle = '#ffdc70';
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const a = Math.PI * j / 4;
        const radius = j % 2 ? 5 : 11;
        j ? ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius) : ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const obstacle of state.obstacles) {
      if (obstacle.type === 'drone') {
        ctx.fillStyle = '#ff8d96';
        ctx.fillRect(obstacle.x + 4, obstacle.y + 5, obstacle.w - 8, obstacle.h - 9);
        ctx.fillStyle = '#ffcbd0';
        ctx.fillRect(obstacle.x + 14, obstacle.y + 11, 9, 4);
        ctx.fillStyle = '#f25b76';
        ctx.fillRect(obstacle.x, obstacle.y, 8, 4);
        ctx.fillRect(obstacle.x + obstacle.w - 8, obstacle.y, 8, 4);
      } else {
        ctx.fillStyle = '#fa839a';
        ctx.beginPath();
        ctx.moveTo(obstacle.x, GROUND);
        ctx.lineTo(obstacle.x + obstacle.w * .52, obstacle.y);
        ctx.lineTo(obstacle.x + obstacle.w, GROUND);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.36)';
        ctx.fillRect(obstacle.x + obstacle.w * .47, obstacle.y + 11, 3, 8);
      }
    }

    // Original mint-coloured Aegis character (not Chrome Dino / Opera Runbun assets).
    const p = playerBounds(state);
    ctx.fillStyle = '#67e0c8';
    ctx.beginPath();
    ctx.roundRect(p.x, p.y, p.w, p.h, state.duck ? 10 : 12);
    ctx.fill();
    ctx.fillStyle = '#1e3145';
    ctx.fillRect(p.x + p.w - 15, p.y + 11, 5, 5);
    ctx.fillStyle = '#f7fcff';
    ctx.fillRect(p.x + 8, p.y + 9, 5, 5);
    ctx.fillStyle = '#2e8e92';
    ctx.fillRect(p.x + 6, p.y + p.h - 5, 9, 7);
    ctx.fillRect(p.x + 22, p.y + p.h - 5, 9, 7);
    ctx.strokeStyle = '#9df8dd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + 17, p.y);
    ctx.lineTo(p.x + 17, p.y - 7);
    ctx.stroke();
    ctx.fillStyle = '#ffdf82';
    ctx.fillRect(p.x + 14, p.y - 10, 6, 5);

    if (state.mode !== 'running') {
      ctx.fillStyle = light ? 'rgba(238,248,249,.44)' : 'rgba(9,19,35,.38)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = light ? '#1e4658' : '#effffa';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.mode === 'over' ? 'FIN DE PARTIE' : state.mode === 'paused' ? 'PAUSE' : 'AEGIS RUN', WIDTH / 2, 104);
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('ESPACE / ↑ : sauter   •   ↓ : glisser   •   P : pause', WIDTH / 2, 130);
    }
  }
  function loop(timestamp) {
    if (!visible) return;
    if (previous) {
      const before = state.mode;
      step(state, (timestamp - previous) / 1000);
      if (before === 'running' && state.mode === 'over') saveBest();
    }
    previous = timestamp;
    paint();
    updateLabels();
    frame = requestAnimationFrame(loop);
  }
  function setVisible(active, options = {}) {
    const next = Boolean(active);
    if (next === visible && (!next || privateMode === Boolean(options.privateMode))) return;
    privateMode = Boolean(options.privateMode);
    if (next) {
      best = getBest();
      visible = true;
      previous = 0;
      if (!frame) frame = requestAnimationFrame(loop);
    } else {
      visible = false;
      if (state.mode === 'running') {
        state.mode = 'paused';
        saveBest();
      }
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      state.duck = false;
      updateLabels();
    }
  }
  function togglePlay() {
    if (!visible) return;
    if (state.mode === 'running') state.mode = 'paused';
    else if (state.mode === 'paused') { state.mode = 'running'; previous = 0; }
    else start(state);
    updateLabels();
  }
  function onKeyDown(event) {
    if (!visible || root.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) jump(state);
    } else if (['ArrowDown', 'KeyS'].includes(event.code)) {
      event.preventDefault();
      duck(state, true);
    } else if (event.code === 'KeyP') {
      event.preventDefault();
      if (!event.repeat) togglePlay();
    } else if (event.code === 'Enter' && state.mode !== 'running') {
      event.preventDefault();
      togglePlay();
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', event => {
    if (['ArrowDown', 'KeyS'].includes(event.code)) duck(state, false);
  });
  $('offline-run-start').addEventListener('click', togglePlay);
  $('offline-run-jump').addEventListener('click', () => { if (visible) jump(state); });
  const slide = $('offline-run-duck');
  slide.addEventListener('pointerdown', event => { if (visible) { event.preventDefault(); duck(state, true); } });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) slide.addEventListener(type, () => duck(state, false));
  canvas.addEventListener('pointerdown', event => { if (visible) { event.preventDefault(); jump(state); } });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && visible && state.mode === 'running') {
      state.mode = 'paused';
      saveBest();
      updateLabels();
    }
  });
  window.AegisOfflineRun = { isNetworkError, setVisible };
  updateLabels();
  paint();
})();
