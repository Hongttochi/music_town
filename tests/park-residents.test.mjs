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
const { residentRoute, residentSafePosition } = load('src/scene/park/residentNavigation.ts');
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

function simulation(random = 0.1, seats = [], clear = () => true) {
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
    clear,
    cross: canCrossRiver,
    insideBar: (p) => p.z < -5 && p.x > 25,
    surface: () => 0,
    coffee: { x: -3, z: -9 },
    talk: (value) => {
      talk = value;
    },
  });
  // Image loading is stubbed; simulate characters whose textures have loaded.
  for (const group of scene.children) group.children[0].visible = true;
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
  return { system, context, step, activities, scene, parent, camera };
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

test('coffee cup stays attached to the sprite hand when the camera rotates', () => {
  const sim = simulation();
  for (const group of sim.scene.children) group.children[0].visible = true;
  let drinker;
  let time = 0;
  for (time = 100; time <= 90000; time += 100) {
    sim.system.update(time, 0.1, sim.context);
    drinker = sim.scene.children.find((group) => group.children[1].visible);
    if (drinker) break;
  }
  assert.ok(drinker, 'a resident reaches the cafe and receives coffee');
  sim.context.paused = true;
  const [sprite, cup] = drinker.children;
  const handOffset = () =>
    cup.position
      .clone()
      .sub(sprite.position)
      .applyQuaternion(sim.camera.quaternion.clone().invert());
  const before = handOffset();
  sim.camera.rotation.set(-0.7, 0.6, 0);
  sim.camera.updateMatrixWorld(true);
  sim.system.update(time + 100, 0.1, sim.context);
  assert.ok(before.distanceTo(handOffset()) < 1e-9);
  assert.ok(Math.abs(before.x - Math.abs(sprite.scale.x) * 0.32) < 1e-9);
  sprite.visible = false;
  sim.system.update(time + 200, 0.1, sim.context);
  assert.equal(cup.visible, false, 'never show a cup before the character texture loads');
  sim.system.dispose();
});

test('resident hips use seat height and expose occupied seats for stool occlusion', () => {
  for (const bar of [false, true]) {
    const seat = {
      point: new THREE.Vector3(-10, 0, 5),
      approach: new THREE.Vector3(-10, 0, 6),
      facing: 0,
      bar,
    };
    const sim = simulation(0.4, [seat]);
    sim.step(12);
    assert.equal(sim.system.occupiedSeats().length, 1);
    const resident = sim.scene.children.find(
      (group) => group.position.distanceTo(seat.point) < 0.01,
    );
    assert.ok(resident);
    const sprite = resident.children[0];
    assert.equal(sprite.center.y, 0.23);
    assert.equal(sprite.position.y, bar ? 1.03 : 0.705);
    assert.equal(sim.system.positionOf(resident.name.replace('resident-', '')), resident.position);
    sim.context.people = [seat.point];
    sim.system.update(12100, 0.1, sim.context);
    assert.equal(sim.system.occupiedSeats().length, 0);
    sim.system.dispose();
  }
});

test('resident speech bubbles include a chat icon and a visible name', () => {
  const sim = simulation();
  const buttons = sim.parent.children[0].children.filter((element) => element.onclick);
  assert.equal(buttons.length, 8);
  for (const button of buttons) {
    assert.equal(button.children[0].src, '/icons/chat.png');
    assert.ok(button.children[1].textContent.length > 0);
  }
  sim.system.dispose();
});

test('speech anchor follows the camera-facing head for standing and seated sprites', () => {
  const { spriteHeadAnchor } = load('src/scene/park/spriteHeadAnchor.ts');
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 140);
  camera.position.set(0, 14, 19);
  camera.lookAt(0, 1, 0);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial());
  sprite.scale.set(1.6, 2.3, 1);
  for (const center of [0, 0.23]) {
    sprite.center.set(0.5, center);
    sprite.position.set(0, center ? 1.03 : 0, 0);
    const anchor = spriteHeadAnchor(sprite, camera);
    const local = anchor.clone().applyMatrix4(camera.matrixWorldInverse);
    const origin = sprite.position.clone().applyMatrix4(camera.matrixWorldInverse);
    assert.ok(Math.abs(local.y - origin.y - 2.3 * (1 - center)) < 1e-9);
    assert.ok(Math.abs(local.z - origin.z) < 1e-9);
  }
});

