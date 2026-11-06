import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/remoteMovement.ts', import.meta.url), 'utf8');
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  context,
);
const { remoteMovementStep } = context.exports;

test('1.5-second heartbeat updates produce continuous walking at 30, 60 and 120 fps', () => {
  for (const fps of [30, 60, 120]) {
    let position = 0;
    let target = 0;
    const steps = [];
    for (let frame = 0; frame < fps * 6; frame++) {
      if (frame % (fps * 1.5) === 0) target += 6.3;
      const movement = remoteMovementStep(target - position, 1 / fps);
      const step = (target - position) * movement.fraction;
      position += step;
      steps.push(step);
    }
    assert.ok(Math.abs(position - 25.2) < 0.001);
    assert.ok(
      Math.max(...steps) - Math.min(...steps) < 0.001,
      'no repeated rush-and-stop between packets',
    );
  }
});
test('a stopped participant settles exactly without overshooting or continuing to walk', () => {
  let position = 0;
  for (let frame = 0; frame < 180; frame++) {
    const { fraction } = remoteMovementStep(3 - position, 1 / 60);
    position += (3 - position) * fraction;
    assert.ok(position <= 3);
  }
  assert.equal(position, 3);
  assert.equal(remoteMovementStep(0, 1 / 60).walking, false);
});
test('a long frame does not jump forward, while server relocations are immediate', () => {
  const step = remoteMovementStep(6, 10);
  assert.ok(6 * step.fraction < 0.2);
  for (const [distance, relocate] of [
    [30, false],
    [6, true],
  ]) {
    const movement = remoteMovementStep(distance, 1 / 60, relocate);
    assert.equal(movement.fraction, 1);
    assert.equal(movement.walking, false);
  }
});
