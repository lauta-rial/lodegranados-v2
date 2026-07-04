-- listUsers()'s admin REST API is broken on this project past page 1
-- (confirmed via direct testing: page 1 always succeeds, page 2+ always
-- throws AuthRetryableFetchError, independent of perPage) — manage-staff
-- needs to find-or-create an account by email, and can't rely on that
-- pagination working once the user count grows past one page. A direct SQL
-- lookup sidesteps the broken endpoint entirely. Restricted to service_role
-- only — this returns raw app_metadata, not for client use.
create or replace function public.find_user_by_email(p_email text)
returns table(id uuid, email text, app_metadata jsonb)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select u.id, u.email::text, u.raw_app_meta_data
  from auth.users u
  where u.email = p_email
  limit 1;
$$;

revoke all on function public.find_user_by_email(text) from public, anon, authenticated;
