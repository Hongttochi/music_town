begin;
-- Retain the first receipt time across cancellation/re-addition, without resetting hearts.
create table public.profile_heart_receipts (
  sender_id uuid references auth.users(id) on delete cascade,
  recipient_id uuid references public.member_profiles(id) on delete cascade,
  created_at timestamptz not null,
  primary key(sender_id, recipient_id)
);
alter table public.profile_heart_receipts enable row level security;
revoke all on public.profile_heart_receipts from public, anon, authenticated;
insert into public.profile_heart_receipts
select sender_id, recipient_id, created_at from public.profile_fans where kind='heart';
create function private.retain_heart_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.kind='heart' then
    insert into public.profile_heart_receipts values(new.sender_id,new.recipient_id,new.created_at)
      on conflict do nothing;
    select created_at into new.created_at from public.profile_heart_receipts
      where sender_id=new.sender_id and recipient_id=new.recipient_id;
  end if;
  return new;
end $$;
revoke all on function private.retain_heart_receipt() from public,anon,authenticated;
create trigger retain_heart_receipt before insert on public.profile_fans
for each row execute function private.retain_heart_receipt();
create index profile_fans_heart_time on public.profile_fans(created_at,recipient_id) where kind='heart';

alter function public.profile_fan_action(uuid,text,boolean) rename to profile_fan_action_before_rankings;
alter function public.profile_fan_action_before_rankings(uuid,text,boolean) set schema private;
revoke all on function private.profile_fan_action_before_rankings(uuid,text,boolean) from public,anon,authenticated;
create function public.profile_fan_action(target uuid, action text default 'stats', enabled boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; week_start timestamptz := date_trunc('week',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  result := private.profile_fan_action_before_rankings(target,action,enabled);
  return result || jsonb_build_object('weeklyHearts', (select count(*) from public.profile_fans
    where recipient_id=target and kind='heart' and created_at>=week_start and created_at<week_start+interval '7 days'));
end $$;
revoke all on function public.profile_fan_action(uuid,text,boolean) from public,anon;
grant execute on function public.profile_fan_action(uuid,text,boolean) to authenticated;

create function public.musician_rankings(period text default 'weekly') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; week_start timestamptz := date_trunc('week',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if period is null or period not in ('weekly','all') then raise exception 'INVALID_PERIOD'; end if;
  with counts as (
    select recipient_id, count(*) as hearts,
      count(*) filter(where created_at>=week_start and created_at<week_start+interval '7 days') as weekly_hearts
    from public.profile_fans where kind='heart' group by recipient_id
  ), scored as (
    select m.*, c.hearts,c.weekly_hearts,case when period='weekly' then c.weekly_hearts else c.hearts end as score
    from counts c join public.member_profiles m on m.id=c.recipient_id where m.completed and m.role='musician'
  ), ranked as (
    select *,rank() over(order by score desc) as position from scored where score>0
  ), limited as (select * from ranked order by position,id limit 100)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'avatar',avatar,'bio',bio,'role',role,
    'instagram',instagram,'soundcloud',soundcloud,'x',0,'y',0,'hearts',hearts,
    'weeklyHearts',weekly_hearts,'rank',position) order by position,id),'[]'::jsonb) into result from limited;
  return jsonb_build_object('weekStart',week_start,'weekEnd',week_start+interval '7 days','entries',result);
end $$;
revoke all on function public.musician_rankings(text) from public,anon;
grant execute on function public.musician_rankings(text) to authenticated;
commit;
