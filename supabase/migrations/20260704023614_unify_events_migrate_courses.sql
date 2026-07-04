-- Fase 1, Migración B: mueve courses -> events (kind='curso'), preservando el
-- id original para no tener que remapear FKs de enrollments (todavía intacto).
-- courses/enrollments no se tocan ni se borran en esta migración.
alter table events
  add column instructor_name text,
  add column instructor_bio text,
  add column syllabus jsonb,
  add column total_classes int,
  add column schedule text;

-- time/location eran NOT NULL porque toda cata siempre las tiene; los cursos
-- no tienen hora/lugar puntual (schedule es texto libre), así que pasan a
-- nullable — solo afecta a las filas nuevas kind='curso'.
alter table events alter column time drop not null;
alter table events alter column location drop not null;

insert into events (
  id, title, description, date, time, location,
  total_spots, available_spots, price, active, image_url, branch_id,
  created_at, updated_at,
  kind, instructor_name, instructor_bio, syllabus, total_classes, schedule
)
select
  id, title, description, start_date, null, null,
  total_spots, available_spots, price, active, image_url, branch_id,
  created_at, updated_at,
  'curso', instructor_name, instructor_bio, syllabus, total_classes, schedule
from courses;

insert into event_sessions (event_id, session_number, date, time, location)
select id, 1, date, time, location
from events
where kind = 'curso' and id not in (select event_id from event_sessions);
