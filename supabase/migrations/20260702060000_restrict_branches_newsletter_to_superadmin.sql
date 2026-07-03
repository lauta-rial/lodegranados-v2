-- Sucursales and Newsletter are superadmin-only in the UI (Sidebar hides
-- them for branch admins), but the RLS policies allowed any role in
-- ('admin','superadmin') with no branch restriction — a branch admin who
-- navigated directly to /admin/sucursales or /admin/newsletter could manage
-- ALL branches / the global newsletter list. Restrict at the DB level too.
-- (Paired with a route guard — see src/components/admin/SuperAdminRoute.tsx.)

ALTER POLICY "Admin manage branches" ON public.branches
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superadmin'::text);

ALTER POLICY "Admin manage newsletter" ON public.newsletter
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'superadmin'::text);
