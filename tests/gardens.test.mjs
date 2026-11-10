import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as T from 'three';
const require = createRequire(import.meta.url);
function load(reduced = false) {
  const context = { exports: {}, require, matchMedia: () => ({ matches: reduced }) };
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/scene/park/gardens.ts', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      },
    ).outputText,
    context,
  );
  return context.exports.createGardens;
}
test('gardens respect blocked placements and release scene resources', () => {
  const scene = new T.Scene();
  const blocked = load()(scene, [], () => false);
  assert.equal(blocked.fountain, undefined);
  blocked.dispose();
  assert.equal(scene.children.length, 0);
  const paths = Array.from({ length: 60 }, (_, i) => ({ x: i * 0.2, z: 0, width: 1 }));
  const gardens = load()(scene, paths, (x) => x > 7);
  assert.equal(gardens.fountain.x, 8, 'blocked first fountain site uses the next clear site');
  const group = scene.children[0];
  assert.ok(group.children.some((mesh) => mesh.isInstancedMesh && mesh.count > 0));
  const drop = group.children.find((mesh) => mesh.userData.curve);
  const before = drop.position.clone();
  gardens.update(800);
  assert.ok(drop.position.distanceTo(before) > 0);
  let released = 0;
  drop.geometry.addEventListener('dispose', () => released++);
  gardens.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(released, 1);
});
test('reduced motion keeps fountain water animation still', () => {
  const scene = new T.Scene();
  const gardens = load(true)(scene, [], () => true);
  const drop = scene.children[0].children.find((mesh) => mesh.userData.curve);
  const before = drop.position.clone();
  gardens.update(9000);
  assert.equal(drop.position.distanceTo(before), 0);
  gardens.dispose();
});
