-- events.started_at/ended_at are superseded by event_sessions' own columns
-- (AdminEventLive.tsx now reads/writes the session, not the event). Kept
-- around unused since Phase 1; nothing reads them anymore as of this phase.
alter table events drop column started_at;
alter table events drop column ended_at;
