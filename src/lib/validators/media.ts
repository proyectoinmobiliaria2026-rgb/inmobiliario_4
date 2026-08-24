import type {
  CreatePropertyMediaInput,
  MediaKind,
  MediaState,
  UpdatePropertyMediaInput
} from "@/lib/types/media";

const MEDIA_KINDS: MediaKind[] = ["image", "video"];
const MEDIA_STATES: MediaState[] = ["original", "processed", "edited", "generated"];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;

function requireText(value: FormDataEntryValue | null, field: string): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function isFileLike(value: unknown): value is File {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function"
  );
}

export function parseCreatePropertyMediaInput(formData: FormData, propertyId: string): CreatePropertyMediaInput {
  const kindText = requireText(formData.get("kind"), "kind");
  const stateText = requireText(formData.get("state"), "state");
  const fileValue = formData.get("file");

  if (!MEDIA_KINDS.includes(kindText as MediaKind)) {
    throw new Error("kind must be one of: image, video");
  }
  if (!MEDIA_STATES.includes(stateText as MediaState)) {
    throw new Error("state must be one of: original, processed, edited, generated");
  }
  if (!isFileLike(fileValue)) {
    throw new Error("file is required");
  }

  if (kindText === "image" && !fileValue.type.startsWith("image/")) {
    throw new Error("file mime type must be image/* when kind=image");
  }
  if (kindText === "video" && !fileValue.type.startsWith("video/")) {
    throw new Error("file mime type must be video/* when kind=video");
  }
  if (kindText === "image" && fileValue.size > IMAGE_MAX_BYTES) {
    throw new Error("image file size exceeds 10MB limit");
  }
  if (kindText === "video" && fileValue.size > VIDEO_MAX_BYTES) {
    throw new Error("video file size exceeds 200MB limit");
  }

  return {
    propertyId,
    kind: kindText as MediaKind,
    state: stateText as MediaState,
    file: fileValue
  };
}

export function parseUpdatePropertyMediaInput(payload: unknown): UpdatePropertyMediaInput {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload");
  }

  const source = payload as Record<string, unknown>;
  const result: UpdatePropertyMediaInput = {};

  if (source.state !== undefined) {
    if (typeof source.state !== "string" || !MEDIA_STATES.includes(source.state as MediaState)) {
      throw new Error("state must be one of: original, processed, edited, generated");
    }
    result.state = source.state as MediaState;
  }

  if (source.metadata !== undefined) {
    if (typeof source.metadata !== "object" || source.metadata === null || Array.isArray(source.metadata)) {
      throw new Error("metadata must be an object");
    }
    result.metadata = source.metadata as Record<string, unknown>;
  }

  if (Object.keys(result).length === 0) {
    throw new Error("No fields provided for update");
  }

  return result;
}
