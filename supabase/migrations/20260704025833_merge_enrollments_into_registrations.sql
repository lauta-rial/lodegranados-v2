-- Fase 2, paso 1-2: registrations absorbe enrollments. courses/enrollments
-- NO se borran acá (quedan como red de seguridad hasta un deploy separado y
-- verificado, al menos un día después).
alter table registrations
  add column status text check (status in ('enrolled','completed','dropped'));

insert into registrations (id, user_id, event_id, name, email, spots, status, payment_id, created_at, updated_at)
select id, user_id, course_id, name, email, 1, status, payment_id, created_at, updated_at
from enrollments;
