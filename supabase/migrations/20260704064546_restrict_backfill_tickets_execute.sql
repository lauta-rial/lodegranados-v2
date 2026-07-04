-- backfill_tickets_for_registration/_for_session are SECURITY DEFINER with
-- no internal role check — confirmed via get_advisors they were callable
-- directly by anon/authenticated via /rest/v1/rpc/*. A legitimate buyer
-- could call either with their own real registration_id and an inflated
-- p_spots to mint themselves extra valid tickets for free, since the
-- function has no idea who's calling it or whether they're entitled to
-- more tickets than they paid for. Only send-email (service role) and the
-- AFTER INSERT triggers on registrations/event_sessions (which also run as
-- the function owner, not as the end user) ever need to call these.
revoke execute on function public.backfill_tickets_for_registration(uuid, uuid, integer) from anon, authenticated;
revoke execute on function public.backfill_tickets_for_session(uuid, uuid) from anon, authenticated;
