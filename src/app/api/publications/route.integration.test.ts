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

vi.mock("@/lib/services/publication-service", () => {
  return {
    listPublications: vi.fn(),
    createPublication: vi.fn()
  };
});

import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { createPublication, listPublications } from "@/lib/services/publication-service";
import { GET, POST } from "./route";

describe("/api/publications integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when token is missing or invalid", async () => {
    vi.mocked(requireAuthContext).mockRejectedValue(new UnauthorizedError("Invalid token"));

    const request = new NextRequest("http://localhost:3000/api/publications");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
  });

  it("lists publications with filters", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(listPublications).mockResolvedValue({
      items: [{ id: "pub-1", platform: "facebook" }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1
    } as never);

    const request = new NextRequest("http://localhost:3000/api/publications?status=draft&platform=facebook");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.items).toHaveLength(1);
    expect(vi.mocked(listPublications)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: "draft", platform: "facebook", page: 1, pageSize: 10 })
    );
  });

  it("creates publication with auth.uid instead of createdBy payload", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "auth-user-id" } as never
    });
    vi.mocked(createPublication).mockResolvedValue({ id: "pub-2" } as never);

    const request = new NextRequest("http://localhost:3000/api/publications", {
      method: "POST",
      body: JSON.stringify({
        propertyId: "property-1",
        platform: "instagram",
        copy: "Copia de prueba",
        hashtags: ["casa"]
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(vi.mocked(createPublication)).toHaveBeenCalledWith(
      expect.anything(),
      "auth-user-id",
      expect.objectContaining({ propertyId: "property-1", platform: "instagram", copy: "Copia de prueba" })
    );
  });

  it("returns 400 for invalid platform", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });

    const request = new NextRequest("http://localhost:3000/api/publications", {
      method: "POST",
      body: JSON.stringify({ propertyId: "property-1", platform: "tiktok" }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });
});
