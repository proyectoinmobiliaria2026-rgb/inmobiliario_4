import type { ContentGenerationInput, GeneratedContent } from "@/lib/types/content";
import type { ListingDraftInput } from "@/lib/validators/property";

export type ListingDraft = {
  title: string;
  description: string;
};

export interface AIService {
  readonly provider: string;
  generateContent(input: ContentGenerationInput): Promise<GeneratedContent>;
  generateListing(input: ListingDraftInput): Promise<ListingDraft>;
}
