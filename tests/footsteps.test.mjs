import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(readFileSync('src/audio/footsteps.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const { createFootsteps } = context.exports;
test('walking loops once, switches flooring, and cancels immediately on stop', () => {
  const calls = [];
  const steps = createFootsteps((name, loop) => {
    calls.push(['play', name, loop]);
    return () => calls.push(['stop', name]);
  });
  steps.update(false, false);
  steps.update(true, false);
  steps.update(true, false);
  steps.update(true, true);
  steps.update(false, true);
  steps.stop();
  assert.deepEqual(calls, [
    ['play', 'grassWalk', true],
    ['stop', 'grassWalk'],
    ['play', 'barWalk', true],
    ['stop', 'barWalk'],
  ]);
});
test('blur or scene disposal cancels a pending loop and permits later resumption', () => {
  let started = 0,
    stopped = 0;
  const steps = createFootsteps(() => {
    started++;
    return () => stopped++;
  });
  steps.update(true, true);
  steps.stop();
  steps.stop();
  steps.update(true, true);
  steps.stop();
  assert.equal(started, 2);
  assert.equal(stopped, 2);
});
