import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as T from 'three';
import { createCanvas } from '@napi-rs/canvas';
const require = createRequire(import.meta.url);
const context = { exports: {}, require, document: { createElement: () => createCanvas(512, 128) } };
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/scene/park/townOffice.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  context,
);
const {
  createTownOffice,
  OFFICE_SPOT,
  OFFICE_CLERK,
  overlapsOffice,
  isInsideOffice,
  isOfficeGround,
} = context.exports;
test('office has a walkable doorway, solid furniture, cutaway roof and disposed render assets', () => {
  assert.equal(overlapsOffice(OFFICE_SPOT, 0.3), false);
  assert.ok(isInsideOffice(OFFICE_CLERK));
  assert.ok(isOfficeGround(OFFICE_CLERK, 2));
  for (let z = -13; z >= -20; z -= 0.1)
    assert.equal(overlapsOffice({ x: 5, z }, 0.3), false, `door lane ${z}`);
  assert.ok(overlapsOffice({ x: 5, z: -21.2 }, 0.3));
  assert.ok(overlapsOffice({ x: 9.9, z: -20 }, 0.3));
  assert.ok(overlapsOffice({ x: 5, z: -23.9 }, 0.3));
  assert.equal(overlapsOffice(OFFICE_CLERK, 0.3), false);
  const scene = new T.Scene();
  const office = createTownOffice(scene);
  assert.equal(scene.children[0].name, 'town-office');
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set();
  scene.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) {
      materials.add(object.material);
      if (object.material.map) textures.add(object.material.map);
    }
  });
  const assets = [...geometries, ...materials, ...textures];
  let disposed = 0;
  assets.forEach((asset) => asset.addEventListener('dispose', () => disposed++));
  office.update(1200, true, false, true);
  assert.equal(scene.getObjectByName('office-roof').visible, false);
  assert.equal(scene.getObjectByName('office-interior').visible, true);
  assert.ok(scene.children[0].children.find((o) => o.isPointLight).intensity > 0);
  office.update(2400, false, true, false);
  assert.equal(scene.getObjectByName('office-roof').visible, true);
  assert.equal(scene.children[0].children.find((o) => o.isPointLight).intensity, 0);
  office.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(disposed, assets.length);
});
