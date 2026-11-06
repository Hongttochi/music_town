import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const version = '2026-11-06-v1';
const uid = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
async function fixture() {
  const db = new PGlite();
  await db.exec(`
create role anon;create role authenticated;create role service_role bypassrls;
create schema auth;create table auth.users(id uuid primary key);
insert into auth.users values('${uid}'),('${other}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
create table public.member_profiles(id uuid primary key references auth.users on delete cascade, bio text);
alter table public.member_profiles enable row level security;grant select,insert,update,delete on public.member_profiles to authenticated;
create policy own_profile on public.member_profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
insert into public.member_profiles values('${uid}','private'),('${other}','other');
create table public.town_sessions(user_id uuid primary key references auth.users on delete cascade);
create function public.submit_town_report(request_id uuid,target_user uuid,report_reason text,report_details text) returns uuid language sql security definer as $$select request_id$$;
create function public.town_action(action text default 'snapshot',channel integer default null,stage integer default null,client uuid default null,pos_x real default null,pos_y real default null) returns jsonb language sql security definer as $$select jsonb_build_object('action',action,'owner',auth.uid())$$;
`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/202611060001_guardian_consent.sql', import.meta.url),
      'utf8',
    ),
  );
  return db;
}
async function asRole(db, role, user, sql, params = []) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
  await db.exec('set role ' + role);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
async function reserve(db, request = id, token = 'token', age = 'under14', user = null) {
  await db.query('select public.reserve_service_admission($1,$2,$3,$4,$5,$6,$7,$8)', [
    request,
    token,
    age,
    version,
    'text-hash',
    age === 'under14' ? 'verification-' + request : null,
    'rate-' + request,
    user,
  ]);
}
async function approve(db, request = id) {
  await db.query(
    "update public.service_admission_requests set status='approved',relationship='parent',indicated_at=now(),guardian_name='Parent',guardian_identity_hash='opaque-hash',guardian_verified_at=now(),approved_at=now() where id=$1",
    [request],
  );
}
async function claim(db, user = uid, token = 'token', v = version) {
  return (
    await db.query('select public.claim_service_admission($1,$2,$3) as allowed', [user, token, v])
  ).rows[0].allowed;
}

