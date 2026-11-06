import { build } from 'esbuild';
import assert from 'node:assert/strict';
const result = await build({
  entryPoints: ['src/scene/park/riverBoundary.ts'],
  bundle: true,
  write: false,
  format: 'esm',
});
const { canCrossRiver } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);
const move = (x, z, nextX, nextZ) => canCrossRiver({ x, z }, { x: nextX, z: nextZ });
assert.equal(move(14, 0, 15, 0), true, 'walking along bank stays available');
assert.equal(move(15, 0, 15.2, 0), false, 'west bank stops the player footprint before water');
assert.equal(move(25, 0, 24.8, 0), false, 'east bank stops the player footprint before water');
assert.equal(move(15, 4.5, 25, 4.5), true, 'bridge crosses west to east');
assert.equal(move(25, 4.5, 15, 4.5), true, 'bridge crosses east to west');
assert.equal(move(20, 3.6, 20, 3.4), false, 'north bridge edge blocks partial entry into water');
assert.equal(move(20, 5.4, 20, 5.6), false, 'south bridge edge blocks partial entry into water');
assert.equal(move(15, 3.4, 15.3, 3.56), false, 'diagonal entry cannot clip the water corner');
assert.equal(move(20, 4.5, 25, 0), false, 'a long diagonal move cannot skip across water');
assert.equal(move(20, 4.5, 15, 4.5), true, 'bridge exit remains available');
console.log(
  'Passed: both banks, both bridge edges, two-way crossing, diagonal corner and long-step collision',
);
