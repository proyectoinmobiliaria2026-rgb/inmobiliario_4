-- Entrega 1: folio interno, staging derivado, TikTok y estados comerciales.

-- 1) TikTok en publicaciones
alter table public.publications drop constraint if exists publications_platform_check;
alter table public.publications add constraint publications_platform_check
  check (platform in ('facebook', 'instagram', 'whatsapp', 'tiktok'));

-- 2) Folio interno automático CF-000123
create sequence if not exists public.properties_folio_seq start with 1;

alter table public.properties add column if not exists folio text;

-- Backfill para registros existentes (el trigger solo cubre inserts nuevos)
with numbered as (
  select id, row_number() over (order by created_at) as n
  from public.properties
  where folio is null or folio = ''
)
update public.properties p
set folio = 'CF-' || lpad(numbered.n::text, 6, '0')
from numbered
where p.id = numbered.id;

alter table public.properties alter column folio set not null;
alter table public.properties add constraint properties_folio_unique unique (folio);

create or replace function public.set_property_folio_title()
returns trigger language plpgsql as $$
begin
  if new.folio is null or new.folio = '' then
    new.folio := 'CF-' || lpad(nextval('public.properties_folio_seq')::text, 6, '0');
  end if;
  if new.title is null or new.title = '' then
    new.title := new.folio;
  end if;
  return new;
end; $$;

drop trigger if exists properties_folio_title_before_insert on public.properties;
create trigger properties_folio_title_before_insert
  before insert on public.properties
  for each row execute function public.set_property_folio_title();

-- 3) Staging: imagen amueblada derivada de la original
alter table public.property_media add column if not exists derived_from uuid
  references public.property_media (id) on delete set null;

-- 4) Estados comerciales: separar de publicaciones en redes
update public.properties set status = 'active' where status = 'published';
