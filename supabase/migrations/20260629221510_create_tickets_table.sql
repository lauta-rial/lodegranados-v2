
CREATE TABLE tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id        uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  validated_at    timestamptz,
  validated_by    uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX tickets_token_idx ON tickets(token);
CREATE INDEX tickets_event_idx  ON tickets(event_id);
CREATE INDEX tickets_reg_idx    ON tickets(registration_id);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view own tickets" ON tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM registrations r
      WHERE r.id = tickets.registration_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "admins can manage tickets" ON tickets
  FOR ALL USING (auth.role() = 'authenticated');
