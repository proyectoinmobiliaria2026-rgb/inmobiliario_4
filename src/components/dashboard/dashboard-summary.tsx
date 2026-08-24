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
      <div className="card">
        <p>Necesitas iniciar sesión para ver el dashboard.</p>
        <Link href="/properties">Ir a iniciar sesión</Link>
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
    { testId: "stat-properties-total", label: "Total propiedades", value: summary.propertiesTotal },
    { testId: "stat-properties-draft", label: "En borrador", value: summary.propertiesDraft },
    { testId: "stat-properties-published", label: "Publicadas", value: summary.propertiesPublished },
    { testId: "stat-properties-archived", label: "Archivadas", value: summary.propertiesArchived },
    { testId: "stat-media-total", label: "Archivos media", value: summary.mediaTotal },
    { testId: "stat-media-images", label: "Imágenes", value: summary.mediaImages },
    { testId: "stat-media-videos", label: "Videos", value: summary.mediaVideos },
    { testId: "stat-leads-total", label: "Leads", value: summary.leadsTotal }
  ];

  return (
    <section className="workbench" data-testid="dashboard-summary">
      <div className="summary-grid">
        {stats.map((stat) => (
          <div key={stat.testId} className="stat-card" data-testid={stat.testId}>
            <span className="stat-value">{stat.value}</span>
            <span className="muted">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card" data-testid="recent-published">
        <h2>Publicadas recientemente</h2>
        <div className="list">
          {summary.recentPublished.map((item) => (
            <div key={item.id} className="property-row">
              <strong>{item.title}</strong>
              <span className="muted">{item.city ?? "—"}</span>
              <span className="muted">
                {item.published_at ? new Date(item.published_at).toLocaleString() : "—"}
              </span>
            </div>
          ))}
          {summary.recentPublished.length === 0 && (
            <p className="muted">Sin propiedades publicadas todavía.</p>
          )}
        </div>
      </div>
    </section>
  );
}
