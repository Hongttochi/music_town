import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file) {
  const context = {
    exports: {},
    require: (id) => (id === '../../data/bar' ? load('../src/data/bar.ts') : require(id)),
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return context.exports;
}
const { BAR_SPOT, BAR_ENTRANCE, BAR_INSIDE, BAR_SEATS, overlapsBar, isInsideBar } = load(
  '../src/scene/park/nightBar.ts',
);
const { isParkNight } = load('../src/utils/time.ts');
const { clampParkPosition } = load('../src/utils/parkBounds.ts');

test('bar uses the existing Korean night schedule at both boundaries', () => {
  for (const [time, night] of [
    ['18:59:59', false],
    ['19:00:00', true],
    ['05:59:59', true],
    ['06:00:00', false],
  ]) {
    assert.equal(isParkNight(Date.parse(`2026-11-08T${time}+09:00`)), night);
  }
});
test('daytime locks the doorway while night allows passage without opening side walls', () => {
  const doorway = { x: BAR_SPOT.x, z: BAR_SPOT.z + 4.9 };
  assert.equal(overlapsBar(doorway, 0.35, false), true);
  assert.equal(overlapsBar(doorway, 0.35, true), false);
  assert.equal(overlapsBar({ x: BAR_SPOT.x + 5.9, z: BAR_SPOT.z }, 0.35, true), true);
  assert.equal(overlapsBar({ x: BAR_SPOT.x, z: BAR_SPOT.z - 4.9 }, 0.35, true), true);
  assert.equal(overlapsBar({ x: 29.5, z: -8.3 }, 0.35, true), true);
  assert.equal(overlapsBar({ x: 34, z: -9.8 }, 0.35, true), true);
  assert.equal(overlapsBar({ x: 34, z: -8.6 }, 0.35, true), false);
});
test('arrival and exit are clear, stay within supported coordinates and avoid the riverside stage', () => {
  assert.equal(isInsideBar(BAR_INSIDE), true);
  assert.equal(isInsideBar(BAR_ENTRANCE), false);
  assert.equal(overlapsBar(BAR_INSIDE, 0.35, true), false);
  assert.equal(overlapsBar(BAR_ENTRANCE, 0.35, false), false);
  for (const point of [BAR_INSIDE, BAR_ENTRANCE]) {
    const position = { x: point.x * 25 + 700, y: point.z * 25 + 450 };
    const safe = clampParkPosition(position);
    assert.equal(safe.x, position.x);
    assert.equal(safe.y, position.y);
  }
  assert.equal(overlapsBar({ x: 32, z: 7 }, 2.2, false), false);
});

test('closed bar reserves the front apron to keep avatar heads out of the facade', () => {
  for (const z of [-2, -1, 1]) {
    assert.equal(overlapsBar({ x: 32, z }, 0.35, false), true);
  }
  assert.equal(overlapsBar(BAR_ENTRANCE, 0.35, false), false);
  assert.equal(overlapsBar({ x: 32, z: -2.8 }, 0.35, true), false);
});

test('expanded bar has separated lounge and counter seats, an open audience aisle and accessible stage', () => {
  assert.equal(BAR_SEATS.length, 9);
  for (const seat of BAR_SEATS) {
    assert.equal(isInsideBar(seat), true);
    const safe = clampParkPosition({ x: seat.x * 25 + 700, y: seat.z * 25 + 450 });
    assert.equal(safe.x, seat.x * 25 + 700);
    assert.equal(safe.y, seat.z * 25 + 450);
  }
  for (let z = -2.2; z >= -8.6; z -= 0.2) {
    assert.equal(overlapsBar({ x: 34, z }, 0.35, true), false, `stage aisle z=${z}`);
  }
  for (let z = -3; z <= 3; z += 0.1) {
    assert.equal(overlapsBar({ x: 32, z }, 0.35, true), false, `exit z=${z}`);
  }
});