test('residents use side views for horizontal movement and retain their idle direction', () => {
  const { residentFacing } = load('src/scene/park/residentFacing.ts');
  const front = { side: 0, back: false };
  assert.equal(residentFacing(1, 0.1, front).side, 1);
  assert.equal(residentFacing(-1, -0.1, front).side, -1);
  assert.equal(residentFacing(0.1, -1, front).back, true);
  assert.equal(residentFacing(0.1, 1, front).side, 0);
  assert.equal(residentFacing(0.1, 1, front).back, false);
  const left = { side: -1, back: false };
  assert.equal(residentFacing(0, 0, left), left);
});

test('left-facing sprites mirror UV coordinates and right-facing sprites reset them', () => {
  const { faceResidentTexture } = load('src/scene/park/residentAnimation.ts');
  const texture = new THREE.Texture();
  faceResidentTexture(texture, true);
  texture.updateMatrix();
  const left = new THREE.Vector2(0.2, 0.5).applyMatrix3(texture.matrix);
  assert.ok(Math.abs(left.x - 0.8) < 1e-9);
  faceResidentTexture(texture, false);
  texture.updateMatrix();
  assert.equal(new THREE.Vector2(0.2, 0.5).applyMatrix3(texture.matrix).x, 0.2);
});

test('walking, seated, happy and blinking poses respect direction and reduced motion', () => {
  const { residentPose } = load('src/scene/park/residentAnimation.ts');
  assert.equal(residentPose(0, true, false, false, false, false), 'walkA');
  assert.equal(residentPose(180, true, false, false, false, false), 'walkB');
  assert.equal(residentPose(0, true, false, false, true, false, false), 'frontWalkA');
  assert.equal(residentPose(180, true, false, false, false, false, false), 'backWalkB');
  assert.equal(residentPose(180, true, false, false, false, true), null);
  assert.equal(residentPose(180, false, true, true, true, false, false), 'sit');
  assert.equal(residentPose(180, false, false, true, true, false), 'happy');
  assert.equal(residentPose(0, false, false, false, true, false), 'blink');
  assert.equal(residentPose(200, false, false, false, true, false), null);
  assert.equal(residentPose(0, false, false, false, false, false), null);
});

test('a resident spawned inside a lamp clearance escapes and resumes walking', () => {
  const origin = { x: 12, z: 8 };
  const clear = (p) => Math.hypot(p.x - origin.x, p.z - origin.z) >= 0.7;
  const safe = residentSafePosition(origin, clear, canCrossRiver);
  assert.ok(safe && clear(safe));
  assert.ok(Math.hypot(safe.x - origin.x, safe.z - origin.z) < 0.9);
  const sim = simulation(0.99, [], clear);
  const deer = sim.scene.children[6];
  sim.step(2);
  assert.ok(clear(deer.position), 'resident must leave the lamp base');
  const recovered = deer.position.clone();
  sim.step(25);
  assert.ok(deer.position.distanceTo(recovered) > 1, 'resident must resume its route');
  sim.system.dispose();
});
test('recovery respects boundaries and leaves valid positions unchanged', () => {
  const from = { x: 0, z: 0 };
  assert.equal(
    residentSafePosition(
      from,
      () => true,
      () => true,
    ),
    from,
  );
  assert.equal(
    residentSafePosition(
      from,
      (p) => p.x > 0.5,
      () => false,
    ),
    null,
  );
  assert.equal(
    residentSafePosition(
      from,
      () => false,
      () => true,
    ),
    null,
  );
});

test('side seats keep their direction and use a seated side pose', () => {
  const { residentSeatFacing } = load('src/scene/park/residentFacing.ts');
  const { residentPose } = load('src/scene/park/residentAnimation.ts');
  for (const [angle, expected] of [
    [Math.PI / 2, 1],
    [-Math.PI / 2, -1],
  ]) {
    const facing = residentSeatFacing(angle);
    assert.equal(facing.side, expected);
    assert.equal(facing.back, false);
    assert.equal(residentPose(0, false, true, true, false, true, !!facing.side), 'sitSide');
  }
  assert.equal(residentSeatFacing(0).side, 0);
  assert.equal(residentSeatFacing(Math.PI).back, true);
});

test('counter seating faces back and drinking alternates hold and sip without motion when reduced', () => {
  const { residentPose, residentDrinkPose } = load('src/scene/park/residentAnimation.ts');
  assert.equal(residentPose(0, false, true, false, false, false, false), 'sitBack');
  assert.equal(residentDrinkPose(0, false), 'drinkHold');
  assert.equal(residentDrinkPose(2600, false), 'drinkSip');
  assert.equal(residentDrinkPose(4000, false), 'drinkHold');
  assert.equal(residentDrinkPose(2600, true), 'drinkHold');
});
