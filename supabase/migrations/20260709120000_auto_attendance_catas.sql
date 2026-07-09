-- Attendance for catas is derived automatically, not toggled by hand:
-- a validated ticket marks its registration present (SÍ); closing the cata's
-- session marks the remaining, unscanned registrations absent (NO). Until
-- either happens, attended stays null and the UI shows '-'.

create or replace function public.mark_registration_present_on_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.validated_at is not null and old.validated_at is null then
    update registrations
      set attended = true, updated_at = now()
      where id = new.registration_id and attended is distinct from true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_present_on_validate on public.tickets;
create trigger trg_mark_present_on_validate
  after update of validated_at on public.tickets
  for each row execute function public.mark_registration_present_on_validate();

create or replace function public.mark_absent_on_session_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ended_at is not null and old.ended_at is null then
    update registrations r
      set attended = false, updated_at = now()
      from events e
      where r.event_id = new.event_id
        and e.id = r.event_id
        and e.kind = 'cata'
        and r.attended is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_absent_on_session_end on public.event_sessions;
create trigger trg_mark_absent_on_session_end
  after update of ended_at on public.event_sessions
  for each row execute function public.mark_absent_on_session_end();
