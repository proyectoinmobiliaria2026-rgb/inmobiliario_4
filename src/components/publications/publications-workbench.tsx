"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { fetchProfile } from "@/lib/auth/profile-client";
import type { PublicationMode, PublicationPlatform, PublicationRecord, PublicationStatus, SchedulerJobRecord, ManualActionRecord } from "@/lib/types/publication";

type SessionUser = { id: string; email: string | null };
type ApiResponse<T> = { ok: boolean; data?: T; reason?: string };
type PropertyOption = { id: string; title: string };
type SummaryRow = { mode: string; status: string; count: number };
type PublicationFormState = {
  propertyId: string;
  platform: PublicationPlatform;
  mode: PublicationMode;
  copy: string;
  hashtags: string;
  cta: string;
  scheduledFor: string;
  groupBatch: string;
  batchTimeSlot: "" | "morning" | "afternoon" | "evening";
};

const PLATFORMS: PublicationPlatform[] = ["facebook", "instagram", "whatsapp", "tiktok"];
const MODES: PublicationMode[] = ["assisted_manual", "direct_api", "local_test"];
const BATCH_SLOTS = ["morning", "afternoon", "evening"] as const;
const EMPTY_FORM: PublicationFormState = {
  propertyId: "",
  platform: "facebook",
  mode: "assisted_manual",
  copy: "",
  hashtags: "",
  cta: "",
  scheduledFor: "",
  groupBatch: "",
  batchTimeSlot: ""
};

const MODE_LABEL: Record<PublicationMode, string> = {
  assisted_manual: "Facebook (asistido manual)",
  direct_api: "Instagram / TikTok (API)",
  local_test: "Prueba local"
};

const MODE_HINT: Record<PublicationMode, string> = {
  assisted_manual: "Publicas manualmente en los grupos de Facebook. Requiere grupo y horario de lote.",
  direct_api: "Se publica por API oficial; quedará pendiente de confirmación externa.",
  local_test: "Modo de prueba, sin publicación real en ninguna red."
};

const STATUS_LABEL: Record<string, string> = {
  prepared: "Preparada",
  manual_queue: "En cola manual",
  ready_to_publish: "Lista para publicar",
  published_manually: "Publicada (manual)",
  api_submitted: "Enviada a la API",
  scheduled: "Programada",
  published: "Publicada",
  failed: "Fallida",
  cancelled: "Cancelada",
  skipped: "Omitida",
  draft: "Borrador"
};

