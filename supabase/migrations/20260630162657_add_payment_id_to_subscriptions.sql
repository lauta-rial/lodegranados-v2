ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_id text;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_payment_id_unique ON subscriptions(payment_id) WHERE payment_id IS NOT NULL;
