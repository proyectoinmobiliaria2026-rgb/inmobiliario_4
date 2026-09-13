import type { PropertyMediaRecord, PropertyMediaWithUrl } from "@/lib/types/media";
import type { SupabaseClient } from "@supabase/supabase-js";

const PROPERTY_MEDIA_BUCKET = "property-media";
const SIGNED_URL_EXPIRES_SECONDS = 300;
const OPENAI_IMAGES_API_URL = "https://api.openai.com/v1/images/edits";

export type StagingResult = PropertyMediaWithUrl & {
  generationId: string;
};

const STAGING_PROMPT = [
  "Transforma esta foto de un inmueble en una version amueblada y lista para mostrar,",
  "manteniendo fielmente la arquitectura, los acabados, los colores, la luz natural y la distribucion del espacio.",
  "Agrega mobiliario moderno y neutro (sofas, camas, mesa de comedor, decoracion sobria),",
  "en estilo interiorismo profesional de alta gama. No cambies las dimensiones de la habitacion.",
  "Sin personas, sin logotipos ni marcas visibles, sin texto."
].join(" ");

function buildStoragePath(userId: string, propertyId: string): string {
  return `${userId}/${propertyId}/${Date.now()}-staging.png`;
}

export async function generatePropertyStaging(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  sourceMediaId: string
): Promise<StagingResult> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to generate staging");
  }

  const { data: source, error: sourceError } = await supabase
    .from("property_media")
    .select("*")
    .eq("id", sourceMediaId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (sourceError) throw new Error(sourceError.message);
  if (!source) throw new Error("Media not found");
  if (source.kind !== "image") throw new Error("Staging is only available for image media");

  const { data: imageBuffer, error: downloadError } = await supabase.storage
    .from(PROPERTY_MEDIA_BUCKET)
    .download(source.storage_path);
  if (downloadError || !imageBuffer) {
    throw new Error(downloadError?.message ?? "Could not download source image");
  }

  const file = new File([imageBuffer], "source.png", { type: imageBuffer.type || "image/png" });

  const form = new FormData();
  form.append("image", file);
  form.append("prompt", STAGING_PROMPT);
  form.append("model", "gpt-image-1");
  form.append("size", "1024x1024");
  form.append("n", "1");
  form.append("response_format", "b64_json");

  const openaiResponse = await fetch(OPENAI_IMAGES_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text();
    throw new Error(`OpenAI error ${openaiResponse.status}: ${detail.slice(0, 300)}`);
  }

  const payload = (await openaiResponse.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };

  const item = payload.data?.[0];
  const b64 = item?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no generated image");
  }

  const imageBytes = Buffer.from(b64, "base64");
  const storagePath = buildStoragePath(userId, propertyId);

  const uploadResult = await supabase.storage.from(PROPERTY_MEDIA_BUCKET).upload(storagePath, imageBytes, {
    contentType: "image/png",
    upsert: false
  });
  if (uploadResult.error) {
    throw new Error(uploadResult.error.message);
  }

  const { data: mediaRow, error: mediaError } = await supabase
    .from("property_media")
    .insert({
      property_id: propertyId,
      kind: "image",
      state: "generated",
      storage_path: storagePath,
      mime_type: "image/png",
      file_size_bytes: imageBytes.byteLength,
      derived_from: sourceMediaId,
      metadata: {
        prompt: STAGING_PROMPT,
        provider: "openai",
        model: "gpt-image-1",
        source_media_id: sourceMediaId
      },
      created_by: userId
    })
    .select("*")
    .single();

  if (mediaError) {
    await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
    throw new Error(mediaError.message);
  }

  const generationResult = await supabase
    .from("ai_generations")
    .insert({
      property_id: propertyId,
      channel: "staging",
      prompt_input: { source_media_id: sourceMediaId, prompt: STAGING_PROMPT },
      output: { storage_path: storagePath, state: "generated" },
      provider: "openai",
      status: "completed",
      created_by: userId
    })
    .select("id")
    .single();

  if (generationResult.error) {
    throw new Error(generationResult.error.message);
  }

  const record = mediaRow as PropertyMediaRecord;
  const signed = await supabase.storage
    .from(PROPERTY_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_SECONDS);

  return {
    ...record,
    signed_url: signed.error ? null : (signed.data?.signedUrl ?? null),
    generationId: (generationResult.data?.id as string) ?? ""
  };
}