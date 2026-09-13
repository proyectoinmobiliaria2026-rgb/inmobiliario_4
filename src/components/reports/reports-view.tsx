"use client";

import { useEffect, useState } from "react";
import type { ReportsSummary } from "@/lib/services/reports-service";

type ReportsViewProps = {
  initialUser: { id: string } | null;
};

function StatCard({
  label,
  value,
  sublabel,
  accent
}: {
  label: string;
  value: number;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold tabular-nums ${accent}`}>
        {value.toLocaleString("es-AR")}
      </p>
      {sublabel ? <p className="mt-1 text-xs text-slate-500">{sublabel}</p> : null}
    </div>
  );
}

function ModeList({ items }: { items: { mode: string; status: string; count: number }[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-slate-300">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-indigo-500" />
            {item.mode} · {item.status}
          </span>
          <span className="font-semibold tabular-nums text-slate-200">{item.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportsView({ initialUser }: ReportsViewProps) {
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/reports/summary", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok: boolean;
          data?: ReportsSummary;
          reason?: string;
        };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.reason ?? `HTTP ${response.status}`);
        }
        return payload.data ?? null;
      })
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar los reportes");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-slate-400" role="status">
        Cargando reportes…
      </p>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
        {error ?? "No hay datos de reporte disponibles."}
      </div>
    );
  }

  const scheduler = summary.scheduler;
  const publicationCounts = summary.publications;
  const leads = summary.leads;
  const recentEvents = summary.audit?.recentEvents ?? [];
  const lastRunAt = scheduler.lastRunAt
    ? new Date(scheduler.lastRunAt).toLocaleString("es-AR")
    : "Sin corridas registradas";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Publicaciones" value={publicationCounts.total} accent="text-indigo-300" />
        <StatCard
          label="Publicadas"
          value={publicationCounts.published}
          accent="text-emerald-300"
          sublabel="+ manuales"
        />
        <StatCard
          label="Programadas"
          value={publicationCounts.scheduled}
          accent="text-sky-300"
        />
        <StatCard label="Fallidas" value={publicationCounts.failed} accent="text-red-300" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Jobs de scheduler" value={scheduler.jobsTotal} accent="text-amber-300" />
        <StatCard
          label="Jobs pendientes"
          value={scheduler.jobsPending}
          accent="text-orange-300"
        />
        <StatCard label="Corridas totales" value={scheduler.runsTotal} accent="text-violet-300" />
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Última corrida
          </p>
          <p className="mt-1.5 break-words text-sm font-semibold text-slate-200">{lastRunAt}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Leads por estado</h2>
          {leads.total === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Sin datos (no hay leads registrados).</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {leads.byStatus.map((item, index) => (
                <li key={index} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-300">{item.status}</span>
                  <span className="font-semibold tabular-nums text-slate-200">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Publicaciones por modo</h2>
          {publicationCounts.byMode.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Sin datos (no hay publicaciones registradas).
            </p>
          ) : (
            <ModeList items={publicationCounts.byMode} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-slate-200">Actividad reciente (auditoría)</h2>
        {recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Sin datos (no hay eventos de auditoría registrados todavía).
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-800">
            {recentEvents.map((event, index) => (
              <li key={index} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate text-slate-300">
                  {event.event_type}
                  {event.entity_id ? (
                    <span className="text-slate-500"> · #{event.entity_id.slice(0, 8)}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  {new Date(event.created_at).toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
