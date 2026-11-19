-- n.n. 두 번째 설정: 폭(roll)과 기록, 책을 위한 자동 저장 (SQL Editor에 통째로 붙여 넣고 Run, 여러 번 돌려도 안전)
-- 규칙: 앞 장의 끝만 보고 잇는다 / 정해진 장 수가 차면 모두 펼쳐진다 / 마지막 사람이 폭의 이름을 짓는다.
-- 장 수는 첫 장을 놓는 사람이 2·4·6·8·10 중 고른다(기본 6). 닫힌 폭은 누구나 본다.
-- 책(엽서 크기, 흑백)을 위해: 그림은 획(strokes: 순서·좌표·시간), 사진은 원본(긴 변 1600px)을 따로 저장. 화면엔 내보내지 않는다.

create table if not exists public.rolls(
  id bigint generated always as identity primary key,
  size int not null,
  title text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.rolls enable row level security;
alter table public.rolls drop constraint if exists rolls_size_check;
alter table public.rolls add constraint rolls_size_check check (size in (2,4,6,8,10));

alter table public.sheets add column if not exists roll_id bigint references public.rolls(id);
alter table public.sheets add column if not exists title text;
alter table public.sheets add column if not exists strokes jsonb;   -- [{t0, p:[[x,y,ms],...]}] x,y는 0~1
alter table public.sheets add column if not exists photo text;      -- 사진 원본 (data:image/jpeg;base64)

-- 이미 놓인 장이 있으면 첫 폭으로 묶는다
do $$ declare rid bigint; n int; begin
  select count(*) into n from public.sheets where roll_id is null;
  if n > 0 then
    insert into public.rolls(size) values (case when n<=4 then 4 when n<=6 then 6 when n<=8 then 8 else 10 end) returning id into rid;
    update public.sheets set roll_id = rid where roll_id is null;
  end if;
end $$;

create or replace function public.board()
returns json
language sql security definer set search_path = public stable as $$
  with s as (
    select s.*, row_number() over (partition by s.roll_id order by s.id) as n,
           count(*) over (partition by s.roll_id) as cnt
    from sheets s where not s.hidden
  ),
  o as (select * from rolls where closed_at is null order by id desc limit 1)
  select json_build_object(
    'open', (select json_build_object('id', o.id, 'size', o.size,
        'sheets', coalesce((select json_agg(json_build_object(
            'id', s.id, 'n', s.n, 'title', s.title,
            'at', to_char(s.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'img', case when s.n = s.cnt then s.strip else s.img end) order by s.id)
          from s where s.roll_id = o.id), '[]'::json))
      from o),
    'closed', coalesce((select json_agg(json_build_object('id', r.id, 'size', r.size, 'title', r.title,
        'from', to_char(r.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD'),
        'to', to_char(r.closed_at at time zone 'Asia/Seoul', 'YYYY.MM.DD'),
        'sheets', (select json_agg(json_build_object(
            'id', s.id, 'n', s.n, 'title', s.title,
            'at', to_char(s.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'img', s.img) order by s.id) from s where s.roll_id = r.id)) order by r.id desc)
      from rolls r where r.closed_at is not null), '[]'::json)
  );
$$;

create or replace function public.place2(
  k text, after_id bigint, pimg text, pstrip text,
  ptitle text default null, psize int default null, proll text default null,
  pstrokes jsonb default null, pphoto text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare rid bigint; rsize int; lastid bigint; cnt int; nid bigint; isclosed boolean := false;
begin
  if not exists(select 1 from keys where hash = encode(extensions.digest(k,'sha256'),'hex')) then
    raise exception 'no key';
  end if;
  if pimg !~ '^data:image/jpeg;base64,' or pstrip !~ '^data:image/jpeg;base64,' then raise exception 'type'; end if;
  if length(pimg) > 700000 or length(pstrip) > 160000 then raise exception 'too big'; end if;
  if pphoto is not null and (pphoto !~ '^data:image/jpeg;base64,' or length(pphoto) > 1400000) then raise exception 'photo'; end if;
  if pstrokes is not null and length(pstrokes::text) > 600000 then raise exception 'strokes'; end if;
  perform pg_advisory_xact_lock(7);
  select r.id, r.size into rid, rsize from rolls r where r.closed_at is null order by r.id desc limit 1;
  if rid is null then
    rsize := coalesce(psize, 6);
    if rsize not in (2,4,6,8,10) then raise exception 'size'; end if;
    if after_id is not null then raise exception 'moved'; end if;
    insert into rolls(size) values (rsize) returning id into rid;
  else
    select max(s.id) into lastid from sheets s where s.roll_id = rid and not s.hidden;
    if lastid is distinct from after_id then raise exception 'moved'; end if;
  end if;
  insert into sheets(img, strip, roll_id, title, strokes, photo)
    values (pimg, pstrip, rid, nullif(left(trim(ptitle),40),''), pstrokes, pphoto)
    returning id into nid;
  select count(*) into cnt from sheets s where s.roll_id = rid and not s.hidden;
  if cnt >= rsize then
    update rolls set closed_at = now(), title = nullif(left(trim(proll),40),'') where id = rid;
    isclosed := true;
  end if;
  return json_build_object('id', nid, 'closed', isclosed);
end $$;

revoke all on function public.board() from public;
revoke all on function public.place2(text,bigint,text,text,text,int,text,jsonb,text) from public;
grant execute on function public.board() to anon, authenticated;
grant execute on function public.place2(text,bigint,text,text,text,int,text,jsonb,text) to anon, authenticated;
