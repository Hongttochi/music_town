-- Admin console (/admin). Apply after member_profiles, town_channels, town_stages, town_sessions,
-- town_performances, town_queue, profile_fans, profile_daily_activity and 202611150001_report_retention.sql.
-- Safe to re-run. Grant admin access manually in the SQL Editor as described at the bottom.
begin;
create schema if not exists private;

-- Admin list. App users cannot read or write the table directly.
-- 'master' rows mirror the server-only ADMIN_EMAILS list: /api/admin-role refreshes them with a short
-- expiry, so removing an email revokes access on the next check or within two hours at most.
-- 'admin' rows are granted by a master in the console and do not expire.
create table if not exists public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_members
  add column if not exists role text not null default 'admin',
  add column if not exists expires_at timestamptz,
  add column if not exists granted_by uuid;
alter table public.admin_members drop constraint if exists admin_members_role_check;
alter table public.admin_members add constraint admin_members_role_check check (
  (role = 'admin' and expires_at is null) or (role = 'master' and expires_at is not null));
alter table public.admin_members enable row level security;
revoke all on public.admin_members from public, anon, authenticated;

create or replace function private.admin_role(uid uuid) returns text
language sql stable security definer set search_path='' as $$
  select role from public.admin_members
  where user_id = uid and (expires_at is null or expires_at > now());
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and private.admin_role(auth.uid()) is not null;
$$;
create or replace function private.require_admin() returns void
language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
end $$;
revoke all on function private.admin_role(uuid), private.is_admin(), private.require_admin()
  from public, anon, authenticated;

-- Called only by /api/admin-role with the server secret key after it verified the caller's email.
create or replace function public.admin_sync_role(target_user uuid, is_master boolean) returns text
language plpgsql security definer set search_path='' as $$
begin
  if target_user is null or is_master is null then raise exception 'INVALID_REQUEST'; end if;
  if is_master then
    insert into public.admin_members(user_id, role, expires_at)
    values (target_user, 'master', now() + interval '2 hours')
    on conflict (user_id) do update set role = 'master', expires_at = excluded.expires_at, granted_by = null;
  else
    -- Removed from ADMIN_EMAILS: drop the mirrored master right immediately.
    delete from public.admin_members where user_id = target_user and role = 'master';
  end if;
  return private.admin_role(target_user);
