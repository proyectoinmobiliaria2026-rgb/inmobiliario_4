"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { LeadRecord, LeadStatus } from "@/lib/types/lead";

type SessionUser = { id: string; email: string | null };
type ApiResponse<T> = { ok: boolean; data?: T; reason?: string };
type LeadFormState = { name: string; phone: string; email: string; origin: string; status: LeadStatus; notes: string; lastContactAt: string; nextFollowUpAt: string };

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost"];
const EMPTY_FORM: LeadFormState = { name: "", phone: "", email: "", origin: "", status: "new", notes: "", lastContactAt: "", nextFollowUpAt: "" };

function toInputDate(value: string | null) { return value ? value.slice(0, 16) : ""; }
function toForm(lead: LeadRecord): LeadFormState {
  return { name: lead.name, phone: lead.phone ?? "", email: lead.email ?? "", origin: lead.origin ?? "", status: lead.status, notes: lead.notes ?? "", lastContactAt: toInputDate(lead.last_contact_at), nextFollowUpAt: toInputDate(lead.next_follow_up_at) };
}
function toPayload(form: LeadFormState) {
  return { name: form.name.trim(), phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, origin: form.origin.trim() || undefined, status: form.status, notes: form.notes.trim() || undefined, lastContactAt: form.lastContactAt ? new Date(form.lastContactAt).toISOString() : undefined, nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined };
}

