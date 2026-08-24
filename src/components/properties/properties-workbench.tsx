"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AMENITY_LABELS,
  AMENITY_OPTIONS,
  OPERATION_TYPE_LABELS,
  OPERATION_TYPES,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUSES,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  RENTAL_REQUIREMENT_LABELS,
  RENTAL_REQUIREMENT_OPTIONS
} from "@/lib/types/property";

type SessionUser = {
  id: string;
  email: string | null;
};

type PropertyItem = {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  operation_type: string;
  status: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  price_amount: number | null;
  price_currency: string | null;
  amenities: string[] | null;
  rental_requirements: string[] | null;
};

type MediaItem = {
  id: string;
  kind: "image" | "video";
  state: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  signed_url: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  reason?: string;
};

type PropertyListData = {
  items: PropertyItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FilterState = {
  status: string;
  propertyType: string;
  operationType: string;
  search: string;
};

type GenerationItem = {
  id: string;
  channel: string;
  provider: string;
  status: string;
  output: {
    copy?: string;
    hashtags?: string[];
    cta?: string;
  };
  created_at: string;
};

const CONTENT_CHANNELS = ["facebook", "instagram", "whatsapp"];

const EMPTY_FILTERS: FilterState = {
  status: "",
  propertyType: "",
  operationType: "",
  search: ""
};

type PropertyFormState = {
  title: string;
  description: string;
  propertyType: string;
  operationType: string;
  status: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpots: string;
  priceAmount: string;
  priceCurrency: string;
  amenities: string[];
  rentalRequirements: string[];
};

const MEDIA_KINDS = ["image", "video"];
const MEDIA_STATES = ["original", "processed", "edited", "generated"];
const CURRENCIES = ["USD", "MXN", "EUR"];

const EMPTY_FORM: PropertyFormState = {
  title: "",
  description: "",
  propertyType: "apartment",
  operationType: "sale",
  status: "draft",
  addressLine: "",
  city: "",
  state: "",
  country: "MX",
  bedrooms: "",
  bathrooms: "",
  parkingSpots: "",
  priceAmount: "",
  priceCurrency: "MXN",
  amenities: [],
  rentalRequirements: []
};

function toFormState(property: PropertyItem): PropertyFormState {
  return {
    title: property.title,
    description: property.description ?? "",
    propertyType: property.property_type,
    operationType: property.operation_type,
    status: property.status,
    addressLine: property.address_line ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    country: property.country ?? "",
    bedrooms: property.bedrooms?.toString() ?? "",
    bathrooms: property.bathrooms?.toString() ?? "",
    parkingSpots: property.parking_spots?.toString() ?? "",
    priceAmount: property.price_amount?.toString() ?? "",
    priceCurrency: property.price_currency ?? "MXN",
    amenities: property.amenities ?? [],
    rentalRequirements: property.rental_requirements ?? []
  };
}

function validatePropertyForm(form: PropertyFormState): string[] {
  const errors: string[] = [];
  const title = form.title.trim();

  if (title.length < 5 || title.length > 120) {
    errors.push("El título debe tener entre 5 y 120 caracteres");
  }
  if (!(PROPERTY_TYPES as readonly string[]).includes(form.propertyType)) {
    errors.push("Selecciona un tipo de propiedad válido");
  }
  if (!(OPERATION_TYPES as readonly string[]).includes(form.operationType)) {
    errors.push("Selecciona una operación válida");
  }

  for (const field of ["bedrooms", "bathrooms", "parkingSpots"] as const) {
    const raw = form[field].trim();
    if (raw === "") continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
      errors.push("Recámaras, baños y estacionamientos deben ser enteros mayores o iguales a 0");
    }
  }

  for (const field of ["priceAmount"] as const) {
    const raw = form[field].trim();
    if (raw === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      errors.push("El precio debe ser un número mayor o igual a 0");
    }
  }

  if (form.status === "published") {
    if (form.description.trim().length < 20) {
      errors.push("Para publicar la descripción necesita al menos 20 caracteres");
    }
    if (!(Number(form.priceAmount) > 0)) {
      errors.push("Para publicar el precio debe ser mayor a 0");
    }
    if (!form.addressLine.trim() || !form.city.trim() || !form.country.trim()) {
      errors.push("Para publicar se requiere dirección, ciudad y país");
    }
  }

  return errors;
}

