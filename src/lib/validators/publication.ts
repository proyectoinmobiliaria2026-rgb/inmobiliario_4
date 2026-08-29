import { PUBLICATION_PLATFORMS, PUBLICATION_MODES, type PublicationMode, type PublicationPlatform, type PublicationStatus, getValidStatusesForMode } from "@/lib/types/publication";

const MAX_COPY_LENGTH = 5000;
const MAX_CTA_LENGTH = 200;
const MAX_HASHTAGS = 30;
const MAX_HASHTAG_LENGTH = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`Expected string value for ${field}`);
  return value.trim();
}

function readPlatform(value: unknown): PublicationPlatform {
  const platform = readOptionalString(value, "platform");
  if (!platform) throw new Error("platform is required");
  if (!PUBLICATION_PLATFORMS.includes(platform as PublicationPlatform)) {
    throw new Error(`platform must be one of: ${PUBLICATION_PLATFORMS.join(", ")}`);
  }
  return platform as PublicationPlatform;
}

function readMode(value: unknown): PublicationMode | undefined {
  const mode = readOptionalString(value, "mode");
  if (mode === undefined) return undefined;
  if (!PUBLICATION_MODES.includes(mode as PublicationMode)) throw new Error(`mode must be one of: ${PUBLICATION_MODES.join(", ")}`);
  return mode as PublicationMode;
}

function readBatchTimeSlot(value: unknown): "morning" | "afternoon" | "evening" | undefined {
  const slot = readOptionalString(value, "batchTimeSlot");
  if (slot === undefined) return undefined;
  if (!["morning", "afternoon", "evening"].includes(slot)) throw new Error("batchTimeSlot must be one of: morning, afternoon, evening");
  return slot as "morning" | "afternoon" | "evening";
}

function readGroupUrls(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error("groupUrls must be an array of strings");
  return value.map((url) => {
    if (typeof url !== "string") throw new Error("groupUrls must be an array of strings");
    return url.trim();
  }).filter(Boolean);
}

function readMediaIds(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error("mediaIds must be an array of strings");
  return value.map((id) => {
    if (typeof id !== "string") throw new Error("mediaIds must be an array of strings");
    return id.trim();
  }).filter(Boolean);
}

export function parseCreatePublicationInput(payload: unknown): ParsedPublicationFields & { propertyId: string; platform: PublicationPlatform } {
  if (!isRecord(payload)) throw new Error("Invalid payload");
  const fields = parseFields(payload, true);
  if (fields.mode === "assisted_manual") {
    if (!fields.groupBatch) throw new Error("groupBatch is required for assisted_manual mode");
    if (!fields.batchTimeSlot) throw new Error("batchTimeSlot is required for assisted_manual mode");
  }
  return { ...fields, propertyId: fields.propertyId as string, platform: fields.platform as PublicationPlatform };
}

function readHashtags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) throw new Error("hashtags must be an array of strings");
  const hashtags = value.map((tag) => {
    if (typeof tag !== "string") throw new Error("hashtags must be an array of strings");
    const trimmed = tag.trim().replace(/^#/, "");
    if (!trimmed) throw new Error("hashtags must not be empty");
    if (trimmed.length > MAX_HASHTAG_LENGTH) throw new Error(`each hashtag must be at most ${MAX_HASHTAG_LENGTH} characters`);
    return trimmed;
  });
  if (hashtags.length > MAX_HASHTAGS) throw new Error(`hashtags must have at most ${MAX_HASHTAGS} items`);
  return hashtags;
}

function readCopy(value: unknown): string | undefined {
  const copy = readOptionalString(value, "copy");
  if (copy !== undefined && copy.length > MAX_COPY_LENGTH) {
    throw new Error(`copy length must be at most ${MAX_COPY_LENGTH} characters`);
  }
  return copy;
}

function readCta(value: unknown): string | undefined {
  const cta = readOptionalString(value, "cta");
  if (cta !== undefined && cta.length > MAX_CTA_LENGTH) {
    throw new Error(`cta length must be at most ${MAX_CTA_LENGTH} characters`);
  }
  return cta;
}

export type ParsedPublicationFields = {
  propertyId?: string;
  platform?: PublicationPlatform;
  mode?: PublicationMode;
  copy?: string;
  hashtags?: string[];
  cta?: string;
  groupBatch?: string;
  batchTimeSlot?: "morning" | "afternoon" | "evening";
  groupUrls?: string[];
  mediaIds?: string[];
};

function parseFields(payload: Record<string, unknown>, requireCore: boolean): ParsedPublicationFields {
  const propertyId = readOptionalString(payload.propertyId, "propertyId");
  const copy = readCopy(payload.copy);
  const hashtags = readHashtags(payload.hashtags);
  const cta = readCta(payload.cta);
  const mode = readMode(payload.mode);
  const platform = payload.platform === undefined && !requireCore ? undefined : readPlatform(payload.platform);
  const groupBatch = readOptionalString(payload.groupBatch, "groupBatch");
  const batchTimeSlot = readBatchTimeSlot(payload.batchTimeSlot);
  const groupUrls = readGroupUrls(payload.groupUrls);
  const mediaIds = readMediaIds(payload.mediaIds);

  if (requireCore && !propertyId) throw new Error("propertyId is required");

  return { propertyId, platform, mode, copy, hashtags, cta, groupBatch, batchTimeSlot, groupUrls, mediaIds };
}

export function parseUpdatePublicationInput(payload: unknown): ParsedPublicationFields {
  if (!isRecord(payload) || Object.keys(payload).length === 0) throw new Error("No fields provided for update");
  return parseFields(payload, false);
}

export function parseSchedulePublicationInput(payload: unknown): { scheduledFor: string } {
  if (!isRecord(payload)) throw new Error("Invalid payload");
  const raw = readOptionalString(payload.scheduledFor, "scheduledFor");
  if (!raw) throw new Error("scheduledFor is required");
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) throw new Error("scheduledFor must be a valid date");
  if (timestamp > Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) {
    throw new Error("scheduledFor must not be more than 2 years in the future");
  }
  return { scheduledFor: new Date(timestamp).toISOString() };
}

export function parseManualActionInput(payload: unknown): { action: "moved_to_queue" | "marked_ready" | "published_manually" | "skipped" | "failed"; metadata?: Record<string, unknown> } {
  if (!isRecord(payload)) throw new Error("Invalid payload");
  const action = readOptionalString(payload.action, "action");
  if (!action) throw new Error("action is required");
  const validActions = ["moved_to_queue", "marked_ready", "published_manually", "skipped", "failed"] as const;
  if (!validActions.includes(action as typeof validActions[number])) {
    throw new Error(`action must be one of: ${validActions.join(", ")}`);
  }
  const metadata = payload.metadata;
  if (metadata !== undefined && (!isRecord(metadata))) throw new Error("metadata must be an object");
  return { action: action as typeof validActions[number], metadata: metadata ?? {} };
}
