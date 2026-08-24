import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicationRecord, SchedulerJobRecord, SchedulerRunSummary } from "@/lib/types/publication";

export const PUBLICATION_JOB_TYPE = "publish_publication";

const JOB_BATCH_LIMIT = 25;
const RETRY_BACKOFF_MS = 5 * 60 * 1000;

export type SchedulerJobFilters = { status?: string; page: number; pageSize: number };
export type SchedulerJobListResult = { items: SchedulerJobRecord[]; total: number; page: number; pageSize: number; totalPages: number };

export async function enqueuePublicationJob(
  supabase: SupabaseClient,
  publicationId: string,
  runAt: string
): Promise<SchedulerJobRecord> {
  const { data, error } = await supabase
    .from("scheduler_jobs")
    .insert({
      job_type: PUBLICATION_JOB_TYPE,
      payload: { publicationId },
      status: "pending",
      next_retry_at: runAt
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as SchedulerJobRecord;
}

export async function cancelPublicationJobs(supabase: SupabaseClient, publicationId: string): Promise<void> {
  const { error } = await supabase
    .from("scheduler_jobs")
    .update({ status: "cancelled", last_error: "Publication cancelled" })
    .eq("job_type", PUBLICATION_JOB_TYPE)
    .eq("payload->>publicationId", publicationId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
}

export async function listSchedulerJobs(supabase: SupabaseClient, filters: SchedulerJobFilters): Promise<SchedulerJobListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = filters.page * filters.pageSize - 1;
  let query = supabase
    .from("scheduler_jobs")
    .select("*", { count: "exact" })
    .order("next_retry_at", { ascending: true, nullsFirst: false })
    .range(from, to);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    items: (data ?? []) as SchedulerJobRecord[],
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
  };
}

async function recordRun(
  supabase: SupabaseClient,
  jobId: string,
  status: "success" | "failed" | "skipped",
  result: Record<string, unknown>,
  errorMessage: string | null
): Promise<void> {
  await supabase.from("scheduler_runs").insert({
    scheduler_job_id: jobId,
    status,
    result,
    error_message: errorMessage,
    finished_at: new Date().toISOString()
  });
}

async function completeJob(supabase: SupabaseClient, jobId: string): Promise<void> {
  const { error } = await supabase.from("scheduler_jobs").update({ status: "completed" }).eq("id", jobId);
  if (error) throw new Error(error.message);
}

type DueJobOutcome = "published" | "retried" | "failed" | "skipped";

async function processPublicationJob(supabase: SupabaseClient, job: SchedulerJobRecord, now: Date): Promise<DueJobOutcome> {
  const publicationId = typeof job.payload?.publicationId === "string" ? job.payload.publicationId : null;
  if (!publicationId) {
    await supabase.from("scheduler_jobs").update({ status: "failed", last_error: "Job payload has no publicationId" }).eq("id", job.id);
    await recordRun(supabase, job.id, "failed", {}, "Job payload has no publicationId");
    return "failed";
  }

  const { data: publication, error: fetchError } = await supabase
    .from("publications")
    .select("*")
    .eq("id", publicationId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const record = publication as PublicationRecord | null;
  if (!record || record.status === "cancelled" || record.status === "published" || record.status === "draft") {
    await completeJob(supabase, job.id);
    await recordRun(supabase, job.id, "skipped", { publicationId, status: record?.status ?? "missing" }, null);
    return "skipped";
  }

  if (record.scheduled_for && new Date(record.scheduled_for).getTime() > now.getTime()) {
    await supabase.from("scheduler_jobs").update({ next_retry_at: record.scheduled_for }).eq("id", job.id);
    await recordRun(supabase, job.id, "skipped", { publicationId, reason: "not due yet" }, null);
    return "skipped";
  }

  const { error: publishError } = await supabase
    .from("publications")
    .update({ status: "published", executed_at: now.toISOString(), confirmed_at: now.toISOString(), error_message: null })
    .eq("id", publicationId);
  if (publishError) throw new Error(publishError.message);

  await completeJob(supabase, job.id);
  await recordRun(supabase, job.id, "success", { publicationId }, null);
  return "published";
}

async function handleJobError(supabase: SupabaseClient, job: SchedulerJobRecord, error: unknown): Promise<DueJobOutcome> {
  const message = error instanceof Error ? error.message : "Unknown scheduler error";
  const attempts = job.attempts + 1;
  const exhausted = attempts >= job.max_attempts;

  if (exhausted) {
    const publicationId = typeof job.payload?.publicationId === "string" ? job.payload.publicationId : null;
    if (publicationId) {
      await supabase
        .from("publications")
        .update({ status: "failed", error_message: message })
        .eq("id", publicationId);
    }
    await supabase.from("scheduler_jobs").update({ status: "failed", attempts, last_error: message }).eq("id", job.id);
  } else {
    const nextRetry = new Date(Date.now() + RETRY_BACKOFF_MS * attempts).toISOString();
    await supabase.from("scheduler_jobs").update({ status: "pending", attempts, next_retry_at: nextRetry, last_error: message }).eq("id", job.id);
  }

  await recordRun(supabase, job.id, "failed", { attempts, exhausted }, message);
  return exhausted ? "failed" : "retried";
}

export async function runDueSchedulerJobs(supabase: SupabaseClient, now: Date = new Date()): Promise<SchedulerRunSummary> {
  const { data: jobs, error } = await supabase
    .from("scheduler_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("next_retry_at", now.toISOString())
    .order("next_retry_at", { ascending: true })
    .limit(JOB_BATCH_LIMIT);
  if (error) throw new Error(error.message);

  const summary: SchedulerRunSummary = { processed: 0, published: 0, retried: 0, failed: 0, skipped: 0 };

  for (const job of (jobs ?? []) as SchedulerJobRecord[]) {
    summary.processed += 1;
    try {
      const outcome = await processPublicationJob(supabase, job, now);
      summary[outcome] += 1;
    } catch (error) {
      const outcome = await handleJobError(supabase, job, error);
      summary[outcome] += 1;
    }
  }

  return summary;
}
