-- Club plans are a company-wide commercial decision now: only superadmins may
-- create/edit/delete them (price included). This supersedes the earlier
-- price-only trigger, which is dropped — the whole table is superadmin-write.
drop trigger if exists trg_enforce_plan_price_superadmin on public.plans;
drop function if exists public.enforce_plan_price_superadmin();

drop policy if exists "Admin manage plans" on public.plans;

create policy "Superadmin manage plans" on public.plans for all
  using ((((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'superadmin'))
  with check ((((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'superadmin'));

-- Branch admins keep read access to every plan for the admin panel (read-only);
-- the public still reads only active plans via "Public read active plans".
create policy "Admin read plans" on public.plans for select
  using ((((select auth.jwt()) -> 'app_metadata' ->> 'role') = any (array['admin', 'superadmin'])));
