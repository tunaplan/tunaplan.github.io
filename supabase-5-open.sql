-- n.n. 다섯 번째 설정: 장 수 제한 없음 · 놓는 사람이 "여기서 마치기" · 방금 놓은 내 장 되돌리기
-- (SQL Editor에 통째로 붙여 넣고 Run, 여러 번 돌려도 안전)

alter table public.rolls alter column size drop not null;
alter table public.rolls drop constraint if exists rolls_size_check;
alter table public.rolls add constraint rolls_size_check check (size is null or size >= 1);
alter table public.rolls alter column form set default 'line';
alter table public.sheets add column if not exists owner text;   -- 놓은 폰의 표식(되돌리기용, 이름 아님)

-- 놓기: 진행 중인 폭이 없으면 새 폭(형식은 첫 사람이). pend면 이 장으로 폭을 닫고 이름을 붙인다.
create or replace function public.place6(
  k text, ptoken text, after_id bigint, pimg text, pstrip text,
  ptitle text default null, pform text default null, pend boolean default false, proll text default null,
  pstrokes jsonb default null, pphoto text default null, powner text default null)
returns json
language plpgsql security definer set search_path = public as $$
declare h holds; rid bigint; lastid bigint; nid bigint; cnt int; isclosed boolean := false;
begin
  if not exists(select 1 from keys where hash = encode(extensions.digest(k,'sha256'),'hex')) then raise exception 'no key'; end if;
  if pimg !~ '^data:image/jpeg;base64,' or pstrip !~ '^data:image/jpeg;base64,' then raise exception 'type'; end if;
  if length(pimg) > 700000 or length(pstrip) > 160000 then raise exception 'too big'; end if;
  if pphoto is not null and (pphoto !~ '^data:image/jpeg;base64,' or length(pphoto) > 1400000) then raise exception 'photo'; end if;
  if pstrokes is not null and length(pstrokes::text) > 600000 then raise exception 'strokes'; end if;
  perform pg_advisory_xact_lock(7);
  select * into h from holds where id = 1;
  if h.until > now() and h.token is distinct from ptoken then raise exception 'held'; end if;
  select r.id into rid from rolls r where r.closed_at is null order by r.id desc limit 1;
  if rid is null then
    if after_id is not null then raise exception 'moved'; end if;
    insert into rolls(size, form) values (null, case when pform = 'snake' then 'snake' else 'line' end) returning id into rid;
  else
    select max(s.id) into lastid from sheets s where s.roll_id = rid and not s.hidden;
    if lastid is distinct from after_id then raise exception 'moved'; end if;
    if lastid is null then   -- 비어 있는 폭(되돌리기로 비워진)이면 첫 사람이 형식을 다시 정한다
      update rolls set form = case when pform = 'snake' then 'snake' else 'line' end where id = rid;
    end if;
  end if;
  insert into sheets(img, strip, roll_id, title, strokes, photo, owner)
    values (pimg, pstrip, rid, nullif(left(trim(ptitle),40),''), pstrokes, pphoto, powner)
    returning id into nid;
  if pend then
    select count(*) into cnt from sheets s where s.roll_id = rid and not s.hidden;
    update rolls set closed_at = now(), size = cnt, title = nullif(left(trim(proll),40),'') where id = rid;
    isclosed := true;
  end if;
  update holds set token = null, until = null where id = 1;
  return json_build_object('id', nid, 'closed', isclosed);
end $$;

-- 되돌리기: 방금 놓은 내 장을, 아무도 잇기 전·폭이 닫히기 전에만 거둔다
create or replace function public.undo(pid bigint, powner text)
returns text
language plpgsql security definer set search_path = public as $$
declare s sheets; lastid bigint; open_id bigint;
begin
  perform pg_advisory_xact_lock(7);
  select * into s from sheets where id = pid;
  if not found then raise exception 'none'; end if;
  if s.owner is null or s.owner is distinct from powner then raise exception 'not yours'; end if;
  select id into open_id from rolls where id = s.roll_id and closed_at is null;
  if open_id is null then raise exception 'closed'; end if;
  select max(id) into lastid from sheets where roll_id = s.roll_id and not hidden;
  if lastid <> pid then raise exception 'continued'; end if;
  delete from sheets where id = pid;   -- 폭은 남겨 둔다(번호가 비지 않게). 비면 다음 첫 장이 형식을 정한다
  return 'ok';
end $$;

revoke all on function public.place6(text,text,bigint,text,text,text,text,boolean,text,jsonb,text,text) from public;
revoke all on function public.undo(bigint,text) from public;
grant execute on function public.place6(text,text,bigint,text,text,text,text,boolean,text,jsonb,text,text) to anon, authenticated;
grant execute on function public.undo(bigint,text) to anon, authenticated;
