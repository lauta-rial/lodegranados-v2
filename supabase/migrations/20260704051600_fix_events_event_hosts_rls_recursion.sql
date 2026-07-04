-- "Host read assigned events" (on events) queries event_hosts, and
-- "Admin manage event hosts" (on event_hosts) queries events — each
-- table's RLS policy queries the other table, and Postgres re-evaluates
-- RLS on every query, including inside another policy's subquery. That's
-- a genuine infinite loop (confirmed: 42P17 "infinite recursion detected in
-- policy for relation events", broke ALL reads of events for every role,
-- not just hosts, since RLS re-evaluation happens regardless of which
-- policy branch ultimately matches).
--
-- Fix: route both cross-table checks through SECURITY DEFINER functions.
-- These are owned by the migration role (effectively postgres), which owns
-- both tables — Postgres RLS doesn't apply to a table's owner by default,
-- so the inner query never re-triggers RLS and the cycle breaks.
create or replace function public.is_host_of_event(p_event_id uuid)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from event_hosts eh where eh.event_id = p_event_id and eh.user_id = auth.uid()
  );
$$;

create or replace function public.event_branch_id(p_event_id uuid)
returns uuid
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select branch_id from events where id = p_event_id;
$$;

drop policy "Host read assigned events" on events;
create policy "Host read assigned events" on events for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and is_host_of_event(events.id)
);

drop policy "Admin manage event hosts" on event_hosts;
create policy "Admin manage event hosts" on event_hosts for all
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = event_branch_id(event_hosts.event_id)::text)
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = event_branch_id(event_hosts.event_id)::text)
);
