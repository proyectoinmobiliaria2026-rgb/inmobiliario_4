-- Fase 9: reglas de negocio y consultas del seguimiento de leads.
alter table public.leads
  add constraint leads_status_check check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  add constraint leads_name_length_check check (char_length(trim(name)) between 2 and 120),
  add constraint leads_contact_check check (nullif(trim(phone), '') is not null or nullif(trim(email), '') is not null),
  add constraint leads_email_length_check check (email is null or char_length(email) <= 254),
  add constraint leads_phone_length_check check (phone is null or char_length(phone) <= 40),
  add constraint leads_origin_length_check check (origin is null or char_length(origin) <= 80),
  add constraint leads_notes_length_check check (notes is null or char_length(notes) <= 5000);

create index leads_created_by_updated_at_idx on public.leads (created_by, updated_at desc);
create index leads_next_follow_up_at_idx on public.leads (created_by, next_follow_up_at)
  where next_follow_up_at is not null;

alter table public.leads enable row level security;

drop policy if exists "leads_manage_authenticated" on public.leads;
create policy "leads_manage_own" on public.leads
for all to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());
