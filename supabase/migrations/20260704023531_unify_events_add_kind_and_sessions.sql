-- Fase 1, Migración A: aditiva, inerte para la app hasta el deploy de código.
alter table events add column kind text not null default 'cata' check (kind in ('cata','curso'));

create table event_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  session_number int not null,
  date date,
  time time,
  location text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now(),
  unique(event_id, session_number)
);

-- Backfill: 1 sesión por evento existente (todas son catas en este punto; el
-- backfill de los cursos migrados en la Migración B corre acotado a las filas
-- nuevas, así esta misma sentencia es idempotente).
insert into event_sessions (event_id, session_number, date, time, location, started_at, ended_at)
select id, 1, date, time, location, started_at, ended_at
from events
where id not in (select event_id from event_sessions);

alter table tickets add column session_id uuid references event_sessions(id);

update tickets t
set session_id = (select es.id from event_sessions es where es.event_id = t.event_id)
where t.session_id is null;
