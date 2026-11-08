-- Move the bar stage away from the counter, preserving live performances and queues.
begin;
select pg_advisory_xact_lock(684109);
update public.town_stages set x=1587.5,y=235 where id=6 and name='달빛 바 라이브';
update public.town_sessions s set x=t.x,y=t.y
from public.town_performances p join public.town_stages t on t.id=p.stage_id
where s.user_id=p.user_id and t.id=6 and t.name='달빛 바 라이브';
update public.town_channels set revision=revision+1;
commit;
