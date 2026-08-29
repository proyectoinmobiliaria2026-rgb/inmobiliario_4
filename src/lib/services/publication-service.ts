import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePublicationInput, PublicationFilters, PublicationListResult, PublicationRecord, UpdatePublicationInput, PublicationSummaryByMode, ManualActionRecord } from "@/lib/types/publication";
import { cancelPublicationJobs, enqueuePublicationJob } from "@/lib/services/scheduler-service";
import { getValidStatusesForMode } from "@/lib/types/publication";

const ASSISTED_TERMINAL_STATUSES: PublicationRecord["status"][] = ["published_manually", "cancelled", "skipped"];
const ASSISTED_SCHEDULABLE_FROM: PublicationRecord["status"][] = ["prepared"];
const ASSISTED_MOVABLE_FROM: PublicationRecord["status"][] = ["prepared", "manual_queue", "ready_to_publish"];
const DIRECT_API_TERMINAL_STATUSES: PublicationRecord["status"][] = ["published", "failed", "cancelled"];
const DIRECT_API_SCHEDULABLE_FROM: PublicationRecord["status"][] = ["draft", "failed"];
const DIRECT_API_PUBLISHABLE_FROM: PublicationRecord["status"][] = ["draft", "scheduled", "failed"];
const DIRECT_API_CONFIRMABLE_FROM: PublicationRecord["status"][] = ["api_submitted"];
const LOCAL_TEST_TERMINAL_STATUSES: PublicationRecord["status"][] = ["published", "failed", "cancelled"];
const LOCAL_TEST_PUBLISHABLE_FROM: PublicationRecord["status"][] = ["draft", "failed"];

function getTerminalStatuses(mode: PublicationRecord["mode"]): PublicationRecord["status"][] {
  switch (mode) {
    case "assisted_manual":
      return ASSISTED_TERMINAL_STATUSES;
    case "direct_api":
      return DIRECT_API_TERMINAL_STATUSES;
    case "local_test":
      return LOCAL_TEST_TERMINAL_STATUSES;
  }
}

function getSchedulableFrom(mode: PublicationRecord["mode"]): PublicationRecord["status"][] {
  switch (mode) {
    case "assisted_manual":
      return ASSISTED_SCHEDULABLE_FROM;
    case "direct_api":
      return DIRECT_API_SCHEDULABLE_FROM;
    case "local_test":
      return [];
  }
}

function getPublishableFrom(mode: PublicationRecord["mode"]): PublicationRecord["status"][] {
  switch (mode) {
    case "assisted_manual":
      return ASSISTED_MOVABLE_FROM;
    case "direct_api":
      return DIRECT_API_PUBLISHABLE_FROM;
    case "local_test":
      return LOCAL_TEST_PUBLISHABLE_FROM;
  }
}

function getCancellableFrom(mode: PublicationRecord["mode"]): PublicationRecord["status"][] {
  switch (mode) {
    case "assisted_manual":
      return ["prepared", "manual_queue", "ready_to_publish"];
    case "direct_api":
      return ["draft", "scheduled", "failed"];
    case "local_test":
      return ["draft", "failed"];
  }
}

function toInsertPayload(input: CreatePublicationInput, userId: string) {
  const payload: Record<string, unknown> = {};
  if (input.copy !== undefined) payload.copy = input.copy;
  if (input.hashtags !== undefined) payload.hashtags = input.hashtags;
  if (input.cta !== undefined) payload.cta = input.cta;
  if (input.groupUrls !== undefined) payload.group_urls = input.groupUrls;
  if (input.mediaIds !== undefined) payload.media_ids = input.mediaIds;

  const base = {
    property_id: input.propertyId,
    platform: input.platform,
    mode: input.mode ?? "assisted_manual",
    payload,
    created_by: userId
  } as Record<string, unknown>;

  if (input.mode === "assisted_manual") {
    base.status = "prepared";
    base.group_batch = input.groupBatch;
    base.batch_time_slot = input.batchTimeSlot;
  } else if (input.mode === "direct_api") {
    base.status = "draft";
  } else {
    base.status = "draft";
  }

  return base;
}