end $$;
revoke all on function public.admin_sync_role(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_sync_role(uuid, boolean) to service_role;

-- Lets the console check the caller's own admin flag without exposing the list.
create or replace function public.admin_whoami() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  return jsonb_build_object('userId', auth.uid(), 'admin', private.is_admin(),
    'role', private.admin_role(auth.uid()));
end $$;

-- Performance history. town_performances rows are deleted when a show ends, so keep a log from now on.
create table if not exists private.performance_log (
  id bigint generated always as identity primary key,
  channel_id integer not null,
  stage_id integer not null,
  user_id uuid,
  started_at timestamptz not null,
  planned_end timestamptz,
  ended_at timestamptz
);
create index if not exists performance_log_started on private.performance_log(started_at);
revoke all on private.performance_log from public, anon, authenticated;

create or replace function private.log_performance() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'INSERT' then
    insert into private.performance_log(channel_id, stage_id, user_id, started_at, planned_end)
    values (new.channel_id, new.stage_id, new.user_id, coalesce(new.started_at, now()), new.ends_at);
    return new;
  end if;
  update private.performance_log set ended_at = now()
  where user_id = old.user_id and ended_at is null and started_at = coalesce(old.started_at, started_at);
  return old;
end $$;
revoke all on function private.log_performance() from public, anon, authenticated;
drop trigger if exists admin_log_performance on public.town_performances;
create trigger admin_log_performance after insert or delete on public.town_performances
  for each row execute function private.log_performance();

-- Names come from the profile character (avatar.name) only; no email or other account data.
create or replace function private.display_name(uid uuid) returns text
language sql stable security definer set search_path='' as $$
  select coalesce(nullif(m.avatar->>'name', ''), '이름 없음') from public.member_profiles m where m.id = uid;
$$;
revoke all on function private.display_name(uuid) from public, anon, authenticated;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare today date := (now() at time zone 'Asia/Seoul')::date;
  day_start timestamptz := ((now() at time zone 'Asia/Seoul')::date)::timestamp at time zone 'Asia/Seoul';
begin
  perform private.require_admin();
  return jsonb_build_object(
    'now', now(),
    'online', (select count(*) from public.town_sessions where last_seen > now() - interval '45 seconds'),
    'stale', (select count(*) from public.town_sessions where last_seen <= now() - interval '45 seconds'),
    'performing', (select count(*) from public.town_performances),
    'queued', (select count(*) from public.town_queue),
    'openReports', (select count(*) from private.town_reports where status in ('pending', 'reviewing')),
    'todayVisitors', (select count(distinct user_id) from public.profile_daily_activity where day = today),
    'todayShows', (select count(*) from private.performance_log where started_at >= day_start),
    'todaySignups', (select count(*) from auth.users where created_at >= day_start),
    'channels', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', coalesce(to_jsonb(c)->>'name', c.id || '채널'),
        'capacity', coalesce((to_jsonb(c)->>'capacity')::int, 0),
        'count', (select count(*) from public.town_sessions s where s.channel_id = c.id and s.last_seen > now() - interval '45 seconds')
      ) order by c.id), '[]'::jsonb) from public.town_channels c),
    'days', (select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'visitors', (select count(distinct a.user_id) from public.profile_daily_activity a where a.day = d::date),
        'onlineSeconds', (select coalesce(sum(a.online_seconds), 0) from public.profile_daily_activity a where a.day = d::date),
        'stageSeconds', (select coalesce(sum(a.stage_seconds), 0) from public.profile_daily_activity a where a.day = d::date)
      ) order by d) from generate_series((today - 13)::timestamp, today::timestamp, interval '1 day') d)
  );
end $$;

create or replace function public.admin_live() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'now', now(),
    'channels', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', coalesce(to_jsonb(c)->>'name', c.id || '채널'),
        'capacity', coalesce((to_jsonb(c)->>'capacity')::int, 0),
        'count', (select count(*) from public.town_sessions s where s.channel_id = c.id and s.last_seen > now() - interval '45 seconds')
      ) order by c.id), '[]'::jsonb) from public.town_channels c),
    'stages', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', st.id, 'name', coalesce(to_jsonb(st)->>'name', '무대 ' || st.id)
      ) order by st.id), '[]'::jsonb) from public.town_stages st),
    'performances', (select coalesce(jsonb_agg(jsonb_build_object(
        'channel', p.channel_id, 'stage', p.stage_id, 'userId', p.user_id,
        'name', private.display_name(p.user_id), 'startedAt', p.started_at, 'endsAt', p.ends_at
      )), '[]'::jsonb) from public.town_performances p),
    'queue', (select coalesce(jsonb_agg(jsonb_build_object('channel', q.channel_id, 'stage', q.stage_id, 'count', q.n)), '[]'::jsonb)
      from (select channel_id, stage_id, count(*) n from public.town_queue group by channel_id, stage_id) q)
  );
end $$;

create or replace function public.admin_shows() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare week_start date := (now() at time zone 'Asia/Seoul')::date - 6;
  since timestamptz := ((now() at time zone 'Asia/Seoul')::date - 6)::timestamp at time zone 'Asia/Seoul';
