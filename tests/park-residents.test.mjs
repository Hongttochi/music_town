import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';

function load(file, globals = {}, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const context = {
    exports,
    ...globals,
    require: (name) =>
      name === 'three'
        ? {
            ...THREE,
            ImageLoader: class {
              load() {}
            },
          }
        : load(resolve(dirname(file), name + '.ts'), globals, cache),
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return exports;
}
const { residentRoute } = load('src/scene/park/residentNavigation.ts');
const { canCrossRiver, BRIDGE } = load('src/scene/park/riverBoundary.ts');
test('residents cross the river only on the bridge', () => {
  const start = { x: 12, z: -4 },
    end = { x: 28, z: 8 };
  const route = residentRoute(start, end, () => true, canCrossRiver);
  assert.ok(route);
  let previous = start;
  for (const point of route) {
    assert.ok(canCrossRiver(previous, point));
    previous = point;
  }
  assert.ok(
    route.some((p) => p.x > 16 && p.x < 24 && Math.abs(p.z - BRIDGE.centerZ) < BRIDGE.width / 2),
  );
});
test('route avoids furniture and rejects an enclosed destination', () => {
  const clear = (p) => !(Math.abs(p.x) < 1 && Math.abs(p.z) < 3);
  const route = residentRoute({ x: -3, z: 0 }, { x: 3, z: 0 }, clear, () => true);
  assert.ok(route && route.every(clear));
  assert.equal(
    residentRoute({ x: -3, z: 0 }, { x: 0, z: 0 }, clear, () => true),
    null,
  );
});
test('random dialogue does not immediately repeat', () => {
  const { residentLine } = load('src/data/parkResidents.ts');
  const talk = { id: 'bori', activity: 'coffee' };
  const first = residentLine(talk, '', () => 0);
  assert.notEqual(
    residentLine(talk, first, () => 0),
    first,
  );
});

function simulation(random = 0.1, seats = []) {
  const elements = [];
  const element = () => ({
    style: {},
    append(...children) {
      this.children.push(...children);
    },
    children: [],
    setAttribute() {},
    remove() {
      this.removed = true;
    },
    textContent: '',
  });
  const parent = element();
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera();
  const math = Object.create(Math);
  math.random = () => random;
  const { createParkResidents } = load('src/scene/park/parkResidents.ts', {
    Math: math,
    document: {
      createElement() {
        const e = element();
        elements.push(e);
        return e;
      },
    },
    matchMedia: () => ({ matches: true }),
    performance: { now: () => 0 },
  });
  let talk;
  const system = createParkResidents({
    scene,
    camera,
    canvas: { parentElement: parent, clientWidth: 800, clientHeight: 600 },
    seats,
    clear: () => true,
    cross: canCrossRiver,
    insideBar: (p) => p.z < -5 && p.x > 25,
    surface: () => 0,
    coffee: { x: -3, z: -9 },
    talk: (value) => {
      talk = value;
    },
  });
  const context = { night: true, paused: false, stages: [], people: [], insideBar: true };
  const step = (seconds) => {
    for (let i = 1; i <= seconds * 10; i++) system.update(i * 100, 0.1, context);
  };
  const activities = () =>
    elements
      .filter((e) => e.onclick)
      .map((e) => {
        e.onclick();
        return talk.activity;
      });
  return { system, context, step, activities, scene, parent };
}
test('residents visit coffee and react to an active stage', () => {
  const sim = simulation();
  sim.context.stages = [{ id: 1, point: new THREE.Vector3(5, 0, 0) }];
  sim.step(45);
  const activities = sim.activities();
  assert.ok(activities.includes('coffee'));
  assert.ok(activities.includes('watch'));
  assert.ok(
    sim.scene.children.some((g) => g.children.some((c) => c.isMesh && c.visible)),
    'coffee cup becomes visible',
  );
  sim.context.stages = [];
  sim.system.update(45100, 0.1, sim.context);
  assert.ok(!sim.activities().includes('watch'));
  sim.system.dispose();
  assert.equal(sim.scene.children.length, 0);
  assert.ok(sim.parent.children[0].removed);
});
test('bench reservations are unique and yield to a player', () => {
  const seat = {
    point: new THREE.Vector3(-10, 0, 5),
    approach: new THREE.Vector3(-10, 0, 6),
    facing: 0,
    bar: false,
  };
  const sim = simulation(0.4, [seat]);
  sim.step(12);
  assert.equal(sim.activities().filter((a) => a === 'rest').length, 1);
  sim.context.people = [seat.point];
  sim.system.update(12100, 0.1, sim.context);
  assert.ok(!sim.activities().includes('rest'));
  sim.system.dispose();
});
test('bar visits end when the bar closes', () => {
  const seat = {
    point: new THREE.Vector3(30, 0, -6),
    approach: new THREE.Vector3(30, 0, -5),
    facing: 0,
    bar: true,
  };
  const sim = simulation(0.4, [seat]);
  sim.step(90);
  assert.ok(sim.activities().includes('bar'));
  sim.context.night = false;
  sim.system.update(90100, 0.1, sim.context);
  assert.ok(!sim.activities().includes('bar'));
  sim.system.dispose();
});
