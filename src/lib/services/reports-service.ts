import type { AuditEventRecord, AuditFilters } from "./event-log-service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Importar tipos necesarios
import type { DashboardSummary } from "@/lib/services/dashboard-service";
import { getDashboardSummary } from "@/lib/services/dashboard-service";

// --- Resumen general de actividad (solo datos reales; Regla 10/36: nunca inventar) ---

export type ReportsSummary = {
  dashboard: DashboardSummary;
  publications: {
    total: number;
    published: number;
    scheduled: number;
    failed: number;
    draft: number;
    byMode: { mode: string; status: string; count: number }[];
  };
  scheduler: {
    jobsTotal: number;
    jobsPending: number;
    runsTotal: number;
    lastRunAt: string | null;
  };
  leads: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  audit: {
    recentEvents: AuditEventRecord[];
  };
};

/**
 * Resumen de reportes construido UNICAMENTE con datos reales que existen en las
 * tablas de Supabase (publications, scheduler_jobs, scheduler_runs, leads,
 * event_log). Si una entidad no tiene registros, el conteo es 0 — nunca se
 * presenta informacion inventada (Regla 32 del prompt maestro).
 */
export async function getReportsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<ReportsSummary> {
  const dashboard = await getDashboardSummary(supabase);

  // Publicaciones: resumen por modo desde la funcion RPC existente.
  const { data: byModeData, error: byModeError } = await supabase.rpc(
    "get_publications_summary_by_mode",
    { p_user_id: userId }
  );
  if (byModeError) throw new Error(byModeError.message);

  const byMode = (byModeData ?? []) as { mode: string; status: string; count: number }[];
  const byModeWithoutDuplicates = byMode.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) => candidate.mode === item.mode && candidate.status === item.status
      ) === index
  );

  const publicationCounts = byModeWithoutDuplicates.reduce(
    (acc, item) => {
      acc.total += item.count;
      if (item.status === "published" || item.status === "published_manually") acc.published += item.count;
      if (item.status === "scheduled") acc.scheduled += item.count;
      if (item.status === "failed") acc.failed += item.count;
      if (item.status === "draft") acc.draft += item.count;
      return acc;
    },
    { total: 0, published: 0, scheduled: 0, failed: 0, draft: 0 }
  );

  // Scheduler: jobs pendientes + ultima corrida (solo lo que existe).
  const { count: schedulerJobsTotal, error: schedulerJobsError } = await supabase
    .from("scheduler_jobs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);
  if (schedulerJobsError) throw new Error(schedulerJobsError.message);

  const { count: schedulerJobsPending, error: schedulerJobsPendingError } = await supabase
    .from("scheduler_jobs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .in("status", ["pending", "due", "retrying"]);
  if (schedulerJobsPendingError) throw new Error(schedulerJobsPendingError.message);

  const { count: schedulerRunsTotal, error: schedulerRunsError } = await supabase
    .from("scheduler_runs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);
  if (schedulerRunsError) throw new Error(schedulerRunsError.message);

  const { data: lastRunData, error: lastRunError } = await supabase
    .from("scheduler_runs")
    .select("started_at")
    .eq("created_by", userId)
    .order("started_at", { ascending: false })
    .limit(1);
  if (lastRunError) throw new Error(lastRunError.message);

  // Leads: total y por estado.
  const { count: leadsTotal, error: leadsTotalError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId);
  if (leadsTotalError) throw new Error(leadsTotalError.message);

  const { data: leadsByStatusData, error: leadsByStatusError } = await supabase.rpc(
    "get_leads_summary_by_status",
    { p_user_id: userId }
  );
  if (leadsByStatusError) {
    // Fallback: si la RPC no existe, contamos por estado con consulta simple.
    const { data: leadsRows, error: leadsRowsError } = await supabase
      .from("leads")
      .select("status")
      .eq("created_by", userId);
    if (leadsRowsError) throw new Error(leadsRowsError.message);
    const leadsRowsFallback = (leadsRows ?? []) as { status: string }[];
    const leadsByStatusMap = leadsRowsFallback.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      },
      {}
    );
    const leadsByStatusFallback: { status: string; count: number }[] = Object.entries(
      leadsByStatusMap
    ).map(([status, count]) => ({ status, count }));
    return buildSummary(dashboard, byModeWithoutDuplicates, publicationCounts, {
      jobsTotal: schedulerJobsTotal ?? 0,
      jobsPending: schedulerJobsPending ?? 0,
      runsTotal: schedulerRunsTotal ?? 0,
      lastRunAt: lastRunData?.[0]?.started_at ?? null
    }, leadsTotal ?? 0, leadsByStatusFallback, userId, supabase);
  }

  const leadsByStatus = (leadsByStatusData ?? []) as { status: string; count: number }[];

  return buildSummary(dashboard, byModeWithoutDuplicates, publicationCounts, {
    jobsTotal: schedulerJobsTotal ?? 0,
    jobsPending: schedulerJobsPending ?? 0,
    runsTotal: schedulerRunsTotal ?? 0,
    lastRunAt: lastRunData?.[0]?.started_at ?? null
  }, leadsTotal ?? 0, leadsByStatus, userId, supabase);
}

async function buildSummary(
  dashboard: DashboardSummary,
  byMode: { mode: string; status: string; count: number }[],
  publicationCounts: { total: number; published: number; scheduled: number; failed: number; draft: number },
  scheduler: { jobsTotal: number; jobsPending: number; runsTotal: number; lastRunAt: string | null },
  leadsTotal: number,
  leadsByStatus: { status: string; count: number }[],
  userId: string,
  supabase: SupabaseClient
): Promise<ReportsSummary> {
  const { data: recentEventsData, error: recentEventsError } = await supabase
    .from("event_log")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (recentEventsError) throw new Error(recentEventsError.message);

  return {
    dashboard,
    publications: {
      ...publicationCounts,
      byMode
    },
    scheduler,
    leads: {
      total: leadsTotal,
      byStatus: leadsByStatus
    },
    audit: {
      recentEvents: (recentEventsData ?? []) as AuditEventRecord[]
    }
  };
}