export function LeadsWorkbench() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("seed.agent@cfdigital.local");
  const [loginPassword, setLoginPassword] = useState("");
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [form, setForm] = useState<LeadFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const apiFetch = useCallback(async (url: string, init?: RequestInit) => fetch(url, { cache: "no-store", credentials: "same-origin", ...init }), []);
  const loadLeads = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", pageSize: "100" });
    if (statusFilter) params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());
    const response = await apiFetch(`/api/leads?${params}`);
    const payload = (await response.json()) as ApiResponse<{ items: LeadRecord[] }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudieron cargar los leads"); return; }
    setLeads(payload.data.items);
  }, [apiFetch, search, statusFilter]);

  useEffect(() => {
    void fetch("/api/auth/session", { credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as ApiResponse<SessionUser>;
      if (payload.ok && payload.data) { setSession(payload.data); }
    });
  }, []);
  useEffect(() => { if (session) void loadLeads(); }, [loadLeads, session]);

  function updateField(field: keyof LeadFormState, value: string) { setForm((current) => ({ ...current, [field]: value })); }
  function startCreate() { setEditingId(null); setForm(EMPTY_FORM); setError(""); }
  function startEdit(lead: LeadRecord) { setEditingId(lead.id); setForm(toForm(lead)); setError(""); }

  async function handleLogin(event: FormEvent) {
    event.preventDefault(); setError("");
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }) });
    const payload = (await response.json()) as ApiResponse<{ user: SessionUser }>;
    if (!payload.ok || !payload.data) { setError(payload.reason ?? "No se pudo iniciar sesión"); return; }
    setSession(payload.data.user); setLoginPassword(""); setNotice("Sesión iniciada");
  }

  async function submitLead(event: FormEvent) {
    event.preventDefault(); setError("");
    if (form.name.trim().length < 2) { setError("El nombre debe tener al menos 2 caracteres"); return; }
    if (!form.phone.trim() && !form.email.trim()) { setError("Captura teléfono o email"); return; }
    const response = await apiFetch(editingId ? `/api/leads/${editingId}` : "/api/leads", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(form)) });
    const payload = (await response.json()) as ApiResponse<LeadRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo guardar el lead"); return; }
    setNotice(editingId ? "Lead actualizado" : "Lead creado"); startCreate(); await loadLeads();
  }

  async function deleteLead(lead: LeadRecord) {
    const response = await apiFetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiResponse<null>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo eliminar el lead"); return; }
    setNotice("Lead eliminado"); await loadLeads();
  }

  async function changeStatus(lead: LeadRecord, status: LeadStatus) {
    const response = await apiFetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = (await response.json()) as ApiResponse<LeadRecord>;
    if (!payload.ok) { setError(payload.reason ?? "No se pudo actualizar el estado"); return; }
    await loadLeads();
  }

  if (!session) return (
    <section className="workbench">
      <div className="card card-pad mx-auto w-full max-w-md">
        <h2 className="panel-title">Iniciar sesión</h2>
        <p className="panel-subtitle mt-1">Accede para administrar tu CRM de leads.</p>
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
    <form className="card card-pad" onSubmit={submitLead} data-testid="lead-form">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="panel-title">{editingId ? "Editar lead" : "Nuevo lead"}</h2>
        <span className="badge badge-new">CRM</span>
      </div>
      <div className="form-grid">
        <label className="field">Nombre<input className="input" aria-label="Nombre" value={form.name} onChange={(event) => updateField("name", event.target.value)} /></label>
        <label className="field">Teléfono<input className="input" aria-label="Teléfono" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
        <label className="field">Email<input className="input" aria-label="Email del lead" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></label>
        <label className="field">Origen<input className="input" aria-label="Origen" placeholder="Portal, WhatsApp..." value={form.origin} onChange={(event) => updateField("origin", event.target.value)} /></label>
        <label className="field">Estado<select className="input" aria-label="Estado" value={form.status} onChange={(event) => updateField("status", event.target.value)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
        <label className="field">Próximo seguimiento<input className="input" aria-label="Próximo seguimiento" type="datetime-local" value={form.nextFollowUpAt} onChange={(event) => updateField("nextFollowUpAt", event.target.value)} /></label>
        <label className="field">Último contacto<input className="input" aria-label="Último contacto" type="datetime-local" value={form.lastContactAt} onChange={(event) => updateField("lastContactAt", event.target.value)} /></label>
        <label className="field form-span">Notas<textarea className="input" aria-label="Notas" rows={3} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} /></label>
      </div>
      <div className="actions"><button type="submit" className="btn-primary">{editingId ? "Guardar cambios" : "Crear lead"}</button>{editingId && <button type="button" className="btn-secondary" onClick={startCreate}>Cancelar</button>}</div>
    </form>
    <form className="card card-pad" onSubmit={(event) => { event.preventDefault(); void loadLeads(); }} data-testid="lead-filters">
      <h2 className="panel-title mb-4">Seguimiento</h2>
      <div className="form-grid">
        <label className="field">Búsqueda<input className="input" aria-label="Búsqueda" placeholder="Nombre, email o teléfono" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="field">Filtrar por estado<select className="input" aria-label="Filtrar por estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
      </div>
      <div className="actions"><button type="submit" className="btn-primary">Filtrar</button><button type="button" className="btn-secondary" onClick={() => { setSearch(""); setStatusFilter(""); }}>Limpiar</button></div>
    </form>
    <div className="card" data-testid="lead-list">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="panel-title">Pipeline de leads</h2>
        <span className="badge badge-contacted">{leads.length} activos</span>
      </div>
      <div className="p-5"><div className="list">{leads.map((lead) => <div className="property-row lead-row" key={lead.id}>
        <div className="min-w-40">
          <strong className="text-sm text-slate-900">{lead.name}</strong>
          <div className="muted">{lead.email ?? lead.phone} {lead.origin ? `· ${lead.origin}` : ""}</div>
        </div>
        <span className={`badge badge-${lead.status}`}>{lead.status}</span>
        <span className="muted">{lead.next_follow_up_at ? `Seguimiento: ${new Date(lead.next_follow_up_at).toLocaleString()}` : "Sin seguimiento"}</span>
        <div className="actions">
          <select className="input w-auto py-1.5 text-xs" aria-label={`Estado de ${lead.name}`} value={lead.status} onChange={(event) => void changeStatus(lead, event.target.value as LeadStatus)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
          <button type="button" className="btn-secondary" onClick={() => startEdit(lead)}>Editar</button>
          <button type="button" className="btn-danger" onClick={() => void deleteLead(lead)}>Eliminar lead</button>
        </div>
      </div>)}{leads.length === 0 && <p className="muted">No hay leads para mostrar.</p>}</div></div>
    </div>
  </section>;
}
