-- event_sessions had RLS enabled (default-on for new tables) but zero
-- policies since it was created in Phase 1 — that silently blocked ALL
-- client-side access (anon/authenticated), even though it never surfaced
-- until Phase 3 started actually reading/writing it from the browser
-- (Phase 1/2 only ever touched it via the service-role key in migrations).
create policy "Admin manage branch event sessions" on event_sessions for all
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_sessions.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_sessions.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
);

-- Public needs to read sessions of active events too — e.g. a ticket's own
-- session data, or a future public display of per-class dates.
create policy "Public read sessions of active events" on event_sessions for select
using (exists (select 1 from events e where e.id = event_sessions.event_id and e.active = true));
