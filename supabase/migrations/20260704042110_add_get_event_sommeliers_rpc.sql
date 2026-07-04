-- event_sommeliers.user_id references auth.users, which isn't queryable
-- directly from the client (PostgREST doesn't expose the auth schema) — this
-- RPC is the only way the admin UI can show *which email* is assigned,
-- without a view permanently exposing auth.users. Same authorization check
-- as the "Admin manage event sommeliers" RLS policy, duplicated here because
-- a SECURITY DEFINER function bypasses RLS by design and is otherwise
-- callable by any authenticated user via the public RPC endpoint.
create or replace function public.get_event_sommeliers(p_event_id uuid)
returns table(id uuid, user_id uuid, email text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not (
    (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin'])
    and exists (
      select 1 from events e
      where e.id = p_event_id
        and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select es.id, es.user_id, u.email::text
    from event_sommeliers es
    join auth.users u on u.id = es.user_id
    where es.event_id = p_event_id;
end;
$$;
