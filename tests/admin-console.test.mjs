import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const retention = await readFile(
  new URL('../supabase/migrations/202611150001_report_retention.sql', import.meta.url),
  'utf8',
);
const sql = await readFile(
  new URL('../supabase/migrations/202611150003_admin_console.sql', import.meta.url),
  'utf8',
);
const admin = '11111111-1111-4111-8111-111111111111',
  user = '22222222-2222-4222-8222-222222222222',
  kakao = '33333333-3333-4333-8333-333333333333';

async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
  create table auth.users(id uuid primary key, created_at timestamptz default now(), raw_app_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated, anon;
  create table public.member_profiles(id uuid primary key references auth.users on delete cascade, completed boolean, avatar jsonb, role text);
  create table public.town_channels(id integer primary key, revision bigint default 0, name text, capacity integer);
  create table public.town_stages(id integer primary key, name text, x real, y real);
  create table public.town_sessions(user_id uuid primary key, channel_id integer, client_id uuid, x real, y real, last_seen timestamptz default now());
  create table public.town_performances(channel_id integer, stage_id integer, user_id uuid unique, started_at timestamptz default now(),
    ends_at timestamptz default now() + interval '5 minutes', primary key(channel_id, stage_id));
  create table public.town_queue(id bigint generated always as identity primary key, channel_id integer, stage_id integer, user_id uuid unique, joined_at timestamptz default now());
  create table public.profile_fans(sender_id uuid, recipient_id uuid, kind text, created_at timestamptz default now(), primary key(sender_id, recipient_id, kind));
  create table public.profile_daily_activity(user_id uuid, day date, online_seconds double precision default 0, stage_seconds double precision default 0, primary key(user_id, day));
  insert into auth.users(id, raw_app_meta_data) values
    ('${admin}', '{"provider":"google"}'), ('${user}', '{"provider":"google"}'), ('${kakao}', '{"provider":"kakao"}');
  insert into public.member_profiles values ('${admin}', true, '{"name":"운영자"}', 'listener'),
    ('${user}', true, '{"name":"서우"}', 'musician'), ('${kakao}', false, '{"name":"윤슬"}', 'listener');
  insert into public.town_channels values (1, 0, '1채널', 40), (2, 0, '2채널', 40);
  insert into public.town_stages values (0, '느티나무 아래', 0, 0), (6, '문나잇 바 무대', 0, 0);`);
  await db.exec(retention);
  await db.exec(sql);
  await db.exec(sql); // The migration is repeatable.
  return db;
}
const as = (db, uid) =>
  db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
const call = async (db, fn, args = [], params = []) =>
  (await db.query(`select public.${fn}(${args.join(',')}) as r`, params)).rows[0].r;

test('only admins can read the console, everyone else is refused', async () => {
  const db = await fixture();
  try {
    await as(db, user);
    assert.deepEqual(await call(db, 'admin_whoami'), { userId: user, admin: false, role: null });
    for (const fn of [
      'admin_members_list',
      'admin_overview',
      'admin_live',
      'admin_shows',
      'admin_reports',
      'admin_notices',
    ])
      await assert.rejects(call(db, fn), /ADMIN_REQUIRED/, fn);
    await assert.rejects(db.query('select * from public.admin_members'), /permission denied/);
    await assert.rejects(db.query('select * from public.town_notices'), /permission denied/);
    await db.exec(`reset role; set role anon; set request.jwt.claim.sub='';`);
    await assert.rejects(call(db, 'admin_whoami'), /permission denied/);
    await db.exec('reset role');
    await db.exec(`insert into public.admin_members(user_id) values('${admin}')`);
    await as(db, admin);
    assert.equal((await call(db, 'admin_whoami')).admin, true);
    assert.equal((await call(db, 'admin_whoami')).role, 'admin');
  } finally {
    await db.close();
  }
});

test('overview, live and shows reflect sessions, performances and the new show log', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into public.admin_members values('${admin}');
      insert into public.town_sessions(user_id, channel_id) values ('${user}', 1), ('${kakao}', 1);
      insert into public.town_sessions(user_id, channel_id, last_seen) values ('${admin}', 2, now() - interval '2 minutes');
      insert into public.town_performances(channel_id, stage_id, user_id) values (1, 6, '${user}');
      insert into public.town_queue(channel_id, stage_id, user_id) values (1, 6, '${kakao}');
      insert into private.town_reports(id, reporter_id, target_id, target_name, channel_id, reason, details)
        values (gen_random_uuid(), '${kakao}', '${user}', '서우', 1, 'hate', '공연 중에 욕설을 반복했어요');
      insert into public.profile_daily_activity values ('${user}', (now() at time zone 'Asia/Seoul')::date, 600, 300);
      insert into public.profile_fans(sender_id, recipient_id, kind) values ('${kakao}', '${user}', 'follow');`);
    await as(db, admin);
    const o = await call(db, 'admin_overview');
    assert.equal(o.online, 2);
    assert.equal(o.stale, 1);
    assert.equal(o.performing, 1);
    assert.equal(o.queued, 1);
    assert.equal(o.openReports, 1);
    assert.equal(o.todayVisitors, 1);
    assert.equal(o.todayShows, 1);
    assert.equal(o.days.length, 14);
    assert.deepEqual(o.channels[0], { id: 1, name: '1채널', capacity: 40, count: 2 });

    const live = await call(db, 'admin_live');
    assert.equal(live.performances[0].name, '서우');
    assert.deepEqual(live.queue, [{ channel: 1, stage: 6, count: 1 }]);
    assert.equal(live.stages.length, 2);

    await db.exec('reset role');
    await db.exec(`delete from public.town_performances`);
    await as(db, admin);
    const shows = await call(db, 'admin_shows');
    assert.equal(shows.shows, 1);
    assert.equal(shows.finished, 1);
    assert.equal(shows.earlyEnds, 1);
    assert.equal(shows.newFollows, 1);
    assert.equal(shows.musicians[0].name, '서우');
    assert.equal(shows.musicians[0].followers, 1);
  } finally {
    await db.close();
  }
});

