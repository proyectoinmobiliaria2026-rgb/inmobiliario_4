import type { AIService } from "@/lib/ai/ai-service";
import { CONTENT_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompt";
import type { ContentGenerationInput, GeneratedContent } from "@/lib/types/content";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIAIService implements AIService {
  readonly provider = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = "gpt-4o-mini"
  ) {}

  async generateContent(input: ContentGenerationInput): Promise<GeneratedContent> {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: CONTENT_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) }
        ]
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI error ${response.status}: ${detail.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI returned an empty response");
    }

    const parsed = JSON.parse(raw) as Partial<GeneratedContent>;

    return {
      copy: typeof parsed.copy === "string" ? parsed.copy : "",
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.filter((tag): tag is string => typeof tag === "string")
        : [],
      cta: typeof parsed.cta === "string" ? parsed.cta : ""
    };
  }
}
