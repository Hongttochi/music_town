import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/scene/avatar/gait.ts', import.meta.url), 'utf8');
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  context,
);
const {
  GAIT_STRIDE,
  GAIT_FRAMES,
  WALK_SPEED,
  JOYSTICK_DEADZONE,
  createGaitState,
  advanceGait,
  gaitFrame,
  gaitBob,
  facingCell,
  joystickVector,
  smoothVelocity,
  smoothVelocityDelta,
} = context.exports;
const degrees = (value) => (value * Math.PI) / 180;
const bodyFrame = (state) => gaitFrame(state.phase);

test('30, 60 and 120 fps produce the same position and gait phase', () => {
  function simulate(fps) {
    const dt = 1 / fps;
    let velocity = { x: 0, z: 0 };
    let state = createGaitState();
    let position = 0;
    let phaseAtThreeQuarters = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      const moving = frame < fps;
      const target = moving ? { x: WALK_SPEED, z: 0 } : { x: 0, z: 0 };
      const delta = smoothVelocityDelta(velocity, target, dt);
      position += delta.x;
      state = advanceGait(state, Math.hypot(delta.x, delta.z), dt, moving);
      velocity = smoothVelocity(velocity, target, dt);
      if (frame + 1 === Math.round(fps * 0.5)) phaseAtThreeQuarters = state.phase;
    }
    return { position, phaseAtThreeQuarters };
  }
  const runs = [30, 60, 120].map(simulate);
  for (const run of runs.slice(1)) {
    assert.ok(Math.abs(run.position - runs[0].position) < 1e-3);
    assert.ok(Math.abs(run.phaseAtThreeQuarters - runs[0].phaseAtThreeQuarters) < 1e-3);
  }
});

test('stopping only advances forward to the next legs-together frame', () => {
  const expected = (phase) => {
    const frame = gaitFrame(phase);
    if (frame === 0) return 0;
    if (frame === 4) return 0.5;
    return phase < 0.5 ? 0.5 : 0;
  };
  const maxSeconds = GAIT_STRIDE / 2 / WALK_SPEED;
  const dt = 1 / 60;
  for (const phase of [
    0,
    1e-12,
    0.01,
    0.12,
    0.13,
    0.24,
    0.37,
    0.49,
    0.5,
    0.5 - 1e-12,
    0.5 + 1e-12,
    0.61,
    0.625,
    0.76,
    0.92,
    1 - 1e-12,
    0.999,
  ]) {
    let state = { phase, settling: false, bobWeight: 1 };
    const start = state.phase;
    const snapsImmediately = [0, 4].includes(gaitFrame(start));
    let seconds = 0;
    for (let frame = 0; frame < 120; frame++) {
      const previous = state;
      state = advanceGait(state, 0, dt, false);
      seconds += dt;
      const forward =
        state.phase >= previous.phase
          ? state.phase - previous.phase
          : 1 - previous.phase + state.phase;
      if (!snapsImmediately) assert.ok(forward >= -1e-12, 'settling never rewinds the walk');
      if (!state.settling) break;
    }
    assert.equal(state.settling, false);
    assert.ok([0, 4].includes(bodyFrame(state)));
    assert.equal(state.phase, expected(start), `phase ${start} settles on the next neutral`);
    if (snapsImmediately) assert.equal(seconds, dt);
    assert.ok(seconds <= maxSeconds + dt + 1e-9, `settled in ${seconds}s`);
  }
});

test('zero distance leaves the phase untouched, even while input is held', () => {
  let state = createGaitState(0.37);
  const phase = state.phase;
  for (let frame = 0; frame < 120; frame++) state = advanceGait(state, 0, 1 / 60, true);
  assert.equal(state.phase, phase);
  assert.equal(state.settling, false);
});

