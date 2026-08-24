import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/route-auth", () => {
  class UnauthorizedError extends Error {
    constructor(message = "Unauthorized") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  return {
    UnauthorizedError,
    requireAuthContext: vi.fn()
  };
});

vi.mock("@/lib/services/property-service", () => {
  return {
    listProperties: vi.fn(),
    createProperty: vi.fn()
  };
});

import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { createProperty, listProperties } from "@/lib/services/property-service";
import { GET, POST } from "./route";

describe("/api/properties integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing or invalid", async () => {
    vi.mocked(requireAuthContext).mockRejectedValue(new UnauthorizedError("Invalid token"));

    const request = new NextRequest("http://localhost:3000/api/properties");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
  });

  it("lists properties using authenticated supabase client", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(listProperties).mockResolvedValue({
      items: [
        {
          id: "property-1",
          title: "Casa 1"
        }
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1
    } as never);

    const request = new NextRequest("http://localhost:3000/api/properties");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.items).toHaveLength(1);
    expect(payload.data.total).toBe(1);
    expect(vi.mocked(listProperties)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: 1, pageSize: 10 })
    );
  });

  it("creates property with auth.uid instead of createdBy payload", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "auth-user-id" } as never
    });
    vi.mocked(createProperty).mockResolvedValue({ id: "property-2" } as never);

    const request = new NextRequest("http://localhost:3000/api/properties", {
      method: "POST",
      body: JSON.stringify({
        createdBy: "forged-user",
        title: "Depto",
        propertyType: "apartment",
        operationType: "sale"
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(vi.mocked(createProperty)).toHaveBeenCalledWith(
      expect.anything(),
      "auth-user-id",
      expect.objectContaining({
        title: "Depto",
        propertyType: "apartment",
        operationType: "sale"
      })
    );
  });
});
