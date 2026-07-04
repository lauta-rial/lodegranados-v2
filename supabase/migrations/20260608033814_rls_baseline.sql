-- Baseline RLS: enable on all app tables
-- NestJS will use service_role; anon gets public catalog reads only

ALTER TABLE public.branch ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY branch_public_read ON public.branch FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY plan_public_read ON public.plan FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY branch_plans_public_read ON public.branch_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY event_public_read ON public.event FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY course_public_read ON public.course FOR SELECT TO anon, authenticated USING (active = true);

COMMENT ON TABLE public.payment IS 'Writes via NestJS service_role only during migration phase';
COMMENT ON TABLE public."user" IS 'Will migrate to auth.users + profiles in Phase 3';
