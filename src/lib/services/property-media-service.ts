import type {
  CreatePropertyMediaInput,
  PropertyMediaRecord,
  PropertyMediaWithUrl,
  UpdatePropertyMediaInput
} from "@/lib/types/media";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROPERTY_MEDIA_BUCKET = "property-media";
const SIGNED_URL_EXPIRES_SECONDS = 300;

function buildStoragePath(userId: string, propertyId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${propertyId}/${Date.now()}-${safeName}`;
}

export async function listPropertyMedia(
  supabase: SupabaseClient,
  propertyId: string
): Promise<PropertyMediaWithUrl[]> {
  const { data, error } = await supabase
    .from("property_media")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PropertyMediaWithUrl[];

  return Promise.all(
    rows.map(async (row) => {
      const signed = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_URL_EXPIRES_SECONDS);

      return {
        ...row,
        signed_url: signed.error ? null : (signed.data?.signedUrl ?? null)
      };
    })
  );
}

export async function createPropertyMedia(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePropertyMediaInput
): Promise<PropertyMediaRecord> {
  const storagePath = buildStoragePath(userId, input.propertyId, input.file.name);
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());

  const uploadResult = await supabase.storage.from(PROPERTY_MEDIA_BUCKET).upload(storagePath, fileBuffer, {
    contentType: input.file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const { data, error } = await supabase
    .from("property_media")
    .insert({
      property_id: input.propertyId,
      kind: input.kind,
      state: input.state,
      storage_path: storagePath,
      mime_type: input.file.type || null,
      file_size_bytes: input.file.size,
      created_by: userId
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return data as PropertyMediaRecord;
}

export async function updatePropertyMedia(
  supabase: SupabaseClient,
  propertyId: string,
  mediaId: string,
  input: UpdatePropertyMediaInput
): Promise<PropertyMediaRecord> {
  const payload: Record<string, unknown> = {};
  if (input.state !== undefined) payload.state = input.state;
  if (input.metadata !== undefined) payload.metadata = input.metadata;

  const { data, error } = await supabase
    .from("property_media")
    .update(payload)
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PropertyMediaRecord;
}

export async function deletePropertyMedia(supabase: SupabaseClient, propertyId: string, mediaId: string): Promise<void> {
  const { data, error } = await supabase
    .from("property_media")
    .select("id, storage_path")
    .eq("id", mediaId)
    .eq("property_id", propertyId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const deleted = await supabase.from("property_media").delete().eq("id", mediaId).eq("property_id", propertyId);
  if (deleted.error) {
    throw new Error(deleted.error.message);
  }

  if (data?.storage_path) {
    const storageDeleted = await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([data.storage_path]);
    if (storageDeleted.error) {
      throw new Error(storageDeleted.error.message);
    }
  }
}
