-- tickets.session_id had no ON DELETE behavior (defaults to NO ACTION),
-- so deleting a session with any ticket pointing to it — validated or
-- not — failed with a FK violation before the BEFORE DELETE guard trigger
-- even got a chance to matter for the validated case. CASCADE here is safe
-- specifically because the guard trigger (trg_prevent_delete_validated_session)
-- fires BEFORE this cascade and blocks the whole delete if any of the
-- session's tickets are already validated — cascade only ever removes
-- still-unvalidated tickets.
alter table tickets drop constraint tickets_session_id_fkey;
alter table tickets add constraint tickets_session_id_fkey
  foreign key (session_id) references event_sessions(id) on delete cascade;
