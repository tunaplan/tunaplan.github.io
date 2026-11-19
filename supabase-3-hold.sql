-- n.n. 세 번째 설정: 자리 잡기(5분). 누군가 빈 자리를 눌러 잇기 시작하면 5분 동안 그 자리는 그 사람의 것.
-- (SQL Editor에 통째로 붙여 넣고 Run, 여러 번 돌려도 안전)

create table if not exists public.holds(
  id int primary key default 1 check (id = 1),
  token text,
  until timestamptz
);
alter table public.holds enable row level security;
insert into public.holds(id) values (1) on conflict do nothing;

-- 지금 누가 잇는 중인지: 끝나는 시각만 (누구인지는 없다)
create or replace function public.held()
returns timestamptz
language sql security definer set search_path = public stable as $$
  select until from holds where id = 1 and until > now();
$$;

-- 자리 잡기: 비어 있거나 내 자리면 5분 잡는다
create or replace function public.hold(k text, ptoken text)
returns json
language plpgsql security definer set search_path = public as $$
declare h holds;
begin
  if not exists(select 1 from keys where hash = encode(extensions.digest(k,'sha256'),'hex')) then
    raise exception 'no key';
  end if;
  perform pg_advisory_xact_lock(7);
  select * into h from holds where id = 1;
  if h.until > now() and h.token is distinct from ptoken then
    return json_build_object('ok', false, 'until', h.until);
  end if;
  update holds set token = ptoken, until = now() + interval '5 minutes' where id = 1;
  return json_build_object('ok', true, 'until', now() + interval '5 minutes');
end $$;

-- 놓지 않고 나가면 자리를 푼다
create or replace function public.release(ptoken text)
returns void
language sql security definer set search_path = public as $$
  update holds set token = null, until = null where id = 1 and token = ptoken;
$$;

-- 놓기: 다른 사람이 자리를 잡고 있으면 막는다. 놓으면 자리를 푼다.
create or replace function public.place3(
  k text, ptoken text, after_id bigint, pimg text, pstrip text,
  ptitle text default null, psize int default null, proll text default null,
  pstrokes jsonb default null, pphoto text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare h holds; res json;
begin
  perform pg_advisory_xact_lock(8);
  select * into h from holds where id = 1;
  if h.until > now() and h.token is distinct from ptoken then
    raise exception 'held';
  end if;
  res := public.place2(k, after_id, pimg, pstrip, ptitle, psize, proll, pstrokes, pphoto);
  update holds set token = null, until = null where id = 1;
  return res;
end $$;

revoke all on function public.held() from public;
revoke all on function public.hold(text,text) from public;
revoke all on function public.release(text) from public;
revoke all on function public.place3(text,text,bigint,text,text,text,int,text,jsonb,text) from public;
grant execute on function public.held() to anon, authenticated;
grant execute on function public.hold(text,text) to anon, authenticated;
grant execute on function public.release(text) to anon, authenticated;
grant execute on function public.place3(text,text,bigint,text,text,text,int,text,jsonb,text) to anon, authenticated;
