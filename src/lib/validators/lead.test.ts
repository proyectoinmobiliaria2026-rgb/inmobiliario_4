import { describe, expect, it } from "vitest";
import { parseCreateLeadInput, parseUpdateLeadInput } from "@/lib/validators/lead";

describe("lead validators", () => {
  it("requires a name and a contact channel", () => {
    expect(() => parseCreateLeadInput({ name: "A" })).toThrow("name length");
    expect(() => parseCreateLeadInput({ name: "Ana Pérez" })).toThrow("phone or email");
  });

  it("normalizes and accepts a valid lead", () => {
    expect(parseCreateLeadInput({ name: " Ana Pérez ", email: " ana@example.com ", status: "qualified" })).toMatchObject({
      name: "Ana Pérez",
      email: "ana@example.com",
      status: "qualified"
    });
  });

  it("rejects invalid status and dates", () => {
    expect(() => parseCreateLeadInput({ name: "Ana Pérez", phone: "555", status: "pending" })).toThrow("status must be one of");
    expect(() => parseUpdateLeadInput({ nextFollowUpAt: "tomorrow" })).toThrow("nextFollowUpAt must be a valid date");
  });

  it("accepts partial updates", () => {
    expect(parseUpdateLeadInput({ notes: "Llamar el viernes" })).toEqual({
      propertyId: undefined,
      name: "Valid contact",
      phone: undefined,
      email: undefined,
      origin: undefined,
      status: undefined,
      notes: "Llamar el viernes",
      lastContactAt: undefined,
      nextFollowUpAt: undefined
    });
  });
});
