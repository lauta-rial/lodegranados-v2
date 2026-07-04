-- Fase 3: tickets por sesión real.
--
-- Ticket count needed for a (registration, session) pair is
-- registration.spots — NOT always 1. A cata registration with spots=3 and
-- one session needs 3 tickets for that session; a curso registration
-- (spots always 1) with N sessions needs 1 ticket per session. Both are the
-- same rule (spots tickets per session), so a single count-based top-up
-- function handles both instead of a hard unique(registration_id,
-- session_id) constraint, which would have wrongly capped multi-spot catas
-- at 1 ticket per session.

create or replace function public.backfill_tickets_for_session(p_session_id uuid, p_event_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  r record;
  needed int;
begin
  for r in select id, spots from registrations where event_id = p_event_id loop
    needed := coalesce(r.spots, 1) - (select count(*)::int from tickets where registration_id = r.id and session_id = p_session_id);
    for i in 1..needed loop
      insert into tickets (registration_id, event_id, session_id) values (r.id, p_event_id, p_session_id);
    end loop;
  end loop;
end;
$$;

create or replace function public.backfill_tickets_for_registration(p_registration_id uuid, p_event_id uuid, p_spots int)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  s record;
  needed int;
begin
  for s in select id from event_sessions where event_id = p_event_id loop
    needed := coalesce(p_spots, 1) - (select count(*)::int from tickets where registration_id = p_registration_id and session_id = s.id);
    for i in 1..needed loop
      insert into tickets (registration_id, event_id, session_id) values (p_registration_id, p_event_id, s.id);
    end loop;
  end loop;
end;
$$;

create or replace function public.trg_backfill_tickets_on_session_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform public.backfill_tickets_for_session(new.id, new.event_id);
  return new;
end;
$$;

create trigger on_event_sessions_insert_backfill_tickets
after insert on event_sessions
for each row execute function trg_backfill_tickets_on_session_insert();

create or replace function public.trg_backfill_tickets_on_registration_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform public.backfill_tickets_for_registration(new.id, new.event_id, coalesce(new.spots, 1));
  return new;
end;
$$;

create trigger on_registrations_insert_backfill_tickets
after insert on registrations
for each row execute function trg_backfill_tickets_on_registration_insert();

-- Every new event gets a first session automatically (mirrors what the
-- Phase 1 one-time backfill did for pre-existing rows) — without this,
-- events created after this migration would have zero sessions and thus
-- zero tickets ever generated.
create or replace function public.trg_create_first_session()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  insert into event_sessions (event_id, session_number, date, time, location)
  values (new.id, 1, new.date, new.time, new.location);
  return new;
end;
$$;

create trigger on_events_insert_create_first_session
after insert on events
for each row execute function trg_create_first_session();

-- A cata's single session mirrors the event's own date/time/location
-- exactly (that's the only place those ever get edited from, via
-- EventModal) — keep session_number=1 in sync on edit. Cursos are excluded:
-- once a course has multiple sessions, event.date is just the nominal
-- "start date" shown on the listing, not tied to any one specific class.
create or replace function public.trg_sync_cata_session()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.kind = 'cata' then
    update event_sessions
    set date = new.date, time = new.time, location = new.location
    where event_id = new.id and session_number = 1;
  end if;
  return new;
end;
$$;

create trigger on_events_update_sync_cata_session
after update on events
for each row
when (old.date is distinct from new.date or old.time is distinct from new.time or old.location is distinct from new.location)
execute function trg_sync_cata_session();

-- Don't let a session with already-validated tickets be deleted — that
-- would silently erase real attendance history (e.g. an admin cleaning up
-- a typo'd extra session after the class already happened and was scanned).
create or replace function public.trg_prevent_delete_validated_session()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if exists (select 1 from tickets where session_id = old.id and validated_at is not null) then
    raise exception 'No se puede eliminar una sesión con entradas ya validadas';
  end if;
  return old;
end;
$$;

create trigger on_event_sessions_delete_guard
before delete on event_sessions
for each row execute function trg_prevent_delete_validated_session();

-- Retroactive top-up: registrations that existed before these triggers
-- (e.g. the one migrated enrollment from Phase 2) get their tickets
-- generated now. Safe/idempotent for rows that already have the right
-- ticket count (existing catas) — the loop bound is <= 0 and does nothing.
select public.backfill_tickets_for_registration(id, event_id, coalesce(spots, 1)) from registrations;
