-- Fase 10: reglas de negocio para publicaciones y scheduler de redes sociales.
alter table public.publications
  add constraint publications_status_check check (status in ('draft', 'scheduled', 'published', 'failed', 'cancelled')),
  add constraint publications_platform_check check (platform in ('facebook', 'instagram', 'whatsapp')),
  add constraint publications_mode_check check (mode in ('assisted', 'automatic')),
  add constraint publications_schedule_requires_date_check check (status <> 'scheduled' or scheduled_for is not null);

alter table public.scheduler_jobs
  add constraint scheduler_jobs_type_check check (job_type in ('publish_publication')),
  add constraint scheduler_jobs_status_check check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  add constraint scheduler_jobs_attempts_check check (attempts >= 0),
  add constraint scheduler_jobs_max_attempts_check check (max_attempts > 0);

create index publications_property_status_idx on public.publications (property_id, status);
create index publications_scheduled_for_idx on public.publications (status, scheduled_for)
  where status = 'scheduled';
create index scheduler_jobs_due_idx on public.scheduler_jobs (status, next_retry_at);
create index scheduler_runs_job_idx on public.scheduler_runs (scheduler_job_id, started_at desc);
