-- Keep the outdoor stage down the riverside path, clear of the bar entrance.
begin;
select pg_advisory_xact_lock(684109);
update public.town_stages set x=1500, y=625
where id=5 and name='다리 건너 강바람 무대';
update public.town_sessions s set x=t.x, y=t.y
from public.town_performances p join public.town_stages t on t.id=p.stage_id
where s.user_id=p.user_id and t.id=5 and t.name='다리 건너 강바람 무대';
update public.town_channels set revision=revision+1;
commit;
