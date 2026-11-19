-- n.n. 네 번째 설정: 폭의 형식 + 받음(다음 장이 놓인 시각) (두 줄 굽이 / 한 줄). 첫 장을 놓는 사람이 장 수와 함께 고른다(기본 두 줄).
-- 두 줄: 01→02 오른쪽, 02→03 아래, 03→04 왼쪽, 04→05 아래 … 모든 이음매가 실제로 맞닿은 가장자리.
-- (SQL Editor에 통째로 붙여 넣고 Run, 여러 번 돌려도 안전)

alter table public.rolls add column if not exists form text not null default 'snake';
alter table public.rolls drop constraint if exists rolls_form_check;
alter table public.rolls add constraint rolls_form_check check (form in ('snake','line'));
-- 이미 있던 폭은 한 줄로 만들어졌다
update public.rolls set form = 'line' where id in (select distinct roll_id from public.sheets where roll_id is not null)
  and form = 'snake' and created_at < now() - interval '1 minute';

create or replace function public.board()
returns json
language sql security definer set search_path = public stable as $$
  with s as (
    select s.*, row_number() over (partition by s.roll_id order by s.id) as n,
           count(*) over (partition by s.roll_id) as cnt,
           lead(s.created_at) over (partition by s.roll_id order by s.id) as got_at
    from sheets s where not s.hidden
  ),
  o as (select * from rolls where closed_at is null order by id desc limit 1)
  select json_build_object(
    'open', (select json_build_object('id', o.id, 'size', o.size, 'form', o.form,
        'sheets', coalesce((select json_agg(json_build_object(
            'id', s.id, 'n', s.n, 'title', s.title,
            'at', to_char(s.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'got', to_char(s.got_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'img', case when s.n = s.cnt then s.strip else s.img end) order by s.id)
          from s where s.roll_id = o.id), '[]'::json))
      from o),
    'closed', coalesce((select json_agg(json_build_object('id', r.id, 'size', r.size, 'form', r.form, 'title', r.title,
        'from', to_char(r.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD'),
        'to', to_char(r.closed_at at time zone 'Asia/Seoul', 'YYYY.MM.DD'),
        'sheets', (select json_agg(json_build_object(
            'id', s.id, 'n', s.n, 'title', s.title,
            'at', to_char(s.created_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'got', to_char(s.got_at at time zone 'Asia/Seoul', 'YYYY.MM.DD HH24:MI'),
            'img', s.img, 'strip', s.strip) order by s.id) from s where s.roll_id = r.id)) order by r.id desc)
      from rolls r where r.closed_at is not null), '[]'::json)
  );
$$;

-- 놓기(형식 포함): 새 폭의 첫 장이면 형식을 정한다
create or replace function public.place4(
  k text, ptoken text, after_id bigint, pimg text, pstrip text,
  ptitle text default null, psize int default null, pform text default null, proll text default null,
  pstrokes jsonb default null, pphoto text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare res json; rid bigint; n int;
begin
  res := public.place3(k, ptoken, after_id, pimg, pstrip, ptitle, psize, proll, pstrokes, pphoto);
  select roll_id into rid from sheets where id = (res->>'id')::bigint;
  select count(*) into n from sheets where roll_id = rid;
  if n = 1 then
    update rolls set form = case when pform = 'line' then 'line' else 'snake' end where id = rid;
  end if;
  return res;
end $$;

revoke all on function public.board() from public;
revoke all on function public.place4(text,text,bigint,text,text,text,int,text,text,jsonb,text) from public;
grant execute on function public.board() to anon, authenticated;
grant execute on function public.place4(text,text,bigint,text,text,text,int,text,text,jsonb,text) to anon, authenticated;
