import { describe, expect, it } from "vitest";
import { parseCreatePropertyInput, parseListingDraftInput } from "@/lib/validators/property";

describe("property details validators", () => {
  it("accepts whitelisted amenities and rental requirements", () => {
    const parsed = parseCreatePropertyInput({
      title: "Departamento con roof garden",
      propertyType: "apartment",
      operationType: "rent",
      amenities: ["roof_garden", "vigilancia_24_7", "roof_garden"],
      rentalRequirements: ["sin_aval"]
    });
    expect(parsed.amenities).toEqual(["roof_garden", "vigilancia_24_7"]);
    expect(parsed.rentalRequirements).toEqual(["sin_aval"]);
  });

  it("rejects unknown amenities and requirements", () => {
    expect(() =>
      parseCreatePropertyInput({
        title: "Departamento prueba",
        propertyType: "apartment",
        operationType: "rent",
        amenities: ["alberca_olimpica"]
      })
    ).toThrow(/amenities contains invalid values/);
    expect(() =>
      parseCreatePropertyInput({
        title: "Departamento prueba",
        propertyType: "apartment",
        operationType: "rent",
        rentalRequirements: ["fiador"]
      })
    ).toThrow(/rentalRequirements contains invalid values/);
    expect(() =>
      parseCreatePropertyInput({
        title: "Departamento prueba",
        propertyType: "apartment",
        operationType: "rent",
        amenities: "roof_garden"
      })
    ).toThrow(/amenities must be an array/);
  });

  it("validates listing draft input for the AI generator", () => {
    expect(() => parseListingDraftInput({ propertyType: "apartment" })).toThrow("operationType is required");
    expect(() => parseListingDraftInput({ propertyType: "bunker", operationType: "sale" })).toThrow(/propertyType must be one of/);
    const parsed = parseListingDraftInput({
      propertyType: "apartment",
      operationType: "rent",
      city: "Monterrey",
      priceAmount: 18000,
      amenities: ["gimnasio"],
      rentalRequirements: ["dos_depositos"]
    });
    expect(parsed).toMatchObject({ propertyType: "apartment", operationType: "rent", city: "Monterrey", amenities: ["gimnasio"] });
  });
});
