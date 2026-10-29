-- =====================================================================
-- Centinela — 03_comentarios_equipo.sql
-- Comentarios de revisoras/administradoras sobre cada documento y nuevos tipos
-- de aviso para la campanita (comentario y alerta de bloqueados).
-- Pégalo completo en Supabase → SQL Editor → New query → Run (una sola vez).
-- Igual que las demás tablas: RLS activado y sin políticas; solo el servidor
-- (con la clave secreta) lee y escribe, después de verificar el rol.
-- =====================================================================

-- 1) Comentarios (hilo por documento).
create table public.comentarios (
  id            uuid primary key default gen_random_uuid(),
  documento_id  uuid not null references public.documentos (id) on delete cascade,
  autor_id      uuid not null references public.profiles (id) on delete restrict,
  autor_nombre  text not null,
  texto         text not null check (char_length(texto) between 1 and 4000),
  created_at    timestamptz not null default now()
);
create index comentarios_doc_idx on public.comentarios (documento_id, created_at);
alter table public.comentarios enable row level security;

-- 2) La campanita admite dos tipos de aviso más: comentario y alerta.
do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.notificaciones'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%tipo%';
  if c is not null then
    execute format('alter table public.notificaciones drop constraint %I', c);
  end if;
end $$;

alter table public.notificaciones
  add constraint notificaciones_tipo_check
  check (tipo in ('bloqueado', 'aprobado_con_observaciones', 'comentario', 'alerta_bloqueados'));
