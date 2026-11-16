import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import * as T from 'three';
import { createCanvas } from '@napi-rs/canvas';
const require = createRequire(import.meta.url);
const context = { exports: {}, require, document: { createElement: () => createCanvas(512,128) } };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/scene/park/townOffice.ts',import.meta.url),'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,context);
const { createTownOffice, OFFICE_SPOT, OFFICE_CLERK, overlapsOffice } = context.exports;
test('office has an accessible clerk outside its solid building and disposes all render assets', () => {
  assert.ok(overlapsOffice(OFFICE_SPOT,.3));
  assert.equal(overlapsOffice(OFFICE_CLERK,.3),false);
  const scene=new T.Scene();
  const office=createTownOffice(scene);
  assert.equal(scene.children[0].name,'town-office');
  const geometries=new Set(), materials=new Set(),textures=new Set();
  scene.traverse((object)=>{
    if (object.geometry) geometries.add(object.geometry);
    if (object.material) { materials.add(object.material); if(object.material.map) textures.add(object.material.map); }
  });
  const assets=[...geometries,...materials,...textures];
  let disposed=0;
  assets.forEach((asset)=>asset.addEventListener('dispose',()=>disposed++));
  office.update(1200,true,false);
  assert.ok(scene.children[0].children.find((o)=>o.isPointLight).intensity>0);
  office.update(2400,false,true);
  assert.equal(scene.children[0].children.find((o)=>o.isPointLight).intensity,0);
  office.dispose();
  assert.equal(scene.children.length,0);
  assert.equal(disposed,assets.length);
});
