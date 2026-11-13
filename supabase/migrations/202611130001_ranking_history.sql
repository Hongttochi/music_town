begin;
-- Historical views reconstruct the existing ranking rules from retained active hearts.
-- They are not frozen weekly awards: cancellations and profile changes can affect them.
create function public.musician_rankings_week(selected_date date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  result jsonb;
  week_start timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if selected_date is null or selected_date > (now() at time zone 'Asia/Seoul')::date then
    raise exception 'INVALID_WEEK';
  end if;
  week_start := date_trunc('week',selected_date::timestamp) at time zone 'Asia/Seoul';
  with counts as (
    select recipient_id, count(*) as hearts,
      count(*) filter(where created_at>=week_start and created_at<week_start+interval '7 days') as weekly_hearts
    from public.profile_fans where kind='heart' group by recipient_id
  ), scored as (
    select m.*,c.hearts,c.weekly_hearts from counts c
    join public.member_profiles m on m.id=c.recipient_id
    where m.completed and m.role='musician' and c.weekly_hearts>0
  ), ranked as (
    select *,rank() over(order by weekly_hearts desc) as position from scored
  ), limited as (select * from ranked order by position,id limit 100)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'avatar',avatar,'bio',bio,'role',role,
    'instagram',instagram,'soundcloud',soundcloud,'x',0,'y',0,'hearts',hearts,
    'weeklyHearts',weekly_hearts,'rank',position) order by position,id),'[]'::jsonb)
    into result from limited;
  return jsonb_build_object('weekStart',week_start,'weekEnd',week_start+interval '7 days','entries',result);
end $$;
revoke all on function public.musician_rankings_week(date) from public,anon;
grant execute on function public.musician_rankings_week(date) to authenticated;
commit;
