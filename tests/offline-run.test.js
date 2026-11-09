'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isNetworkError, createState, start, jump, duck, step, playerBounds, GROUND } = require('../src/offline-run');

test('only network errors trigger the offline game; a cancelled navigation does not', () => {
  assert.equal(isNetworkError(-106), true); // Internet disconnected
  assert.equal(isNetworkError(-105), true); // DNS resolution failed
  assert.equal(isNetworkError(-118), true); // Network timeout
  assert.equal(isNetworkError(-3), false); // navigation aborted
  assert.equal(isNetworkError(-202), false); // certificate failure
  assert.equal(isNetworkError(-999, true), true); // browser reports offline
});
test('game starts, jumps, lands and reacts to duck controls', () => {
  const state = createState();
  assert.equal(state.mode, 'ready');
  jump(state);
  assert.equal(state.mode, 'running');
  assert.ok(state.velocityY < 0);
  step(state, 0.02, () => 0);
  assert.ok(state.jumpY < 0);
  for (let i = 0; i < 45; i++) step(state, 0.02, () => 0);
  assert.equal(state.jumpY, 0);
  assert.equal(state.velocityY, 0);
  duck(state, true);
  assert.equal(playerBounds(state).h, 25);
  duck(state, false);
  assert.equal(playerBounds(state).h, 44);
});
test('hitting ground hazards ends the game and restart works', () => {
  const state = createState();
  start(state);
  state.obstacles.push({ type: 'pillar', x: 94, y: GROUND - 32, w: 26, h: 32 });
  step(state, 0.016);
  assert.equal(state.mode, 'over');
  jump(state);
  assert.equal(state.mode, 'running');
  assert.equal(state.obstacles.length, 0);
});
test('ducking avoids low-flying drones but standing collides', () => {
  const state = createState();
  start(state);
  state.obstacles.push({ type: 'drone', x: 94, y: GROUND - 54, w: 42, h: 24 });
  duck(state, true);
  step(state, 0.016);
  assert.equal(state.mode, 'running');
  duck(state, false);
  step(state, 0.016);
  assert.equal(state.mode, 'over');
});
test('jumping clears ground pillars and stars increase score', () => {
  const state = createState();
  start(state);
  state.jumpY = -70;
  state.velocityY = 0;
  state.obstacles.push({ type: 'pillar', x: 94, y: GROUND - 32, w: 26, h: 32 });
  state.tokens.push({ x: 96, y: GROUND - 115, w: 18, h: 18 });
  step(state, 0.016);
  assert.equal(state.mode, 'running');
  assert.ok(state.score >= 20);
});
test('score and difficulty progress, pause freezes all movement', () => {
  const state = createState();
  start(state);
  state.distance = 3000;
  step(state, 0.02, () => 0.1);
  assert.ok(state.level >= 2);
  assert.ok(state.speed > 255);
  state.mode = 'paused';
  const before = state.distance;
  step(state, 0.04);
  assert.equal(state.distance, before);
});
