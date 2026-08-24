import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateLeadInput, LeadRecord, LeadStatus, UpdateLeadInput } from "@/lib/types/lead";

type AppSupabaseClient = SupabaseClient;

export type LeadFilters = { status?: LeadStatus | string; search?: string; page: number; pageSize: number };
export type LeadListResult = { items: LeadRecord[]; total: number; page: number; pageSize: number; totalPages: number };

function toInsertPayload(input: CreateLeadInput, userId: string) {
  return {
    created_by: userId,
    property_id: input.propertyId ?? null,
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    origin: input.origin ?? null,
    status: input.status ?? "new",
    notes: input.notes ?? null,
    last_contact_at: input.lastContactAt ?? null,
    next_follow_up_at: input.nextFollowUpAt ?? null
  };
}

function toUpdatePayload(input: UpdateLeadInput) {
  const payload: Record<string, unknown> = {};
  if (input.propertyId !== undefined) payload.property_id = input.propertyId || null;
  if (input.name !== undefined) payload.name = input.name;
  if (input.phone !== undefined) payload.phone = input.phone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.origin !== undefined) payload.origin = input.origin || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.notes !== undefined) payload.notes = input.notes || null;
  if (input.lastContactAt !== undefined) payload.last_contact_at = input.lastContactAt || null;
  if (input.nextFollowUpAt !== undefined) payload.next_follow_up_at = input.nextFollowUpAt || null;
  return payload;
}

export async function listLeads(supabase: AppSupabaseClient, filters: LeadFilters): Promise<LeadListResult> {
  const from = (filters.page - 1) * filters.pageSize;
  const to = filters.page * filters.pageSize - 1;
  let query = supabase.from("leads").select("*", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const total = count ?? 0;
  return { items: (data ?? []) as LeadRecord[], total, page: filters.page, pageSize: filters.pageSize, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) };
}

export async function getLeadById(supabase: AppSupabaseClient, id: string): Promise<LeadRecord | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LeadRecord | null) ?? null;
}

export async function createLead(supabase: AppSupabaseClient, userId: string, input: CreateLeadInput): Promise<LeadRecord> {
  const { data, error } = await supabase.from("leads").insert(toInsertPayload(input, userId)).select("*").single();
  if (error) throw new Error(error.message);
  return data as LeadRecord;
}

export async function updateLead(supabase: AppSupabaseClient, id: string, input: UpdateLeadInput): Promise<LeadRecord> {
  const payload = toUpdatePayload(input);
  if (Object.keys(payload).length === 0) throw new Error("No fields provided for update");
  const { data, error } = await supabase.from("leads").update(payload).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as LeadRecord;
}

export async function deleteLead(supabase: AppSupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
