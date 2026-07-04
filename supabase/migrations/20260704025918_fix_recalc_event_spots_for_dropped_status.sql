-- Fase 2, paso 3: recalculate_event_spots ahora excluye status='dropped'
-- (equivalente a la semántica que tenía recalculate_course_spots para
-- enrollments: un alumno dropped libera el cupo. Para catas, status es
-- siempre null, así que "is distinct from 'dropped'" sigue contando todas
-- las filas igual que antes — comportamiento idéntico para catas).
CREATE OR REPLACE FUNCTION public.recalculate_event_spots(p_event_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  update events
  set available_spots = greatest(
    0,
    total_spots - coalesce((select sum(spots) from registrations where event_id = p_event_id and status is distinct from 'dropped'), 0)
  )
  where id = p_event_id;
$function$;

-- enrollments ya no recibe escrituras nuevas de la app a partir de este
-- deploy — retiramos su trigger/función de auto-cálculo. La tabla misma no
-- se borra todavía (queda como red de seguridad).
drop trigger if exists on_enrollments_change_recalc_spots on enrollments;
drop function if exists public.trg_recalculate_course_spots();
drop function if exists public.recalculate_course_spots(uuid);

-- Destraba cualquier desincronización previa (courses.available_spots ya no
-- se actualiza, pero events.available_spots para las filas kind='curso' sí
-- debe reflejar la migración de enrollments recién hecha).
select recalculate_event_spots(id) from events;
