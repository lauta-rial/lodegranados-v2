-- Fase 4: rol sommelier con acceso limitado a los eventos que se le asignen
-- (no branch-scoped como admin — event-scoped vía esta tabla de unión).
create table event_sommeliers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(event_id, user_id)
);

alter table event_sommeliers enable row level security;

-- Admins gestionan asignaciones, scoped por sucursal como el resto de las
-- tablas admin-managed.
create policy "Admin manage event sommeliers" on event_sommeliers for all
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_sommeliers.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_sommeliers.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
);

-- A sommelier reads their own assignments (so the frontend can list "mis eventos").
create policy "Sommelier reads own assignments" on event_sommeliers for select
using (user_id = auth.uid());

-- Sommelier access to tickets/sessions is intentionally minimal: SELECT +
-- UPDATE only (scan + start/end their assigned session's lifecycle) — never
-- INSERT/DELETE. Kept as separate policies rather than broadening the
-- existing admin ALL policy, so a sommelier account can never do more than
-- scanning requires.
create policy "Sommelier select assigned tickets" on tickets for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = tickets.event_id and es.user_id = auth.uid())
);

create policy "Sommelier validate assigned tickets" on tickets for update
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = tickets.event_id and es.user_id = auth.uid())
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = tickets.event_id and es.user_id = auth.uid())
);

create policy "Sommelier select assigned sessions" on event_sessions for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = event_sessions.event_id and es.user_id = auth.uid())
);

create policy "Sommelier update assigned sessions" on event_sessions for update
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = event_sessions.event_id and es.user_id = auth.uid())
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = event_sessions.event_id and es.user_id = auth.uid())
);

-- A sommelier also needs to know the event's own title/date/location for
-- the live page header/summary card — read-only, same event-scoping as
-- above.
create policy "Sommelier read assigned events" on events for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'sommelier'
  and exists (select 1 from event_sommeliers es where es.event_id = events.id and es.user_id = auth.uid())
);
