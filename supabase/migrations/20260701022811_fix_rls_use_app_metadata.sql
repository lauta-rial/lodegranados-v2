
-- Fix RLS policies: replace user_metadata with app_metadata

-- branches
DROP POLICY IF EXISTS "Admin manage branches" ON public.branches;
CREATE POLICY "Admin manage branches" ON public.branches
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- plans
DROP POLICY IF EXISTS "Admin manage plans" ON public.plans;
CREATE POLICY "Admin manage plans" ON public.plans
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- subscriptions
DROP POLICY IF EXISTS "Admin manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admin manage subscriptions" ON public.subscriptions
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- events (branch-scoped)
DROP POLICY IF EXISTS "Admin manage branch events" ON public.events;
CREATE POLICY "Admin manage branch events" ON public.events
  FOR ALL USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
    AND (
      ((auth.jwt() -> 'app_metadata') ->> 'branch_id') IS NULL
      OR ((auth.jwt() -> 'app_metadata') ->> 'branch_id') = branch_id::text
    )
  );

-- courses (branch-scoped)
DROP POLICY IF EXISTS "Admin manage branch courses" ON public.courses;
CREATE POLICY "Admin manage branch courses" ON public.courses
  FOR ALL USING (
    ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'
    AND (
      ((auth.jwt() -> 'app_metadata') ->> 'branch_id') IS NULL
      OR ((auth.jwt() -> 'app_metadata') ->> 'branch_id') = branch_id::text
    )
  );

-- registrations
DROP POLICY IF EXISTS "Admin manage registrations" ON public.registrations;
CREATE POLICY "Admin manage registrations" ON public.registrations
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- enrollments
DROP POLICY IF EXISTS "Admin manage enrollments" ON public.enrollments;
CREATE POLICY "Admin manage enrollments" ON public.enrollments
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- inquiries
DROP POLICY IF EXISTS "Admin manage inquiries" ON public.inquiries;
CREATE POLICY "Admin manage inquiries" ON public.inquiries
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- newsletter
DROP POLICY IF EXISTS "Admin read newsletter" ON public.newsletter;
DROP POLICY IF EXISTS "Admin manage newsletter" ON public.newsletter;
CREATE POLICY "Admin manage newsletter" ON public.newsletter
  FOR ALL USING (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- Revoke rls_auto_enable() from public roles
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;

-- Fix search_path on functions
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.decrement_event_spots(p_event_id uuid, p_amount integer) SET search_path = public;
ALTER FUNCTION public.decrement_course_spots(p_course_id uuid) SET search_path = public;
