begin;
-- Expose only completed public profiles, never auth account details or raw fan rows.
create or replace function public.profile_fan_people(target uuid, fan_kind text, page_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if fan_kind is null or fan_kind not in ('follow','heart') or page_offset is null or page_offset < 0 then
    raise exception 'INVALID_ARGUMENT';
  end if;
  if not exists(select 1 from public.member_profiles where id=target and completed) then
    raise exception 'PROFILE_REQUIRED';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'avatar',p.avatar,'bio',p.bio,
    'role',p.role,'instagram',p.instagram,'soundcloud',p.soundcloud,'x',0,'y',0)
    order by p.created_at desc,p.id),'[]'::jsonb)
    from (select m.id,m.avatar,m.bio,m.role,m.instagram,m.soundcloud,f.created_at from public.profile_fans f
      join public.member_profiles m on m.id=f.sender_id
      where f.recipient_id=target and f.kind=fan_kind and m.completed
      order by f.created_at desc,m.id limit 50 offset page_offset) p);
end $$;
revoke all on function public.profile_fan_people(uuid,text,integer) from public,anon;
grant execute on function public.profile_fan_people(uuid,text,integer) to authenticated;
commit;
