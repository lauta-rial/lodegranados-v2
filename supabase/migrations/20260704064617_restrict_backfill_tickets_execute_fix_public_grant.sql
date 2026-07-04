-- The first pass revoked from anon/authenticated but not from PUBLIC —
-- Postgres grants EXECUTE to PUBLIC by default on function creation, and
-- that grant applies regardless of a role's own specific revokes. Verified
-- the gap live: a direct anon-key RPC call still succeeded (204) after the
-- previous migration. Revoking from PUBLIC as well is what actually closes
-- it — confirmed by re-testing after this migration.
revoke execute on function public.backfill_tickets_for_registration(uuid, uuid, integer) from public;
revoke execute on function public.backfill_tickets_for_session(uuid, uuid) from public;
