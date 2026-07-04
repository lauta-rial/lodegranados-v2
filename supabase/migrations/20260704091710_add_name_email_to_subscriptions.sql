-- Club DeVinos subscriptions support guest checkout (CheckoutModal collects
-- name/email for non-logged-in users), same as registrations — but unlike
-- registrations, subscriptions had no name/email columns, only user_id.
-- Needed now for the monthly-charge receipt email: a guest subscriber has
-- no auth.users row to look an email up from, so it has to be captured at
-- subscribe time, same pattern as registrations.name/registrations.email.
alter table public.subscriptions add column name text;
alter table public.subscriptions add column email text;
