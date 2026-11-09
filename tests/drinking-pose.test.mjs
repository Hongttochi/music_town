import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context = { exports: {}, require: () => ({}) };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/scene/avatar/drinkingAvatar.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);
const { drinkingArmPose } = context.exports;
test('cup rim reaches the mouth at the peak of a sip', () => {
  const pose = drinkingArmPose(1);
  const rimX = pose.handX - 10 - 25 * Math.sin(0.2);
  const rimY = pose.handY - 25 * Math.cos(0.2);
  assert.ok(Math.hypot(rimX - 256, rimY - 225) < 2);
});
test('hand stays attached to both rigid arm segments throughout the sip', () => {
  let previous;
  for (let frame = 0; frame <= 100; frame++) {
    const p = drinkingArmPose(frame / 100);
    assert.ok(Math.abs(Math.hypot(p.elbowX - 310, p.elbowY - 306) - Math.hypot(20, 51)) < 1e-6);
    assert.ok(Math.abs(Math.hypot(p.handX - p.elbowX, p.handY - p.elbowY) - 29) < 1e-6);
    if (previous) assert.ok(Math.hypot(p.handX - previous.handX, p.handY - previous.handY) < 3);
    previous = p;
  }
});
