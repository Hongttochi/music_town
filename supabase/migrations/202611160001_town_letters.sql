begin;

create table if not exists public.town_letters (
  id uuid primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 80),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists town_letters_inbox on public.town_letters(recipient_id, created_at desc, id);
create index if not exists town_letters_sent on public.town_letters(sender_id, created_at desc, id);
alter table public.town_letters enable row level security;
revoke all on public.town_letters from public, anon, authenticated;

create or replace function public.send_town_letter(recipient uuid, subject text, body text, request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); existing public.town_letters;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if request_id is null or recipient is null or recipient=uid then raise exception 'INVALID_RECIPIENT'; end if;
  if subject is null or body is null or char_length(btrim(subject)) not between 1 and 80
    or char_length(btrim(body)) not between 1 and 2000 then raise exception 'INVALID_LETTER'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,611160001));
  select * into existing from public.town_letters where id=request_id;
  if found then
    if existing.sender_id=uid and existing.recipient_id=recipient and existing.subject=btrim(subject) and existing.body=btrim(body) then
      return existing.id;
    end if;
    raise exception 'INVALID_REQUEST';
  end if;
  if not exists(select 1 from public.member_profiles where id=uid and completed)
    or not exists(select 1 from public.member_profiles where id=recipient and completed) then
    raise exception 'PROFILE_REQUIRED';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || recipient::text || 'follow',0));
  if not exists(select 1 from public.profile_fans where sender_id=uid and recipient_id=recipient and kind='follow') then
    raise exception 'FOLLOW_REQUIRED';
  end if;
  if (select count(*) from public.town_letters where sender_id=uid and created_at>now()-interval '24 hours')>=50 then
    raise exception 'LETTER_LIMIT';
  end if;
  insert into public.town_letters(id,sender_id,recipient_id,subject,body)
    values(request_id,uid,recipient,btrim(subject),btrim(body));
  return request_id;
end $$;

create or replace function public.my_town_letters(box text default 'inbox', page_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if box is null or box not in ('inbox','sent') or page_offset is null or page_offset<0 then raise exception 'INVALID_ARGUMENT'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id',l.id,'senderId',l.sender_id,'recipientId',l.recipient_id,
    'senderName',coalesce(s.avatar->>'name','탈퇴한 주민'),
    'recipientName',coalesce(r.avatar->>'name','탈퇴한 주민'),
    'subject',l.subject,'body',l.body,'createdAt',l.created_at,'readAt',l.read_at
  ) order by l.created_at desc,l.id),'[]'::jsonb)
  from (select * from public.town_letters
    where (box='inbox' and recipient_id=uid) or (box='sent' and sender_id=uid)
    order by created_at desc,id limit 30 offset page_offset) l
  left join public.member_profiles s on s.id=l.sender_id
  left join public.member_profiles r on r.id=l.recipient_id);
end $$;

create or replace function public.read_town_letter(letter_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare result timestamptz;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.town_letters set read_at=coalesce(read_at,now())
    where id=letter_id and recipient_id=auth.uid() returning read_at into result;
  if not found then raise exception 'LETTER_NOT_FOUND'; end if;
  return result;
end $$;

revoke all on function public.send_town_letter(uuid,text,text,uuid), public.my_town_letters(text,integer), public.read_town_letter(uuid) from public,anon;
grant execute on function public.send_town_letter(uuid,text,text,uuid), public.my_town_letters(text,integer), public.read_town_letter(uuid) to authenticated;
commit;
