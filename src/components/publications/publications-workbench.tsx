"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchProfile } from "@/lib/auth/profile-client";
import type { PublicationPlatform, PublicationRecord, PublicationStatus, SchedulerJobRecord } from "@/lib/types/publication";

type SessionUser = { id: string; email: string | null };
type ApiResponse<T> = { ok: boolean; data?: T; reason?: string };
type PropertyOption = { id: string; title: string };
type PublicationFormState = { propertyId: string; platform: PublicationPlatform; copy: string; hashtags: string; cta: string; scheduledFor: string };

const PLATFORMS: PublicationPlatform[] = ["facebook", "instagram", "whatsapp", "tiktok"];
const STATUSES: PublicationStatus[] = ["draft", "scheduled", "published", "failed", "cancelled"];
const EMPTY_FORM: PublicationFormState = { propertyId: "", platform: "facebook", copy: "", hashtags: "", cta: "", scheduledFor: "" };

function toInputDate(value: string | null) { return value ? value.slice(0, 16) : ""; }
function parseHashtags(raw: string): string[] | undefined {
  const tags = raw.split(/[,\s]+/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}
function truncate(text: string, max = 90) { return text.length > max ? `${text.slice(0, max)}...` : text; }

function PublicationRow({ publication, propertyTitle, onSchedule, onPublish, onCancel, onDelete }: {
  publication: PublicationRecord;
  propertyTitle: string;
  onSchedule: (localValue: string) => void;
  onPublish: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [dateValue, setDateValue] = useState(toInputDate(publication.scheduled_for));
  return <div className="property-row publication-row">
    <div className="min-w-40">
      <strong className="text-sm text-slate-900">{propertyTitle}</strong>
      <div className="muted">{publication.platform} · {truncate(publication.payload?.copy ?? "")}</div>
    </div>
    <span className={`badge badge-${publication.status}`}>{publication.status}</span>
    <span className="muted">{publication.status === "scheduled" && publication.scheduled_for ? `Programada: ${new Date(publication.scheduled_for).toLocaleString()}` : publication.status === "published" ? "Registro interno (sin confirmación de red social)" : publication.executed_at ? `Ejecutada: ${new Date(publication.executed_at).toLocaleString()}` : "Sin ejecutar"}</span>
    <div className="actions">
      <input className="input w-auto py-1.5 text-xs" aria-label={`Fecha de publicación ${publication.id}`} type="datetime-local" value={dateValue} onChange={(event) => setDateValue(event.target.value)} />
      <button type="button" className="btn-secondary" onClick={() => onSchedule(dateValue)}>Programar</button>
      <button type="button" className="btn-primary" onClick={onPublish}>Publicar ahora</button>
      <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
      <button type="button" className="btn-danger" onClick={onDelete}>Eliminar</button>
    </div>
  </div>;
}

export function PublicationsWorkbench() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("seed.agent@cfdigital.local");
  const [loginPassword, setLoginPassword] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [jobs, setJobs] = useState<SchedulerJobRecord[]>([]);
  const [form, setForm] = useState<PublicationFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [defaultCta, setDefaultCta] = useState("");

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => fetch(url, { cache: "no-store", credentials: "same-origin", ...init }), []);

  const loadPublications = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (platformFilter) params.set("platform", platformFilter);
    const response = await apiFetch(`/api/publications?${params}`);
    const payload = (await response.json()) as ApiResponse<{ items: PublicationRecord[] }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudieron cargar las publicaciones"); return; }
    setPublications(payload.data.items);
  }, [apiFetch, platformFilter, statusFilter]);

  const loadJobs = useCallback(async () => {
    const response = await apiFetch("/api/scheduler/jobs?status=pending&pageSize=20");
    const payload = (await response.json()) as ApiResponse<{ items: SchedulerJobRecord[] }>;
    if (payload.ok && payload.data) setJobs(payload.data.items);
  }, [apiFetch]);

  useEffect(() => {
    void fetch("/api/auth/session", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as ApiResponse<SessionUser>;
      if (payload.ok && payload.data) setSession(payload.data);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    void fetchProfile().then((profile) => {
      if (!profile) return;
      const contact = [profile.full_name, profile.phone, profile.email].filter(Boolean).join(" · ");
      if (contact) {
        setDefaultCta(contact);
        setForm((current) => (current.cta ? current : { ...current, cta: contact }));
      }
    });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      const response = await apiFetch("/api/properties?page=1&pageSize=100");
      const payload = (await response.json()) as ApiResponse<{ items: PropertyOption[] }>;
      if (payload.ok && payload.data) setProperties(payload.data.items);
    })();
  }, [apiFetch, session]);

  useEffect(() => { if (session) { void loadPublications(); void loadJobs(); } }, [loadJobs, loadPublications, session]);

  function updateField<K extends keyof PublicationFormState>(field: K, value: PublicationFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }) });
    const payload = (await response.json()) as ApiResponse<{ user: SessionUser }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo iniciar sesión"); return; }
    setSession(payload.data.user); setLoginPassword(""); setNotice("Sesión iniciada");
  }

  async function fetchAiCopy() {
    setError(""); setNotice("");
    if (!form.propertyId) { setError("Selecciona una propiedad primero"); return; }
    const response = await apiFetch(`/api/properties/${form.propertyId}/generations`);
    const payload = (await response.json()) as ApiResponse<{ items: { channel: string; output: { copy: string; hashtags: string[]; cta: string } }[] }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo obtener contenido IA"); return; }
    const generation = payload.data.items.find((item) => item.channel === form.platform);
    if (!generation) { setError(`No hay contenido IA para ${form.platform}. Genéralo desde propiedades.`); return; }
    setForm((current) => ({ ...current, copy: generation.output.copy, hashtags: generation.output.hashtags.join(", "), cta: current.cta || generation.output.cta }));
    setNotice("Copia IA cargada");
  }

  async function createPublication(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!form.propertyId) { setError("Selecciona una propiedad"); return; }
    if (!form.copy.trim()) { setError("La copia es obligatoria"); return; }
    const createResponse = await apiFetch("/api/publications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: form.propertyId,
        platform: form.platform,
        copy: form.copy.trim(),
        hashtags: parseHashtags(form.hashtags),
        cta: form.cta.trim() || undefined
      })
    });
    const createPayload = (await createResponse.json()) as ApiResponse<PublicationRecord>;
    if (!createPayload.ok || !createPayload.data) { setError(createPayload.reason ?? "No se pudo crear la publicación"); return; }
    if (form.scheduledFor) {
      const scheduleResponse = await apiFetch(`/api/publications/${createPayload.data.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: new Date(form.scheduledFor).toISOString() })
      });
      const schedulePayload = (await scheduleResponse.json()) as ApiResponse<PublicationRecord>;
      if (!schedulePayload.ok) { setError(schedulePayload.reason ?? "Publicación creada pero no se pudo programar"); await loadPublications(); return; }
      setNotice("Publicación programada");
    } else {
      setNotice("Borrador creado");
    }
    setForm({ ...EMPTY_FORM, platform: form.platform, cta: defaultCta });
    await loadPublications(); await loadJobs();
  }

  async function scheduleRow(publication: PublicationRecord, localValue: string) {
    setError("");
    if (!localValue) { setError("Captura fecha y hora para programar"); return; }
    const response = await apiFetch(`/api/publications/${publication.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: new Date(localValue).toISOString() })
    });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo programar"); return; }
    setNotice("Publicación programada"); await loadPublications(); await loadJobs();
  }

  async function rowAction(publication: PublicationRecord, action: "publish" | "cancel") {
    setError("");
    const response = await apiFetch(`/api/publications/${publication.id}/${action}`, { method: "POST" });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo actualizar la publicación"); return; }
    setNotice(action === "publish" ? "Publicación publicada" : "Publicación cancelada");
    await loadPublications(); await loadJobs();
  }

  async function deleteRow(publication: PublicationRecord) {
    setError("");
    const response = await apiFetch(`/api/publications/${publication.id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiResponse<null>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo eliminar"); return; }
    setNotice("Publicación eliminada"); await loadPublications(); await loadJobs();
  }

  async function runScheduler() {
    setError(""); setNotice("");
    const response = await apiFetch("/api/scheduler/run", { method: "POST" });
    const payload = (await response.json()) as ApiResponse<{ processed: number; published: number; retried: number; failed: number; skipped: number }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo ejecutar el scheduler"); return; }
    const s = payload.data;
    setNotice(`Scheduler: ${s.processed} procesados, ${s.published} publicados, ${s.retried} en reintento, ${s.failed} fallidos, ${s.skipped} omitidos`);
    await loadPublications(); await loadJobs();
  }

  if (!session) return (
    <section className="workbench">
      <div className="card card-pad mx-auto w-full max-w-md">
        <h2 className="panel-title">Iniciar sesión</h2>
        <p className="panel-subtitle mt-1">Accede para programar tus publicaciones.</p>
        <form onSubmit={handleLogin} className="mt-4 grid gap-4">
          <label className="field">Email<input className="input" aria-label="Email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
          <label className="field">Password<input className="input" aria-label="Password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
          <div className="actions"><button type="submit" className="btn-primary w-full">Iniciar sesión</button></div>
        </form>
        {error && <div className="notice notice-error mt-4">{error}</div>}
      </div>
    </section>
  );

  return <section className="workbench">
    {error && <div className="notice notice-error">{error}</div>}{notice && <div className="notice">{notice}</div>}
    <div className="grid gap-6 xl:grid-cols-5">
      <form className="card card-pad xl:col-span-3" onSubmit={createPublication} data-testid="publication-form">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="panel-title">Nueva publicación</h2>
          <span className="badge badge-scheduled">Social</span>
        </div>
        <div className="form-grid">
          <label className="field">Propiedad<select className="input" aria-label="Propiedad" value={form.propertyId} onChange={(event) => updateField("propertyId", event.target.value)}><option value="">Selecciona...</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select></label>
          <label className="field">Canal<select className="input" aria-label="Canal" value={form.platform} onChange={(event) => updateField("platform", event.target.value as PublicationPlatform)}>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
          <label className="field">Programar para (opcional)<input className="input" aria-label="Programar para" type="datetime-local" value={form.scheduledFor} onChange={(event) => updateField("scheduledFor", event.target.value)} /></label>
          <label className="field form-span">Copia<textarea className="input" aria-label="Copia" rows={4} value={form.copy} onChange={(event) => updateField("copy", event.target.value)} /></label>
          <label className="field">Hashtags<input className="input" aria-label="Hashtags" placeholder="casa, monterrey" value={form.hashtags} onChange={(event) => updateField("hashtags", event.target.value)} /></label>
          <label className="field">CTA<input className="input" aria-label="CTA" value={form.cta} onChange={(event) => updateField("cta", event.target.value)} /></label>
        </div>
        <div className="actions"><button type="button" className="btn-secondary" onClick={() => void fetchAiCopy()}>Traer copia IA</button><button type="submit" className="btn-primary">{form.scheduledFor ? "Crear y programar" : "Crear borrador"}</button></div>
      </form>
      <div className="card card-pad overflow-hidden bg-indigo-950 text-white xl:col-span-2" data-testid="scheduler-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Scheduler</h2>
          <span className="rounded-full bg-indigo-900 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">{jobs.length} pendientes</span>
        </div>
        <div className="mt-4 grid gap-2.5">
          {jobs.map((job) => <div className="rounded-xl border border-indigo-800/70 bg-indigo-900/60 px-4 py-3" key={job.id}>
            <strong className="text-sm">{job.job_type}</strong>
            <div className="text-xs text-slate-400">Intentos: {job.attempts}/{job.max_attempts} · Próximo: {job.next_retry_at ? new Date(job.next_retry_at).toLocaleString() : "-"}</div>
          </div>)}
          {jobs.length === 0 && <p className="text-sm text-slate-400">Sin trabajos pendientes.</p>}
        </div>
        <div className="mt-4"><button type="button" className="btn w-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400" data-testid="scheduler-run" onClick={() => void runScheduler()}>Ejecutar scheduler</button></div>
      </div>
    </div>
    <form className="card card-pad" onSubmit={(event) => { event.preventDefault(); void loadPublications(); }} data-testid="publication-filters">
      <h2 className="panel-title mb-4">Publicaciones</h2>
      <div className="form-grid">
        <label className="field">Filtrar por estado<select className="input" aria-label="Filtrar estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="field">Filtrar por canal<select className="input" aria-label="Filtrar canal" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">Todos</option>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
      </div>
      <div className="actions"><button type="submit" className="btn-primary">Filtrar</button><button type="button" className="btn-secondary" onClick={() => { setStatusFilter(""); setPlatformFilter(""); }}>Limpiar</button></div>
    </form>
    <div className="card" data-testid="publication-list">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="panel-title">Cola de publicaciones</h2>
        <span className="badge badge-scheduled">{publications.length} registros</span>
      </div>
      <div className="p-5"><div className="list">{publications.map((publication) => <PublicationRow key={publication.id} publication={publication} propertyTitle={properties.find((property) => property.id === publication.property_id)?.title ?? publication.property_id} onSchedule={(localValue) => void scheduleRow(publication, localValue)} onPublish={() => void rowAction(publication, "publish")} onCancel={() => void rowAction(publication, "cancel")} onDelete={() => void deleteRow(publication)} />)}{publications.length === 0 && <p className="muted">No hay publicaciones para mostrar.</p>}</div></div>
    </div>
  </section>;
}