test('signup funnel counts each step and filters by login provider', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into public.admin_members values('${admin}');
      update auth.users set created_at = now() - interval '40 days' where id = '${admin}';
      insert into public.profile_daily_activity values ('${user}', current_date, 100, 50), ('${kakao}', current_date, 10, 0);
      insert into public.profile_fans(sender_id, recipient_id, kind) values ('${kakao}', '${user}', 'follow');`);
    await as(db, admin);
    const all = await call(db, 'admin_funnel', ['$1', '$2'], [30, null]);
    assert.deepEqual(
      all.steps.map((s) => [s.value, s.last]),
      [
        [2, 1],
        [1, 1],
        [2, 0],
        [1, 0],
        [1, 0],
      ],
    );
    const k = await call(db, 'admin_funnel', ['$1', '$2'], [30, 'kakao']);
    assert.deepEqual(
      k.steps.map((s) => s.value),
      [1, 0, 1, 0, 0],
    );
    await assert.rejects(call(db, 'admin_funnel', ['$1', '$2'], [0, null]), /INVALID_RANGE/);
  } finally {
    await db.close();
  }
});

test('report status changes follow the review flow and never overwrite a newer change', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into public.admin_members values('${admin}');
      insert into private.town_reports(id, reporter_id, target_id, target_name, channel_id, reason, details) values
        (gen_random_uuid(), '${kakao}', '${user}', '옛 이름', 1, 'hate', '공연 중에 욕설을 반복했어요'),
        (gen_random_uuid(), '${admin}', '${user}', '옛 이름', 1, 'other', '대기열을 계속 들락거려요');`);
    await as(db, admin);
    const list = await call(db, 'admin_reports');
    assert.equal(list.length, 2);
    assert.equal(list[0].target, '서우');
    assert.equal(list[0].targetTotal, 2);
    const id = list.find((r) => r.reason === 'hate').id;
    const set = (next, expected) =>
      call(db, 'admin_set_report_status', ['$1', '$2', '$3'], [id, next, expected]);
    await assert.rejects(set('resolved', 'pending'), /INVALID_TRANSITION/);
    assert.equal((await set('reviewing', 'pending')).status, 'reviewing');
    await assert.rejects(set('dismissed', 'pending'), /REPORT_CHANGED/);
    assert.equal((await set('dismissed', 'reviewing')).status, 'dismissed');
    await assert.rejects(set('reviewing', 'dismissed'), /INVALID_TRANSITION/);
    const closed = (await call(db, 'admin_reports')).find((r) => r.id === id);
    assert.equal(closed.status, 'dismissed');
    assert.ok(closed.retentionUntil);
    await db.exec('reset role');
    const row = (
      await db.query(
        `select reviewed_by, retention_class from private.town_reports where id = $1`,
        [id],
      )
    ).rows[0];
    assert.deepEqual(row, { reviewed_by: `admin:${admin}`, retention_class: 'standard' });
    await as(db, admin);
    await assert.rejects(
      call(
        db,
        'admin_set_report_status',
        ['$1', '$2', '$3'],
        ['00000000-0000-4000-8000-000000000000', 'reviewing', 'pending'],
      ),
      /REPORT_NOT_FOUND/,
    );
  } finally {
    await db.close();
  }
});

