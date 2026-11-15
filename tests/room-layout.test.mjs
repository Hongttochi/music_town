import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function load(file) {
  const context = {
    exports: {},
    require: (id) => {
      if (id.endsWith('/roomCatalog') || id === '../data/roomCatalog') {
        return load('../src/data/roomCatalog.ts');
      }
      if (id.endsWith('/roomThemes') || id === '../data/roomThemes') {
        return load('../src/data/roomThemes.ts');
      }
      return require(id);
    },
  };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    context,
  );
  return context.exports;
}

const {
  ROOM_SIZE,
  MAX_ROOM_ITEMS,
  rotatedFootprint,
  footprintTiles,
  canPlace,
  validateRoomLayout,
  parseSavedRoom,
} = load('../src/utils/roomLayout.ts');

const chair = (id, x, z, r = 0) => ({ id, item: 'chair', x, z, r });
const layout = (items = [], theme = 'cozy') => ({ theme, items });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('placement stays inside the 8x8 room for every footprint', () => {
  assert.equal(ROOM_SIZE, 8);
  assert.equal(canPlace(layout(), chair('a', 0, 0)), true);
  assert.equal(canPlace(layout(), chair('a', ROOM_SIZE - 1, ROOM_SIZE - 1)), true);

  for (const [x, z] of [
    [-1, 0],
    [0, -1],
    [ROOM_SIZE, 0],
    [0, ROOM_SIZE],
  ]) {
    assert.equal(canPlace(layout(), chair('a', x, z)), false, `${x},${z} is outside`);
  }

  const bed = (x, z, r = 0) => ({ id: 'bed', item: 'bed', x, z, r });
  assert.equal(canPlace(layout(), bed(6, 0)), true);
  assert.equal(canPlace(layout(), bed(7, 0)), false);
  assert.equal(canPlace(layout(), bed(0, 5)), true);
  assert.equal(canPlace(layout(), bed(0, 6)), false);
  assert.equal(canPlace(layout(), bed(5, 0, 1)), true);
  assert.equal(canPlace(layout(), bed(6, 0, 1)), false);

  const sofa = (x) => ({ id: 'sofa', item: 'sofa', x, z: 0, r: 0 });
  assert.equal(canPlace(layout(), sofa(5)), true);
  assert.equal(canPlace(layout(), sofa(6)), false);
});

test('two solid items cannot share tiles but adjacent items can', () => {
  const occupied = layout([chair('a', 2, 2)]);
  assert.equal(canPlace(occupied, chair('b', 2, 2)), false);
  assert.equal(canPlace(occupied, chair('b', 3, 2)), true);
  assert.equal(canPlace(occupied, chair('b', 2, 1)), true);
  assert.equal(canPlace(occupied, chair('b', 1, 3)), true);

  const sofa = { id: 'sofa', item: 'sofa', x: 0, z: 0, r: 0 };
  assert.equal(canPlace(layout([sofa]), chair('c', 2, 0)), false);
  assert.equal(canPlace(layout([sofa]), chair('c', 3, 0)), true);
});

test('rotating a footprint swaps width and depth on odd quarter turns', () => {
  assert.deepEqual(plain(rotatedFootprint('rug', 0)), { width: 3, depth: 2 });
  assert.deepEqual(plain(rotatedFootprint('rug', 1)), { width: 2, depth: 3 });
  assert.deepEqual(plain(rotatedFootprint('rug', 2)), { width: 3, depth: 2 });
  assert.deepEqual(plain(rotatedFootprint('rug', 3)), { width: 2, depth: 3 });

  assert.equal(footprintTiles('rug', 0, 0, 0).length, 6);
  assert.equal(footprintTiles('rug', 0, 0, 1).length, 6);
  assert.deepEqual(plain(footprintTiles('rug', 1, 1, 1)), [
    { x: 1, z: 1 },
    { x: 2, z: 1 },
    { x: 1, z: 2 },
    { x: 2, z: 2 },
    { x: 1, z: 3 },
    { x: 2, z: 3 },
  ]);
  assert.deepEqual(plain(footprintTiles('chair', 3, 4, 2)), [{ x: 3, z: 4 }]);
});

