-- Fase 11: detalles comerciales de la propiedad (amenidades y requisitos de contratacion).
alter table public.properties
  add column if not exists amenities text[] not null default '{}',
  add column if not exists rental_requirements text[] not null default '{}';
