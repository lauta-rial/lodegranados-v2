-- Real gap found via e2e testing (2026-07-04): AdminEventLive.tsx's roster
-- query embeds registrations(name, email, spots) alongside tickets — under
-- RLS, an embedded/joined table is subject to its OWN policies independent
-- of the top-level table's. Hosts had a SELECT policy on tickets and
-- event_sessions but never one on registrations, so this embed silently
-- returned null for every ticket whose row a host viewed, and the UI's
-- "fall back to the registration's own name/email when there's no
-- companion attendee_email" case rendered "—" instead of real info — the
-- one thing a door host most needs for tickets nobody bothered to fill a
-- companion email in for. Same pattern as "Host select assigned tickets".
create policy "Host select assigned registrations"
on public.registrations
for select
to public
using (
  (((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
  and exists (
    select 1 from event_hosts eh
    where eh.event_id = registrations.event_id
    and eh.user_id = (select auth.uid())
  )
);
