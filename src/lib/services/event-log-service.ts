import type { SupabaseClient } from "@supabase/supabase-js";

// Eventos normalizados (Regla 30 del prompt maestro: eventos rastreables).
export const EVENT_TYPES = {
  publicationCreated: "publication.created",
  publicationScheduled: "publication.scheduled",
  publicationApiSubmitted: "publication.api_submitted",
  publicationPublished: "publication.published",
  publicationConfirmed: "publication.confirmed",
  publicationFailed: "publication.failed",
  publicationCancelled: "publication.cancelled",
  manualAction: "publication.manual_action",
  leadCreated: "lead.created",
  leadUpdated: "lead.updated",
  leadStatusChanged: "lead.status_changed",
  stagingGenerated: "staging.generated",
  contentGenerated: "content.generated",
  schedulerRun: "scheduler.run_completed",
  propertyCreated: "property.created",
  propertyUpdated: "property.updated",
  propertyStaged: "property.staging_generated"
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

export type AuditEventRecord = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
};

export type LogEventPayload = {
  eventType: EventType;
  entityType: "property" | "publication" | "lead" | "media" | "scheduler_job" | "scheduler_run" | "ai_generation" | "property_media" | "ai_generation";
  entityId?: string;
  payload?: Record<string, unknown>;
};

export type AuditFilters = {
  entityType?: string;
  eventType?: string;
  limit?: number;
};

/**
 * Registra un evento de auditoria en `public.event_log` (tabla existente desde
 * phase2, con RLS por `created_by`). Nunca lanza: si falla el insert se ignora
 * para no interrumpir la accion de negocio principal.
 */
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  input: LogEventPayload
): Promise<void> {
  try {
    const { error } = await supabase.from("event_log").insert({
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      payload: input.payload ?? {},
      created_by: userId
    });
    if (error) console.warn(`[event-log] insert skipped: ${error.message}`);
  } catch (unknownError) {
    console.warn(
      `[event-log] insert skipped: ${unknownError instanceof Error ? unknownError.message : "unknown error"}`
    );
  }
}

/**
 * Lista eventos de auditoria del usuario con filtros opcionales por entidad
 * y tipo de evento. Devuelve SOLO lo que existe (si no hay registros, lista vacia).
 */
export async function listAuditEvents(
  supabase: SupabaseClient,
  userId: string,
  filters: AuditFilters
): Promise<AuditEventRecord[]> {
  let query = supabase
    .from("event_log")
    .select("id, event_type, entity_type, entity_id, payload, created_by, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.eventType) query = query.eq("event_type", filters.eventType);
  if (filters.limit) query = query.limit(Math.min(filters.limit, 200));

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditEventRecord[];
}
