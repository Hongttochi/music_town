-- Apply to the existing multiplayer schema. Preserves town_action and its activity wrapper.
begin;
create or replace function public.bar_is_open(at_time timestamptz default now()) returns boolean
language sql stable set search_path='' as $$
  select extract(hour from at_time at time zone 'Asia/Seoul') >= 19
      or extract(hour from at_time at time zone 'Asia/Seoul') < 6;
$$;
revoke all on function public.bar_is_open(timestamptz) from public,anon,authenticated;

do $$ begin
  if exists(select 1 from public.town_stages where id=6 and name<>'달빛 바 라이브') then
    raise exception 'STAGE_6_ALREADY_IN_USE';
  end if;
end $$;
insert into public.town_stages(id,name,x,y) values(6,'달빛 바 라이브',1550,235)
on conflict(id) do update set name=excluded.name,x=excluded.x,y=excluded.y;

create or replace function public.check_bar_stage_hours() returns trigger
language plpgsql security definer set search_path='' as $$
declare local_day date := (now() at time zone 'Asia/Seoul')::date; closes_at timestamptz;
begin
  if new.stage_id=6 then
    if not public.bar_is_open() then raise exception 'BAR_CLOSED'; end if;
    if tg_table_name='town_performances' then
      if extract(hour from now() at time zone 'Asia/Seoul')>=19 then local_day:=local_day+1; end if;
      closes_at := (local_day + time '06:00') at time zone 'Asia/Seoul';
      new.ends_at := least(new.ends_at,closes_at);
    end if;
  end if;
  return new;
end $$;
revoke all on function public.check_bar_stage_hours() from public,anon,authenticated;
drop trigger if exists bar_queue_hours on public.town_queue;
create trigger bar_queue_hours before insert or update on public.town_queue
for each row execute function public.check_bar_stage_hours();
drop trigger if exists bar_performance_hours on public.town_performances;
create trigger bar_performance_hours before insert or update on public.town_performances
for each row execute function public.check_bar_stage_hours();

-- Same serialized maintenance contract as the original function; close the bar before FIFO promotion.
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
    update public.town_sessions set x=1500,y=380 where x between 1405 and 1595 and y between 180 and 345;
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
