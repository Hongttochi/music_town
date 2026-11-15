-- Requires the existing member_profiles and town_sessions tables.
-- Keeps case records separate from accounts; never copies Auth identities, email or tokens.
begin;
create schema if not exists private;

do $$
begin
  if to_regclass('public.town_reports') is not null then
    if to_regclass('private.town_reports') is not null then
      raise exception 'BOTH_REPORT_TABLES_EXIST: reconcile before migration';
    end if;
    alter table public.town_reports set schema private;
  end if;
end $$;

create table if not exists private.town_reports (
  id uuid primary key,
  reporter_id uuid not null,
  target_id uuid not null,
  target_name text not null,
  channel_id integer not null,
  reason text not null check (reason in ('sexual','harassment','hate','privacy','disruption','other')),
  details text not null check (char_length(details) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- An account deletion must neither erase a case nor fail because of its references.
do $$
declare fk record;
begin
  for fk in
    select c.conname from pg_constraint c
    where c.conrelid='private.town_reports'::regclass and c.contype='f'
      and exists (select 1 from pg_attribute a where a.attrelid=c.conrelid
        and a.attnum=any(c.conkey) and a.attname in ('reporter_id','target_id'))
  loop
    execute format('alter table private.town_reports drop constraint %I', fk.conname);
  end loop;
end $$;

alter table private.town_reports
  add column if not exists closed_at timestamptz,
  add column if not exists retention_until timestamptz,
  add column if not exists retention_class text not null default 'standard',
  add column if not exists retention_assessment text,
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists hold_until timestamptz,
  add column if not exists hold_basis text,
  add column if not exists hold_reference text,
  add column if not exists hold_reason text,
  add column if not exists hold_review_at timestamptz;

-- Unknown historical closure dates must not silently start a fresh retention year.
update private.town_reports set closed_at=created_at
where closed_at is null and status in ('resolved','dismissed');
update private.town_reports set retention_until=coalesce(closed_at,created_at)+interval '90 days'
where retention_until is null;
alter table private.town_reports alter column retention_until set not null;
create index if not exists town_reports_expiry on private.town_reports(retention_until);
create index if not exists town_reports_reporter_time on private.town_reports(reporter_id,created_at);
alter table private.town_reports enable row level security;
revoke all on private.town_reports from public,anon,authenticated;

create or replace function private.enforce_report_retention() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' then
    new.created_at:=old.created_at;
    if old.closed_at is not null then
      if new.status not in ('resolved','dismissed') then raise exception 'CASE_ALREADY_CLOSED'; end if;
      new.closed_at:=old.closed_at;
    end if;
  end if;
  if new.status in ('resolved','dismissed') then
    new.closed_at:=coalesce(new.closed_at,now());
  else
    new.closed_at:=null;
  end if;
  if new.retention_class='safety' then
    if new.status<>'resolved' or coalesce(char_length(btrim(new.retention_assessment)),0)<20
      or coalesce(char_length(btrim(new.reviewed_by)),0)=0 then
      raise exception 'RETENTION_ASSESSMENT_REQUIRED';
    end if;
  elsif new.retention_class is distinct from 'standard' then
    raise exception 'INVALID_RETENTION_CLASS';
  end if;
  new.retention_until:=coalesce(new.closed_at,new.created_at)
    + case when new.retention_class='safety' then interval '1 year' else interval '90 days' end;
  if new.hold_until is not null then
    -- Revalidate extensions/changes, not an unrelated edit to an already expired hold.
    if tg_op='INSERT' or row(new.hold_until,new.hold_basis,new.hold_reference,new.hold_reason)
      is distinct from row(old.hold_until,old.hold_basis,old.hold_reference,old.hold_reason) then
      if new.hold_until<=now() or new.hold_until>now()+interval '90 days'
        or coalesce(new.hold_basis,'') not in ('legal_obligation','legitimate_interest')
        or coalesce(char_length(btrim(new.hold_reference)),0)<5
        or coalesce(char_length(btrim(new.hold_reason)),0)<20
        or coalesce(char_length(btrim(new.reviewed_by)),0)=0 then
        raise exception 'INVALID_CASE_HOLD';
      end if;
      new.hold_review_at:=least(now()+interval '30 days',new.hold_until);
    else
      new.hold_review_at:=old.hold_review_at;
    end if;
  else
    new.hold_basis:=null; new.hold_reference:=null; new.hold_reason:=null; new.hold_review_at:=null;
  end if;
  return new;
end $$;
revoke all on function private.enforce_report_retention() from public,anon,authenticated;
drop trigger if exists report_retention_guard on private.town_reports;
create trigger report_retention_guard before insert or update on private.town_reports
for each row execute function private.enforce_report_retention();

create or replace function public.submit_town_report(request_id uuid,target_user uuid,report_reason text,report_details text)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); own_channel integer; target_channel integer; display_name text; prior_reporter uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  -- A JWT may outlive a deleted Auth account. Verify its current existence too.
  perform 1 from auth.users where id=uid for key share;
  if not found then raise exception 'AUTH_REQUIRED'; end if;
  if request_id is null or target_user is null or target_user=uid
    or coalesce(report_reason,'') not in ('sexual','harassment','hate','privacy','disruption','other')
    or coalesce(char_length(btrim(report_details)),0) not between 10 and 1000 then
    raise exception 'INVALID_REPORT';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,611150001));
  select reporter_id into prior_reporter from private.town_reports where id=request_id;
  if found then
    if prior_reporter=uid then return request_id; end if;
    raise exception 'INVALID_REPORT';
  end if;
  select channel_id into own_channel from public.town_sessions
    where user_id=uid and last_seen>now()-interval '45 seconds';
  if not found then raise exception 'SESSION_EXPIRED'; end if;
  perform 1 from auth.users where id=target_user for key share;
  if not found then raise exception 'TARGET_LEFT'; end if;
  select s.channel_id,left(coalesce(p.avatar->>'name',''),50) into target_channel,display_name
    from public.town_sessions s join public.member_profiles p on p.id=s.user_id
    where s.user_id=target_user and s.last_seen>now()-interval '45 seconds';
  if not found or own_channel<>target_channel then raise exception 'TARGET_LEFT'; end if;
  if (select count(*) from private.town_reports where reporter_id=uid and created_at>now()-interval '1 minute')>=3 then
    raise exception 'REPORT_RATE_LIMIT';
  end if;
  insert into private.town_reports(id,reporter_id,target_id,target_name,channel_id,reason,details)
    values(request_id,uid,target_user,display_name,own_channel,report_reason,btrim(report_details));
  return request_id;
