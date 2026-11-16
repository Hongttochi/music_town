begin;
-- Keep existing session, queue, activity and position constraints intact. Extended
-- coordinates are an authenticated overlay tied to the lifetime of each session.
create schema if not exists private;
create table if not exists private.town_extended_positions (
  user_id uuid primary key references public.town_sessions(user_id) on delete cascade,
  client_id uuid not null,
  x real not null check (x between 100 and 1800),
  y real not null check (y between -200 and 1000)
);
revoke all on private.town_extended_positions from public,anon,authenticated;

create or replace function public.town_action_expanded(action text default 'snapshot',channel integer default null,
  stage integer default null,client uuid default null,pos_x real default null,pos_y real default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); result jsonb; participants jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if pos_x is null or pos_y is null or not (pos_x between 100 and 1800 and pos_y between -200 and 1000) then
    raise exception 'INVALID_POSITION';
  end if;
  -- Same lock as town_action and the activity wrapper; never bypass their ownership checks.
  perform pg_advisory_xact_lock(684109);
  result := public.town_action(action,channel,stage,client,
    greatest(240::real,least(1650::real,pos_x)),greatest(150::real,least(790::real,pos_y)));
  if action='enter' then delete from private.town_extended_positions where user_id=uid; end if;
  if action='heartbeat' and exists(select 1 from public.town_sessions where user_id=uid and client_id=client)
    and not exists(select 1 from public.town_performances where user_id=uid) then
    insert into private.town_extended_positions values(uid,client,pos_x,pos_y)
      on conflict(user_id) do update set client_id=excluded.client_id,x=excluded.x,y=excluded.y;
  end if;
  -- A performance or a different tab's session must never reuse an old free-roam position.
  delete from private.town_extended_positions p where exists(select 1 from public.town_performances where user_id=p.user_id)
    or not exists(select 1 from public.town_sessions s where s.user_id=p.user_id and s.client_id=p.client_id
      and s.x=greatest(240::real,least(1650::real,p.x)) and s.y=greatest(150::real,least(790::real,p.y)));
  if jsonb_typeof(result->'participants')='array' then
    select coalesce(jsonb_agg(case when p.user_id is null then item.value
      else item.value || jsonb_build_object('x',p.x,'y',p.y) end order by item.ord),'[]'::jsonb)
    into participants from jsonb_array_elements(result->'participants') with ordinality item(value,ord)
    left join private.town_extended_positions p on p.user_id::text=item.value->>'id';
    result := jsonb_set(result,'{participants}',participants);
  end if;
  return result;
end $$;
revoke all on function public.town_action_expanded(text,integer,integer,uuid,real,real) from public,anon;
grant execute on function public.town_action_expanded(text,integer,integer,uuid,real,real) to authenticated;
commit;