test('DB migration: browser roles cannot inspect/approve consent; RPC and profile access fail closed', async () => {
  const db = await fixture();
  try {
    for (const role of ['anon', 'authenticated']) {
      await assert.rejects(
        asRole(db, role, uid, 'select * from public.service_admission_requests'),
        /permission denied/,
      );
      await assert.rejects(
        asRole(db, role, uid, "select public.claim_service_admission($1,'x',$2)", [uid, version]),
        /permission denied/,
      );
      await assert.rejects(
        asRole(db, role, uid, 'update public.member_admissions set revoked_at=null'),
        /permission denied/,
      );
    }
    await assert.rejects(
      asRole(db, 'authenticated', uid, "select public.town_action('enter')"),
      /GUARDIAN_CONSENT_REQUIRED/,
    );
    assert.equal(
      (await asRole(db, 'authenticated', uid, 'select * from public.member_profiles')).rows.length,
      0,
    );
    await assert.rejects(
      asRole(db, 'authenticated', uid, 'select public.submit_town_report($1,$2,$3,$4)', [
        id,
        other,
        'other',
        'details',
      ]),
      /GUARDIAN_CONSENT_REQUIRED/,
    );
    await assert.rejects(
      asRole(
        db,
        'authenticated',
        uid,
        'update public.member_profiles set bio=$1 where id=$2 returning id',
        ['changed', uid],
      ).then((r) => {
        assert.equal(r.rows.length, 1);
      }),
    );
    await assert.rejects(
      asRole(db, 'authenticated', uid, "select private.town_action_before_admission('enter')"),
      /permission denied/,
    );
    await reserve(db);
    assert.equal(await claim(db), false);
    await approve(db);
    assert.equal(await claim(db), true);
    assert.equal(
      (
        await asRole(
          db,
          'authenticated',
          uid,
          'select public.submit_town_report($1,$2,$3,$4) as receipt',
          [id, other, 'other', 'details'],
        )
      ).rows[0].receipt,
      id,
    );
    assert.equal(
      (await asRole(db, 'authenticated', uid, "select public.town_action('enter') as result"))
        .rows[0].result.owner,
      uid,
    );
    assert.equal(
      (await asRole(db, 'authenticated', uid, 'select * from public.member_profiles')).rows.length,
      1,
    );
    assert.equal(
      (await asRole(db, 'authenticated', other, 'select * from public.member_profiles')).rows
        .length,
      0,
    );
    await assert.rejects(
      asRole(db, 'authenticated', other, "select public.town_action('snapshot')"),
      /GUARDIAN_CONSENT_REQUIRED/,
    );
  } finally {
    await db.close();
  }
});
test('claims are single-account, expire, reject old versions, cannot replay revoked consent or downgrade a known child', async () => {
  const db = await fixture();
  try {
    await reserve(db);
    await approve(db);
    assert.equal(await claim(db, uid, 'token', 'old-version'), false);
    assert.equal(await claim(db), true);
    assert.equal(await claim(db, other), false);
    await db.query('insert into public.town_sessions values($1)', [uid]);
    await db.query('select public.revoke_service_admission($1)', [uid]);
    assert.equal((await db.query('select * from public.town_sessions')).rows.length, 0);
    assert.equal(await claim(db), false);
    await assert.rejects(
      asRole(db, 'authenticated', uid, "select public.town_action('snapshot')"),
      /GUARDIAN_CONSENT_REQUIRED/,
    );
    assert.equal(
      (await asRole(db, 'authenticated', uid, "select public.town_action('leave') as result"))
        .rows[0].result.action,
      'leave',
    );
    await reserve(db, '44444444-4444-4444-8444-444444444444', 'adult', '14plus');
    assert.equal(await claim(db, uid, 'adult'), false);
    await assert.rejects(
      reserve(db, '55555555-5555-4555-8555-555555555555', 'adult2', '14plus', uid),
      /AGE_LOCKED/,
    );
    await db.query(
      "update public.service_admission_requests set expires_at=now()-interval '1 second' where id=$1",
      [id],
    );
    assert.equal(await claim(db), false);
  } finally {
    await db.close();
  }
});
test('pending classifications survive clearing browser cookies and cannot provide profile/RPC access', async () => {
  const db = await fixture();
  try {
    await reserve(db, id, 'pending', 'under14', uid);
    assert.equal(
      (await db.query('select age_group,approved_at from public.member_admissions')).rows[0]
        .age_group,
      'under14',
    );
    assert.equal(
      (await db.query('select approved_at from public.member_admissions')).rows[0].approved_at,
      null,
    );
    await assert.rejects(
      reserve(db, '44444444-4444-4444-8444-444444444444', 'new-cookie', '14plus', uid),
      /AGE_LOCKED/,
    );
    await approve(db);
    assert.equal(await claim(db, other, 'pending'), false);
    assert.equal(await claim(db, uid, 'pending'), true);
    // Account deletion cascades through the consent evidence as well.
    await db.query('delete from auth.users where id=$1', [uid]);
    assert.equal((await db.query('select * from public.member_admissions')).rows.length, 0);
    assert.equal(
      (await db.query('select * from public.service_admission_requests')).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
test('global request rate limits are enforced by the database, not per server process', async () => {
  const db = await fixture();
  try {
    for (let i = 0; i < 10; i++)
      await db.query('select public.reserve_service_admission($1,$2,$3,$4,$5,null,$6,null)', [
        `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        'token' + i,
        '14plus',
        version,
        'hash',
        'same-client',
      ]);
    await assert.rejects(
      db.query('select public.reserve_service_admission($1,$2,$3,$4,$5,null,$6,null)', [
        '99999999-9999-4999-8999-999999999999',
        'extra',
        '14plus',
        version,
        'hash',
        'same-client',
      ]),
      /RATE_LIMITED/,
    );
  } finally {
    await db.close();
  }
});
