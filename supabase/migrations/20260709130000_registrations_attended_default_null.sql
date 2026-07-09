-- Attendance starts undecided (null → '-'), not absent. It becomes true on a
-- ticket scan and false only when the cata's session is closed (see the
-- auto-attendance triggers). The column had a default of false, so every
-- registration showed 'NO' from the moment it was created.
alter table registrations alter column attended set default null;

-- Reset the ones that were wrongly defaulted to false but whose event hasn't
-- actually been closed yet.
update registrations r
  set attended = null
  where r.attended = false
    and not exists (
      select 1 from event_sessions s
      where s.event_id = r.event_id and s.ended_at is not null
    );
