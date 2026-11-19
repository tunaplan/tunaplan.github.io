-- n.n. 저장소 설정 (Supabase → SQL Editor에 통째로 붙여 넣고 Run)
-- 장은 함수로만 읽고 쓴다. 표는 직접 열리지 않는다.
-- 맨 끝 장은 아래 가장자리 한 줄(strip)만 내보낸다 — 다음 장이 놓이기 전까지 전체는 아무도 못 본다.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sheets(
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  img text not null,      -- 한 장 전체 (data:image/jpeg;base64)
  strip text not null,    -- 아래 가장자리 한 줄
  hidden boolean not null default false  -- 지울 장은 true로 (표에서 직접)
);
alter table public.sheets enable row level security;

create table if not exists public.keys(hash text primary key);
alter table public.keys enable row level security;
-- 초대 열쇠 (사이트 코드에는 들어가지 않는다)
insert into public.keys values (encode(extensions.digest('여기에-열쇠','sha256'),'hex'))
  on conflict do nothing;

create or replace function public.chain()
returns table(id bigint, d text, img text)
language sql security definer set search_path = public stable as $$
  with v as (select * from sheets where not hidden),
       m as (select max(id) as mid from v)
  select v.id,
         to_char(v.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD'),
         case when v.id = m.mid then v.strip else v.img end
  from v, m order by v.id;
$$;

create or replace function public.can_place(k text)
returns boolean
language sql security definer set search_path = public stable as $$
  select exists(select 1 from keys where hash = encode(extensions.digest(k,'sha256'),'hex'));
$$;

create or replace function public.place(k text, after bigint, img text, strip text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare last bigint; nid bigint;
begin
  if not exists(select 1 from keys where hash = encode(extensions.digest(k,'sha256'),'hex')) then
    raise exception 'no key';
  end if;
  if img !~ '^data:image/jpeg;base64,' or strip !~ '^data:image/jpeg;base64,' then
    raise exception 'type';
  end if;
  if length(img) > 700000 or length(strip) > 160000 then
    raise exception 'too big';
  end if;
  perform pg_advisory_xact_lock(7);
  select max(s.id) into last from sheets s where not s.hidden;
  if last is distinct from after then
    raise exception 'moved';   -- 그새 누군가 이어 놓음
  end if;
  insert into sheets(img, strip) values (img, strip) returning id into nid;
  return nid;
end $$;

revoke all on function public.chain() from public;
revoke all on function public.can_place(text) from public;
revoke all on function public.place(text,bigint,text,text) from public;
grant execute on function public.chain() to anon, authenticated;
grant execute on function public.can_place(text) to anon, authenticated;
grant execute on function public.place(text,bigint,text,text) to anon, authenticated;
