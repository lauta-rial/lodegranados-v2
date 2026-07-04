-- Renombre de diseño: 'sommelier' -> 'host' (más abstracto, cubre catas y
-- cursos por igual). Nada en producción usaba todavía el rol sommelier real
-- (fue diseñado y construido en esta misma sesión, sin desplegar), así que
-- el renombre es gratis ahora — no hay datos reales que migrar.
alter table event_sommeliers rename to event_hosts;

drop policy "Admin manage event sommeliers" on event_hosts;
drop policy "Sommelier reads own assignments" on event_hosts;
drop policy "Sommelier select assigned tickets" on tickets;
drop policy "Sommelier validate assigned tickets" on tickets;
drop policy "Sommelier select assigned sessions" on event_sessions;
drop policy "Sommelier update assigned sessions" on event_sessions;
drop policy "Sommelier read assigned events" on events;
drop function if exists public.get_event_sommeliers(uuid);

create policy "Admin manage event hosts" on event_hosts for all
using (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_hosts.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
)
with check (
  ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin']))
  and exists (
    select 1 from events e
    where e.id = event_hosts.event_id
      and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
  )
);

create policy "Host reads own assignments" on event_hosts for select
using (user_id = auth.uid());

create policy "Host select assigned tickets" on tickets for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = auth.uid())
);

create policy "Host validate assigned tickets" on tickets for update
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = auth.uid())
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = tickets.event_id and eh.user_id = auth.uid())
);

create policy "Host select assigned sessions" on event_sessions for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = auth.uid())
);

create policy "Host update assigned sessions" on event_sessions for update
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = auth.uid())
)
with check (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = event_sessions.event_id and eh.user_id = auth.uid())
);

create policy "Host read assigned events" on events for select
using (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'host'
  and exists (select 1 from event_hosts eh where eh.event_id = events.id and eh.user_id = auth.uid())
);

-- Reemplaza get_event_sommeliers: misma razón (auth.users no es visible
-- directo por el cliente), tabla renombrada.
create or replace function public.get_event_hosts(p_event_id uuid)
returns table(id uuid, user_id uuid, email text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not (
    (auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin'])
    and exists (
      select 1 from events e
      where e.id = p_event_id
        and ((auth.jwt() -> 'app_metadata' ->> 'branch_id') is null or (auth.jwt() -> 'app_metadata' ->> 'branch_id') = e.branch_id::text)
    )
  ) then
    raise exception 'not authorized';
  end if;

  return query
    select eh.id, eh.user_id, u.email::text
    from event_hosts eh
    join auth.users u on u.id = eh.user_id
    where eh.event_id = p_event_id;
end;
$$;

-- Sección "Staff" del admin (superadmin-only): lista todas las cuentas
-- admin/host. auth.users no es visible directo por el cliente, de ahí el RPC.
create or replace function public.get_staff()
returns table(id uuid, email text, role text, branch_id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not ((auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin') then
    raise exception 'not authorized';
  end if;

  return query
    select
      u.id,
      u.email::text,
      (u.raw_app_meta_data ->> 'role')::text as role,
      (u.raw_app_meta_data ->> 'branch_id')::uuid as branch_id,
      u.created_at
    from auth.users u
    where (u.raw_app_meta_data ->> 'role') in ('admin', 'host')
    order by u.created_at desc;
end;
$$;

-- Para el selector de "asignar host" en el editor de evento: solo hosts de
-- la sucursal del evento (un evento pertenece a una sucursal). Un admin
-- solo puede consultar la suya; superadmin, cualquiera.
create or replace function public.get_branch_hosts(p_branch_id uuid)
returns table(id uuid, email text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not ((auth.jwt() -> 'app_metadata' ->> 'role') = any (array['admin','superadmin'])) then
    raise exception 'not authorized';
  end if;
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
     and (auth.jwt() -> 'app_metadata' ->> 'branch_id') is distinct from p_branch_id::text then
    raise exception 'not authorized';
  end if;

  return query
    select u.id, u.email::text
    from auth.users u
    where (u.raw_app_meta_data ->> 'role') = 'host'
      and (u.raw_app_meta_data ->> 'branch_id') = p_branch_id::text
    order by u.email;
end;
$$;
