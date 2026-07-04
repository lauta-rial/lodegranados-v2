-- Postgres's planner treats a bare auth.uid()/auth.jwt() call in an RLS
-- policy as a per-row volatile function call, re-evaluating it on every row
-- instead of once per query. Wrapping it as `(select auth.uid())` makes the
-- planner recognize it as a stable subquery it can evaluate once and reuse
-- — same result, no behavior change, just avoids paying for it N times on
-- a filtered scan. Flagged by the Supabase performance advisor
-- (auth_rls_initplan) across all 20 policies below. Every WHERE/CHECK
-- clause here is byte-for-byte the same logic as before, only the auth.*()
-- calls are now wrapped.

alter policy "Admin manage branches" on public.branches
  using (((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text = 'superadmin');

alter policy "Admin manage branch courses" on public.courses
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
      or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (branch_id)::text));

alter policy "Admin manage enrollments" on public.enrollments
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "User insert own enrollments" on public.enrollments
  with check (user_id = (select auth.uid()));

alter policy "User read own enrollments" on public.enrollments
  using (user_id = (select auth.uid()));

alter policy "Admin manage event hosts" on public.event_hosts
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
      or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (event_branch_id(event_id))::text))
  with check ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
      or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (event_branch_id(event_id))::text));

alter policy "Host reads own assignments" on public.event_hosts
  using (user_id = (select auth.uid()));

alter policy "Admin manage branch event sessions" on public.event_sessions
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and exists (select 1 from events e where e.id = event_sessions.event_id
      and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
        or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (e.branch_id)::text)))
  with check ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and exists (select 1 from events e where e.id = event_sessions.event_id
      and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
        or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (e.branch_id)::text)));

alter policy "Host select assigned sessions" on public.event_sessions
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = (select auth.uid())));

alter policy "Host update assigned sessions" on public.event_sessions
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = (select auth.uid())))
  with check ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = (select auth.uid())));

alter policy "Admin manage branch events" on public.events
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin'])
    and ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) is null
      or (((select auth.jwt()) -> 'app_metadata'::text) ->> 'branch_id'::text) = (branch_id)::text));

alter policy "Host read assigned events" on public.events
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host' and is_host_of_event(id));

alter policy "Admin manage inquiries" on public.inquiries
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "Admin manage newsletter" on public.newsletter
  using (((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text = 'superadmin');

alter policy "Admin manage plans" on public.plans
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "Admin manage registrations" on public.registrations
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "User insert own registrations" on public.registrations
  with check (user_id = (select auth.uid()));

alter policy "User read own registrations" on public.registrations
  using (user_id = (select auth.uid()));

alter policy "Admin manage subscriptions" on public.subscriptions
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "User read own subscriptions" on public.subscriptions
  using (user_id = (select auth.uid()));

alter policy "Admin manage tickets" on public.tickets
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']))
  with check ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = any (array['admin','superadmin']));

alter policy "Host select assigned tickets" on public.tickets
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = (select auth.uid())));

alter policy "Host validate assigned tickets" on public.tickets
  using ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = (select auth.uid())))
  with check ((((select auth.jwt()) -> 'app_metadata'::text) ->> 'role'::text) = 'host'
    and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = (select auth.uid())));

alter policy "users can view own tickets" on public.tickets
  using (exists (select 1 from registrations r where r.id = tickets.registration_id and r.user_id = (select auth.uid())));
