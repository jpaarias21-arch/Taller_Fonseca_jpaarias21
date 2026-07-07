create table if not exists public.whatsapp_envios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id text,
  estado text,
  placa text,
  cliente text,
  telefono text not null,
  mensaje text not null,
  status text not null check (status in ('sent', 'failed')),
  provider text not null default 'meta-whatsapp-business',
  provider_message_id text,
  error text,
  provider_response jsonb
);

create index if not exists whatsapp_envios_created_at_idx on public.whatsapp_envios (created_at desc);
create index if not exists whatsapp_envios_order_id_idx on public.whatsapp_envios (order_id);
create index if not exists whatsapp_envios_status_idx on public.whatsapp_envios (status);
