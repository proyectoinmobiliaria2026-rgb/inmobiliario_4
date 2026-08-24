export type ContentChannel = "facebook" | "instagram" | "whatsapp";

export const CONTENT_CHANNELS: ContentChannel[] = ["facebook", "instagram", "whatsapp"];

export type PropertyContentSource = {
  title: string;
  description?: string | null;
  propertyType: string;
  operationType: string;
  city?: string | null;
  areaM2?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
};

export type ContentGenerationInput = {
  channel: ContentChannel;
  property: PropertyContentSource;
};

export type GeneratedContent = {
  copy: string;
  hashtags: string[];
  cta: string;
};

export type AiGenerationRecord = {
  id: string;
  property_id: string;
  channel: string;
  prompt_input: Record<string, unknown>;
  output: GeneratedContent;
  provider: string;
  status: string;
  created_by: string;
  created_at: string;
};
