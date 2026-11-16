import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, cache = new Map()) {
  file = resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const context = {
    exports,
    require: (name) => load(resolve(dirname(file), name + '.ts'), cache),
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    context,
  );
  return exports;
}

const {
  ROOM_SIZE,
  MAX_ROOM_ITEMS,
  rotatedFootprint,
  footprintTiles,
  canPlace,
  findFreePlacement,
  validateRoomLayout,
  parseSavedRoom,
  tileToWorld,
  worldToTile,
  blockingRects,
  collidesCircle,
  clampToRoom,
} = load('src/utils/roomLayout.ts');
const { DEFAULT_ROOM_LAYOUT } = load('src/data/roomFurniture.ts');

const place = (id, item, x, z, r = 0) => ({ id, item, x, z, r });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('placements must stay inside the 8x8 room', () => {
  const empty = { items: [] };
  assert.equal(canPlace(empty, place('a', 'bed', 0, 0)), true);
  assert.equal(canPlace(empty, place('a', 'bed', 6, 5)), true);
  assert.equal(canPlace(empty, place('a', 'bed', 7, 5)), false);
  assert.equal(canPlace(empty, place('a', 'bed', 6, 6)), false);
  assert.equal(canPlace(empty, place('a', 'chair', -1, 0)), false);
  assert.equal(canPlace(empty, place('a', 'chair', 8, 0)), false);
  assert.equal(ROOM_SIZE, 8);
});

test('object furniture cannot overlap another object', () => {
  const layout = { items: [place('table', 'table', 2, 2)] };
  assert.equal(canPlace(layout, place('chair', 'chair', 3, 3)), false);
  assert.equal(canPlace(layout, place('chair', 'chair', 4, 2)), true);
});

test('a rug can sit under a bed but two rugs cannot overlap', () => {
  const bed = { items: [place('bed', 'bed', 0, 0)] };
  assert.equal(canPlace(bed, place('rug', 'rug', 1, 1)), true);
  const rug = { items: [place('rug', 'rug', 0, 0)] };
  assert.equal(canPlace(rug, place('rug2', 'rug', 2, 1)), false);
  assert.equal(canPlace(rug, place('rug2', 'rug', 3, 0)), true);
});

test('rotation swaps the footprint dimensions', () => {
  assert.deepEqual(plain(rotatedFootprint('bed', 0)), { width: 2, depth: 3 });
  assert.deepEqual(plain(rotatedFootprint('bed', 1)), { width: 3, depth: 2 });
  assert.deepEqual(plain(rotatedFootprint('bed', 2)), { width: 2, depth: 3 });
  assert.deepEqual(plain(rotatedFootprint('bed', 3)), { width: 3, depth: 2 });
  assert.equal(footprintTiles(place('bed', 'bed', 0, 0, 1)).length, 6);
  const empty = { items: [] };
  assert.equal(canPlace(empty, place('a', 'bed', 6, 0, 0)), true);
  assert.equal(canPlace(empty, place('a', 'bed', 6, 0, 1)), false);
});

test('ignoreId lets a selected item move onto its own footprint', () => {
  const layout = { items: [place('bed', 'bed', 0, 0)] };
  const moved = place('bed', 'bed', 1, 1);
  assert.equal(canPlace(layout, moved), false);
  assert.equal(canPlace(layout, moved, { ignoreId: 'bed' }), true);
});

test('tiles occupied by the avatar block placement', () => {
  const empty = { items: [] };
  const chair = place('chair', 'chair', 3, 3);
  assert.equal(canPlace(empty, chair, { blockedTiles: [{ x: 3, z: 3 }] }), false);
  assert.equal(canPlace(empty, chair, { blockedTiles: [{ x: 2, z: 3 }] }), true);
});

