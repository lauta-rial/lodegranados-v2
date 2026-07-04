alter table events
  add column started_at timestamptz,
  add column ended_at timestamptz;

alter table tickets
  add column attendee_email text;
