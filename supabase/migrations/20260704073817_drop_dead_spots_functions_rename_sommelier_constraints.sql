-- decrement_event_spots/decrement_course_spots predate the self-healing
-- spots triggers (recalculate_event_spots, applied by
-- self_healing_event_available_spots / add_total_spots_and_self_healing_course_spots)
-- which now derive available_spots from registrations on every insert/update/
-- delete. Nothing in the app calls these two anymore (confirmed: no rpc()
-- call site in src/ or supabase/functions/) — dead code left over from
-- before the trigger-based approach.
drop function if exists public.decrement_event_spots(uuid, integer);
drop function if exists public.decrement_course_spots(uuid);

-- event_hosts was renamed from event_sommeliers (rename_sommelier_to_host_and_staff_rpcs)
-- but the constraint names weren't renamed along with the table — cosmetic,
-- but confusing to anyone reading \d event_hosts today.
alter table public.event_hosts rename constraint event_sommeliers_pkey to event_hosts_pkey;
alter table public.event_hosts rename constraint event_sommeliers_event_id_user_id_key to event_hosts_event_id_user_id_key;
alter table public.event_hosts rename constraint event_sommeliers_event_id_fkey to event_hosts_event_id_fkey;
alter table public.event_hosts rename constraint event_sommeliers_user_id_fkey to event_hosts_user_id_fkey;