test('findFreePlacement picks a valid central spot around blocks and moves', () => {
  const empty = { items: [] };
  const spot = findFreePlacement(empty, 'chair', 0);
  assert.ok(spot);
  assert.equal(Number.isInteger(spot.x) && Number.isInteger(spot.z), true);
  assert.deepEqual(plain(spot), { x: 3, z: 3 });
  assert.equal(canPlace(empty, place('__new__', 'chair', spot.x, spot.z)), true);
  const shifted = findFreePlacement(empty, 'chair', 0, {
    blockedTiles: [{ x: spot.x, z: spot.z }],
  });
  assert.ok(shifted && (shifted.x !== spot.x || shifted.z !== spot.z));
  const occupied = { items: [place('chair', 'chair', spot.x, spot.z)] };
  assert.deepEqual(
    plain(findFreePlacement(occupied, 'chair', 0, { ignoreId: 'chair' })),
    plain(spot),
  );
  assert.equal(
    findFreePlacement(empty, 'chair', 0, {
      blockedTiles: Array.from({ length: ROOM_SIZE * ROOM_SIZE }, (_, i) => ({
        x: i % ROOM_SIZE,
        z: Math.floor(i / ROOM_SIZE),
      })),
    }),
    null,
  );
});

test('validate drops unknown, bad, overlapping and duplicate placements', () => {
  const result = validateRoomLayout({
    items: [
      place('a', 'chair', 0, 0),
      place('b', 'chair', 1, 0),
      place('unknown', 'piano', 2, 0),
      place('rotation', 'chair', 2, 1, 4),
      place('outside', 'bed', 7, 7),
      place('overlap', 'chair', 0, 0),
      place('a', 'chair', 4, 4),
    ],
  });
  assert.deepEqual(plain(result.items.map((item) => item.id)), ['a', 'b']);
});

test('validate caps a saved room at 40 items', () => {
  const many = Array.from({ length: 45 }, (_, i) =>
    place(`chair-${i}`, 'chair', i % 8, Math.floor(i / 8)),
  );
  const result = validateRoomLayout({ items: many });
  assert.equal(result.items.length, MAX_ROOM_ITEMS);
  assert.equal(MAX_ROOM_ITEMS, 40);
});

test('missing or corrupt saved JSON falls back to the default room', () => {
  for (const json of [
    null,
    '',
    '{',
    'null',
    '{"items":"nope"}',
    JSON.stringify({ items: [{ id: 'bad', item: 'piano', x: 0, z: 0, r: 0 }] }),
  ]) {
    assert.deepEqual(plain(parseSavedRoom(json)), plain(DEFAULT_ROOM_LAYOUT));
  }
  assert.deepEqual(plain(parseSavedRoom(plain(DEFAULT_ROOM_LAYOUT))), plain(DEFAULT_ROOM_LAYOUT));
  assert.deepEqual(plain(parseSavedRoom({ items: 'nope' })), plain(DEFAULT_ROOM_LAYOUT));
});

test('the default room layout is valid', () => {
  const validated = validateRoomLayout(DEFAULT_ROOM_LAYOUT);
  assert.deepEqual(plain(validated), plain(DEFAULT_ROOM_LAYOUT));
  const layout = { items: [] };
  for (const item of DEFAULT_ROOM_LAYOUT.items) {
    assert.equal(canPlace(layout, item), true);
    layout.items.push(item);
  }
});

test('circle collision covers objects, their edges and ignores rugs', () => {
  const layout = {
    items: [place('bed', 'bed', 0, 0), place('rug', 'rug', 2, 2)],
  };
  const rects = blockingRects(layout);
  assert.equal(rects.length, 1);
  assert.equal(collidesCircle(rects, -3, -2.5, 0.3), true);
  assert.equal(collidesCircle(rects, -1.9, -2.5, 0.3), true);
  assert.equal(collidesCircle(rects, 0, 0, 0.3), false);
  assert.equal(blockingRects({ items: [place('rug', 'rug', 2, 2)] }).length, 0);
  assert.equal(collidesCircle([], -1, -1, 0.3), false);
});

test('tile and world coordinates round-trip around the room centre', () => {
  assert.deepEqual(plain(tileToWorld(0, 0)), { x: -3.5, z: -3.5 });
  for (let z = 0; z < ROOM_SIZE; z++) {
    for (let x = 0; x < ROOM_SIZE; x++) {
      const world = tileToWorld(x, z);
      assert.deepEqual(plain(worldToTile(world.x, world.z)), { x, z });
    }
  }
  assert.deepEqual(plain(worldToTile(-4, -4)), { x: 0, z: 0 });
  assert.deepEqual(plain(clampToRoom(-9, 9, 0.3)), { x: -3.7, z: 3.7 });
});
