-- Apply after member_profiles. Only aggregate counts and the caller's own follows are exposed.
begin;
create table public.profile_fans (
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references public.member_profiles(id) on delete cascade,
  kind text not null check (kind in ('follow','heart')),
  created_at timestamptz not null default now(),
  primary key (sender_id, recipient_id, kind),
  check (sender_id <> recipient_id)
);
create index profile_fans_counts on public.profile_fans(recipient_id, kind);
alter table public.profile_fans enable row level security;
revoke all on public.profile_fans from public, anon, authenticated;

create table public.profile_daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  online_seconds double precision not null default 0 check (online_seconds >= 0),
  stage_seconds double precision not null default 0 check (stage_seconds >= 0 and stage_seconds <= online_seconds),
  primary key(user_id,day)
);
create table public.profile_activity_cursor (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credited_at timestamptz not null
);
alter table public.profile_daily_activity enable row level security;
alter table public.profile_activity_cursor enable row level security;
revoke all on public.profile_daily_activity,public.profile_activity_cursor from public,anon,authenticated;

-- Wrap the existing RPC without changing its session ownership, queue or capacity checks.
create schema if not exists private;
alter function public.town_action(text,integer,integer,uuid,real,real) rename to town_action_before_activity;
alter function public.town_action_before_activity(text,integer,integer,uuid,real,real) set schema private;
revoke all on function private.town_action_before_activity(text,integer,integer,uuid,real,real) from public,anon,authenticated;
create function public.town_action(action text default 'snapshot',channel integer default null,stage integer default null,
  client uuid default null,pos_x real default null,pos_y real default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); last_seen_at timestamptz; perf_start timestamptz; perf_end timestamptz;
  start_at timestamptz; end_at timestamptz; d date; lower_at timestamptz; upper_at timestamptz; online_s double precision; stage_s double precision; result jsonb;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(684109);
  select last_seen into last_seen_at from public.town_sessions where user_id=uid;
  select started_at,ends_at into perf_start,perf_end from public.town_performances where user_id=uid;
  select credited_at into start_at from public.profile_activity_cursor where user_id=uid;
  result:=private.town_action_before_activity(action,channel,stage,client,pos_x,pos_y);
  end_at:=least(now(),last_seen_at+interval '45 seconds');
  if last_seen_at is not null and start_at is not null and end_at>start_at then
    for d in select generate_series((start_at at time zone 'Asia/Seoul')::date::timestamp,
      (end_at at time zone 'Asia/Seoul')::date::timestamp,interval '1 day')::date loop
      lower_at:=greatest(start_at,d::timestamp at time zone 'Asia/Seoul');
      upper_at:=least(end_at,(d+1)::timestamp at time zone 'Asia/Seoul');
      online_s:=greatest(0,extract(epoch from upper_at-lower_at));
      stage_s:=case when perf_start is null then 0 else greatest(0,extract(epoch from least(upper_at,perf_end)-greatest(lower_at,perf_start))) end;
      insert into public.profile_daily_activity(user_id,day,online_seconds,stage_seconds) values(uid,d,online_s,stage_s)
        on conflict(user_id,day) do update set online_seconds=profile_daily_activity.online_seconds+excluded.online_seconds,
        stage_seconds=profile_daily_activity.stage_seconds+excluded.stage_seconds;
    end loop;
  end if;
  insert into public.profile_activity_cursor values(uid,now()) on conflict(user_id) do update set credited_at=greatest(profile_activity_cursor.credited_at,excluded.credited_at);
  return result;
end $$;
revoke all on function public.town_action(text,integer,integer,uuid,real,real) from public,anon;
grant execute on function public.town_action(text,integer,integer,uuid,real,real) to authenticated;

create function public.profile_fan_action(target uuid, action text default 'stats', enabled boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if action is null or action not in ('stats','follow','heart') then raise exception 'INVALID_ACTION'; end if;
  if not exists(select 1 from public.member_profiles where id=target and completed) then raise exception 'PROFILE_REQUIRED'; end if;
  if action <> 'stats' then
    if target=uid then raise exception 'SELF_REACTION'; end if;
    if enabled is null then raise exception 'INVALID_ACTION'; end if;
    if not exists(select 1 from public.member_profiles where id=uid and completed) then raise exception 'PROFILE_REQUIRED'; end if;
    perform pg_advisory_xact_lock(hashtextextended(uid::text || target::text || action,0));
    if enabled then
      insert into public.profile_fans(sender_id,recipient_id,kind) values(uid,target,action) on conflict do nothing;
    else
      delete from public.profile_fans where sender_id=uid and recipient_id=target and kind=action;
    end if;
  end if;
  return jsonb_build_object(
    'onlineSeconds',(select coalesce(sum(online_seconds),0) from public.profile_daily_activity where user_id=target),
    'stageSeconds',(select coalesce(sum(stage_seconds),0) from public.profile_daily_activity where user_id=target),
    'days',(select jsonb_agg(jsonb_build_object('date',d::date,'onlineSeconds',coalesce(a.online_seconds,0),'stageSeconds',coalesce(a.stage_seconds,0)) order by d)
      from generate_series(((now() at time zone 'Asia/Seoul')::date-6)::timestamp,(now() at time zone 'Asia/Seoul')::date::timestamp,interval '1 day') d
      left join public.profile_daily_activity a on a.day=d::date and a.user_id=target),
    'followers',(select count(*) from public.profile_fans where recipient_id=target and kind='follow'),
    'hearts',(select count(*) from public.profile_fans where recipient_id=target and kind='heart'),
    'following',exists(select 1 from public.profile_fans where recipient_id=target and sender_id=uid and kind='follow'),
    'hearted',exists(select 1 from public.profile_fans where recipient_id=target and sender_id=uid and kind='heart')
  );
end $$;
revoke all on function public.profile_fan_action(uuid,text,boolean) from public,anon;
grant execute on function public.profile_fan_action(uuid,text,boolean) to authenticated;

create function public.my_followed_profiles() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'avatar',m.avatar,'bio',m.bio,
    'role',m.role,'instagram',m.instagram,'soundcloud',m.soundcloud,'x',0,'y',0) order by f.created_at desc),'[]'::jsonb)
    from public.profile_fans f join public.member_profiles m on m.id=f.recipient_id
    where f.sender_id=auth.uid() and f.kind='follow' and m.completed);
end $$;
revoke all on function public.my_followed_profiles() from public,anon;
grant execute on function public.my_followed_profiles() to authenticated;
commit;
