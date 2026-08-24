import { describe, expect, it } from "vitest";
import { parseCreatePropertyInput, parseUpdatePropertyInput } from "@/lib/validators/property";
import { parseCreatePropertyMediaInput } from "@/lib/validators/media";

describe("property business validations", () => {
  it("rejects invalid property type", () => {
    expect(() =>
      parseCreatePropertyInput({
        title: "Casa amplia zona centro",
        propertyType: "castle",
        operationType: "sale"
      })
    ).toThrow("propertyType must be one of");
  });

  it("rejects invalid operation type", () => {
    expect(() =>
      parseCreatePropertyInput({
        title: "Casa amplia zona centro",
        propertyType: "house",
        operationType: "swap"
      })
    ).toThrow("operationType must be one of");
  });

  it("rejects negative numeric fields", () => {
    expect(() =>
      parseUpdatePropertyInput({
        areaM2: -10
      })
    ).toThrow("areaM2 must be a non-negative number");
  });

  it("validates media mime by kind", () => {
    const fakeFile = {
      name: "clip.mp4",
      type: "video/mp4",
      size: 1024,
      arrayBuffer: async () => new ArrayBuffer(0)
    };

    const formData = {
      get(key: string) {
        if (key === "kind") return "image";
        if (key === "state") return "original";
        if (key === "file") return fakeFile;
        return null;
      }
    } as unknown as FormData;

    expect(() => parseCreatePropertyMediaInput(formData, "property-1")).toThrow(
      "file mime type must be image/* when kind=image"
    );
  });
});
