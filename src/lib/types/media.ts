export type MediaKind = "image" | "video";

export type MediaState = "original" | "processed" | "edited" | "generated";

export type PropertyMediaRecord = {
  id: string;
  property_id: string;
  kind: MediaKind;
  state: MediaState;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
};

export type CreatePropertyMediaInput = {
  propertyId: string;
  kind: MediaKind;
  state: MediaState;
  file: File;
};

export type UpdatePropertyMediaInput = {
  state?: MediaState;
  metadata?: Record<string, unknown>;
};

export type PropertyMediaWithUrl = PropertyMediaRecord & {
  signed_url: string | null;
};
