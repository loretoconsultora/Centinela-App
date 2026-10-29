-- =====================================================================
-- Centinela — 02_gestion_documentos.sql
-- Historial de documentos revisados ("Gestión de documentos") y
-- notificaciones de la campanita. Pégalo completo en Supabase →
-- SQL Editor → New query → Run. Correrlo una sola vez.
--
-- Seguridad: ambas tablas tienen RLS activado y NINGUNA política a
-- propósito. Eso significa que nadie puede leerlas ni escribirlas desde el
-- navegador; solo el servidor de Centinela (con la clave secreta), que antes
-- verifica quién es la persona y qué rol tiene.
-- =====================================================================

create table public.documentos (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  autor_id        uuid not null references public.profiles (id) on delete restrict,
  autor_nombre    text not null,
  subido_por      uuid references public.profiles (id) on delete set null,
  dictamen        text not null
    check (dictamen in ('bloqueado', 'aprobado_con_observaciones', 'aprobado')),
  reporte         jsonb not null,
  tokens_entrada  integer,
  tokens_salida   integer,
  created_at      timestamptz not null default now()
);

create index documentos_autor_idx on public.documentos (autor_id, created_at desc);
create index documentos_fecha_idx on public.documentos (created_at desc);
alter table public.documentos enable row level security;

create table public.notificaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.profiles (id) on delete cascade,
  documento_id  uuid references public.documentos (id) on delete cascade,
  vista         text not null check (vista in ('autora', 'revisora_nucleo')),
  tipo          text not null check (tipo in ('bloqueado', 'aprobado_con_observaciones')),
  mensaje       text not null,
  leida         boolean not null default false,
  created_at    timestamptz not null default now()
);

create index notificaciones_usuario_idx
  on public.notificaciones (usuario_id, leida, created_at desc);
alter table public.notificaciones enable row level security;
