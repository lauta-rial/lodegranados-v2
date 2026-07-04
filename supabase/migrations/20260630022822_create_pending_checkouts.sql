
CREATE TABLE pending_checkouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL,
  ref           text NOT NULL,
  user_id       uuid,
  payer_name    text,
  payer_email   text,
  spots         int DEFAULT 1,
  price         int,
  preference_id text,
  processed_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);
