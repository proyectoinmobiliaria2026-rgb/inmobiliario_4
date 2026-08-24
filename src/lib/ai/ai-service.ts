import type { ContentGenerationInput, GeneratedContent } from "@/lib/types/content";

export interface AIService {
  readonly provider: string;
  generateContent(input: ContentGenerationInput): Promise<GeneratedContent>;
}