export async function listPublications(supabase: SupabaseClient, filters: PublicationFilters): Promise<PublicationListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = filters.page * filters.pageSize - 1;
  let query = supabase
    .from("publications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.platform) query = query.eq("platform", filters.platform);
  if (filters.mode) query = query.eq("mode", filters.mode);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return {
    items: (data ?? []) as PublicationRecord[],
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(total / filters.pageSize))
  };
}

export async function getPublicationById(supabase: SupabaseClient, id: string): Promise<PublicationRecord | null> {
  const { data, error } = await supabase.from("publications").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PublicationRecord | null) ?? null;
}

export async function createPublication(supabase: SupabaseClient, userId: string, input: CreatePublicationInput): Promise<PublicationRecord> {
  const { data, error } = await supabase.from("publications").insert(toInsertPayload(input, userId)).select("*").single();
  if (error) throw new Error(error.message);
  return data as PublicationRecord;
}

export async function updatePublication(supabase: SupabaseClient, id: string, input: UpdatePublicationInput): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  const terminalStatuses = getTerminalStatuses(current.mode);
  if (terminalStatuses.includes(current.status)) {
    throw new Error(`Publication is ${current.status} and can no longer be modified`);
  }
  if (Object.keys(input).length === 0) throw new Error("No fields provided for update");

  const payload: Record<string, unknown> = {};
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.mode !== undefined) payload.mode = input.mode;
  if (input.groupBatch !== undefined) payload.group_batch = input.groupBatch;
  if (input.batchTimeSlot !== undefined) payload.batch_time_slot = input.batchTimeSlot;
  if (input.copy !== undefined || input.hashtags !== undefined || input.cta !== undefined || input.groupUrls !== undefined || input.mediaIds !== undefined) {
    payload.payload = {
      ...current.payload,
      ...(input.copy !== undefined ? { copy: input.copy } : {}),
      ...(input.hashtags !== undefined ? { hashtags: input.hashtags } : {}),
      ...(input.cta !== undefined ? { cta: input.cta } : {}),
      ...(input.groupUrls !== undefined ? { group_urls: input.groupUrls } : {}),
      ...(input.mediaIds !== undefined ? { media_ids: input.mediaIds } : {})
    };
  }

  const { data, error } = await supabase.from("publications").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as PublicationRecord;
}

