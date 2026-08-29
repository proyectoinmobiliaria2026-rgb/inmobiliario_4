import type { ContentChannel } from "@/lib/types/content";

export type AssistedManualStatus =
  | "prepared"
  | "manual_queue"
  | "ready_to_publish"
  | "published_manually"
  | "skipped";

export type DirectApiStatus = "scheduled" | "api_submitted" | "published" | "failed";

export type LocalTestStatus = "draft" | "published" | "failed";

export type PublicationStatus =
  | "draft"
  | "scheduled"
  | "api_submitted"
  | "published"
  | "failed"
  | "cancelled"
  | AssistedManualStatus;

export const PUBLICATION_STATUSES: PublicationStatus[] = [
  "draft",
  "scheduled",
  "api_submitted",
  "published",
  "failed",
  "cancelled",
  "prepared",
  "manual_queue",
  "ready_to_publish",
  "published_manually",
  "skipped"
];

export const ASSISTED_MANUAL_STATUSES: AssistedManualStatus[] = [
  "prepared",
  "manual_queue",
  "ready_to_publish",
  "published_manually",
  "skipped"
];

export const DIRECT_API_STATUSES: DirectApiStatus[] = ["scheduled", "api_submitted", "published", "failed"];

export const LOCAL_TEST_STATUSES: LocalTestStatus[] = ["draft", "published", "failed"];

export type PublicationPlatform = ContentChannel | "tiktok";

export const PUBLICATION_PLATFORMS: PublicationPlatform[] = ["facebook", "instagram", "whatsapp", "tiktok"];

export type PublicationMode = "assisted_manual" | "direct_api" | "local_test";

export const PUBLICATION_MODES: PublicationMode[] = ["assisted_manual", "direct_api", "local_test"];

export function getValidStatusesForMode(mode: PublicationMode): PublicationStatus[] {
  switch (mode) {
    case "assisted_manual":
      return ASSISTED_MANUAL_STATUSES;
    case "direct_api":
      return DIRECT_API_STATUSES;
    case "local_test":
      return LOCAL_TEST_STATUSES;
  }
}

export type PublicationRecord = {
  id: string;
  property_id: string;
  platform: PublicationPlatform;
  mode: PublicationMode;
  status: PublicationStatus;
  scheduled_for: string | null;
  executed_at: string | null;
  confirmed_at: string | null;
  confirmed_at_manual: string | null;
  confirmed_by: string | null;
  external_id: string | null;
  group_batch: string | null;
  batch_time_slot: "morning" | "afternoon" | "evening" | null;
  payload: {
    copy?: string;
    hashtags?: string[];
    cta?: string;
    group_urls?: string[];
    media_ids?: string[];
  } & Record<string, unknown>;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreatePublicationInput = {
  propertyId: string;
  platform: PublicationPlatform;
  mode?: PublicationMode;
  copy?: string;
  hashtags?: string[];
  cta?: string;
  groupBatch?: string;
  batchTimeSlot?: "morning" | "afternoon" | "evening";
  groupUrls?: string[];
  mediaIds?: string[];
};

export type UpdatePublicationInput = {
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

export type PublicationFilters = {
  propertyId?: string;
  platform?: PublicationPlatform | string;
  mode?: PublicationMode | string;
  status?: PublicationStatus | string;
  page: number;
  pageSize: number;
};

export type PublicationListResult = {
  items: PublicationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PublicationSummaryByMode = {
  mode: PublicationMode;
  status: PublicationStatus;
  count: number;
};

export type ManualActionRecord = {
  id: string;
  publication_id: string;
  action: "moved_to_queue" | "marked_ready" | "published_manually" | "skipped" | "failed";
  performed_by: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SchedulerJobRecord = {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type SchedulerRunSummary = {
  processed: number;
  published: number;
  retried: number;
  failed: number;
  skipped: number;
};
