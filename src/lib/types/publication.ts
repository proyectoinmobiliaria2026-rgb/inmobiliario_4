import type { ContentChannel } from "@/lib/types/content";

export type PublicationStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled";

export const PUBLICATION_STATUSES: PublicationStatus[] = ["draft", "scheduled", "published", "failed", "cancelled"];

export type PublicationPlatform = ContentChannel;

export const PUBLICATION_PLATFORMS: PublicationPlatform[] = ["facebook", "instagram", "whatsapp", "tiktok"];

export type PublicationMode = "assisted" | "automatic";

export type PublicationRecord = {
  id: string;
  property_id: string;
  platform: PublicationPlatform;
  mode: PublicationMode;
  status: PublicationStatus;
  scheduled_for: string | null;
  executed_at: string | null;
  confirmed_at: string | null;
  external_id: string | null;
  payload: { copy?: string; hashtags?: string[]; cta?: string } & Record<string, unknown>;
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
};

export type UpdatePublicationInput = {
  platform?: PublicationPlatform;
  mode?: PublicationMode;
  copy?: string;
  hashtags?: string[];
  cta?: string;
};

export type PublicationFilters = {
  propertyId?: string;
  platform?: PublicationPlatform | string;
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
