import { describe, expect, it } from "vitest";
import { MockAIService } from "@/lib/ai/providers/mock-provider";

describe("mock AI listing generator", () => {
  it("builds a Spanish title and description with amenities and requirements", async () => {
    const service = new MockAIService();
    const draft = await service.generateListing({
      propertyType: "apartment",
      operationType: "rent",
      city: "Monterrey",
      bedrooms: 2,
      bathrooms: 2,
      parkingSpots: 1,
      priceAmount: 18000,
      priceCurrency: "MXN",
      amenities: ["roof_garden", "gimnasio", "vigilancia_24_7"],
      rentalRequirements: ["sin_aval", "dos_depositos"]
    });

    expect(draft.title).toContain("Departamento en Renta en Monterrey");
    expect(draft.title.length).toBeLessThanOrEqual(120);
    expect(draft.description).toContain("2 recámaras");
    expect(draft.description.toLowerCase()).toContain("roof garden");
    expect(draft.description).toContain("Sin aval");
    expect(draft.description).toContain("18000 MXN");
  });
});
