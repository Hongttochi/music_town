import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
const context = { exports: {}, require: () => THREE };
vm.runInNewContext(
  ts.transpileModule(readFileSync('src/scene/park/benchOcclusion.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  context,
);
const { createBenchOcclusion } = context.exports;
test('occupied benches stay visible and do not write depth through the seated sprite', () => {
  for (const rotation of [0, Math.PI, Math.PI / 2]) {
    const bench = new THREE.Group();
    bench.position.set(26.6, 0, 7.5);
    bench.rotation.y = rotation;
    const shared = new THREE.MeshStandardMaterial();
    const slat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.13, 0.22), shared);
    bench.add(slat);
    const occlusion = createBenchOcclusion(bench);
    const occupant = bench.localToWorld(new THREE.Vector3(0.5, 0, 0.48));
    occlusion.update([occupant]);
    assert.equal(slat.visible, true);
    assert.equal(slat.material.depthWrite, false);
    assert.equal(
      shared.depthWrite,
      true,
      'other furniture sharing the original material stays unchanged',
    );
    assert.equal(slat.material.depthTest, true);
    assert.equal(slat.material.transparent, false);
    occlusion.update([{ x: 0, z: 0 }]);
    assert.equal(slat.material.depthWrite, true);
    occlusion.update([occupant]);
    occlusion.update([]);
    assert.equal(slat.material.depthWrite, true);
    occlusion.dispose();
    assert.equal(slat.material, shared);
    slat.geometry.dispose();
    shared.dispose();
  }
});

test('rear bench rails cover the seated back view without cutting the body with seat slats', () => {
  const bench = new THREE.Group();
  const shared = new THREE.MeshStandardMaterial();
  const rail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.12), shared);
  rail.position.set(0, 1.25, -0.43);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.13, 0.22), shared);
  seat.position.set(0, 0.64, 0);
  bench.add(rail, seat);
  const occlusion = createBenchOcclusion(bench);
  occlusion.update([{ x: 0, z: 0.12 }], new THREE.Vector3(0, 5, -6));
  assert.equal(rail.material.depthWrite, true);
  assert.equal(seat.material.depthWrite, false);
  occlusion.update([{ x: 0, z: 0.12 }], new THREE.Vector3(0, 5, 6));
  assert.equal(rail.material.depthWrite, false);
  assert.equal(seat.material.depthWrite, false);
  occlusion.dispose();
  rail.geometry.dispose();
  seat.geometry.dispose();
  shared.dispose();
});