begin
  perform private.require_admin();
  return jsonb_build_object(
    'stageSeconds', (select coalesce(sum(stage_seconds), 0) from public.profile_daily_activity where day >= week_start),
    'performers', (select count(distinct user_id) from public.profile_daily_activity where day >= week_start and stage_seconds > 0),
    'newFollows', (select count(*) from public.profile_fans where kind = 'follow' and created_at >= since),
    'newHearts', (select count(*) from public.profile_fans where kind = 'heart' and created_at >= since),
    'shows', (select count(*) from private.performance_log where started_at >= since),
    'avgSeconds', (select coalesce(avg(extract(epoch from ended_at - started_at)), 0) from private.performance_log
      where started_at >= since and ended_at is not null),
    'earlyEnds', (select count(*) from private.performance_log
      where started_at >= since and ended_at is not null and planned_end is not null and ended_at < planned_end - interval '10 seconds'),
    'finished', (select count(*) from private.performance_log where started_at >= since and ended_at is not null),
    'musicians', (select coalesce(jsonb_agg(x order by (x->>'stageSeconds')::float desc), '[]'::jsonb) from (
      select jsonb_build_object('userId', a.user_id, 'name', private.display_name(a.user_id),
        'stageSeconds', sum(a.stage_seconds),
        'followers', (select count(*) from public.profile_fans f where f.recipient_id = a.user_id and f.kind = 'follow'),
        'hearts', (select count(*) from public.profile_fans f where f.recipient_id = a.user_id and f.kind = 'heart')) x
      from public.profile_daily_activity a where a.day >= week_start
      group by a.user_id having sum(a.stage_seconds) > 0
      order by sum(a.stage_seconds) desc limit 12) t)
  );
end $$;

-- Signup cohort funnel. provider is 'google', 'kakao' or null for everyone.
create or replace function public.admin_funnel(days integer default 30, provider text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare span interval;
begin
  perform private.require_admin();
  if days is null or days < 1 or days > 365 then raise exception 'INVALID_RANGE'; end if;
  span := make_interval(days => days);
  return (
    with cohort as (
      select u.id, case when u.created_at >= now() - span then 'now' else 'last' end as period
      from auth.users u
      where u.created_at >= now() - span * 2
        and (provider is null or u.raw_app_meta_data->>'provider' = provider)
    ), marks as (
      select c.period,
        exists(select 1 from public.member_profiles m where m.id = c.id and m.completed) as profile,
        exists(select 1 from public.profile_daily_activity a where a.user_id = c.id) as visited,
        exists(select 1 from public.profile_daily_activity a where a.user_id = c.id and a.stage_seconds > 0) as staged,
        exists(select 1 from public.profile_fans f where f.recipient_id = c.id and f.kind = 'follow') as followed
      from cohort c
    )
    select jsonb_build_object('days', days, 'provider', provider, 'steps', jsonb_build_array(
      jsonb_build_object('label', '가입', 'value', count(*) filter (where period = 'now'), 'last', count(*) filter (where period = 'last')),
      jsonb_build_object('label', '프로필 완성', 'value', count(*) filter (where period = 'now' and profile), 'last', count(*) filter (where period = 'last' and profile)),
      jsonb_build_object('label', '공원 방문', 'value', count(*) filter (where period = 'now' and visited), 'last', count(*) filter (where period = 'last' and visited)),
      jsonb_build_object('label', '첫 무대', 'value', count(*) filter (where period = 'now' and staged), 'last', count(*) filter (where period = 'last' and staged)),
      jsonb_build_object('label', '팔로워 생김', 'value', count(*) filter (where period = 'now' and followed), 'last', count(*) filter (where period = 'last' and followed))
    )) from marks
  );
end $$;

-- Reports live in private.town_reports (see 202611150001_report_retention.sql). Ids travel as text.
create or replace function public.admin_reports() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id::text, 'createdAt', r.created_at, 'reason', r.reason, 'details', r.details, 'status', r.status,
      'channel', r.channel_id, 'targetId', r.target_id,
      'target', coalesce(private.display_name(r.target_id), r.target_name, '알 수 없음'),
      'reporter', coalesce(private.display_name(r.reporter_id), '알 수 없음'),
      'targetTotal', (select count(*) from private.town_reports t where t.target_id = r.target_id),
      'retentionUntil', case when r.closed_at is not null then r.retention_until end
    ) order by r.created_at desc), '[]'::jsonb)
    from (select * from private.town_reports order by created_at desc limit 300) r);
