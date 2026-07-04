-- Correlates MercadoPago's recurring-billing webhooks (subscription_preapproval,
-- subscription_authorized_payment) back to a subscriptions row. The one-time
-- checkout flow used payment_id for the same purpose; preapproval_id is the
-- equivalent identifier for a real recurring mandate. Unique so the same
-- preapproval can never create two rows (both PagoExitoso.tsx and
-- mp-webhook's subscription_preapproval handler can race to activate the
-- same subscription — this plus an explicit idempotency check in send-email
-- is what makes that race safe).
alter table public.subscriptions add column preapproval_id text unique;
