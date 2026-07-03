-- courses never had a total_spots column, so available_spots had no ground
-- truth to be recalculated against (unlike events). Add it, backfilled from
-- current available_spots + actual enrolled count so displayed capacity
-- doesn't change, then apply the same self-healing trigger pattern used for
-- events (see migration self_healing_event_available_spots).

alter table public.courses add column if not exists total_spots integer;

update public.courses c
set total_spots = c.available_spots + (
  select count(*) from public.enrollments e
  where e.course_id = c.id and e.status = 'enrolled'
)
where c.total_spots is null;

alter table public.courses alter column total_spots set not null;
alter table public.courses alter column total_spots set default 0;

create or replace function public.recalculate_course_spots(p_course_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update courses
  set available_spots = greatest(
    0,
    total_spots - coalesce((select count(*) from enrollments where course_id = p_course_id and status = 'enrolled'), 0)
  )
  where id = p_course_id;
$$;

create or replace function public.trg_recalculate_course_spots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_course_spots(old.course_id);
    return old;
  end if;
  perform public.recalculate_course_spots(new.course_id);
  if tg_op = 'UPDATE' and old.course_id is distinct from new.course_id then
    perform public.recalculate_course_spots(old.course_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_enrollments_change_recalc_spots on enrollments;
create trigger on_enrollments_change_recalc_spots
  after insert or update or delete on enrollments
  for each row
  execute function public.trg_recalculate_course_spots();

-- Bring every existing course in line at the time this migration runs.
select public.recalculate_course_spots(id) from courses;