function buildPropertyPayload(form: PropertyFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    propertyType: form.propertyType,
    operationType: form.operationType,
    status: form.status,
    priceCurrency: form.priceCurrency
  };

  const description = form.description.trim();
  if (description) payload.description = description;
  const addressLine = form.addressLine.trim();
  if (addressLine) payload.addressLine = addressLine;
  const city = form.city.trim();
  if (city) payload.city = city;
  const stateRegion = form.state.trim();
  if (stateRegion) payload.state = stateRegion;
  const country = form.country.trim();
  if (country) payload.country = country;

  for (const key of ["bedrooms", "bathrooms", "parkingSpots", "priceAmount"] as const) {
    const raw = form[key].trim();
    if (raw !== "") payload[key] = Number(raw);
  }

  if (form.amenities.length > 0) payload.amenities = form.amenities;
  if (form.rentalRequirements.length > 0) payload.rentalRequirements = form.rentalRequirements;

  return payload;
}

export function PropertiesWorkbench() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [loginEmail, setLoginEmail] = useState("seed.agent@cfdigital.local");
  const [loginPassword, setLoginPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [savingProperty, setSavingProperty] = useState(false);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaKind, setMediaKind] = useState("image");
  const [mediaState, setMediaState] = useState("original");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [contentChannel, setContentChannel] = useState("facebook");
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingListing, setGeneratingListing] = useState(false);

  const apiFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    const first = await fetch(url, { cache: "no-store", ...init, credentials: "same-origin" });
    if (first.status !== 401) {
      return first;
    }

    const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
    if (!refreshed.ok) {
      return first;
    }

    const refreshPayload = (await refreshed.json()) as ApiResponse<{ user: SessionUser }>;
    if (refreshPayload.ok && refreshPayload.data) {
      setSession(refreshPayload.data.user);
    }

    return fetch(url, { cache: "no-store", ...init, credentials: "same-origin" });
  }, []);

  const loadProperties = useCallback(
    async (overrides?: { page?: number; filters?: FilterState }) => {
      const activePage = overrides?.page ?? page;
      const activeFilters = overrides?.filters ?? filters;

      const params = new URLSearchParams();
      params.set("page", String(activePage));
      params.set("pageSize", "10");
      if (activeFilters.status) params.set("status", activeFilters.status);
      if (activeFilters.propertyType) params.set("propertyType", activeFilters.propertyType);
      if (activeFilters.operationType) params.set("operationType", activeFilters.operationType);
      if (activeFilters.search.trim()) params.set("search", activeFilters.search.trim());

      const response = await apiFetch(`/api/properties?${params.toString()}`);
      const payload = (await response.json()) as ApiResponse<PropertyListData>;
      if (!payload.ok || !payload.data) {
        if (response.status === 401) {
          setSession(null);
        }
        setError(payload.reason ?? "No se pudieron cargar las propiedades");
        return;
      }
      setProperties(payload.data.items);
      setTotal(payload.data.total);
      setTotalPages(payload.data.totalPages);
    },
    [apiFetch, page, filters]
  );

  const loadMedia = useCallback(
    async (propertyId: string) => {
      const response = await apiFetch(`/api/properties/${propertyId}/media`);
      const payload = (await response.json()) as ApiResponse<MediaItem[]>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo cargar la multimedia");
        return;
      }
      setMedia(payload.data);
    },
    [apiFetch]
  );

  const loadGenerations = useCallback(
    async (propertyId: string) => {
      const response = await apiFetch(`/api/properties/${propertyId}/generations`);
      const payload = (await response.json()) as ApiResponse<GenerationItem[]>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo cargar el historial de contenido");
        return;
      }
      setGenerations(payload.data);
    },
    [apiFetch]
  );

  useEffect(() => {
    async function bootstrap() {
      const response = await fetch("/api/auth/session", { credentials: "same-origin" });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as ApiResponse<SessionUser>;
      if (payload.ok && payload.data) {
        setSession(payload.data);
        await loadProperties();
      }
    }

    void bootstrap();
  }, [loadProperties]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
    });

    const payload = (await response.json()) as ApiResponse<{ user: SessionUser }>;
    if (!payload.ok || !payload.data) {
      setError(payload.reason ?? "No se pudo iniciar sesión");
      return;
    }

    setSession(payload.data.user);
    setLoginPassword("");
    setNotice("Sesión iniciada");
    await loadProperties();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setSession(null);
    setProperties([]);
    setMedia([]);
    setGenerations([]);
    setSelectedPropertyId(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
    setNotice("Sesión cerrada");
  }

  async function handleRefreshSession() {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
    const payload = (await response.json()) as ApiResponse<{ user: SessionUser }>;
    if (!payload.ok || !payload.data) {
      setSession(null);
      setError("La sesión no pudo renovarse");
      return;
    }
    setSession(payload.data.user);
    setNotice("Sesión renovada");
  }

  function updateField(field: keyof PropertyFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateFilter(field: keyof FilterState, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function toggleListItem(field: "amenities" | "rentalRequirements", value: string) {
    setForm((current) => {
      const list = current[field];
      return { ...current, [field]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] };
    });
  }

  async function generateListingDraft() {
    setError("");
    setNotice("");

    if (!form.propertyType || !form.operationType) {
      setError("Selecciona tipo de propiedad y operación antes de generar con IA");
      return;
    }

    setGeneratingListing(true);
    try {
      const response = await apiFetch("/api/properties/ai-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyType: form.propertyType,
          operationType: form.operationType,
          city: form.city.trim() || undefined,
          bedrooms: form.bedrooms.trim() ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms.trim() ? Number(form.bathrooms) : undefined,
          parkingSpots: form.parkingSpots.trim() ? Number(form.parkingSpots) : undefined,
          priceAmount: form.priceAmount.trim() ? Number(form.priceAmount) : undefined,
          priceCurrency: form.priceCurrency,
          amenities: form.amenities,
          rentalRequirements: form.rentalRequirements
        })
      });

      const payload = (await response.json()) as ApiResponse<{ title: string; description: string }>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo generar el anuncio con IA");
        return;
      }

      setForm((current) => ({ ...current, title: payload.data!.title, description: payload.data!.description }));
      setNotice("Título y descripción generados con IA. Revisa y ajusta lo que necesites.");
    } finally {
      setGeneratingListing(false);
    }
  }

  async function applyFilters(event: FormEvent) {
    event.preventDefault();
    setError("");
    await loadProperties({ page: 1 });
  }

  async function clearFilters() {
    setError("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
    await loadProperties({ page: 1, filters: EMPTY_FILTERS });
  }

  async function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;
    setError("");
    setPage(nextPage);
    await loadProperties({ page: nextPage });
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors([]);
  }

  function startEdit(property: PropertyItem) {
    setEditingId(property.id);
    setForm(toFormState(property));
    setFormErrors([]);
  }

  async function submitProperty(event: FormEvent) {
    event.preventDefault();
    setError("");

    const validation = validatePropertyForm(form);
    setFormErrors(validation);
    if (validation.length > 0) {
      return;
    }

    setSavingProperty(true);
    try {
      const url = editingId ? `/api/properties/${editingId}` : "/api/properties";
      const response = await apiFetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPropertyPayload(form))
      });

      const payload = (await response.json()) as ApiResponse<PropertyItem>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo guardar la propiedad");
        return;
      }

      setNotice(editingId ? "Propiedad actualizada" : "Propiedad creada");
      setForm(EMPTY_FORM);
      setEditingId(null);
      setFormErrors([]);
      await loadProperties();
    } finally {
      setSavingProperty(false);
    }
  }

  async function publishProperty(property: PropertyItem) {
    setError("");
    const response = await apiFetch(`/api/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" })
    });

    const payload = (await response.json()) as ApiResponse<PropertyItem>;
    if (!payload.ok || !payload.data) {
      setError(payload.reason ?? "No se pudo publicar la propiedad");
      return;
    }

    setNotice("Propiedad publicada");
    await loadProperties();
  }

  async function deleteProperty(property: PropertyItem) {
    setError("");
    const response = await apiFetch(`/api/properties/${property.id}`, { method: "DELETE" });
    const payload = (await response.json()) as ApiResponse<null>;
    if (!payload.ok) {
      setError(payload.reason ?? "No se pudo eliminar la propiedad");
      return;
    }

    if (selectedPropertyId === property.id) {
      setSelectedPropertyId(null);
      setMedia([]);
      setGenerations([]);
    }

    setNotice("Propiedad eliminada");
    await loadProperties();
  }

  async function selectPropertyForMedia(property: PropertyItem) {
    setSelectedPropertyId(property.id);
    setMedia([]);
    await loadMedia(property.id);
  }

  async function selectPropertyForContent(property: PropertyItem) {
    setSelectedPropertyId(property.id);
    setGenerations([]);
    await loadGenerations(property.id);
  }

  async function generateContent(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedPropertyId) {
      setError("Selecciona una propiedad primero");
      return;
    }

    setGenerating(true);
    try {
      const response = await apiFetch(`/api/properties/${selectedPropertyId}/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: contentChannel })
      });

      const payload = (await response.json()) as ApiResponse<GenerationItem>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo generar el contenido");
        return;
      }

      setNotice("Contenido generado");
      setGenerations((current) => [payload.data as GenerationItem, ...current]);
    } finally {
      setGenerating(false);
    }
  }

  async function submitMedia(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!selectedPropertyId) {
      setError("Selecciona una propiedad primero");
      return;
    }
    if (!mediaFile) {
      setError("Selecciona un archivo");
      return;
    }

    const expectedPrefix = mediaKind === "image" ? "image/" : "video/";
    if (!mediaFile.type.startsWith(expectedPrefix)) {
      setError(`El archivo debe ser de tipo ${expectedPrefix}*`);
      return;
    }

    const formData = new FormData();
    formData.set("kind", mediaKind);
    formData.set("state", mediaState);
    formData.set("file", mediaFile);

    setUploadingMedia(true);
    try {
      const response = await apiFetch(`/api/properties/${selectedPropertyId}/media`, {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as ApiResponse<MediaItem>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo subir el archivo");
        return;
      }

      setNotice("Archivo subido");
      setMediaFile(null);
      await loadMedia(selectedPropertyId);
    } finally {
      setUploadingMedia(false);
    }
  }

  async function markMediaProcessed(mediaId: string) {
    if (!selectedPropertyId) return;
    setError("");

    const response = await apiFetch(`/api/properties/${selectedPropertyId}/media/${mediaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "processed" })
    });

    const payload = (await response.json()) as ApiResponse<MediaItem>;
    if (!payload.ok || !payload.data) {
      setError(payload.reason ?? "No se pudo actualizar el archivo");
      return;
    }

    await loadMedia(selectedPropertyId);
  }

  async function deleteMedia(mediaId: string) {
    if (!selectedPropertyId) return;
    setError("");

    const response = await apiFetch(`/api/properties/${selectedPropertyId}/media/${mediaId}`, {
      method: "DELETE"
    });
    const payload = (await response.json()) as ApiResponse<null>;
    if (!payload.ok) {
      setError(payload.reason ?? "No se pudo eliminar el archivo");
      return;
    }

    await loadMedia(selectedPropertyId);
  }

  if (!session) {
    return (
      <section className="workbench">
        <div className="card card-pad mx-auto w-full max-w-md">
          <h2 className="panel-title">Iniciar sesión</h2>
          <p className="panel-subtitle mt-1">Accede con tu cuenta para administrar propiedades y multimedia.</p>
          <form onSubmit={handleLogin} className="mt-4 grid gap-4">
            <label className="field">
              Email
              <input className="input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" autoComplete="email" />
            </label>
            <label className="field">
              Password
              <input className="input" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" autoComplete="current-password" />
            </label>
            <div className="actions">
              <button type="submit" className="btn-primary w-full">Iniciar sesión</button>
            </div>
          </form>
          {error && <div className="notice notice-error mt-4">{error}</div>}
        </div>
      </section>
    );
  }

  const selectedProperty = properties.find((item) => item.id === selectedPropertyId) ?? null;

  return (
    <section className="workbench">
      <div className="card card-pad flex flex-wrap items-center justify-between gap-3">
        <div className="session-bar">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
            {(session.email ?? "?").charAt(0).toUpperCase()}
          </span>
          <span data-testid="session-status" className="text-sm font-medium text-slate-700">{session.email ?? session.id}</span>
        </div>
        <div className="actions pt-0">
          <button type="button" onClick={handleRefreshSession} className="btn-secondary">Renovar sesión</button>
          <button type="button" onClick={handleLogout} className="btn-ghost">Cerrar sesión</button>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <form className="card card-pad" onSubmit={submitProperty} data-testid="property-form">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="panel-title">{editingId ? "Editar propiedad" : "Nueva propiedad"}</h2>
          <button type="button" onClick={() => void generateListingDraft()} disabled={generatingListing} className="btn bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:opacity-90">
            {generatingListing ? "Generando..." : "Generar con IA"}
          </button>
        </div>
        <div className="form-grid">
          <label className="field form-span">
            Título
            <input className="input" value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Lo genera la IA o escríbelo tú" />
          </label>
          <label className="field form-span">
            Descripción
            <textarea className="input" rows={3} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Lo genera la IA con las amenidades y requisitos de abajo" />
          </label>
          <label className="field">
            Tipo de propiedad
            <select className="input" value={form.propertyType} onChange={(e) => updateField("propertyType", e.target.value)}>
              {PROPERTY_TYPES.map((item) => (
                <option key={item} value={item}>{PROPERTY_TYPE_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Operación
            <select className="input" value={form.operationType} onChange={(e) => updateField("operationType", e.target.value)}>
              {OPERATION_TYPES.map((item) => (
                <option key={item} value={item}>{OPERATION_TYPE_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Estado de publicación
            <select className="input" value={form.status} onChange={(e) => updateField("status", e.target.value)}>
              {PROPERTY_STATUSES.map((item) => (
                <option key={item} value={item}>{PROPERTY_STATUS_LABELS[item]}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Dirección
            <input className="input" value={form.addressLine} onChange={(e) => updateField("addressLine", e.target.value)} />
          </label>
          <label className="field">
            Ciudad
            <input className="input" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
          </label>
          <label className="field">
            Estado/Región
            <input className="input" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
          </label>
          <label className="field">
            País
            <input className="input" value={form.country} onChange={(e) => updateField("country", e.target.value)} />
          </label>
          <label className="field">
            Recámaras
            <input className="input" type="number" min={0} value={form.bedrooms} onChange={(e) => updateField("bedrooms", e.target.value)} />
          </label>
          <label className="field">
            Baños
            <input className="input" type="number" min={0} value={form.bathrooms} onChange={(e) => updateField("bathrooms", e.target.value)} />
          </label>
          <label className="field">
            Estacionamientos
            <input className="input" type="number" min={0} value={form.parkingSpots} onChange={(e) => updateField("parkingSpots", e.target.value)} />
          </label>
          <label className="field">
            Precio
            <input className="input" type="number" min={0} step="0.01" value={form.priceAmount} onChange={(e) => updateField("priceAmount", e.target.value)} />
          </label>
          <label className="field">
            Moneda
            <select className="input" value={form.priceCurrency} onChange={(e) => updateField("priceCurrency", e.target.value)}>
              {CURRENCIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mt-5 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">Amenidades</legend>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((amenity) => {
              const checked = form.amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    checked ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600" checked={checked} onChange={() => toggleListItem("amenities", amenity)} />
                  {checked ? "✓ " : ""}{AMENITY_LABELS[amenity]}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-4 rounded-xl border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">Requisitos de contratación (renta)</legend>
          <div className="flex flex-wrap gap-2">
            {RENTAL_REQUIREMENT_OPTIONS.map((requirement) => {
              const checked = form.rentalRequirements.includes(requirement);
              return (
                <label
                  key={requirement}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    checked ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input type="checkbox" className="h-3.5 w-3.5 accent-indigo-600" checked={checked} onChange={() => toggleListItem("rentalRequirements", requirement)} />
                  {checked ? "✓ " : ""}{RENTAL_REQUIREMENT_LABELS[requirement]}
                </label>
              );
            })}
          </div>
        </fieldset>

        {formErrors.length > 0 && (
          <ul className="error-list mt-4">
            {formErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <div className="actions">
          <button type="submit" disabled={savingProperty} className="btn-primary">
            {editingId ? "Guardar cambios" : "Crear propiedad"}
          </button>
          {editingId && (
            <button type="button" onClick={startCreate} className="btn-secondary">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <form className="card card-pad" onSubmit={applyFilters} data-testid="property-filters">
        <h2 className="panel-title mb-4">Filtros</h2>
        <div className="form-grid">
          <label className="field">
            Búsqueda
            <input className="input" value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} placeholder="Buscar por título..." />
          </label>
          <label className="field">
            Filtrar por estado
            <select className="input" value={filters.status} onChange={(e) => updateFilter("status", e.target.value)}>
              <option value="">Todos</option>
              {PROPERTY_STATUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Filtrar por tipo
            <select className="input" value={filters.propertyType} onChange={(e) => updateFilter("propertyType", e.target.value)}>
              <option value="">Todos</option>
              {PROPERTY_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Filtrar por operación
            <select className="input" value={filters.operationType} onChange={(e) => updateFilter("operationType", e.target.value)}>
              <option value="">Todas</option>
              {OPERATION_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="submit" className="btn-primary">Filtrar</button>
          <button type="button" onClick={clearFilters} className="btn-secondary">Limpiar</button>
        </div>
      </form>

      <div className="card" data-testid="property-list">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="panel-title">Inventario</h2>
          <span className="badge badge-published">{total} registros</span>
        </div>
        <div className="p-5">
          <div className="list">
            {properties.map((property) => (
              <div key={property.id} className="property-row">
                <div className="min-w-40">
                  <strong className="text-sm text-slate-900">{property.title}</strong>
                  <div className="muted">
                    {PROPERTY_TYPE_LABELS[property.property_type] ?? property.property_type} · {OPERATION_TYPE_LABELS[property.operation_type] ?? property.operation_type}
                  </div>
                </div>
                <span className={`badge badge-${property.status}`}>{PROPERTY_STATUS_LABELS[property.status] ?? property.status}</span>
                <span className="muted">
                  {property.city ?? "—"} · {property.price_amount ?? "—"} {property.price_currency ?? ""}
                </span>
                <div className="actions">
                  <button type="button" onClick={() => startEdit(property)} className="btn-secondary">Editar</button>
                  {property.status !== "published" && (
                    <button type="button" onClick={() => publishProperty(property)} className="btn-primary">Publicar</button>
                  )}
                  <button type="button" onClick={() => selectPropertyForMedia(property)} className="btn-secondary">Media</button>
                  <button type="button" onClick={() => selectPropertyForContent(property)} className="btn-secondary">Contenido</button>
                  <button type="button" onClick={() => window.open(`/properties/${property.id}/ficha`, "_blank")} className="btn-secondary">Generar PDF</button>
                  <button type="button" onClick={() => deleteProperty(property)} className="btn-danger">Eliminar propiedad</button>
                </div>
              </div>
            ))}
            {properties.length === 0 && <p className="muted">Sin propiedades todavía.</p>}
          </div>
          <div className="pagination" data-testid="pagination">
            <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} className="btn-secondary">Anterior</button>
            <span className="muted">
              Página {page} de {totalPages}
            </span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="btn-secondary">Siguiente</button>
          </div>
        </div>
      </div>

      {selectedPropertyId && (
        <div className="card" data-testid="media-panel">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="panel-title">Multimedia: {selectedProperty?.title ?? ""}</h3>
          </div>
          <div className="p-5">
            <form onSubmit={submitMedia} className="form-grid">
              <label className="field">
                Tipo de archivo
                <select className="input" value={mediaKind} onChange={(e) => setMediaKind(e.target.value)}>
                  {MEDIA_KINDS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Estado del archivo
                <select className="input" value={mediaState} onChange={(e) => setMediaState(e.target.value)}>
                  {MEDIA_STATES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Archivo
                <input className="input" type="file" onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)} />
              </label>
              <div className="actions sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={uploadingMedia} className="btn-primary">Subir archivo</button>
              </div>
            </form>

            <div className="list mt-5" data-testid="media-list">
              {media.map((item) => (
                <div key={item.id} className="property-row media-row">
                  {item.kind === "image" && item.signed_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="media-thumb" src={item.signed_url} alt={item.storage_path} />
                  )}
                  {item.kind === "video" && item.signed_url && (
                    <a className="muted font-medium text-indigo-600 hover:underline" href={item.signed_url} target="_blank" rel="noreferrer">
                      Ver video
                    </a>
                  )}
                  <span className="badge badge-archived">{item.kind}</span>
                  <span className="badge badge-draft">{item.state}</span>
                  <span className="muted">{item.storage_path}</span>
                  <div className="actions">
                    <button type="button" onClick={() => markMediaProcessed(item.id)} className="btn-secondary">Marcar procesada</button>
                    <button type="button" onClick={() => deleteMedia(item.id)} className="btn-danger">Eliminar media</button>
                  </div>
                </div>
              ))}
              {media.length === 0 && <p className="muted">Sin archivos para esta propiedad.</p>}
            </div>
          </div>
        </div>
      )}

      {selectedPropertyId && (
        <div className="card" data-testid="content-panel">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="panel-title">Contenido IA: {selectedProperty?.title ?? ""}</h3>
            <p className="panel-subtitle mt-1">
              Copies adaptados por canal (Facebook, Instagram, WhatsApp) con hashtags y CTA.
            </p>
          </div>
          <div className="p-5">
            <form onSubmit={generateContent} className="flex flex-wrap items-end gap-3">
              <label className="field">
                Canal
                <select className="input w-auto" value={contentChannel} onChange={(e) => setContentChannel(e.target.value)}>
                  {CONTENT_CHANNELS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={generating} className="btn-primary">Generar copy</button>
            </form>

            <div className="list mt-5" data-testid="generation-list">
              {generations.map((gen) => (
                <div key={gen.id} className="property-row generation-row">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge badge-contacted">{gen.channel}</span>
                    <span className="muted">
                      {new Date(gen.created_at).toLocaleString()} · {gen.provider}
                    </span>
                  </div>
                  <pre className="generation-copy">{gen.output?.copy ?? ""}</pre>
                  <div className="hashtag-row">
                    {(gen.output?.hashtags ?? []).map((tag) => (
                      <span key={tag} className="badge badge-archived">{tag}</span>
                    ))}
                  </div>
                  <p className="muted">CTA: {gen.output?.cta ?? ""}</p>
                </div>
              ))}
              {generations.length === 0 && <p className="muted">Sin generaciones todavía.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