end $$;
revoke all on function public.submit_town_report(uuid,uuid,text,text) from public,anon;
grant execute on function public.submit_town_report(uuid,uuid,text,text) to authenticated;

-- Operator-only functions. They are deliberately outside the exposed API schema.
create or replace function private.close_town_report(case_id uuid,outcome text,operator_name text,
  assessment text default null,keep_safety_record boolean default false) returns void
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(outcome,'') not in ('resolved','dismissed') or coalesce(length(btrim(operator_name)),0)=0
    or keep_safety_record is null then raise exception 'INVALID_CASE_DECISION'; end if;
  update private.town_reports set status=outcome,
    retention_class=case when keep_safety_record then 'safety' else 'standard' end,
    retention_assessment=assessment,reviewed_by=operator_name,reviewed_at=now()
    where id=case_id;
  if not found then raise exception 'CASE_NOT_FOUND'; end if;
end $$;
revoke all on function private.close_town_report(uuid,text,text,text,boolean) from public,anon,authenticated;

create or replace function private.set_town_report_hold(case_id uuid,until_time timestamptz,basis text,
  reference_text text,justification text,operator_name text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(length(btrim(operator_name)),0)=0 then raise exception 'OPERATOR_REQUIRED'; end if;
  update private.town_reports set hold_until=until_time,hold_basis=basis,hold_reference=reference_text,
    hold_reason=justification,reviewed_by=operator_name,reviewed_at=now() where id=case_id;
  if not found then raise exception 'CASE_NOT_FOUND'; end if;
end $$;
revoke all on function private.set_town_report_hold(uuid,timestamptz,text,text,text,text) from public,anon,authenticated;

-- Keep only anonymous counts as evidence of cleanup, never copies of removed case data.
create table if not exists private.report_retention_runs (
  ran_at timestamptz primary key default clock_timestamp(),deleted_count integer not null
);
alter table private.report_retention_runs enable row level security;
revoke all on private.report_retention_runs from public,anon,authenticated;
create or replace function private.purge_town_reports() returns integer
language plpgsql security definer set search_path='' as $$
declare deleted integer;
begin
  delete from private.town_reports where retention_until<=now() and (hold_until is null or hold_until<=now());
  get diagnostics deleted=row_count;
  delete from private.report_retention_runs where ran_at<now()-interval '90 days';
  insert into private.report_retention_runs(deleted_count) values(deleted);
  return deleted;
end $$;
revoke all on function private.purge_town_reports() from public,anon,authenticated;
commit;