export async function deletePublication(supabase: SupabaseClient, id: string): Promise<void> {
  await cancelPublicationJobs(supabase, id);
  const { error } = await supabase.from("publications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function schedulePublication(supabase: SupabaseClient, id: string, scheduledFor: string): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  if (current.mode !== "direct_api") {
    throw new Error("Scheduling is only available for direct_api mode");
  }
  const schedulableFrom = getSchedulableFrom(current.mode);
  if (!schedulableFrom.includes(current.status)) {
    throw new Error(`Publication cannot be scheduled from status ${current.status} for mode ${current.mode}`);
  }

  const { data, error } = await supabase
    .from("publications")
    .update({ status: "scheduled", scheduled_for: scheduledFor, error_message: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await enqueuePublicationJob(supabase, id, scheduledFor);
  return data as PublicationRecord;
}

export async function publishPublicationNow(supabase: SupabaseClient, id: string): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");

  if (current.mode === "assisted_manual") {
    throw new Error("Use performManualAction for assisted_manual mode");
  }

  const publishableFrom = getPublishableFrom(current.mode);
  if (!publishableFrom.includes(current.status)) {
    throw new Error(`Publication cannot be published from status ${current.status} for mode ${current.mode}`);
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    executed_at: now,
    error_message: null
  };

  // Para direct_api: enviar a la API y quedar pendiente de confirmación externa
  // El estado 'published' se asigna SOLO en confirmApiPublication tras confirmación real
  if (current.mode === "direct_api") {
    updatePayload.status = "api_submitted";
  } else {
    // local_test: puede pasar directamente a published
    updatePayload.status = "published";
  }

  const { data, error } = await supabase
    .from("publications")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await cancelPublicationJobs(supabase, id);
  return data as PublicationRecord;
}

export async function confirmApiPublication(
  supabase: SupabaseClient,
  id: string,
  externalId: string,
  publicationUrl: string
): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  if (current.mode !== "direct_api") {
    throw new Error("API confirmation is only available for direct_api mode");
  }
  if (current.status !== "api_submitted") {
    throw new Error(`Publication must be in 'api_submitted' status to confirm, current: ${current.status}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("publications")
    .update({
      status: "published",
      external_id: externalId,
      confirmed_at: now
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PublicationRecord;
}

export async function failApiPublication(supabase: SupabaseClient, id: string, errorMessage: string): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  if (current.mode !== "direct_api") {
    throw new Error("API failure is only available for direct_api mode");
  }
  if (current.status !== "api_submitted") {
    throw new Error(`Publication must be in 'api_submitted' status to mark as failed, current: ${current.status}`);
  }

  const { data, error } = await supabase
    .from("publications")
    .update({ status: "failed", error_message: errorMessage, executed_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await cancelPublicationJobs(supabase, id);
  return data as PublicationRecord;
}

export async function performManualAction(
  supabase: SupabaseClient,
  id: string,
  action: "moved_to_queue" | "marked_ready" | "published_manually" | "skipped" | "failed",
  metadata: Record<string, unknown> = {}
): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  if (current.mode !== "assisted_manual") {
    throw new Error("Manual actions are only available for assisted_manual mode");
  }

  const validTransitions: Record<PublicationRecord["status"], string[]> = {
    prepared: ["manual_queue", "skipped", "failed"],
    manual_queue: ["ready_to_publish", "skipped", "failed"],
    ready_to_publish: ["published_manually", "skipped", "failed"],
    published_manually: [],
    skipped: [],
    failed: ["prepared"],
    draft: ["prepared"],
    scheduled: [],
    api_submitted: [],
    published: [],
    cancelled: []
  };

  const allowed = validTransitions[current.status] ?? [];
  if (!allowed.includes(action)) {
    throw new Error(`Cannot ${action} from status ${current.status}`);
  }

  const newStatusMap: Record<string, PublicationRecord["status"]> = {
    moved_to_queue: "manual_queue",
    marked_ready: "ready_to_publish",
    published_manually: "published_manually",
    skipped: "skipped",
    failed: "failed"
  };

  const newStatus = newStatusMap[action];
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    error_message: action === "failed" ? (metadata.error as string ?? "Manual failure") : null
  };

  if (action === "published_manually") {
    updatePayload.executed_at = now;
    updatePayload.confirmed_at_manual = now;
  }

  const { data, error } = await supabase
    .from("publications")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("publication_manual_actions").insert({
    publication_id: id,
    action,
    performed_by: (await supabase.auth.getUser()).data.user?.id,
    metadata
  });

  if (action === "published_manually" || action === "skipped" || action === "failed") {
    await cancelPublicationJobs(supabase, id);
  }

  return data as PublicationRecord;
}

export async function cancelPublication(supabase: SupabaseClient, id: string): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  const cancellableFrom = getCancellableFrom(current.mode);
  if (!cancellableFrom.includes(current.status)) {
    throw new Error(`Publication cannot be cancelled from status ${current.status} for mode ${current.mode}`);
  }

  const { data, error } = await supabase
    .from("publications")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await cancelPublicationJobs(supabase, id);
  return data as PublicationRecord;
}

export async function getPublicationsSummaryByMode(
  supabase: SupabaseClient,
  userId: string
): Promise<PublicationSummaryByMode[]> {
  const { data, error } = await supabase.rpc("get_publications_summary_by_mode", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return (data ?? []) as PublicationSummaryByMode[];
}

export async function listManualActions(
  supabase: SupabaseClient,
  publicationId: string
): Promise<ManualActionRecord[]> {
  const { data, error } = await supabase
    .from("publication_manual_actions")
    .select("*")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ManualActionRecord[];
}