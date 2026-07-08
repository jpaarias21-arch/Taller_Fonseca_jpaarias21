alter table if exists public.orden_trabajo
add column if not exists documentos_ins jsonb not null default '[]'::jsonb;

update public.orden_trabajo
set documentos_ins = '[]'::jsonb
where documentos_ins is null;