import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
async function load(file) {
  const result = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
}
const { createResidentConversations } = await load('src/scene/park/residentConversation.ts');
const { overlapsBench } = await load('src/scene/park/benchCollision.ts');
const { residentRoute } = await load('src/scene/park/residentNavigation.ts');
const members = () => [
  { id: 'a', x: 0, z: 0, available: true },
  { id: 'b', x: 1.8, z: 0, available: true },
  { id: 'c', x: 1.5, z: 1, available: true },
];
test('a pair alternates speakers and changes both facial expressions with the dialogue', () => {
  const system = createResidentConversations(() => 0.3);
  const people = members();
  let states = system.update(people, 0, false);
  assert.equal(states.size, 2);
  assert.equal(states.get('a').partner, 'b');
  assert.equal(states.get('a').mood, 'sad');
  assert.equal(states.get('a').speaking, true);
  assert.equal(states.get('b').speaking, false);
  states = system.update(people, 3.7, false);
  assert.equal(states.get('b').speaking, true);
  assert.equal(states.get('a').speaking, false);
  states = system.update(people, 7.4, false);
  assert.equal(states.get('b').mood, 'happy');
  assert.equal(states.get('a').mood, 'surprised');
  states = system.update(people, 3.7, false);
  assert.equal(states.get('a').mood, 'happy');
});
test('pause preserves the current turn; player interruption releases both partners', () => {
  const system = createResidentConversations(() => 0);
  const people = members();
  const first = system.update(people, 0, false);
  assert.deepEqual(system.update(people, 60, true), first);
  assert.equal(system.update(people, 0, true, 'a').size, 0);
  assert.equal(system.update(people, 1, false).size, 0, 'cooldown prevents an immediate new pair');
});
test('departures and scene changes clear pairs, and finished chats have a cooldown', () => {
  const system = createResidentConversations(() => 0);
  const people = members().slice(0, 2);
  system.update(people, 0, false);
  assert.equal(system.update(people, 17, false).size, 0);
  assert.equal(system.update(people, 1, false).size, 0);
  assert.equal(system.update(people, 27, false).size, 2);
  people[1].available = false;
  assert.equal(system.update(people, 0, false).size, 0);
  system.reset();
  people[1].available = true;
  assert.equal(system.update(people, 0, false).size, 2);
});
test('routes go around benches in either direction and still reach the front seat approach', () => {
  for (const facing of [0, Math.PI, Math.PI / 2]) {
    const bench = { x: 2, z: 2, facing };
    const clear = (p) => !overlapsBench(p, bench);
    assert.equal(clear(bench), false);
    const from = { x: -2, z: 2 },
      to = { x: 6, z: 2 };
    const route = residentRoute(from, to, clear, () => true);
    assert.ok(route);
    let prev = from;
    for (const next of route) {
      for (let i = 1; i <= 30; i++)
        assert.ok(
          clear({
            x: prev.x + ((next.x - prev.x) * i) / 30,
            z: prev.z + ((next.z - prev.z) * i) / 30,
          }),
        );
      prev = next;
    }
    const approach = { x: 2 + Math.sin(facing) * 1.27, z: 2 + Math.cos(facing) * 1.27 };
    assert.ok(clear(approach));
    assert.ok(residentRoute(from, approach, clear, () => true));
  }
});

test('residents never start a conversation across a blocked bench or wall', () => {
  const system = createResidentConversations(() => 0);
  assert.equal(system.update(members(), 0, false, undefined, () => false).size, 0);
});

test('player steps cannot cross benches, while older embedded positions can escape outward', async () => {
  const { blocksBenchStep } = await load('src/scene/park/benchCollision.ts');
  for (const facing of [0, Math.PI / 2, Math.PI]) {
    const bench = { x: 0, z: 0, facing };
    const point = (x, z) => ({
      x: x * Math.cos(facing) + z * Math.sin(facing),
      z: -x * Math.sin(facing) + z * Math.cos(facing),
    });
    assert.equal(blocksBenchStep(point(0, 2), point(0, -2), bench), true);
    assert.equal(blocksBenchStep(point(-2, 0), point(2, 0), bench), true);
    assert.equal(blocksBenchStep(point(-2, 2), point(2, 2), bench), false);
    assert.equal(blocksBenchStep(point(0, 0.2), point(0, 0.4), bench), false);
    assert.equal(blocksBenchStep(point(0, 0.4), point(0, 0.2), bench), true);
    assert.equal(blocksBenchStep(point(0, 0.7), point(0, 1), bench), false);
  }
});

test('emotion icons always agree with the face, including left/right profile expressions', async () => {
  const { residentMoodPresentation } = await load('src/scene/park/residentAnimation.ts');
  assert.deepEqual(residentMoodPresentation('happy', true), {
    pose: 'happySide',
    icon: 'smiling-face',
  });
  assert.deepEqual(residentMoodPresentation('sad', true), { pose: 'sadSide', icon: 'sad' });
  assert.deepEqual(residentMoodPresentation('happy', false), {
    pose: 'happy',
    icon: 'smiling-face',
  });
  assert.deepEqual(residentMoodPresentation('sad', false), { pose: 'sad', icon: 'sad' });
  assert.deepEqual(residentMoodPresentation('surprised', true), {
    pose: 'surprisedSide',
    icon: '',
  });
  assert.deepEqual(residentMoodPresentation('neutral', true), { pose: undefined, icon: '' });
});

test('emotions wait until both partners reach their separate conversation spots', () => {
  const system = createResidentConversations(() => 0.3);
  const people = [
    { id: 'a', x: 0, z: 0, available: true },
    { id: 'b', x: 0, z: 0.5, available: true },
  ];
  const arrange = () => [
    { x: -1.3, z: 0.25 },
    { x: 1.3, z: 0.25 },
  ];
  let states = system.update(people, 0, false, undefined, () => true, arrange);
  assert.equal(states.get('a').ready, false);
  states = system.update(people, 2, false, undefined, () => true, arrange);
  assert.equal(states.get('a').mood, 'neutral');
  Object.assign(people[0], arrange()[0]);
  Object.assign(people[1], arrange()[1]);
  states = system.update(people, 0.1, false, undefined, () => true, arrange);
  assert.equal(states.get('a').ready, true);
  assert.equal(states.get('a').mood, 'sad');
});
test('every mood sequence includes an early sad expression and a happy expression', async () => {
  const { residentConversations } = await load('src/scene/park/residentConversation.ts');
  for (const sequence of residentConversations) {
    assert.ok(sequence.slice(0, 2).some((beat) => beat.mood === 'sad'));
    assert.ok(sequence.some((beat) => beat.mood === 'happy'));
  }
});
