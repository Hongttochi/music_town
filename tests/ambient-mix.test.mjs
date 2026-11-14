import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(readFileSync(new URL('../src/audio/ambientMix.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const { ambientLevels } = context.exports;
const base = {
  audible: true,
  volume: 1,
  quiet: false,
  night: true,
  insideBar: false,
  barPerforming: false,
  riverMix: 0.5,
  fireProximity: 1,
  fountainProximity: 1,
};
const levels = (patch) => Array.from(ambientLevels({ ...base, ...patch }));
test('entering the bar silences all outdoor ambience and plays very quiet jazz', () => {
  const outside = levels({});
  const inside = levels({ insideBar: true });
  assert.equal(outside[4], 0);
  assert.ok(outside[1] > 0 && outside[2] > 0 && outside[3] > 0);
  assert.deepEqual(inside.slice(0, 4), [0, 0, 0, 0]);
  assert.ok(inside[4] > 0 && inside[4] <= 0.04);
  assert.equal(levels({ insideBar: true, volume: 0.5 })[4], inside[4] / 2);
});
test('bar performance silences jazz and finishing restores it without outdoor audio', () => {
  assert.deepEqual(levels({ insideBar: true, barPerforming: true }), [0, 0, 0, 0, 0, 0]);
  assert.ok(levels({ insideBar: true, barPerforming: false })[4] > 0);
  assert.deepEqual(levels({ barPerforming: true }), levels({}));
});
test('disabled audio, zero volume and daytime bar do not play jazz', () => {
  for (const patch of [{ audible: false }, { volume: 0 }, { night: false }]) {
    assert.deepEqual(levels({ insideBar: true, ...patch }), [0, 0, 0, 0, 0, 0]);
  }
});

test('fountain fades with distance and stays silent indoors or when muted', () => {
  const near = levels({})[5];
  assert.ok(near > 0);
  assert.equal(levels({ fountainProximity: 0.5 })[5], near / 4);
  for (const patch of [
    { fountainProximity: 0 },
    { insideBar: true },
    { audible: false },
    { volume: 0 },
  ]) {
    assert.equal(levels(patch)[5], 0);
  }
  assert.ok(levels({ quiet: true })[5] < near);
});
test('background and river levels are reduced while respecting user volume', () => {
  assert.equal(levels({ night: false, riverMix: 0 })[0], 0.21);
  assert.equal(levels({ riverMix: 1 })[2], 0.0525);
  assert.equal(levels({ riverMix: 1, volume: 0.5 })[2], 0.02625);
});
