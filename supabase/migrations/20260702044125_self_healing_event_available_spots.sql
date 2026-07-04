-- available_spots was a manually-decremented counter that could drift from
-- reality (e.g. a bug, a bad manual fix, a retried request). Make it derived
-- instead: any change to registrations recalculates it from the actual data,
-- so it can never show a number that isn't backed by real rows.

create or replace function public.recalculate_event_spots(p_event_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update events
  set available_spots = greatest(
    0,
    total_spots - coalesce((select sum(spots) from registrations where event_id = p_event_id), 0)
  )
  where id = p_event_id;
$$;

create or replace function public.trg_recalculate_event_spots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_event_spots(old.event_id);
    return old;
  end if;
  perform public.recalculate_event_spots(new.event_id);
  if tg_op = 'UPDATE' and old.event_id is distinct from new.event_id then
    perform public.recalculate_event_spots(old.event_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_registrations_change_recalc_spots on registrations;
create trigger on_registrations_change_recalc_spots
  after insert or update or delete on registrations
  for each row
  execute function public.trg_recalculate_event_spots();

-- Bring every existing event in line right now.
select public.recalculate_event_spots(id) from events;
