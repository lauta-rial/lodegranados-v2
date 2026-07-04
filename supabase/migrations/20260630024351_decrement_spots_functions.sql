
CREATE OR REPLACE FUNCTION decrement_event_spots(p_event_id uuid, p_amount int)
RETURNS void LANGUAGE sql AS $$
  UPDATE events
  SET available_spots = GREATEST(available_spots - p_amount, 0)
  WHERE id = p_event_id;
$$;

CREATE OR REPLACE FUNCTION decrement_course_spots(p_course_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE courses
  SET available_spots = GREATEST(available_spots - 1, 0)
  WHERE id = p_course_id;
$$;
