-- Fase 13: Modelo multicanal de publicaciones (Facebook Grupos asistido, Instagram/TikTok API, Test local)
-- 1. Nuevos modos de publicación
alter table public.publications
  drop constraint if exists publications_mode_check,
  add constraint publications_mode_check check (mode in ('assisted_manual', 'direct_api', 'local_test'));

-- 2. Nuevos estados para modo asistido manual (Facebook Grupos) y direct_api (Instagram/TikTok)
alter table public.publications
  drop constraint if exists publications_status_check,
  add constraint publications_status_check check (status in (
    'draft',
    'scheduled',
    'api_submitted',
    'published',
    'failed',
    'cancelled',
    'prepared',
    'manual_queue',
    'ready_to_publish',
    'published_manually',
    'skipped'
  ));

-- 3. Campos adicionales para trazabilidad y agrupación
alter table public.publications
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists confirmed_at_manual timestamptz,
  add column if not exists group_batch text,
  add column if not exists batch_time_slot text check (batch_time_slot in ('morning', 'afternoon', 'evening'));

-- 4. Índices para consultas por modo y batch
create index if not exists publications_mode_status_idx on public.publications (mode, status);
create index if not exists publications_group_batch_idx on public.publications (group_batch) where mode = 'assisted_manual';
create index if not exists publications_confirmed_by_idx on public.publications (confirmed_by) where confirmed_by is not null;

-- 5. Plataforma TikTok
alter table public.publications
  drop constraint if exists publications_platform_check,
  add constraint publications_platform_check check (platform in ('facebook', 'instagram', 'whatsapp', 'tiktok'));

-- 6. Constraint: confirmed_at_manual solo para modo assisted_manual
-- Se permite null en estados intermedios, solo se requiere cuando status = 'published_manually'
alter table public.publications
  add constraint publications_confirmed_manual_check check (
    (mode = 'assisted_manual' and status = 'published_manually' and confirmed_at_manual is not null)
    or (mode = 'assisted_manual' and status != 'published_manually' and confirmed_at_manual is null)
    or (mode != 'assisted_manual' and confirmed_at_manual is null)
  );

-- 7. Constraint: external_id y confirmed_at solo para direct_api cuando confirmado externamente
-- Estados published/failed SIN confirmación externa son válidos (pendientes de confirmación)
-- Solo cuando hay external_id se requiere confirmed_at
alter table public.publications
  add constraint publications_api_confirmation_check check (
    (mode = 'direct_api' and external_id is not null and confirmed_at is not null)
    or (mode = 'direct_api' and external_id is null and confirmed_at is null)
    or (mode != 'direct_api' and external_id is null and confirmed_at is null)
  );

-- 8. Constraint: group_batch y batch_time_slot solo para assisted_manual
alter table public.publications
  add constraint publications_batch_fields_check check (
    (mode = 'assisted_manual' and group_batch is not null and batch_time_slot is not null)
    or (mode != 'assisted_manual' and group_batch is null and batch_time_slot is null)
  );

-- 9. Trigger para actualizar confirmed_at_manual automáticamente en published_manually
create or replace function public.set_confirmed_at_manual()
returns trigger
language plpgsql
as $$
begin
  if new.mode = 'assisted_manual' and new.status = 'published_manually' and old.status != 'published_manually' then
    new.confirmed_at_manual = now();
    new.confirmed_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists publications_set_confirmed_manual on public.publications;
create trigger publications_set_confirmed_manual
before update on public.publications
for each row
execute function public.set_confirmed_at_manual();

-- 10. Tabla de log de acciones manuales para auditoría
create table if not exists public.publication_manual_actions (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  action text not null check (action in ('moved_to_queue', 'marked_ready', 'published_manually', 'skipped', 'failed')),
  performed_by uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index publication_manual_actions_publication_idx on public.publication_manual_actions (publication_id);
create index publication_manual_actions_created_at_idx on public.publication_manual_actions (created_at desc);

alter table public.publication_manual_actions enable row level security;

create policy "publication_manual_actions_select_own" on public.publication_manual_actions
for select to authenticated
using (performed_by = auth.uid() or exists (
  select 1 from public.publications p where p.id = publication_id and p.created_by = auth.uid()
));

create policy "publication_manual_actions_insert_own" on public.publication_manual_actions
for insert to authenticated
with check (performed_by = auth.uid());

-- 11. Función helper para obtener resumen por modo
create or replace function public.get_publications_summary_by_mode(p_user_id uuid)
returns table (
  mode text,
  status text,
  count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.mode, p.status, count(*)::bigint
  from public.publications p
  where p.created_by = p_user_id
  group by p.mode, p.status
  order by p.mode, p.status;
end;
$$;