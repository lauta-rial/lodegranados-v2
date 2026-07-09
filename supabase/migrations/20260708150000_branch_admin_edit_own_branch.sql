-- A branch admin can edit their OWN branch's content (name, city, address,
-- phone, instagram, image). Structural fields — slug (URL routing) and active
-- (site visibility) — stay superadmin-only, enforced in the DB so it holds no
-- matter how the write arrives.
create policy "Branch admin update own branch" on branches for update
  using (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and id = (((select auth.jwt()) -> 'app_metadata' ->> 'branch_id'))::uuid
  )
  with check (
    (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
    and id = (((select auth.jwt()) -> 'app_metadata' ->> 'branch_id'))::uuid
  );

create or replace function public.enforce_branch_structural_superadmin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb := auth.jwt();
begin
  -- Trusted server contexts and superadmins bypass.
  if claims is null
     or (claims ->> 'role') = 'service_role'
     or (claims -> 'app_metadata' ->> 'role') = 'superadmin' then
    return new;
  end if;

  if new.slug is distinct from old.slug then
    raise exception 'Solo un superadmin puede cambiar el slug de una sucursal';
  end if;
  if new.active is distinct from old.active then
    raise exception 'Solo un superadmin puede activar o desactivar una sucursal';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_branch_structural on public.branches;
create trigger trg_enforce_branch_structural
  before update on public.branches
  for each row execute function public.enforce_branch_structural_superadmin();
