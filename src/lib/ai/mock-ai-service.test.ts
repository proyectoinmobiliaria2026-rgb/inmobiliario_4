import { describe, expect, it } from "vitest";
import { MockAIService } from "@/lib/ai/providers/mock-provider";
import { buildUserPrompt } from "@/lib/ai/prompt";
import type { ContentGenerationInput } from "@/lib/types/content";

const baseInput: ContentGenerationInput = {
  channel: "facebook",
  property: {
    title: "Departamento céntrico amplio",
    description: "Departamento remodelado cerca de todo",
    propertyType: "apartment",
    operationType: "sale",
    city: "Monterrey",
    areaM2: 90,
    bedrooms: 2,
    bathrooms: 2,
    priceAmount: 200000,
    priceCurrency: "USD"
  }
};

describe("MockAIService", () => {
  it("uses mock provider label", () => {
    const service = new MockAIService();
    expect(service.provider).toBe("mock");
  });

  it("generates facebook copy with cta and hashtags", async () => {
    const result = await new MockAIService().generateContent({ ...baseInput, channel: "facebook" });

    expect(result.copy).toContain("Venta: Departamento céntrico amplio");
    expect(result.copy).toContain("Escríbenos para agendar una visita.");
    expect(result.hashtags.length).toBeGreaterThanOrEqual(3);
    expect(result.hashtags.every((tag) => tag.startsWith("#"))).toBe(true);
  });

  it("generates instagram copy with dm cta and more hashtags", async () => {
    const result = await new MockAIService().generateContent({ ...baseInput, channel: "instagram" });

    expect(result.copy).toContain("Envíanos DM");
    expect(result.hashtags.length).toBeGreaterThanOrEqual(5);
  });

  it("generates whatsapp copy with direct cta", async () => {
    const result = await new MockAIService().generateContent({ ...baseInput, channel: "whatsapp" });

    expect(result.copy).toContain("Responde este mensaje para agendar tu visita.");
    expect(result.copy).toContain("200000 USD");
    expect(result.hashtags.length).toBeGreaterThanOrEqual(2);
  });

  it("builds prompt with property details", () => {
    const prompt = buildUserPrompt(baseInput);

    expect(prompt).toContain("canal: facebook");
    expect(prompt).toContain("Departamento céntrico amplio");
    expect(prompt).toContain("Precio: 200000 USD");
    expect(prompt).toContain('"copy"');
  });
});