end $$;

create or replace function public.admin_set_report_status(report_id text, next_status text, expected_status text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cur text;
begin
  perform private.require_admin();
  select status into cur from private.town_reports where id::text = report_id for update;
  if cur is null then raise exception 'REPORT_NOT_FOUND'; end if;
  -- Never overwrite a change another admin made first.
  if cur is distinct from expected_status then raise exception 'REPORT_CHANGED'; end if;
  -- Closed cases are final; the retention trigger rejects reopening them.
  if not (
    (cur = 'pending' and next_status = 'reviewing') or
    (cur = 'reviewing' and next_status in ('resolved', 'dismissed'))
  ) then raise exception 'INVALID_TRANSITION'; end if;
  if next_status = 'reviewing' then
    update private.town_reports set status = next_status where id::text = report_id;
  else
    -- Standard 90-day retention. Keeping a safety record stays a manual SQL decision.
    perform private.close_town_report(report_id::uuid, next_status, 'admin:' || auth.uid()::text);
  end if;
  return jsonb_build_object('id', report_id, 'status', next_status);
end $$;

-- Park notice board.
create table if not exists public.town_notices (
  id uuid primary key default gen_random_uuid(),
  label text not null default '' check (char_length(label) <= 10),
  title text not null default '' check (char_length(title) <= 40),
  body text not null default '' check (char_length(body) <= 1000),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status <> 'published' or (btrim(title) <> '' and btrim(body) <> ''))
);
alter table public.town_notices enable row level security;
revoke all on public.town_notices from public, anon, authenticated;

-- Seed the notices bundled with the app (src/data/notices.ts) once.
insert into public.town_notices(label, title, body, status, published_at, created_at)
select v.label, v.title, v.body, 'published', now(), now() - v.ord * interval '1 second'
from (values
  (0, '마을 안내', '음악이 머무는 마을에 오신 걸 환영해요',
   E'산책하다 마음에 드는 무대를 만나면 잠시 멈춰 들어보세요. 하트와 박수, 응원봉으로 공연하는 이에게 마음을 전할 수 있어요.\n\n마을의 새 소식은 이 게시판에서 전해 드릴게요.'),
  (1, '산책 메모', '커피 한 잔, 잠깐의 쉼',
   '카페 가까이에서 커피 아이콘을 눌러 원하는 음료를 골라 보세요. 벤치 옆의 의자 아이콘을 누르면 앉아서 쉬어갈 수 있어요.')
) v(ord, label, title, body)
where not exists (select 1 from public.town_notices);

-- For park visitors: published notices only, newest first.
create or replace function public.town_notice_board() returns jsonb
language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'label', n.label, 'title', n.title, 'body', n.body)
    order by n.published_at desc nulls last, n.created_at desc), '[]'::jsonb)
  from public.town_notices n where n.status = 'published';
$$;

create or replace function public.admin_notices() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'label', n.label, 'title', n.title, 'body', n.body,
      'status', n.status, 'updatedAt', n.updated_at) order by n.created_at desc), '[]'::jsonb)
    from public.town_notices n);
end $$;

