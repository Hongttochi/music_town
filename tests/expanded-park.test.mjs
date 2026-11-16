import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const sql = await readFile(
  new URL('../supabase/migrations/202611160002_expanded_park.sql', import.meta.url),
  'utf8',
);
const uid = '11111111-1111-4111-8111-111111111111',
  client = '22222222-2222-4222-8222-222222222222';
test('expanded movement preserves old coordinate constraints, ownership and session cleanup', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table town_sessions(user_id uuid primary key,client_id uuid,x real check(x between 240 and 1650),y real check(y between 150 and 790));
      create table town_performances(user_id uuid primary key);
      insert into town_sessions values('${uid}','${client}',700,450);
      create function public.town_action(action text,channel integer,stage integer,client uuid,pos_x real,pos_y real) returns jsonb
      language plpgsql security definer set search_path='' as $$ begin
        if action='heartbeat' then
          update public.town_sessions set x=pos_x,y=pos_y where user_id=auth.uid() and client_id=client;
          if not found then raise exception 'SESSION_EXPIRED'; end if;
        end if;
        if action='leave' then delete from public.town_sessions where user_id=auth.uid() and client_id=client; end if;
        return jsonb_build_object('participants',coalesce((select jsonb_agg(jsonb_build_object('id',user_id,'x',x,'y',y)) from public.town_sessions),'[]'::jsonb));
      end $$;`);
    await db.exec(sql);
    await db.exec(sql);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${uid}';`);
    const act = async (action = 'heartbeat', x = 825, y = 40, token = client) =>
      (
        await db.query('select public.town_action_expanded($1,null,null,$2,$3,$4) as state', [
          action,
          token,
          x,
          y,
        ])
      ).rows[0].state;
    assert.equal((await act()).participants[0].y, 40);
    assert.equal((await act('snapshot')).participants[0].y, 40);
    await assert.rejects(act('heartbeat', 825, -201), /INVALID_POSITION/);
    await assert.rejects(act('heartbeat', 1801, 40), /INVALID_POSITION/);
    await assert.rejects(act('heartbeat', 825, 40, crypto.randomUUID()), /SESSION_EXPIRED/);
    await assert.rejects(
      db.query('select * from private.town_extended_positions'),
      /permission denied/,
    );
    await db.exec('reset role; update town_sessions set x=700,y=450; set role authenticated;');
    assert.equal(
      (await act('snapshot')).participants[0].y,
      450,
      'server relocation overrides stale extended coordinates',
    );
    await act();
    await act('leave');
    await db.exec('reset role');
    assert.equal(
      (await db.query('select count(*) from private.town_extended_positions')).rows[0].count,
      0,
    );
    await db.exec('set role anon');
    await assert.rejects(act(), /permission denied/);
  } finally {
    await db.close();
  }
});