test('notices: seeded once, only published ones reach the park board, one blank draft at a time', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into public.admin_members values('${admin}');`);
    await as(db, user);
    const board = await call(db, 'town_notice_board');
    assert.equal(board.length, 2);
    assert.equal(board[0].title, '음악이 머무는 마을에 오신 걸 환영해요');
    await assert.rejects(
      call(db, 'admin_save_notice', ['$1', '$2', '$3', '$4', '$5'], [null, '', '', '', 'draft']),
      /ADMIN_REQUIRED/,
    );

    await as(db, admin);
    const save = (...args) => call(db, 'admin_save_notice', ['$1', '$2', '$3', '$4', '$5'], args);
    const blank = await save(null, '마을 안내', '', '', 'draft');
    await assert.rejects(save(null, '마을 안내', '', '', 'draft'), /BLANK_DRAFT_EXISTS/);
    await assert.rejects(save(blank.id, '마을 안내', '', '', 'published'), /check constraint/);
    await assert.rejects(
      save(blank.id, '마을 안내', '가'.repeat(41), '본문', 'draft'),
      /check constraint/,
    );
    const done = await save(
      blank.id,
      '공연 소식',
      '밤 공연이 늘어나요',
      '첫 문단\n\n둘째 문단',
      'published',
    );
    assert.equal(done.status, 'published');

    await as(db, user);
    assert.equal((await call(db, 'town_notice_board'))[0].title, '밤 공연이 늘어나요');

    await as(db, admin);
    await save(done.id, '공연 소식', '밤 공연이 늘어나요', '본문', 'hidden');
    assert.equal((await call(db, 'admin_notices')).length, 3);
    await call(db, 'admin_delete_notice', ['$1'], [done.id]);
    await assert.rejects(call(db, 'admin_delete_notice', ['$1'], [done.id]), /NOTICE_NOT_FOUND/);
    await as(db, user);
    assert.equal((await call(db, 'town_notice_board')).length, 2);

    await db.exec('reset role');
    await db.exec(sql); // Re-running does not seed again.
    assert.equal((await db.query('select count(*)::int n from public.town_notices')).rows[0].n, 2);
  } finally {
    await db.close();
  }
});

test('masters come only from the server sync and alone can grant regular admins', async () => {
  const db = await fixture();
  try {
    const sync = (uid, master) => call(db, 'admin_sync_role', ['$1', '$2'], [uid, master]);
    const setAdmin = (uid, on) => call(db, 'admin_set_admin', ['$1', '$2'], [uid, on]);

    // Browsers cannot call the sync themselves.
    await as(db, user);
    await assert.rejects(sync(user, true), /permission denied/);
    await db.exec(`reset role; set role service_role;`);
    assert.equal(await sync(admin, true), 'master');

    await as(db, admin);
    assert.equal((await call(db, 'admin_whoami')).role, 'master');
    await assert.rejects(setAdmin(admin, false), /SELF_CHANGE/);
    assert.deepEqual(await setAdmin(kakao, true), { id: kakao, role: 'admin' });
    const list = await call(db, 'admin_members_list', ['$1'], [null]);
    assert.deepEqual(
      list.map((m) => [m.name, m.role]),
      [
        ['운영자', 'master'],
        ['윤슬', 'admin'],
        ['서우', null],
      ],
    );
    assert.equal(list[1].provider, 'kakao');
    assert.ok(!('email' in list[0]));
    assert.deepEqual(
      (await call(db, 'admin_members_list', ['$1'], ['서'])).map((m) => m.name),
      ['서우'],
    );

    // A regular admin can use the console but cannot grant or touch a master.
    await as(db, kakao);
    assert.equal((await call(db, 'admin_whoami')).role, 'admin');
    await assert.rejects(setAdmin(user, true), /MASTER_REQUIRED/);

    await as(db, admin);
    await db.exec('reset role');
    await db.exec(`insert into public.admin_members(user_id, role, expires_at)
      values ('${user}', 'master', now() + interval '1 hour')`);
    await as(db, admin);
    await assert.rejects(setAdmin(user, false), /MASTER_LOCKED/);
    assert.deepEqual(await setAdmin(kakao, false), { id: kakao, role: null });

    // Removing an email from ADMIN_EMAILS revokes at once; an unsynced master expires on its own.
    await db.exec(`reset role; set role service_role;`);
    assert.equal(await sync(user, false), null);
    await db.exec(`reset role; update public.admin_members set expires_at = now() - interval '1 minute'
      where user_id = '${admin}'`);
    await as(db, admin);
    assert.equal((await call(db, 'admin_whoami')).admin, false);
    await assert.rejects(call(db, 'admin_members_list', ['$1'], [null]), /ADMIN_REQUIRED/);
  } finally {
    await db.close();
  }
});
