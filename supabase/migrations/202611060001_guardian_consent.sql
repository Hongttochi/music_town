-- Apply after existing member_profiles and multiplayer migrations.
-- This migration gates existing accounts too. Deploy the admission UI and API configuration together.
begin;
create schema if not exists private;
create table public.service_admission_requests (
  id uuid primary key,
  token_hash text not null unique,
  age_group text not null check (age_group in ('under14','14plus')),
  status text not null check (status in ('pending','approved','claimed','revoked')),
  consent_version text not null,
  consent_text_hash text not null,
  verification_id text unique,
  relationship text check (relationship in ('parent','legal_guardian')),
  indicated_at timestamptz,
  guardian_name text,
  guardian_identity_hash text,
  guardian_verified_at timestamptz,
  approved_at timestamptz,
  user_id uuid references auth.users(id) on delete cascade,
  rate_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 hour',
  check (age_group <> 'under14' or status in ('pending','revoked') or
    (verification_id is not null and relationship is not null and guardian_identity_hash is not null and guardian_verified_at is not null and indicated_at is not null))
);
create index service_admission_rate on public.service_admission_requests(rate_key, created_at);
create table public.member_admissions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_group text not null check (age_group in ('under14','14plus')),
  request_id uuid not null references public.service_admission_requests(id),
  consent_version text not null,
  approved_at timestamptz,
  revoked_at timestamptz
);
alter table public.service_admission_requests enable row level security;
alter table public.member_admissions enable row level security;
revoke all on public.service_admission_requests, public.member_admissions from public, anon, authenticated;
grant all on public.service_admission_requests, public.member_admissions to service_role;

-- Reservation and rate limit share a transaction lock across server instances.
create function public.reserve_service_admission(p_id uuid, p_token_hash text, p_age_group text,
  p_version text, p_text_hash text, p_verification_id text, p_rate_key text, p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_user_id is not null then perform pg_advisory_xact_lock(hashtextextended('admission-user:'||p_user_id::text,0)); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 0));
  if (select count(*) from public.service_admission_requests where rate_key=p_rate_key and created_at > now()-interval '1 hour') >= 10 then
    raise exception 'RATE_LIMITED';
  end if;
  if p_age_group='14plus' and exists(select 1 from public.member_admissions where user_id=p_user_id and age_group='under14') then raise exception 'AGE_LOCKED'; end if;
  -- Purge abandoned requests without touching consent evidence linked to accounts.
  delete from public.service_admission_requests where user_id is null and expires_at < now()-interval '1 day';
  insert into public.service_admission_requests(id,token_hash,age_group,status,consent_version,consent_text_hash,verification_id,rate_key,approved_at,user_id)
  values(p_id,p_token_hash,p_age_group,case when p_age_group='14plus' then 'approved' else 'pending' end,p_version,p_text_hash,p_verification_id,p_rate_key,
    case when p_age_group='14plus' then now() else null end,p_user_id);
  if p_age_group='under14' and p_user_id is not null then
    insert into public.member_admissions(user_id,age_group,request_id,consent_version,approved_at,revoked_at)
    values(p_user_id,'under14',p_id,p_version,null,now())
    on conflict(user_id) do update set age_group='under14',request_id=p_id,consent_version=p_version,approved_at=null,revoked_at=now();
  end if;
