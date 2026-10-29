-- =====================================================================
-- Centinela — 01_schema.sql
-- Perfiles, roles y lista de invitaciones, con seguridad a nivel de fila (RLS).
-- Pégalo completo en Supabase → SQL Editor → New query → Run.
-- Es seguro correrlo una sola vez. (Si lo corres de nuevo, dará error de
-- "already exists" y no cambia nada.)
-- =====================================================================

-- 1) Perfiles: una fila por usuaria, ligada a su cuenta de Supabase Auth.
--    'roles' es una lista: una persona puede tener varios roles a la vez
--    (p. ej. administradora + revisora_nucleo + autora) y la plataforma
--    le deja alternar entre las vistas de cada uno.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  nombre      text,
  nucleo      text,
  roles       text[] not null default '{}',
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint roles_validos
    check (roles <@ array['administradora', 'revisora_nucleo', 'autora']::text[])
);

-- 2) Invitaciones: lista de personas autorizadas, con el rol que les toca.
--    Cuando alguien se crea/invita en Supabase Auth, un trigger busca su
--    correo aquí y le arma el perfil automáticamente. Un correo que NO esté
--    en esta lista queda con perfil inactivo y sin roles (sin acceso).
create table public.invitaciones (
  email   text primary key,
  nombre  text not null,
  nucleo  text,
  roles   text[] not null,
  constraint roles_validos_inv
    check (roles <@ array['administradora', 'revisora_nucleo', 'autora']::text[])
);

-- 3) Trigger: al crearse un usuario en auth.users, crea su perfil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitaciones%rowtype;
begin
  select * into inv
  from public.invitaciones
  where lower(email) = lower(new.email);

  if found then
    insert into public.profiles (id, email, nombre, nucleo, roles, activo)
    values (new.id, lower(new.email), inv.nombre, inv.nucleo, inv.roles, true);
  else
    insert into public.profiles (id, email, roles, activo)
    values (new.id, lower(new.email), '{}', false);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Función auxiliar: ¿la persona que hace la consulta tiene este rol?
--    (security definer para que las reglas de abajo no se llamen a sí mismas
--    en un bucle al leer la tabla de perfiles.)
create or replace function public.tiene_rol(rol text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.activo
      and rol = any (p.roles)
  );
$$;

revoke all on function public.tiene_rol(text) from public;
grant execute on function public.tiene_rol(text) to authenticated;

-- 5) Seguridad a nivel de fila (RLS)
alter table public.profiles enable row level security;
alter table public.invitaciones enable row level security;
-- 'invitaciones' no tiene políticas a propósito: nadie la ve desde el
-- navegador; solo el servidor (con la clave secreta) y el SQL Editor.

-- Cada persona ve su propio perfil.
create policy "ver perfil propio"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

-- Administradoras y revisoras de núcleo ven todos los perfiles.
create policy "equipo ve perfiles"
  on public.profiles for select to authenticated
  using (public.tiene_rol('administradora') or public.tiene_rol('revisora_nucleo'));

-- Solo administradoras pueden editar perfiles (roles, activo, etc.).
-- Nadie puede cambiarse el rol a sí misma. Crear/borrar perfiles lo hace
-- solo el servidor con la clave secreta.
create policy "admin edita perfiles"
  on public.profiles for update to authenticated
  using (public.tiene_rol('administradora'))
  with check (public.tiene_rol('administradora'));
