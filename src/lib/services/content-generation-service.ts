import { getAIService } from "@/lib/ai/factory";
import type { AiGenerationRecord, ContentChannel, PropertyContentSource } from "@/lib/types/content";
import type { PropertyRecord } from "@/lib/types/property";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPropertyById } from "@/lib/services/property-service";

function toContentSource(property: PropertyRecord): PropertyContentSource {
  return {
    title: property.title,
    description: property.description,
    propertyType: property.property_type,
    operationType: property.operation_type,
    city: property.city,
    areaM2: property.area_m2,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    priceAmount: property.price_amount,
    priceCurrency: property.price_currency
  };
}

export async function generatePropertyContent(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  channel: ContentChannel
): Promise<AiGenerationRecord> {
  const property = await getPropertyById(supabase, propertyId);
  if (!property) {
    throw new Error("Property not found");
  }

  const propertySource = toContentSource(property);
  const aiService = getAIService();
  const generated = await aiService.generateContent({ channel, property: propertySource });

  const { data, error } = await supabase
    .from("ai_generations")
    .insert({
      property_id: propertyId,
      channel,
      prompt_input: { channel, property: propertySource },
      output: generated,
      provider: aiService.provider,
      status: "completed",
      created_by: userId
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AiGenerationRecord;
}

export async function listPropertyGenerations(
  supabase: SupabaseClient,
  propertyId: string
): Promise<AiGenerationRecord[]> {
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AiGenerationRecord[];
}
