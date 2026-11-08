import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const sql = await readFile(
  new URL('../supabase/migrations/202611080001_bar_stage.sql', import.meta.url),
  'utf8',
);
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;
  create table public.member_profiles(id uuid primary key,role text);
  create table public.town_channels(id integer primary key,revision bigint default 0);
  create table public.town_stages(id integer primary key,name text,x real,y real);
  create table public.town_sessions(user_id uuid primary key,channel_id integer,client_id uuid,x real,y real,last_seen timestamptz default now());
  create table public.town_performances(channel_id integer,stage_id integer references public.town_stages,user_id uuid unique references public.town_sessions on delete cascade,started_at timestamptz default now(),ends_at timestamptz default now()+interval '5 minutes',primary key(channel_id,stage_id));
  create table public.town_queue(id bigint generated always as identity primary key,channel_id integer,stage_id integer references public.town_stages,user_id uuid unique references public.town_sessions on delete cascade,joined_at timestamptz default now());
  insert into public.town_channels values(0,0);
  insert into public.town_stages values(0,'공원 무대',480,355);
  insert into public.member_profiles values('${a}','musician'),('${b}','musician');
  insert into public.town_sessions(user_id,channel_id,x,y) values('${a}',0,650,470),('${b}',0,650,470);`);
  await db.exec(sql);
  return db;
}
const setNight = (db, night) =>
  db.exec(
    `create or replace function public.bar_is_open(at_time timestamptz default now()) returns boolean language sql stable set search_path='' as $$ select ${night}; $$;`,
  );
test('bar migration is repeatable and guards real KST opening boundaries', async () => {
  const db = await fixture();
  try {
    await db.exec(sql);
    assert.equal(
      (await db.query('select count(*) from public.town_stages where id=6')).rows[0].count,
      1,
    );
    for (const [t, expected] of [
      ['18:59:59', false],
      ['19:00:00', true],
      ['05:59:59', true],
      ['06:00:00', false],
    ])
      assert.equal(
        (
          await db.query('select public.bar_is_open($1::timestamptz) as open', [
            `2026-11-08T${t}+09:00`,
          ])
        ).rows[0].open,
        expected,
      );
    await db.exec('set role anon');
    await assert.rejects(db.query('select public.town_advance()'), /permission denied/);
  } finally {
    await db.close();
  }
});
test('day rejects bar queues and direct performances without blocking outdoor stages', async () => {
  const db = await fixture();
  try {
    await setNight(db, false);
    await assert.rejects(
      db.exec(`insert into public.town_queue(channel_id,stage_id,user_id) values(0,6,'${a}')`),
      /BAR_CLOSED/,
    );
    await assert.rejects(
      db.exec(
        `insert into public.town_performances(channel_id,stage_id,user_id) values(0,6,'${a}')`,
      ),
      /BAR_CLOSED/,
    );
    await db.exec(
      `insert into public.town_queue(channel_id,stage_id,user_id) values(0,0,'${a}');select public.town_advance();`,
    );
    assert.equal(
      (await db.query('select stage_id from public.town_performances')).rows[0].stage_id,
      0,
    );
  } finally {
    await db.close();
  }
});
test('night preserves FIFO and dawn clears bar performance/queue and moves visitors outside', async () => {
  const db = await fixture();
  try {
    await setNight(db, true);
    await db.exec(
      `insert into public.town_queue(channel_id,stage_id,user_id) values(0,6,'${a}'),(0,6,'${b}');select public.town_advance();`,
    );
    assert.equal(
      (await db.query('select user_id from public.town_performances')).rows[0].user_id,
      a,
    );
    assert.equal((await db.query('select user_id from public.town_queue')).rows[0].user_id, b);
    assert.equal(
      (await db.query('select x from public.town_sessions where user_id=$1', [a])).rows[0].x,
      1550,
    );
    await db.exec(
      `delete from public.town_performances where user_id='${a}';select public.town_advance();`,
    );
    assert.equal(
      (await db.query('select user_id from public.town_performances')).rows[0].user_id,
      b,
    );
    await db.exec(`insert into public.town_queue(channel_id,stage_id,user_id) values(0,6,'${a}')`);
    await setNight(db, false);
    await db.exec('select public.town_advance()');
    assert.equal(
      (await db.query('select count(*) from public.town_performances')).rows[0].count,
      0,
    );
    assert.equal((await db.query('select count(*) from public.town_queue')).rows[0].count, 0);
    assert.deepEqual(
      (await db.query('select x,y from public.town_sessions where user_id=$1', [b])).rows[0],
      { x: 1500, y: 380 },
    );
  } finally {
    await db.close();
  }
});

test('moving the riverside stage preserves performances and queues and moves its performer', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into public.town_stages values(5,'다리 건너 강바람 무대',1500,450);
      insert into public.town_performances(channel_id,stage_id,user_id) values(0,5,'${a}');
      insert into public.town_queue(channel_id,stage_id,user_id) values(0,5,'${b}');`);
    const migration = await readFile(
      new URL('../supabase/migrations/202611080002_riverside_stage_spacing.sql', import.meta.url),
      'utf8',
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(
      (await db.query(`select x,y from public.town_sessions where user_id='${a}'`)).rows[0],
      { x: 1500, y: 625 },
    );
    assert.deepEqual(
      (await db.query(`select x,y from public.town_sessions where user_id='${b}'`)).rows[0],
      { x: 650, y: 470 },
    );
    assert.equal(
      (await db.query('select count(*) from public.town_performances')).rows[0].count,
      1,
    );
    assert.equal((await db.query('select count(*) from public.town_queue')).rows[0].count, 1);
  } finally {
    await db.close();
  }
});
