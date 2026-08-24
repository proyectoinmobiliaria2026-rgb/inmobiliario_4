import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePublicationInput, PublicationFilters, PublicationListResult, PublicationRecord, UpdatePublicationInput } from "@/lib/types/publication";
import { cancelPublicationJobs, enqueuePublicationJob } from "@/lib/services/scheduler-service";

const TERMINAL_STATUSES: PublicationRecord["status"][] = ["published", "cancelled"];
const SCHEDULABLE_FROM: PublicationRecord["status"][] = ["draft", "failed"];
const PUBLISHABLE_FROM: PublicationRecord["status"][] = ["draft", "scheduled", "failed"];
const CANCELLABLE_FROM: PublicationRecord["status"][] = ["draft", "scheduled", "failed"];

function toInsertPayload(input: CreatePublicationInput, userId: string) {
  const payload: Record<string, unknown> = {};
  if (input.copy !== undefined) payload.copy = input.copy;
  if (input.hashtags !== undefined) payload.hashtags = input.hashtags;
  if (input.cta !== undefined) payload.cta = input.cta;
  return {
    property_id: input.propertyId,
    platform: input.platform,
    mode: input.mode ?? "assisted",
    status: "draft",
    payload,
    created_by: userId
  };
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
  if (TERMINAL_STATUSES.includes(current.status)) {
    throw new Error(`Publication is ${current.status} and can no longer be modified`);
  }
  if (Object.keys(input).length === 0) throw new Error("No fields provided for update");

  const payload: Record<string, unknown> = {};
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.mode !== undefined) payload.mode = input.mode;
  if (input.copy !== undefined || input.hashtags !== undefined || input.cta !== undefined) {
    payload.payload = {
      ...current.payload,
      ...(input.copy !== undefined ? { copy: input.copy } : {}),
      ...(input.hashtags !== undefined ? { hashtags: input.hashtags } : {}),
      ...(input.cta !== undefined ? { cta: input.cta } : {})
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
  if (!SCHEDULABLE_FROM.includes(current.status)) {
    throw new Error(`Publication cannot be scheduled from status ${current.status}`);
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
  if (!PUBLISHABLE_FROM.includes(current.status)) {
    throw new Error(`Publication cannot be published from status ${current.status}`);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("publications")
    .update({ status: "published", executed_at: now, confirmed_at: now, error_message: null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await cancelPublicationJobs(supabase, id);
  return data as PublicationRecord;
}

export async function cancelPublication(supabase: SupabaseClient, id: string): Promise<PublicationRecord> {
  const current = await getPublicationById(supabase, id);
  if (!current) throw new Error("Publication not found");
  if (!CANCELLABLE_FROM.includes(current.status)) {
    throw new Error(`Publication cannot be cancelled from status ${current.status}`);
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
