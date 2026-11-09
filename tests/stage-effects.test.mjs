import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const context = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/audio/stageEffects.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);
const { normalizeStageEffects, createStageEffects } = context.exports;
test('persisted effects are bounded and invalid values fall back to dry defaults', () => {
  assert.equal(normalizeStageEffects({ volume: Infinity, reverb: NaN, echo: -20 }).volume, 100);
  assert.equal(normalizeStageEffects({ volume: 200, reverb: 80, echo: 100 }).volume, 150);
  assert.equal(normalizeStageEffects({ reverb: 80 }).reverb, 60);
  assert.equal(normalizeStageEffects({ echo: 100 }).echo, 50);
  assert.equal(normalizeStageEffects({ echo: -20 }).echo, 0);
});
test('processed voice plays locally, preserves the outgoing stream, and disconnects on disposal', () => {
  const nodes = [];
  const param = () => ({
    value: 0,
    cancelScheduledValues() {},
    setTargetAtTime(value) {
      this.value = value;
    },
  });
  const node = () => {
    const n = {
      connections: [],
      gain: param(),
      delayTime: param(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
      connect(target) {
        this.connections.push(target);
        return target;
      },
      disconnect() {
        this.connections = [];
      },
    };
    nodes.push(n);
    return n;
  };
  let outputStopped = 0;
  const track = {
    stop() {
      outputStopped++;
    },
  };
  const stream = { getTracks: () => [track] };
  const ctx = {
    sampleRate: 100,
    currentTime: 1,
    destination: {},
    createMediaStreamSource: () => node(),
    createGain: node,
    createDelay: node,
    createConvolver: node,
    createDynamicsCompressor: node,
    createBuffer: () => ({ getChannelData: () => new Float32Array(140) }),
    createMediaStreamDestination: () => Object.assign(node(), { stream }),
  };
  const raw = {
    stop() {
      throw new Error('raw input must stay owned by microphone hook');
    },
  };
  const graph = createStageEffects(ctx, raw, { volume: 100, reverb: 0, echo: 0 });
  const count = nodes.length;
  for (let i = 0; i < 20; i++) graph.update({ volume: i * 5, reverb: 20, echo: 25 });
  assert.equal(graph.stream, stream);
  assert.equal(nodes.length, count);
  const monitors = nodes.filter((n) => n.connections.includes(ctx.destination));
  assert.equal(monitors.length, 1);
  const outgoing = nodes.find((n) => n.stream === stream);
  assert.ok(monitors[0].connections.includes(outgoing));
  graph.dispose();
  assert.equal(outputStopped, 1);
  assert.ok(nodes.every((n) => n.connections.length === 0));
});