test('ignoreId allows an item to overlap its own previous position while moving', () => {
  const bed = { id: 'bed-1', item: 'bed', x: 0, z: 0, r: 0 };
  const room = layout([bed]);
  const moved = { ...bed, x: 1, z: 0 };
  assert.equal(canPlace(room, moved), false);
  assert.equal(canPlace(room, moved, bed.id), true);
  assert.equal(canPlace(room, { ...bed, x: 7, z: 0 }, bed.id), false);
});

test('rugs may sit under furniture but two rugs may not overlap', () => {
  const rug = { id: 'rug-1', item: 'rug', x: 0, z: 0, r: 0 };
  const roomWithRug = layout([rug]);
  assert.equal(canPlace(roomWithRug, chair('chair-1', 1, 1)), true);

  const roomWithChair = layout([chair('chair-1', 1, 1)]);
  assert.equal(canPlace(roomWithChair, rug), true);
  assert.equal(canPlace(layout([rug]), { ...rug, id: 'rug-2', x: 1, z: 1 }), false);
  assert.equal(canPlace(layout([rug]), { ...rug, id: 'rug-2', x: 3, z: 0 }), true);
});

test('validation drops unknown, malformed, out-of-bounds and overlapping items', () => {
  const cleaned = validateRoomLayout({
    theme: 'night',
    items: [
      { id: 'unknown', item: 'spaceship', x: 0, z: 0, r: 0 },
      { id: 'outside', item: 'chair', x: 9, z: 0, r: 0 },
      { id: 'bad-rotation', item: 'chair', x: 0, z: 0, r: 5 },
      { id: 'bad-coordinate', item: 'chair', x: 1.5, z: 0, r: 0 },
      { id: 'first', item: 'chair', x: 2, z: 2, r: 0 },
      { id: 'second', item: 'chair', x: 2, z: 2, r: 0 },
      { id: 'third', item: 'chair', x: 3, z: 2, r: 0 },
    ],
  });

  assert.equal(cleaned.theme, 'night');
  assert.deepEqual(
    plain(cleaned.items).map((item) => item.id),
    ['first', 'third'],
  );
});

test('validation keeps unique ids, caps at 40 items and falls back to cozy', () => {
  const items = Array.from({ length: 50 }, (_, index) => ({
    id: `chair-${index}`,
    item: 'chair',
    x: index % ROOM_SIZE,
    z: Math.floor(index / ROOM_SIZE),
    r: 0,
  }));
  const cleaned = validateRoomLayout({ theme: 'garden', items });
  assert.equal(cleaned.items.length, MAX_ROOM_ITEMS);
  assert.equal(cleaned.theme, 'garden');
  assert.equal(new Set(cleaned.items.map((item) => item.id)).size, MAX_ROOM_ITEMS);

  const duplicate = validateRoomLayout({
    theme: 'unknown',
    items: [chair('same', 0, 0), chair('same', 1, 0)],
  });
  assert.equal(duplicate.theme, 'cozy');
  assert.deepEqual(
    plain(duplicate.items).map((item) => ({ id: item.id, x: item.x })),
    [{ id: 'same', x: 0 }],
  );
});

test('corrupt saved JSON falls back to the default room', () => {
  const empty = { theme: 'cozy', items: [] };
  assert.deepEqual(plain(parseSavedRoom('{not json')), empty);
  assert.deepEqual(plain(parseSavedRoom('null')), empty);
  assert.deepEqual(plain(parseSavedRoom(null)), empty);
  assert.deepEqual(plain(parseSavedRoom(42)), empty);
  assert.deepEqual(plain(parseSavedRoom({ theme: 'night', items: 'broken' })), {
    theme: 'night',
    items: [],
  });

  const saved = parseSavedRoom(
    JSON.stringify({
      theme: 'studio',
      items: [{ id: 'turn', item: 'turntable', x: 4, z: 5, r: 3 }],
    }),
  );
  assert.equal(saved.theme, 'studio');
  assert.deepEqual(plain(saved.items), [{ id: 'turn', item: 'turntable', x: 4, z: 5, r: 3 }]);
});
