
-- H1: UNIQUE constraints to prevent duplicate registrations/enrollments for same payment
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_event_payment_unique
  UNIQUE (event_id, payment_id);

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_course_payment_unique
  UNIQUE (course_id, payment_id);