-- A null notice_id creates a notice. Only one blank draft may exist at a time.
create or replace function public.admin_save_notice(notice_id uuid, notice_label text, notice_title text, notice_body text, next_status text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare saved public.town_notices;
begin
  perform private.require_admin();
  if next_status not in ('draft', 'published', 'hidden') then raise exception 'INVALID_STATUS'; end if;
  if notice_id is null then
    if exists(select 1 from public.town_notices n where n.status = 'draft' and btrim(n.title) = '' and btrim(n.body) = '') then
      raise exception 'BLANK_DRAFT_EXISTS';
    end if;
    insert into public.town_notices(label, title, body, status, published_at)
    values (coalesce(notice_label, ''), coalesce(notice_title, ''), coalesce(notice_body, ''), next_status,
      case when next_status = 'published' then now() end)
    returning * into saved;
  else
    update public.town_notices n set label = coalesce(notice_label, ''), title = coalesce(notice_title, ''),
      body = coalesce(notice_body, ''), status = next_status, updated_at = now(),
      published_at = case when next_status = 'published' then now() else n.published_at end
    where n.id = notice_id returning * into saved;
    if saved.id is null then raise exception 'NOTICE_NOT_FOUND'; end if;
  end if;
  return jsonb_build_object('id', saved.id, 'label', saved.label, 'title', saved.title, 'body', saved.body,
    'status', saved.status, 'updatedAt', saved.updated_at);
end $$;

create or replace function public.admin_delete_notice(notice_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  delete from public.town_notices where id = notice_id;
  if not found then raise exception 'NOTICE_NOT_FOUND'; end if;
end $$;

-- Members. Everyone with a profile, newest first; names only, never email or provider ids.
create or replace function public.admin_members_list(search text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  perform private.require_admin();
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'name', m.name, 'provider', m.provider, 'joinedAt', m.joined_at,
      'lastVisit', m.last_visit, 'role', m.role
    ) order by m.rank, m.joined_at desc), '[]'::jsonb)
    from (
      select p.id, coalesce(nullif(p.avatar->>'name', ''), '이름 없음') as name,
        u.raw_app_meta_data->>'provider' as provider, u.created_at as joined_at,
        (select max(a.day) from public.profile_daily_activity a where a.user_id = p.id) as last_visit,
        private.admin_role(p.id) as role,
        case private.admin_role(p.id) when 'master' then 0 when 'admin' then 1 else 2 end as rank
      from public.member_profiles p join auth.users u on u.id = p.id
      where coalesce(btrim(search), '') = '' or p.avatar->>'name' ilike '%' || btrim(search) || '%'
      order by rank, u.created_at desc
      limit 200
    ) m);
end $$;

-- Only a master can grant or revoke the regular admin role. Masters come from ADMIN_EMAILS only.
create or replace function public.admin_set_admin(target_user uuid, make_admin boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing_role text;
begin
  perform private.require_admin();
  if private.admin_role(auth.uid()) is distinct from 'master' then raise exception 'MASTER_REQUIRED'; end if;
  if target_user is null or make_admin is null then raise exception 'INVALID_REQUEST'; end if;
  if target_user = auth.uid() then raise exception 'SELF_CHANGE'; end if;
  perform 1 from public.member_profiles where id = target_user;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  select role into existing_role from public.admin_members where user_id = target_user for update;
  if existing_role = 'master' then raise exception 'MASTER_LOCKED'; end if;
  if make_admin then
    insert into public.admin_members(user_id, role, granted_by) values (target_user, 'admin', auth.uid())
    on conflict (user_id) do nothing;
  else
    delete from public.admin_members where user_id = target_user and role = 'admin';
  end if;
  return jsonb_build_object('id', target_user, 'role', private.admin_role(target_user));
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_whoami()', 'public.admin_overview()', 'public.admin_live()', 'public.admin_shows()',
    'public.admin_funnel(integer,text)', 'public.admin_reports()', 'public.admin_set_report_status(text,text,text)',
    'public.town_notice_board()', 'public.admin_notices()', 'public.admin_save_notice(uuid,text,text,text,text)',
    'public.admin_delete_notice(uuid)', 'public.admin_members_list(text)', 'public.admin_set_admin(uuid,boolean)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
commit;

-- Masters are the verified emails in the server-only ADMIN_EMAILS variable; signing in at /admin
-- registers them through /api/admin-role. Masters grant regular admins in the console (회원 관리).
