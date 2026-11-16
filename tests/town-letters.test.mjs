import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const sql = await readFile(
  new URL('../supabase/migrations/202611160001_town_letters.sql', import.meta.url),
  'utf8',
);
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  c = '33333333-3333-4333-8333-333333333333';
const id = '44444444-4444-4444-8444-444444444444';
async function fixture() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table public.member_profiles(id uuid primary key references auth.users on delete cascade, completed boolean, avatar jsonb);
    create table public.profile_fans(sender_id uuid,recipient_id uuid,kind text);
    insert into auth.users values('${a}'),('${b}'),('${c}');
    insert into public.member_profiles select id,true,jsonb_build_object('name','주민') from auth.users;
    insert into public.profile_fans values('${a}','${b}','follow');`);
  await db.exec(sql);
  await db.exec(sql);
  await login(db, a);
  return db;
}
const login = (db, uid) =>
  db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
const send = (db, target = b, request = id, subject = '안녕하세요', body = '첫 편지입니다.') =>
  db.query('select public.send_town_letter($1,$2,$3,$4) as id', [target, subject, body, request]);
const list = async (db, box = 'inbox', offset = 0) =>
  (await db.query('select public.my_town_letters($1,$2) as letters', [box, offset])).rows[0]
    .letters;

test('letters are private, idempotent, and only their recipient can mark them read', async () => {
  const db = await fixture();
  try {
    await send(db);
    await send(db);
    assert.equal((await list(db, 'sent')).length, 1);
    assert.equal((await list(db)).length, 0);
    await assert.rejects(db.query('select * from public.town_letters'), /permission denied/);
    await assert.rejects(db.query('select public.read_town_letter($1)', [id]), /LETTER_NOT_FOUND/);
    await login(db, c);
    assert.deepEqual(await list(db), []);
    assert.deepEqual(await list(db, 'sent'), []);
    await assert.rejects(db.query('select public.read_town_letter($1)', [id]), /LETTER_NOT_FOUND/);
    await login(db, b);
    assert.equal((await list(db))[0].body, '첫 편지입니다.');
    await db.query('select public.read_town_letter($1)', [id]);
    const readAt = (await list(db))[0].readAt;
    assert.ok(readAt);
    await db.query('select public.read_town_letter($1)', [id]);
    assert.equal((await list(db))[0].readAt, readAt);
    await login(db, a);
    assert.equal((await list(db, 'sent'))[0].readAt, readAt);
    await db.exec('reset role; set role anon');
    await assert.rejects(list(db), /permission denied/);
    await assert.rejects(send(db), /permission denied/);
  } finally {
    await db.close();
  }
});

test('sending validates follow, profile, lengths, self-send and conflicting retry IDs', async () => {
  const db = await fixture();
  try {
    await assert.rejects(send(db, c), /FOLLOW_REQUIRED/);
    await assert.rejects(send(db, a), /INVALID_RECIPIENT/);
    await assert.rejects(send(db, b, id, ' '), /INVALID_LETTER/);
    await assert.rejects(send(db, b, id, 'x'.repeat(81)), /INVALID_LETTER/);
    await assert.rejects(send(db, b, id, '제목', 'x'.repeat(2001)), /INVALID_LETTER/);
    await send(db);
    await assert.rejects(send(db, b, id, '다른 제목'), /INVALID_REQUEST/);
    await db.exec('reset role; delete from public.profile_fans;');
    await login(db, a);
    await assert.rejects(send(db, b, crypto.randomUUID()), /FOLLOW_REQUIRED/);
    assert.equal((await list(db, 'sent')).length, 1);
    await assert.rejects(list(db, 'invalid'), /INVALID_ARGUMENT/);
    await assert.rejects(list(db, 'inbox', -1), /INVALID_ARGUMENT/);
  } finally {
    await db.close();
  }
});

test('letters paginate, limit daily sends and are removed with an account', async () => {
  const db = await fixture();
  try {
    for (let i = 0; i < 50; i++) await send(db, b, crypto.randomUUID(), '편지 ' + i);
    assert.equal((await list(db, 'sent')).length, 30);
    assert.equal((await list(db, 'sent', 30)).length, 20);
    await assert.rejects(send(db, b, crypto.randomUUID()), /LETTER_LIMIT/);
    await db.exec(`reset role; delete from auth.users where id='${b}';`);
    await login(db, a);
    assert.deepEqual(await list(db, 'sent'), []);
  } finally {
    await db.close();
  }
});