end $$;
revoke all on function public.reserve_service_admission(uuid,text,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_service_admission(uuid,text,text,text,text,text,text,uuid) to service_role;

create function public.claim_service_admission(p_user_id uuid,p_token_hash text,p_version text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r public.service_admission_requests%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('admission-user:'||p_user_id::text,0));
  select * into r from public.service_admission_requests where token_hash=p_token_hash for update;
  if r.id is null or r.expires_at<=now() or r.consent_version<>p_version or r.status not in ('approved','claimed') or
    (r.user_id is not null and r.user_id<>p_user_id) then return false; end if;
  if exists(select 1 from public.member_admissions where user_id=p_user_id and ((age_group='under14' and r.age_group<>'under14') or r.created_at<revoked_at)) then return false; end if;
  update public.service_admission_requests set user_id=p_user_id,status='claimed' where id=r.id;
  insert into public.member_admissions(user_id,age_group,request_id,consent_version,approved_at)
  values(p_user_id,r.age_group,r.id,r.consent_version,r.approved_at)
  on conflict(user_id) do update set age_group=excluded.age_group,request_id=excluded.request_id,consent_version=excluded.consent_version,approved_at=excluded.approved_at,revoked_at=null;
  return true;
end $$;
revoke all on function public.claim_service_admission(uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_service_admission(uuid,text,text) to service_role;

-- Operator-only withdrawal; never exposed to browser roles.
create function public.revoke_service_admission(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('admission-user:'||p_user_id::text,0));
  update public.member_admissions set revoked_at=now() where user_id=p_user_id;
  update public.service_admission_requests set status='revoked' where user_id=p_user_id;
  delete from public.town_sessions where user_id=p_user_id;
end $$;
revoke all on function public.revoke_service_admission(uuid) from public,anon,authenticated;
grant execute on function public.revoke_service_admission(uuid) to service_role;

-- Browser metadata, localStorage and user-editable profiles cannot approve consent.
create function private.has_service_admission() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.member_admissions a join public.service_admission_requests r on r.id=a.request_id
    where a.user_id=auth.uid() and a.revoked_at is null and a.consent_version='2026-11-06-v1' and
      r.status='claimed' and r.user_id=a.user_id and r.consent_version=a.consent_version and
      (a.age_group='14plus' or (r.guardian_identity_hash is not null and r.guardian_verified_at is not null)))
$$;
revoke all on function private.has_service_admission() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.has_service_admission() to authenticated;
create policy "Require service admission" on public.member_profiles as restrictive for all to authenticated
  using (private.has_service_admission()) with check (private.has_service_admission());

-- Preserve the existing RPC implementation and wrap every public operation with the gate.
alter function public.town_action(text,integer,integer,uuid,real,real) rename to town_action_before_admission;
alter function public.town_action_before_admission(text,integer,integer,uuid,real,real) set schema private;
revoke all on function private.town_action_before_admission(text,integer,integer,uuid,real,real) from public,anon,authenticated;
create function public.town_action(action text default 'snapshot',channel integer default null,stage integer default null,
  client uuid default null,pos_x real default null,pos_y real default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if action is null then raise exception 'INVALID_ACTION'; end if;
  if action<>'leave' and not private.has_service_admission() then raise exception 'GUARDIAN_CONSENT_REQUIRED'; end if;
  return private.town_action_before_admission(action,channel,stage,client,pos_x,pos_y);
end $$;
revoke all on function public.town_action(text,integer,integer,uuid,real,real) from public,anon;
grant execute on function public.town_action(text,integer,integer,uuid,real,real) to authenticated;
-- If the optional report RPC is installed, protect it with the same admission gate.
do $migration$
declare report_oid oid; result_type text;
begin
  report_oid := to_regprocedure('public.submit_town_report(uuid,uuid,text,text)');
  if report_oid is not null then
    if (select proretset from pg_proc where oid=report_oid) then raise exception 'Review report RPC before applying guardian migration'; end if;
    result_type := pg_get_function_result(report_oid);
    alter function public.submit_town_report(uuid,uuid,text,text) rename to submit_town_report_before_admission;
    alter function public.submit_town_report_before_admission(uuid,uuid,text,text) set schema private;
    revoke all on function private.submit_town_report_before_admission(uuid,uuid,text,text) from public,anon,authenticated;
    execute format($wrapper$
      create function public.submit_town_report(request_id uuid,target_user uuid,report_reason text,report_details text) returns %s
      language plpgsql security definer set search_path='' as $body$
      begin
        if not private.has_service_admission() then raise exception 'GUARDIAN_CONSENT_REQUIRED'; end if;
        return private.submit_town_report_before_admission(request_id,target_user,report_reason,report_details);
      end $body$;
    $wrapper$,result_type);
    revoke all on function public.submit_town_report(uuid,uuid,text,text) from public,anon;
    grant execute on function public.submit_town_report(uuid,uuid,text,text) to authenticated;
  end if;
end $migration$;
commit;
