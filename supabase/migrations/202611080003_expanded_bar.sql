-- Run after 202611080001_bar_stage.sql. Keep the expanded room clear at closing.
begin;
create or replace function public.town_advance() returns void
language plpgsql security definer set search_path='' as $$
declare q record;
begin
  delete from public.town_sessions where last_seen < now()-interval '45 seconds';
  if not public.bar_is_open() then
    update public.town_channels set revision=revision+1 where id in
      (select channel_id from public.town_performances where stage_id=6 union select channel_id from public.town_queue where stage_id=6);
    delete from public.town_queue where stage_id=6;
    delete from public.town_performances where stage_id=6;
    update public.town_sessions set x=1500,y=517.5 where x between 1355 and 1645 and y between 167.5 and 407.5;
  end if;
  delete from public.town_performances p where p.ends_at<=now()
    or not exists(select 1 from public.member_profiles m where m.id=p.user_id and m.role='musician');
  delete from public.town_queue pending where not exists
    (select 1 from public.member_profiles m where m.id=pending.user_id and m.role='musician');
  for q in select distinct on (w.channel_id,w.stage_id) w.* from public.town_queue w
    where not exists(select 1 from public.town_performances p where p.channel_id=w.channel_id and p.stage_id=w.stage_id)
    order by w.channel_id,w.stage_id,w.id
  loop
    insert into public.town_performances(channel_id,stage_id,user_id) values(q.channel_id,q.stage_id,q.user_id);
    delete from public.town_queue where id=q.id;
    update public.town_sessions s set x=t.x,y=t.y from public.town_stages t where s.user_id=q.user_id and t.id=q.stage_id;
    update public.town_channels set revision=revision+1 where id=q.channel_id;
  end loop;
end $$;
revoke all on function public.town_advance() from public,anon,authenticated;
update public.town_channels set revision=revision+1;
commit;
