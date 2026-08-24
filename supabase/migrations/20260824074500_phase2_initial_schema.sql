create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'agent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null,
  description text,
  property_type text not null,
  operation_type text not null,
  status text not null default 'draft',
  address_line text,
  city text,
  state text,
  country text,
  bedrooms int,
  bathrooms int,
  parking_spots int,
  area_m2 numeric(10, 2),
  price_amount numeric(14, 2),
  price_currency text default 'USD',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  state text not null check (state in ('original', 'processed', 'edited', 'generated')),
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  width int,
  height int,
  duration_seconds numeric(10, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  channel text not null,
  prompt_input jsonb not null,
  output jsonb not null,
  provider text not null,
  status text not null default 'completed',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  platform text not null,
  mode text not null default 'assisted',
  status text not null default 'draft',
  scheduled_for timestamptz,
  executed_at timestamptz,
  confirmed_at timestamptz,
  external_id text,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  name text not null,
  phone text,
  email text,
  origin text,
  status text not null default 'new',
  notes text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduler_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts int not null default 0,
  max_attempts int not null default 3,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduler_runs (
  id uuid primary key default gen_random_uuid(),
  scheduler_job_id uuid not null references public.scheduler_jobs (id) on delete cascade,
  status text not null,
  result jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.event_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index properties_created_by_idx on public.properties (created_by);
create index properties_status_idx on public.properties (status);
create index property_media_property_id_idx on public.property_media (property_id);
create index ai_generations_property_id_idx on public.ai_generations (property_id);
create index publications_property_id_idx on public.publications (property_id);
create index publications_status_idx on public.publications (status);
create index leads_status_idx on public.leads (status);
create index scheduler_jobs_status_idx on public.scheduler_jobs (status);
create index event_log_event_type_idx on public.event_log (event_type);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger properties_set_updated_at
before update on public.properties
for each row
execute function public.set_updated_at();

create trigger publications_set_updated_at
before update on public.publications
for each row
execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

create trigger scheduler_jobs_set_updated_at
before update on public.scheduler_jobs
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;
alter table public.ai_generations enable row level security;
alter table public.publications enable row level security;
alter table public.leads enable row level security;
alter table public.scheduler_jobs enable row level security;
alter table public.scheduler_runs enable row level security;
alter table public.event_log enable row level security;

create policy "profiles_select_own" on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "properties_manage_authenticated" on public.properties
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "property_media_manage_authenticated" on public.property_media
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "ai_generations_manage_authenticated" on public.ai_generations
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "publications_manage_authenticated" on public.publications
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "leads_manage_authenticated" on public.leads
for all
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "scheduler_jobs_manage_authenticated" on public.scheduler_jobs
for all
to authenticated
using (true)
with check (true);

create policy "scheduler_runs_manage_authenticated" on public.scheduler_runs
for all
to authenticated
using (true)
with check (true);

create policy "event_log_manage_authenticated" on public.event_log
for all
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values
  ('property-media', 'property-media', false),
  ('generated-media', 'generated-media', false)
on conflict (id) do nothing;

create policy "storage_property_media_select" on storage.objects
for select
to authenticated
using (bucket_id in ('property-media', 'generated-media'));

create policy "storage_property_media_insert" on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('property-media', 'generated-media')
  and owner = auth.uid()
);

create policy "storage_property_media_update" on storage.objects
for update
to authenticated
using (
  bucket_id in ('property-media', 'generated-media')
  and owner = auth.uid()
)
with check (
  bucket_id in ('property-media', 'generated-media')
  and owner = auth.uid()
);

create policy "storage_property_media_delete" on storage.objects
for delete
to authenticated
using (
  bucket_id in ('property-media', 'generated-media')
  and owner = auth.uid()
);
