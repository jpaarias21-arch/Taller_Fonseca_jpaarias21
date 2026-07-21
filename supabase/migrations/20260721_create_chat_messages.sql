-- Migración: Crear tabla de chat general para comunicación entre usuarios
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  user_role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Índices para consultas eficientes
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

-- Habilitar realtime para la tabla
alter publication supabase_realtime add table public.chat_messages;

-- Política de seguridad: permitir lectura/inserción a usuarios autenticados
alter table public.chat_messages enable row level security;

-- Política: cualquier usuario autenticado puede leer mensajes
create policy "Usuarios autenticados pueden leer mensajes"
  on public.chat_messages for select
  using (auth.role() = 'authenticated');

-- Política: cualquier usuario autenticado puede insertar mensajes
create policy "Usuarios autenticados pueden insertar mensajes"
  on public.chat_messages for insert
  with check (auth.role() = 'authenticated');