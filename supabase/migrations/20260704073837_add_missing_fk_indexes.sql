-- 7 FKs with no supporting index (found via pg_constraint/pg_index audit) —
-- every one of these is queried by its FK column somewhere in the app
-- (branch-scoped admin views, ticket validation lookups, host assignment
-- checks), so each was doing a sequential scan instead of an index lookup.
create index if not exists idx_plans_branch_id on public.plans(branch_id);
create index if not exists idx_subscriptions_plan_id on public.subscriptions(plan_id);
create index if not exists idx_subscriptions_branch_id on public.subscriptions(branch_id);
create index if not exists idx_inquiries_branch_id on public.inquiries(branch_id);
create index if not exists idx_tickets_validated_by on public.tickets(validated_by);
create index if not exists idx_tickets_session_id on public.tickets(session_id);
create index if not exists idx_event_hosts_user_id on public.event_hosts(user_id);
