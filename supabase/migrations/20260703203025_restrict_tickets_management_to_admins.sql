DROP POLICY IF EXISTS "admins can manage tickets" ON tickets;

CREATE POLICY "Admin manage tickets" ON tickets FOR ALL
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'superadmin']))
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['admin', 'superadmin']));
