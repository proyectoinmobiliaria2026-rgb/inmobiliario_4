"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardSummary = {
  propertiesTotal: number;
  propertiesDraft: number;
  propertiesPublished: number;
  propertiesArchived: number;
  mediaTotal: number;
  mediaImages: number;
  mediaVideos: number;
  leadsTotal: number;
};

const KPIS = [
  { key: "propertiesTotal", label: "Propiedades", accent: "bg-indigo-500" },
  { key: "propertiesPublished", label: "Publicadas", accent: "bg-emerald-500" },
  { key: "propertiesDraft", label: "En borrador", accent: "bg-amber-500" },
  { key: "leadsTotal", label: "Leads en CRM", accent: "bg-sky-500" },
  { key: "mediaTotal", label: "Archivos multimedia", accent: "bg-violet-500" },
  { key: "mediaImages", label: "Imágenes", accent: "bg-fuchsia-500" },
  { key: "mediaVideos", label: "Videos", accent: "bg-rose-500" },
  { key: "propertiesArchived", label: "Archivadas", accent: "bg-slate-400" }
] as const;

export function HomeOverview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    void fetch("/api/dashboard/summary", { credentials: "same-origin" }).then(async (response) => {
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }
      const payload = (await response.json()) as { ok: boolean; data?: DashboardSummary };
      if (payload.ok && payload.data) setSummary(payload.data);
      else setUnauthorized(true);
    }).catch(() => setUnauthorized(true));
  }, []);

  if (unauthorized || !summary) {
    return (
      <div className="card card-pad flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="panel-title">Métricas en tiempo real</p>
          <p className="panel-subtitle">Inicia sesión para ver el estado de tu operación inmobiliaria.</p>
        </div>
        <Link href="/properties" className="btn-primary">Ingresar al panel</Link>
      </div>
    );
  }

  return (
    <section aria-label="Métricas de la operación">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {KPIS.map((kpi) => (
          <div key={kpi.key} className="card p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${kpi.accent}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</span>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{summary[kpi.key]}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Datos reales de tu cuenta ·{" "}
        <Link href="/dashboard" className="font-semibold text-indigo-600 hover:underline">
          ver dashboard completo
        </Link>
      </p>
    </section>
  );
}
