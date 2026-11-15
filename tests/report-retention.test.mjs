import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const sql = await readFile(
  new URL('../supabase/migrations/202611150001_report_retention.sql', import.meta.url),
  'utf8',
);
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const c = '33333333-3333-4333-8333-333333333333';
const id = (n) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const assessment =
  '확인된 반복 괴롭힘의 이의신청과 피해 대응에 필요한 최소 사건 기록만 보관함. 대체 수단과 정보주체의 권리를 비교 검토함.';
async function fixture(legacy = false) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    create table member_profiles(id uuid primary key references auth.users on delete cascade,avatar jsonb);
    create table town_sessions(user_id uuid primary key references auth.users on delete cascade,channel_id integer,last_seen timestamptz);
    create table profile_fans(sender_id uuid references auth.users on delete cascade,recipient_id uuid references member_profiles on delete cascade);
    create table profile_daily_activity(user_id uuid references auth.users on delete cascade);
    insert into auth.users values('${a}'),('${b}'),('${c}');
    insert into member_profiles select id,'{"name":"주민"}'::jsonb from auth.users;
    insert into town_sessions select id,0,now() from auth.users;
    insert into profile_fans values('${a}','${b}');
    insert into profile_daily_activity values('${b}');`);
  if (legacy) {
    await db.exec(`create table public.town_reports(
      id uuid primary key,reporter_id uuid references auth.users on delete cascade,
      target_id uuid references member_profiles on delete set null,target_name text,channel_id integer,
      reason text,details text,status text,created_at timestamptz);
      insert into public.town_reports values('${id(1)}','${a}','${b}','주민',0,'harassment',
      '구체적인 상황에 관한 신고입니다.','resolved',now()-interval '2 years');`);
  }
  await db.exec(sql);
  return db;
}
const asUser = (db, uid = a) =>
  db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
const submit = (
  db,
  n = 1,
  target = b,
  reason = 'harassment',
  details = '반복적으로 괴롭히는 상황을 신고합니다.',
) =>
  db.query('select submit_town_report($1,$2,$3,$4) as receipt', [id(n), target, reason, details]);
const row = async (db, n = 1) =>
  (await db.query('select * from private.town_reports where id=$1', [id(n)])).rows[0];
const close = (db, n, outcome = 'resolved', long = false, note = null) =>
  db.query('select private.close_town_report($1,$2,$3,$4,$5)', [
    id(n),
    outcome,
    'DooNow',
    note,
    long,
  ]);
const hold = (db, n, until, basis = 'legitimate_interest', note = assessment) =>
  db.query('select private.set_town_report_hold($1,$2,$3,$4,$5,$6)', [
    id(n),
    until,
    basis,
    '사건 검토 근거 문서 2026-01',
    note,
    'DooNow',
  ]);
const purge = async (db) => (await db.query('select private.purge_town_reports() as n')).rows[0].n;

test('private cases survive both parties withdrawing while ordinary account data is deleted', async () => {
  const db = await fixture();
  try {
    await asUser(db);
    assert.equal((await submit(db)).rows[0].receipt, id(1));
    await db.exec('reset role');
    await db.exec(`delete from auth.users where id in ('${a}','${b}')`);
    const kept = await row(db);
    assert.equal(kept.reporter_id, a);
    assert.equal(kept.target_id, b);
    assert.equal(kept.target_name, '주민');
    assert.equal((await db.query('select count(*) from member_profiles')).rows[0].count, 1);
    assert.equal((await db.query('select count(*) from profile_fans')).rows[0].count, 0);
    assert.equal((await db.query('select count(*) from profile_daily_activity')).rows[0].count, 0);
    await asUser(db);
    await assert.rejects(submit(db, 2, c), /AUTH_REQUIRED/);
  } finally {
    await db.close();
  }
});

test('anonymous/users cannot inspect cases, change retention, hold cases or purge them', async () => {
  const db = await fixture();
  try {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`reset role; set role ${role}`);
      for (const command of [
        'select * from private.town_reports',
        'update private.town_reports set retention_until=now()',
        'select * from private.report_retention_runs',
        'select private.purge_town_reports()',
      ])
        await assert.rejects(db.query(command), /permission denied/);
      await assert.rejects(close(db, 1), /permission denied/);
      await assert.rejects(hold(db, 1, new Date().toISOString()), /permission denied/);
    }
    await db.exec('reset role; set role anon');
    await assert.rejects(submit(db), /permission denied/);
    await db.exec('reset role; set role authenticated');
    await assert.rejects(submit(db), /AUTH_REQUIRED/);
  } finally {
    await db.close();
  }
});

test('submission verifies same-channel presence, validates input, limits spam, and supports retries', async () => {
  const db = await fixture();
  try {
    await asUser(db);
    await assert.rejects(submit(db, 1, a), /INVALID_REPORT/);
    await assert.rejects(submit(db, 1, b, 'made-up'), /INVALID_REPORT/);
    await assert.rejects(submit(db, 1, b, 'other', 'short'), /INVALID_REPORT/);
    await assert.rejects(submit(db, 1, b, 'other', '가'.repeat(1001)), /INVALID_REPORT/);
    await db.exec(`reset role; update town_sessions set channel_id=1 where user_id='${b}'`);
    await asUser(db);
    await assert.rejects(submit(db), /TARGET_LEFT/);
    await db.exec(
      `reset role; update town_sessions set channel_id=0,last_seen=now()-interval '1 minute' where user_id='${b}'`,
    );
    await asUser(db);
    await assert.rejects(submit(db), /TARGET_LEFT/);
    await db.exec(`reset role; update town_sessions set last_seen=now()`);
    await asUser(db);
    await submit(db);
    await submit(db);
    await submit(db, 2);
    await submit(db, 3);
    await assert.rejects(submit(db, 4), /REPORT_RATE_LIMIT/);
    await asUser(db, c);
    await assert.rejects(submit(db, 1), /INVALID_REPORT/);
    await db.exec(
      `reset role; update town_sessions set last_seen=now()-interval '1 minute' where user_id='${c}'`,
    );
    await asUser(db, c);
    await assert.rejects(submit(db, 4), /SESSION_EXPIRED/);
  } finally {
    await db.close();
  }
});

test('standard cases get 90 days; one year requires a resolved case and a documented assessment', async () => {
  const db = await fixture();
  try {
    await asUser(db);
    await submit(db);
    await submit(db, 2);
    await db.exec('reset role');
    let report = await row(db);
    assert.equal(+report.retention_until - +report.created_at, 90 * 86400000);
    await assert.rejects(close(db, 1, 'resolved', true), /RETENTION_ASSESSMENT_REQUIRED/);
    await assert.rejects(
      close(db, 1, 'dismissed', true, assessment),
      /RETENTION_ASSESSMENT_REQUIRED/,
    );
    await close(db, 1, 'resolved', true, assessment);
    report = await row(db);
    assert.equal(
      (
        await db.query(
          "select retention_until=closed_at+interval '1 year' as ok from private.town_reports where id=$1",
          [id(1)],
        )
      ).rows[0].ok,
      true,
    );
    await close(db, 2, 'dismissed');
    const standard = await row(db, 2);
    assert.equal(+standard.retention_until - +standard.closed_at, 90 * 86400000);
    await close(db, 1, 'resolved', true, assessment);
    assert.equal(
      +(await row(db)).closed_at,
      +report.closed_at,
      'editing/retrying a decision must not reset its clock',
    );
    await assert.rejects(
      db.query("update private.town_reports set status='reviewing' where id=$1", [id(1)]),
      /CASE_ALREADY_CLOSED/,
    );
  } finally {
    await db.close();
  }
});

test('expired open/closed records are purged; a current case survives and cleanup stores counts only', async () => {
  const db = await fixture();
  try {
    await db.exec(`insert into private.town_reports(id,reporter_id,target_id,target_name,channel_id,reason,details,status,created_at,closed_at)
      values ('${id(1)}','${a}','${b}','주민',0,'other','상황 설명을 포함한 신고입니다.','pending',now()-interval '91 days',null),
      ('${id(2)}','${a}','${b}','주민',0,'other','상황 설명을 포함한 신고입니다.','dismissed',now()-interval '1 year',now()-interval '90 days'),
      ('${id(3)}','${a}','${b}','주민',0,'other','상황 설명을 포함한 신고입니다.','pending',now(),null);
      insert into private.report_retention_runs values(now()-interval '91 days',0);`);
    assert.equal(await purge(db), 2);
    assert.equal(await row(db, 1), undefined);
    assert.ok(await row(db, 3));
    const runs = (await db.query('select * from private.report_retention_runs')).rows;
    assert.equal(runs.length, 1);
    assert.deepEqual(Object.keys(runs[0]).sort(), ['deleted_count', 'ran_at']);
    assert.equal(await purge(db), 0);
  } finally {
    await db.close();
  }
});

test('holds require a basis, rationale and a bounded end date; release allows immediate cleanup', async () => {
  const db = await fixture(true);
  try {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    await assert.rejects(
      hold(db, 1, new Date(Date.now() + 91 * 86400000).toISOString()),
      /INVALID_CASE_HOLD/,
    );
    await assert.rejects(hold(db, 1, tomorrow, 'just-in-case'), /INVALID_CASE_HOLD/);
    await assert.rejects(hold(db, 1, tomorrow, 'legitimate_interest', '짧음'), /INVALID_CASE_HOLD/);
    await hold(db, 1, tomorrow);
    const report = await row(db);
    assert.ok(report.hold_review_at <= report.hold_until);
    assert.equal(await purge(db), 0);
    await hold(db, 1, null);
    assert.equal((await row(db)).hold_reason, null);
    assert.equal(await purge(db), 1);
  } finally {
    await db.close();
  }
});

test('migration preserves legacy cases without restarting retention or losing them on account deletion; rerun is safe', async () => {
  const db = await fixture(true);
  try {
    const before = await row(db);
    assert.equal(+before.closed_at, +before.created_at);
    await db.exec(sql);
    await db.exec(`delete from auth.users where id='${b}'`);
    const after = await row(db);
    assert.equal(after.target_id, b);
    assert.equal(+after.retention_until, +before.retention_until);
    assert.equal(
      (await db.query("select to_regclass('public.town_reports') as old")).rows[0].old,
      null,
    );
    assert.equal(await purge(db), 1);
  } finally {
    await db.close();
  }
});

test('one-year expiry and expiring holds release only the records that are due', async () => {
  const db = await fixture();
  try {
    await db.query(
      `insert into private.town_reports
      (id,reporter_id,target_id,target_name,channel_id,reason,details,status,created_at,closed_at,
       retention_class,retention_assessment,reviewed_by)
      values ($1,$3,$4,'주민',0,'harassment','확인된 사건에 관한 신고입니다.','resolved',now()-interval '2 years',now()-interval '1 year','safety',$5,'DooNow'),
      ($2,$3,$4,'주민',0,'harassment','확인된 사건에 관한 신고입니다.','resolved',now()-interval '1 year',now()-interval '11 months','safety',$5,'DooNow')`,
      [id(1), id(2), a, b, assessment],
    );
    await db.query(
      `select private.set_town_report_hold($1,now()+interval '1 second',
      'legal_obligation','유효한 기관 보존 요청 번호 01',$2,'DooNow')`,
      [id(1), assessment],
    );
    assert.equal(await purge(db), 0);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(await purge(db), 1);
    assert.equal(await row(db, 1), undefined);
    assert.ok(await row(db, 2));
  } finally {
    await db.close();
  }
});
