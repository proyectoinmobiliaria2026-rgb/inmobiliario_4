import { describe, expect, it } from "vitest";
import { parseCreatePublicationInput, parseSchedulePublicationInput, parseUpdatePublicationInput } from "@/lib/validators/publication";

describe("publication validators", () => {
  it("requires a property and a valid platform", () => {
    expect(() => parseCreatePublicationInput({ platform: "facebook" })).toThrow("propertyId is required");
    expect(() => parseCreatePublicationInput({ propertyId: "p1" })).toThrow("platform is required");
    expect(() => parseCreatePublicationInput({ propertyId: "p1", platform: "tiktok" })).toThrow("platform must be one of");
  });

  it("normalizes and accepts a valid publication", () => {
    expect(
      parseCreatePublicationInput({ propertyId: " p1 ", platform: " facebook ", mode: "automatic", copy: " Hola ", hashtags: ["#casa", " mx "], cta: " Escribe ya " })
    ).toMatchObject({
      propertyId: "p1",
      platform: "facebook",
      mode: "automatic",
      copy: "Hola",
      hashtags: ["casa", "mx"],
      cta: "Escribe ya"
    });
  });

  it("rejects invalid mode, hashtags and long copy", () => {
    expect(() => parseCreatePublicationInput({ propertyId: "p1", platform: "facebook", mode: "auto" })).toThrow("mode must be one of");
    expect(() => parseCreatePublicationInput({ propertyId: "p1", platform: "facebook", hashtags: "casa" })).toThrow("hashtags must be an array");
    expect(() => parseCreatePublicationInput({ propertyId: "p1", platform: "facebook", copy: "x".repeat(5001) })).toThrow("copy length must be at most 5000");
    expect(() => parseCreatePublicationInput({ propertyId: "p1", platform: "facebook", hashtags: Array(31).fill("a") })).toThrow("at most 30 items");
  });

  it("accepts partial updates and rejects empty payloads", () => {
    expect(() => parseUpdatePublicationInput({})).toThrow("No fields provided for update");
    expect(parseUpdatePublicationInput({ copy: "Nueva copia" })).toMatchObject({ copy: "Nueva copia" });
    expect(parseUpdatePublicationInput({ platform: "whatsapp" })).toMatchObject({ platform: "whatsapp" });
  });

  it("validates schedule input", () => {
    expect(() => parseSchedulePublicationInput({})).toThrow("scheduledFor is required");
    expect(() => parseSchedulePublicationInput({ scheduledFor: "tomorrow" })).toThrow("scheduledFor must be a valid date");
    expect(() => parseSchedulePublicationInput({ scheduledFor: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString() })).toThrow("2 years in the future");
    const parsed = parseSchedulePublicationInput({ scheduledFor: "2026-09-01T10:00:00Z" });
    expect(parsed.scheduledFor).toBe("2026-09-01T10:00:00.000Z");
  });
});
