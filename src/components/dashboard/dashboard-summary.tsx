"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecentPublishedItem = {
  id: string;
  title: string;
  city: string | null;
  published_at: string | null;
};

type DashboardSummary = {
  propertiesTotal: number;
  propertiesDraft: number;
  propertiesPublished: number;
  propertiesArchived: number;
  mediaTotal: number;
  mediaImages: number;
  mediaVideos: number;
  leadsTotal: number;
  recentPublished: RecentPublishedItem[];
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  reason?: string;
};

function StatIcon({ path }: { path: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
      </svg>
    </span>
  );
}

export function DashboardSummaryView() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/dashboard/summary", { credentials: "same-origin" });
      if (response.status === 401) {
        setUnauthorized(true);
        return;
      }

      const payload = (await response.json()) as ApiResponse<DashboardSummary>;
      if (!payload.ok || !payload.data) {
        setError(payload.reason ?? "No se pudo cargar el dashboard");
        return;
      }

      setSummary(payload.data);
    }

    void load();
  }, []);

  if (unauthorized) {
    return (
      <div className="card card-pad flex flex-wrap items-center justify-between gap-4">
        <p className="panel-subtitle">Necesitas iniciar sesión para ver el dashboard.</p>
        <Link href="/properties" className="btn-primary">Ir a iniciar sesión</Link>
      </div>
    );
  }

  if (error) {
    return <div className="notice notice-error">{error}</div>;
  }

  if (!summary) {
    return <p className="muted">Cargando dashboard...</p>;
  }

  const stats = [
    { testId: "stat-properties-total", label: "Total propiedades", value: summary.propertiesTotal, icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" },
    { testId: "stat-properties-draft", label: "En borrador", value: summary.propertiesDraft, icon: "M16.862 4.487 18.549 2.8a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" },
    { testId: "stat-properties-published", label: "Publicadas", value: summary.propertiesPublished, icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
    { testId: "stat-properties-archived", label: "Archivadas", value: summary.propertiesArchived, icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" },
    { testId: "stat-media-total", label: "Archivos media", value: summary.mediaTotal, icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" },
    { testId: "stat-media-images", label: "Imágenes", value: summary.mediaImages, icon: "M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" },
    { testId: "stat-media-videos", label: "Videos", value: summary.mediaVideos, icon: "m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" },
    { testId: "stat-leads-total", label: "Leads", value: summary.leadsTotal, icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Z" }
  ];

  return (
    <section className="workbench" data-testid="dashboard-summary">
      <div className="summary-grid">
        {stats.map((stat) => (
          <div key={stat.testId} className="stat-card" data-testid={stat.testId}>
            <StatIcon path={stat.icon} />
            <span className="stat-value">{stat.value}</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card" data-testid="recent-published">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="panel-title">Publicadas recientemente</h2>
        </div>
        <div className="p-5">
          <div className="list">
            {summary.recentPublished.map((item) => (
              <div key={item.id} className="property-row">
                <strong className="text-sm text-slate-900">{item.title}</strong>
                <span className="badge badge-published">published</span>
                <span className="muted">{item.city ?? "—"}</span>
                <span className="muted ml-auto">
                  {item.published_at ? new Date(item.published_at).toLocaleString() : "—"}
                </span>
              </div>
            ))}
            {summary.recentPublished.length === 0 && (
              <p className="muted">Sin propiedades publicadas todavía.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