test('bob peaks at legs-together frames and matches footsteps', () => {
  let state = createGaitState(0.25);
  const dt = 1 / 120;
  const cycles = 3;
  const seconds = (GAIT_STRIDE * cycles) / WALK_SPEED;
  const bobs = [];
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    state = advanceGait(state, WALK_SPEED * dt, dt, true);
    bobs.push(gaitBob(state.phase, state.bobWeight));
  }
  let peaks = 0;
  for (let i = 1; i < bobs.length - 1; i++)
    if (bobs[i] > bobs[i - 1] && bobs[i] >= bobs[i + 1]) peaks++;
  assert.equal(peaks, 2 * cycles);
  assert.ok(Math.abs(gaitBob(0, 1) - gaitBob(0.5, 1)) < 1e-12);
  assert.ok(Math.abs(gaitBob(0.25, 1)) < 1e-12);
  assert.ok(Math.abs(gaitBob(0.75, 1)) < 1e-12);
  assert.equal(GAIT_FRAMES, 8);
});

test('facing hysteresis ignores jitter around a sector boundary', () => {
  for (const [first, second] of [
    [44, 46],
    [40, 50],
  ]) {
    let cell = facingCell(degrees(first), undefined);
    for (let index = 0; index < 24; index++) {
      const next = facingCell(degrees(index % 2 === 0 ? first : second), cell);
      assert.equal(next, cell, `${first}<->${second} should not flicker`);
      cell = next;
    }
  }
  let side = facingCell(degrees(46), undefined);
  for (let index = 0; index < 24; index++) {
    const next = facingCell(degrees(index % 2 === 0 ? 44 : 46), side);
    assert.equal(next, side);
    side = next;
  }
});

test('eight keyboard directions map deterministically from any previous cell', () => {
  const directions = [
    [0, 1, 0],
    [1, 1, 1],
    [1, 0, 1],
    [1, -1, 1],
    [0, -1, 2],
    [-1, -1, 3],
    [-1, 0, 3],
    [-1, 1, 3],
  ];
  for (const [dx, dz, expected] of directions) {
    const angle = Math.atan2(dx, dz);
    for (const previous of [undefined, 0, 1, 2, 3])
      assert.equal(facingCell(angle, previous), expected, `direction ${dx},${dz}`);
  }
});

test('joystick vector clamps to a circle with a continuous radial deadzone', () => {
  const radius = 35;
  for (const [x, y] of [
    [0, 0],
    [2, 1],
    [JOYSTICK_DEADZONE * radius - 1e-6, 0],
  ]) {
    const inside = joystickVector(x, y, radius);
    assert.equal(inside.x, 0);
    assert.equal(inside.y, 0);
  }
  const justOutside = joystickVector(JOYSTICK_DEADZONE * radius + 1e-6, 0, radius);
  assert.ok(Math.hypot(justOutside.x, justOutside.y) > 0);
  assert.ok(Math.hypot(justOutside.x, justOutside.y) < 1e-3);
  const clamped = joystickVector(100, 0, radius);
  assert.ok(Math.abs(Math.hypot(clamped.x, clamped.y) - 1) < 1e-9);
  for (const [x, y] of [
    [40, 40],
    [-80, 10],
    [3, 4],
    [-1, -1],
  ]) {
    const vector = joystickVector(x, y, radius);
    assert.ok(Math.hypot(vector.x, vector.y) <= 1 + 1e-9);
  }
  const diagonal = joystickVector(30, 40, 60);
  assert.ok(Math.abs(diagonal.y / diagonal.x - 40 / 30) < 1e-9);
});

test('smooth velocity never overshoots and snaps to zero', () => {
  const accelerated = smoothVelocity({ x: 0, z: 0 }, { x: WALK_SPEED, z: 0 }, 0.1);
  assert.ok(accelerated.x > 0 && accelerated.x <= WALK_SPEED);
  const decelerated = smoothVelocity({ x: WALK_SPEED, z: 0 }, { x: 0, z: 0 }, 0.1);
  assert.ok(decelerated.x >= 0 && decelerated.x < WALK_SPEED);
  for (const current of [
    { x: 0.04, z: 0 },
    { x: 0.03, z: 0.03 },
  ]) {
    const stopped = smoothVelocity(current, { x: 0, z: 0 }, 1 / 60);
    assert.equal(stopped.x, 0);
    assert.equal(stopped.z, 0);
  }
});
