import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  c = '33333333-3333-4333-8333-333333333333';
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;
 create table public.member_profiles(id uuid primary key references auth.users on delete cascade,completed boolean,avatar jsonb,bio text,role text,instagram text,soundcloud text);
 create table public.town_sessions(user_id uuid primary key references auth.users on delete cascade,last_seen timestamptz);
 create table public.town_performances(user_id uuid primary key references auth.users on delete cascade,started_at timestamptz,ends_at timestamptz);
 create function public.town_action(action text default 'snapshot',channel integer default null,stage integer default null,client uuid default null,pos_x real default null,pos_y real default null) returns jsonb language plpgsql as $$ begin
 if action='heartbeat' then update public.town_sessions set last_seen=now() where user_id=auth.uid(); end if;
 if action='finish' then delete from public.town_performances where user_id=auth.uid(); end if;
 return '{}'::jsonb; end $$;
 insert into auth.users values('${a}'),('${b}'),('${c}');
 insert into public.member_profiles select id,true,jsonb_build_object('name','사용자'),'','musician','','' from auth.users;`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202611060002_profile_fans.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}';`);
  return db;
}
const stats = async (db, target = b, action = 'stats', enabled = true) =>
  (
    await db.query('select public.profile_fan_action($1,$2,$3) as result', [
      target,
      action,
      enabled,
    ])
  ).rows[0].result;
test('fan counts are per account, private, idempotent and cannot impersonate another account', async () => {
  const db = await fixture();
  try {
    await assert.rejects(db.query('select * from public.profile_fans'), /permission denied/);
    await assert.rejects(stats(db, a, 'heart'), /SELF_REACTION/);
    assert.equal((await stats(db, b, 'follow')).followers, 1);
    assert.equal((await stats(db, b, 'follow')).followers, 1);
    assert.equal((await stats(db, b, 'heart')).hearts, 1);
    assert.equal((await stats(db, b, 'heart')).hearts, 1);
    assert.equal(
      (await db.query('select public.my_followed_profiles() as result')).rows[0].result[0].id,
      b,
    );
    await db.exec(`set request.jwt.claim.sub='${c}'`);
    assert.equal((await stats(db, b, 'follow', false)).followers, 1);
    assert.deepEqual(
      (await db.query('select public.my_followed_profiles() as result')).rows[0].result,
      [],
    );
    await db.exec(`set request.jwt.claim.sub='${a}'`);
    assert.equal((await stats(db, b, 'follow', false)).followers, 0);
    await db.exec(
      `reset role; delete from auth.users where id='${a}'; set role authenticated; set request.jwt.claim.sub='${c}';`,
    );
    assert.equal((await stats(db)).hearts, 0);
    await db.exec("set request.jwt.claim.sub=''");
    await assert.rejects(stats(db), /AUTH_REQUIRED/);
  } finally {
    await db.close();
  }
});
test('server activity credits verified elapsed time and clips performance at its end', async () => {
  const db = await fixture();
  try {
    await db.exec(`reset role; insert into town_sessions values('${a}',now()-interval '30 seconds');
 insert into profile_activity_cursor values('${a}',now()-interval '30 seconds');
 insert into town_performances values('${a}',now()-interval '20 seconds',now()-interval '10 seconds');
 set role authenticated;`);
    await db.query("select public.town_action('heartbeat')");
    let value = await stats(db, a);
    assert.ok(value.onlineSeconds >= 30 && value.onlineSeconds < 32);
    assert.ok(value.stageSeconds >= 9.9 && value.stageSeconds < 10.1);
    assert.equal(value.days.length, 7);
    assert.equal(
      value.days.reduce((n, d) => n + d.onlineSeconds, 0),
      value.onlineSeconds,
    );
    await db.query("select public.town_action('snapshot')");
    value = await stats(db, a);
    assert.ok(value.onlineSeconds < 32, 'repeat calls do not duplicate elapsed time');
    await assert.rejects(
      db.query('update profile_daily_activity set online_seconds=9999'),
      /permission denied/,
    );
    await assert.rejects(
      db.query('select private.town_action_before_activity()'),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test('expired sessions never credit the offline gap and KST midnight splits days', async () => {
  const db = await fixture();
  try {
    await db.exec(`reset role; insert into town_sessions values('${a}',now()-interval '2 minutes');
 insert into profile_activity_cursor values('${a}',now()-interval '2 minutes');set role authenticated;`);
    await db.query("select public.town_action('snapshot')");
    let value = await stats(db, a);
    assert.ok(value.onlineSeconds >= 44.99 && value.onlineSeconds <= 45.01);
    await db.exec(`reset role; delete from profile_daily_activity;
 update town_sessions set last_seen=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')-interval '15 seconds';
 update profile_activity_cursor set credited_at=((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul')-interval '30 seconds';
 set role authenticated;`);
    await db.query("select public.town_action('snapshot')");
    value = await stats(db, a);
    assert.equal(value.days.at(-2).onlineSeconds, 30);
    assert.equal(value.days.at(-1).onlineSeconds, 30);
  } finally {
    await db.close();
  }
});
