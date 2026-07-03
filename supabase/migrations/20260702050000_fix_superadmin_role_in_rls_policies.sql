-- The 'Admin manage ...' policies checked role = 'admin' exactly, so accounts
-- with app_metadata.role = 'superadmin' (branch_id null, meant to see/manage
-- everything) fell through to narrower fallback policies instead. Broaden the
-- role check to accept both roles.

ALTER POLICY "Admin manage branches" ON public.branches
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage branch courses" ON public.courses
  USING (
    (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]))
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'branch_id'::text) IS NULL)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'branch_id'::text) = (branch_id)::text)
    )
  );

ALTER POLICY "Admin manage enrollments" ON public.enrollments
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage branch events" ON public.events
  USING (
    (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]))
    AND (
      (((auth.jwt() -> 'app_metadata'::text) ->> 'branch_id'::text) IS NULL)
      OR (((auth.jwt() -> 'app_metadata'::text) ->> 'branch_id'::text) = (branch_id)::text)
    )
  );

ALTER POLICY "Admin manage inquiries" ON public.inquiries
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage newsletter" ON public.newsletter
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage plans" ON public.plans
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage registrations" ON public.registrations
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));

ALTER POLICY "Admin manage subscriptions" ON public.subscriptions
  USING (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = ANY (ARRAY['admin'::text, 'superadmin'::text]));