function toInputDate(value: string | null) { return value ? value.slice(0, 16) : ""; }
function parseHashtags(raw: string): string[] | undefined {
  const tags = raw.split(/[,\s]+/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}
function truncate(text: string, max = 90) { return text.length > max ? `${text.slice(0, max)}...` : text; }
function isToday(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
function isFocusPublication(p: PublicationRecord) {
  if (p.status === "manual_queue" || p.status === "ready_to_publish" || p.status === "api_submitted") return true;
  if (p.status === "scheduled" && isToday(p.scheduled_for)) return true;
  return false;
}

export function PublicationsWorkbench() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("seed.agent@cfdigital.local");
  const [loginPassword, setLoginPassword] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [publications, setPublications] = useState<PublicationRecord[]>([]);
  const [jobs, setJobs] = useState<SchedulerJobRecord[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [form, setForm] = useState<PublicationFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [defaultCta, setDefaultCta] = useState("");
  const [expandedActions, setExpandedActions] = useState<Record<string, ManualActionRecord[]>>({});
  const [modal, setModal] = useState<{ publication: PublicationRecord; kind: "publish_manual" | "confirm_api" | "fail_api" } | null>(null);

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => fetch(url, { cache: "no-store", credentials: "same-origin", ...init }), []);

  const loadPublications = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (modeFilter) params.set("mode", modeFilter);
    if (platformFilter) params.set("platform", platformFilter);
    const response = await apiFetch(`/api/publications?${params}`);
    const payload = (await response.json()) as ApiResponse<{ items: PublicationRecord[] }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudieron cargar las publicaciones"); return; }
    setPublications(payload.data.items);
  }, [apiFetch, modeFilter, platformFilter, statusFilter]);

  const loadSummary = useCallback(async () => {
    const response = await apiFetch("/api/publications?summary=by_mode");
    const payload = (await response.json()) as ApiResponse<SummaryRow[]>;
    if (payload.ok && payload.data) setSummary(payload.data);
  }, [apiFetch]);

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

  useEffect(() => { if (session) { void loadPublications(); void loadSummary(); void loadJobs(); } }, [loadJobs, loadPublications, loadSummary, session]);

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
    if (form.mode === "assisted_manual" && (!form.groupBatch.trim() || !form.batchTimeSlot)) {
      setError("Para Facebook asistido, captura el nombre del grupo/lote y el horario de publicación.");
      return;
    }
    const body: Record<string, unknown> = {
      propertyId: form.propertyId,
      platform: form.platform,
      mode: form.mode,
      copy: form.copy.trim(),
      hashtags: parseHashtags(form.hashtags),
      cta: form.cta.trim() || undefined
    };
    if (form.mode === "assisted_manual") {
      body.groupBatch = form.groupBatch.trim();
      body.batchTimeSlot = form.batchTimeSlot;
    }
    const createResponse = await apiFetch("/api/publications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const createPayload = (await createResponse.json()) as ApiResponse<PublicationRecord>;
    if (!createPayload.ok || !createPayload.data) { setError(createPayload.reason ?? "No se pudo crear la publicación"); return; }
    if (form.mode === "direct_api" && form.scheduledFor) {
      const scheduleResponse = await apiFetch(`/api/publications/${createPayload.data.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledFor: new Date(form.scheduledFor).toISOString() })
      });
      const schedulePayload = (await scheduleResponse.json()) as ApiResponse<PublicationRecord>;
      if (!schedulePayload.ok) { setError(schedulePayload.reason ?? "Publicación creada pero no se pudo programar"); await loadPublications(); return; }
      setNotice("Publicación programada");
    } else {
      setNotice(form.mode === "assisted_manual" ? "Publicación creada (preparada)" : "Borrador creado");
    }
    setForm({ ...EMPTY_FORM, platform: form.platform, cta: defaultCta });
    await loadPublications(); await loadSummary(); await loadJobs();
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
    setNotice("Publicación programada"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function publishNow(publication: PublicationRecord) {
    setError("");
    const response = await apiFetch(`/api/publications/${publication.id}/publish`, { method: "POST" });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo publicar"); return; }
    setNotice(publication.mode === "direct_api" ? "Enviada a la API (pendiente de confirmación)" : "Publicación publicada");
    await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function performAction(publication: PublicationRecord, action: "moved_to_queue" | "marked_ready" | "published_manually" | "skipped" | "failed") {
    setError(""); setModal(null);
    const response = await apiFetch(`/api/publications/${publication.id}/manual-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo ejecutar la acción"); return; }
    setNotice("Acción aplicada"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function confirmApi(publication: PublicationRecord, externalId: string, publicationUrl: string) {
    setError(""); setModal(null);
    if (!externalId.trim()) { setError("El ID externo es obligatorio"); return; }
    const response = await apiFetch(`/api/publications/${publication.id}/confirm-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalId: externalId.trim(), publicationUrl: publicationUrl.trim() })
    });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo confirmar"); return; }
    setNotice("Publicación confirmada en la plataforma"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function failApi(publication: PublicationRecord, errorMessage: string) {
    setError(""); setModal(null);
    if (!errorMessage.trim()) { setError("El motivo del fallo es obligatorio"); return; }
    const response = await apiFetch(`/api/publications/${publication.id}/confirm-api`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ errorMessage: errorMessage.trim() })
    });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo marcar como fallida"); return; }
    setNotice("Publicación marcada como fallida"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function cancelRow(publication: PublicationRecord) {
    setError("");
    const response = await apiFetch(`/api/publications/${publication.id}/cancel`, { method: "POST" });
    const payload = (await response.json()) as ApiResponse<PublicationRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo cancelar"); return; }
    setNotice("Publicación cancelada"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function deleteRow(publication: PublicationRecord) {
    setError("");
    const response = await apiFetch(`/api/publications/${publication.id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiResponse<null>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo eliminar"); return; }
    setNotice("Publicación eliminada"); await loadPublications(); await loadSummary(); await loadJobs();
  }

  async function toggleHistory(publication: PublicationRecord) {
    setError("");
    setExpandedActions((current) => {
      if (current[publication.id]) {
        const next = { ...current };
        delete next[publication.id];
        return next;
      }
      return current;
    });
    if (expandedActions[publication.id]) return;
    const response = await apiFetch(`/api/publications/${publication.id}/manual-actions`);
    const payload = (await response.json()) as ApiResponse<ManualActionRecord[]>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo cargar el historial"); return; }
    setExpandedActions((current) => ({ ...current, [publication.id]: payload.data ?? [] }));
  }

  async function runScheduler() {
    setError(""); setNotice("");
    const response = await apiFetch("/api/scheduler/run", { method: "POST" });
    const payload = (await response.json()) as ApiResponse<{ processed: number; published: number; retried: number; failed: number; skipped: number }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo ejecutar el scheduler"); return; }
    const s = payload.data;
    setNotice(`Scheduler: ${s.processed} procesados, ${s.published} publicados, ${s.retried} en reintento, ${s.failed} fallidos, ${s.skipped} omitidos`);
    await loadPublications(); await loadSummary(); await loadJobs();
  }

  if (!session) return (
    <section className="workbench">
      <div className="card card-pad mx-auto w-full max-w-md">
        <h2 className="panel-title">Iniciar sesión</h2>
        <p className="panel-subtitle mt-1">Accede para gestionar tus publicaciones.</p>
        <form onSubmit={handleLogin} className="mt-4 grid gap-4">
          <label className="field">Email<input className="input" aria-label="Email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} /></label>
          <label className="field">Password<input className="input" aria-label="Password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} /></label>
          <div className="actions"><button type="submit" className="btn-primary w-full">Iniciar sesión</button></div>
        </form>
        {error && <div className="notice notice-error mt-4">{error}</div>}
      </div>
    </section>
  );

  const focusList = publications.filter(isFocusPublication);
  const summaryCount = (mode: string, status: string) => summary.find((row) => row.mode === mode && row.status === status)?.count ?? 0;

  return <section className="workbench" data-testid="publication-workbench">
    {error && <div className="notice notice-error">{error}</div>}{notice && <div className="notice">{notice}</div>}

    <div className="grid gap-6 xl:grid-cols-5">
      <form className="card card-pad xl:col-span-2" onSubmit={createPublication} data-testid="publication-form">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="panel-title">Nueva publicación</h2>
          <span className="badge badge-scheduled">Social</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <label className="field">Propiedad<select className="input" aria-label="Propiedad" value={form.propertyId} onChange={(event) => updateField("propertyId", event.target.value)}><option value="">Selecciona...</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.title}</option>)}</select></label>
          <label className="field">Canal<select className="input" aria-label="Canal" value={form.platform} onChange={(event) => updateField("platform", event.target.value as PublicationPlatform)}>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
          <label className="field">Modo de publicación
            <select className="input" aria-label="Modo" value={form.mode} onChange={(event) => updateField("mode", event.target.value as PublicationMode)}>{MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABEL[mode]}</option>)}</select>
          </label>
          <p className="muted -mt-1">{MODE_HINT[form.mode]}</p>
          {form.mode === "assisted_manual" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="field">Grupo / lote<select className="input" aria-label="Grupo o lote" value={form.groupBatch} onChange={(event) => updateField("groupBatch", event.target.value)}><option value="">Grupo 1</option><option value="Grupo 1">Grupo 1</option><option value="Grupo 2">Grupo 2</option><option value="Grupo 3">Grupo 3</option></select></label>
              <label className="field">Horario de lote<select className="input" aria-label="Horario de lote" value={form.batchTimeSlot} onChange={(event) => updateField("batchTimeSlot", event.target.value as PublicationFormState["batchTimeSlot"])}><option value="">Selecciona...</option>{BATCH_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
            </div>
          )}
          {form.mode === "direct_api" && (
            <label className="field">Programar para (opcional)<input className="input" aria-label="Programar para" type="datetime-local" value={form.scheduledFor} onChange={(event) => updateField("scheduledFor", event.target.value)} /></label>
          )}
          <label className="field">Copia<textarea className="input" aria-label="Copia" rows={4} value={form.copy} onChange={(event) => updateField("copy", event.target.value)} /></label>
          <label className="field">Hashtags<input className="input" aria-label="Hashtags" placeholder="casa, monterrey" value={form.hashtags} onChange={(event) => updateField("hashtags", event.target.value)} /></label>
          <label className="field">CTA<input className="input" aria-label="CTA" value={form.cta} onChange={(event) => updateField("cta", event.target.value)} /></label>
        </div>
        <div className="actions"><button type="button" className="btn-secondary" onClick={() => void fetchAiCopy()}>Traer copia IA</button><button type="submit" className="btn-primary">Crear</button></div>
      </form>

      <div className="card card-pad xl:col-span-3">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="panel-title">Enfocarse hoy</h2>
          <span className="badge badge-scheduled">{focusList.length} por atender</span>
        </div>
        <div className="list">
          {focusList.length === 0 && <p className="muted">Nada pendiente por hoy.</p>}
          {focusList.map((publication) => <PublicationRow
            key={publication.id}
            publication={publication}
            propertyTitle={properties.find((property) => property.id === publication.property_id)?.title ?? publication.property_id}
            expandedActions={expandedActions[publication.id]}
            onSchedule={(localValue) => void scheduleRow(publication, localValue)}
            onPublish={() => void publishNow(publication)}
            onPerformAction={(action) => void performAction(publication, action)}
            onOpenModal={(kind) => setModal({ publication, kind })}
            onCancel={() => void cancelRow(publication)}
            onDelete={() => void deleteRow(publication)}
            onToggleHistory={() => void toggleHistory(publication)}
          />)}
        </div>

        <form className="mt-6" onSubmit={(event) => { event.preventDefault(); void loadPublications(); }} data-testid="publication-filters">
          <h2 className="panel-title mb-3">Cola completa</h2>
          <div className="form-grid">
            <label className="field">Filtrar por estado<select className="input" aria-label="Filtrar estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{Object.keys(STATUS_LABEL).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}</select></label>
            <label className="field">Filtrar por modo<select className="input" aria-label="Filtrar modo" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option value="">Todos</option>{MODES.map((mode) => <option key={mode} value={mode}>{MODE_LABEL[mode]}</option>)}</select></label>
            <label className="field">Filtrar por canal<select className="input" aria-label="Filtrar canal" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="">Todos</option>{PLATFORMS.map((platform) => <option key={platform}>{platform}</option>)}</select></label>
          </div>
          <div className="actions"><button type="submit" className="btn-primary">Filtrar</button><button type="button" className="btn-secondary" onClick={() => { setStatusFilter(""); setModeFilter(""); setPlatformFilter(""); }}>Limpiar</button></div>
        </form>
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-5">
      <div className="card card-pad xl:col-span-3" data-testid="publication-list">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="panel-title">Cola de publicaciones</h2>
          <span className="badge badge-scheduled">{publications.length} registros</span>
        </div>
        <div className="mt-4"><div className="list">{publications.map((publication) => <PublicationRow
          key={publication.id}
          publication={publication}
          propertyTitle={properties.find((property) => property.id === publication.property_id)?.title ?? publication.property_id}
          expandedActions={expandedActions[publication.id]}
          onSchedule={(localValue) => void scheduleRow(publication, localValue)}
          onPublish={() => void publishNow(publication)}
          onPerformAction={(action) => void performAction(publication, action)}
          onOpenModal={(kind) => setModal({ publication, kind })}
          onCancel={() => void cancelRow(publication)}
          onDelete={() => void deleteRow(publication)}
          onToggleHistory={() => void toggleHistory(publication)}
        />)}{publications.length === 0 && <p className="muted">No hay publicaciones para mostrar.</p>}</div></div>
      </div>

      <div className="grid gap-6">
        <div className="card card-pad">
          <h2 className="panel-title mb-3">Resumen por modo</h2>
          <div className="grid gap-2 text-sm">
            {MODES.map((mode) => (
              <div key={mode} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>{MODE_LABEL[mode]}</span>
                <span className="font-semibold">{["prepared", "manual_queue", "ready_to_publish", "published_manually", "draft", "scheduled", "api_submitted", "published", "failed", "skipped", "cancelled"].reduce((acc, status) => acc + summaryCount(mode, status), 0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad overflow-hidden bg-indigo-950 text-white" data-testid="scheduler-panel">
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
    </div>

    {modal && <ActionModal
      modal={modal}
      onCancel={() => setModal(null)}
      onConfirmManual={() => void performAction(modal.publication, "published_manually")}
      onConfirmApi={(externalId, url) => void confirmApi(modal.publication, externalId, url)}
      onFailApi={(reason) => void failApi(modal.publication, reason)}
    />}
  </section>;
}

function PublicationRow({ publication, propertyTitle, expandedActions, onSchedule, onPublish, onPerformAction, onOpenModal, onCancel, onDelete, onToggleHistory }: {
  publication: PublicationRecord;
  propertyTitle: string;
  expandedActions?: ManualActionRecord[];
  onSchedule: (localValue: string) => void;
  onPublish: () => void;
  onPerformAction: (action: "moved_to_queue" | "marked_ready" | "published_manually" | "skipped" | "failed") => void;
  onOpenModal: (kind: "publish_manual" | "confirm_api" | "fail_api") => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleHistory: () => void;
}) {
  const [dateValue, setDateValue] = useState(toInputDate(publication.scheduled_for));
  const terminal = ["published_manually", "published", "cancelled", "skipped"].includes(publication.status);
  const actionable = !terminal;
  const statusText = publication.status === "published_manually"
    ? "Confirmada manualmente"
    : publication.status === "api_submitted"
      ? "Enviada a la API, pendiente de confirmación"
      : publicationDetail(publication);

  const directApiSchedulable = publication.mode === "direct_api" && (publication.status === "draft" || publication.status === "scheduled" || publication.status === "failed");

  return <div className="property-row publication-row items-start">
    <div className="min-w-48 flex-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`badge badge-mode-${publication.mode}`}>{MODE_LABEL_SHORT[publication.mode]}</span>
        <span className={`badge badge-${publication.status}`}>{STATUS_LABEL[publication.status] ?? publication.status}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <strong className="text-sm text-slate-900">{propertyTitle}</strong>
        <span className="muted text-xs">{publication.platform}</span>
      </div>
      <div className="muted">{truncate(publication.payload?.copy ?? "")}</div>
      <div className="muted text-xs">{statusText}</div>
      {publication.group_batch && <div className="muted text-xs">Grupo: {publication.group_batch} · {publication.batch_time_slot}</div>}
      {publication.external_id && <div className="muted text-xs">ID externo: {publication.external_id}</div>}
      {expandedActions && expandedActions.length > 0 && (
        <div className="mt-2 grid gap-1 text-xs text-slate-500">
          {expandedActions.map((action) => <div key={action.id}><strong>{action.action}</strong> · {new Date(action.created_at).toLocaleString()}</div>)}
        </div>
      )}
    </div>
    <div className="actions">
      {actionable && publication.mode === "assisted_manual" && (
        <>
          {publication.status === "prepared" && <button type="button" className="btn-primary" onClick={() => onPerformAction("moved_to_queue")}>Mover a cola</button>}
          {publication.status === "manual_queue" && <button type="button" className="btn-primary" onClick={() => onPerformAction("marked_ready")}>Listo para publicar</button>}
          {publication.status === "ready_to_publish" && <button type="button" className="btn-primary" onClick={() => onOpenModal("publish_manual")}>Confirmar publicación</button>}
          {publication.status === "failed" && <button type="button" className="btn-ghost" onClick={onDelete}>Eliminar fallida</button>}
        </>
      )}
      {actionable && publication.mode === "direct_api" && publication.status !== "api_submitted" && (
        <>
          <button type="button" className="btn-primary" onClick={onPublish}>Publicar ahora</button>
          {directApiSchedulable && <input className="input w-auto py-1.5 text-xs" aria-label={`Fecha de publicación ${publication.id}`} type="datetime-local" value={dateValue} onChange={(event) => setDateValue(event.target.value)} />}
          {directApiSchedulable && <button type="button" className="btn-secondary" onClick={() => onSchedule(dateValue)}>Programar</button>}
        </>
      )}
      {actionable && publication.mode === "direct_api" && publication.status === "api_submitted" && (
        <>
          <button type="button" className="btn-primary" onClick={() => onOpenModal("confirm_api")}>Confirmar</button>
          <button type="button" className="btn-secondary" onClick={() => onOpenModal("fail_api")}>Marcar falló</button>
        </>
      )}
      {actionable && publication.mode === "local_test" && (publication.status === "draft" || publication.status === "failed") && <button type="button" className="btn-primary" onClick={onPublish}>Publicar ahora</button>}
      {actionable && (publication.status === "draft" || publication.status === "prepared" || publication.status === "manual_queue" || publication.status === "ready_to_publish" || publication.status === "scheduled" || publication.status === "failed") && <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>}
      <button type="button" className="btn-ghost" onClick={onToggleHistory}>Historial</button>
      <button type="button" className="btn-danger" onClick={onDelete}>Eliminar</button>
    </div>
  </div>;
}

function publicationDetail(publication: PublicationRecord): string {
  if (publication.status === "scheduled" && publication.scheduled_for) return `Programada: ${new Date(publication.scheduled_for).toLocaleString()}`;
  if (publication.status === "published_manually") return `Confirmada: ${publication.executed_at ? new Date(publication.executed_at).toLocaleString() : ""}`.trim();
  if (publication.executed_at) return `Ejecutada: ${new Date(publication.executed_at).toLocaleString()}`;
  return publication.error_message ? `Fallo: ${truncate(publication.error_message, 60)}` : "Sin ejecutar";
}

function ActionModal({ modal, onCancel, onConfirmManual, onConfirmApi, onFailApi }: {
  modal: { publication: PublicationRecord; kind: "publish_manual" | "confirm_api" | "fail_api" };
  onCancel: () => void;
  onConfirmManual: () => void;
  onConfirmApi: (externalId: string, url: string) => void;
  onFailApi: (reason: string) => void;
}) {
  const [externalId, setExternalId] = useState("");
  const [publicationUrl, setPublicationUrl] = useState("");
  const [failReason, setFailReason] = useState("");

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true">
    <div className="card card-pad w-full max-w-md">
      {modal.kind === "publish_manual" && (
        <>
          <h3 className="panel-title">Confirmar publicación manual</h3>
          <p className="panel-subtitle mt-1">Confirma que ya publicaste el contenido en Facebook ({modal.publication.platform}). Esto marca la publicación como publicada manualmente.</p>
          <div className="actions mt-4"><button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button><button type="button" className="btn-primary" onClick={onConfirmManual}>Confirmar publicación</button></div>
        </>
      )}
      {modal.kind === "confirm_api" && (
        <>
          <h3 className="panel-title">Confirmar publicación en la plataforma</h3>
          <p className="panel-subtitle mt-1">La API devolvió la publicación. Captura el ID externo que devolvió la plataforma y la URL.</p>
          <div className="mt-4 grid gap-3">
            <label className="field">ID externo<input className="input" aria-label="ID externo" value={externalId} onChange={(event) => setExternalId(event.target.value)} /></label>
            <label className="field">URL de la publicación<input className="input" aria-label="URL de la publicación" value={publicationUrl} onChange={(event) => setPublicationUrl(event.target.value)} /></label>
          </div>
          <div className="actions mt-4"><button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button><button type="button" className="btn-primary" onClick={() => onConfirmApi(externalId, publicationUrl)}>Confirmar</button></div>
        </>
      )}
      {modal.kind === "fail_api" && (
        <>
          <h3 className="panel-title">Marcar como fallida</h3>
          <p className="panel-subtitle mt-1">La plataforma rechazó la publicación. Captura el motivo del fallo.</p>
          <div className="mt-4 grid gap-3">
            <label className="field">Motivo<input className="input" aria-label="Motivo del fallo" value={failReason} onChange={(event) => setFailReason(event.target.value)} /></label>
          </div>
          <div className="actions mt-4"><button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button><button type="button" className="btn-danger" onClick={() => onFailApi(failReason)}>Marcar fallida</button></div>
        </>
      )}
    </div>
  </div>;
}

const MODE_LABEL_SHORT: Record<PublicationMode, string> = {
  assisted_manual: "Facebook",
  direct_api: "API",
  local_test: "Test"
};
