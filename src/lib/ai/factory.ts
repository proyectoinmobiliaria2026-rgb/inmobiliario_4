import type { AIService } from "@/lib/ai/ai-service";
import { MockAIService } from "@/lib/ai/providers/mock-provider";
import { OpenAIAIService } from "@/lib/ai/providers/openai-provider";

// TEMPORAL: factory de providers IA. El mock es la opcion por defecto para desarrollo.
export function getAIService(): AIService {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();

  if (provider === "openai") {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      throw new Error("AI_API_KEY is required when AI_PROVIDER=openai");
    }
    return new OpenAIAIService(apiKey, process.env.AI_MODEL ?? "gpt-4o-mini");
  }

  return new MockAIService();
}
