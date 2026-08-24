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

vi.mock("@/lib/services/content-generation-service", () => {
  return {
    generatePropertyContent: vi.fn(),
    listPropertyGenerations: vi.fn()
  };
});

import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { generatePropertyContent, listPropertyGenerations } from "@/lib/services/content-generation-service";
import { POST } from "./[id]/generate-content/route";
import { GET } from "./[id]/generations/route";

describe("/api/properties/:id/generate-content integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthorized", async () => {
    vi.mocked(requireAuthContext).mockRejectedValue(new UnauthorizedError("Invalid token"));

    const request = new NextRequest("http://localhost:3000/api/properties/p1/generate-content", {
      method: "POST",
      body: JSON.stringify({ channel: "facebook" }),
      headers: { "content-type": "application/json" }
    });
    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid channel", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });

    const request = new NextRequest("http://localhost:3000/api/properties/p1/generate-content", {
      method: "POST",
      body: JSON.stringify({ channel: "tiktok" }),
      headers: { "content-type": "application/json" }
    });
    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.reason).toContain("channel must be one of");
  });

  it("generates content and returns record", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(generatePropertyContent).mockResolvedValue({
      id: "g1",
      channel: "instagram",
      provider: "mock",
      output: { copy: "c", hashtags: ["#a"], cta: "cta" }
    } as never);

    const request = new NextRequest("http://localhost:3000/api/properties/p1/generate-content", {
      method: "POST",
      body: JSON.stringify({ channel: "instagram" }),
      headers: { "content-type": "application/json" }
    });
    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.channel).toBe("instagram");
    expect(vi.mocked(generatePropertyContent)).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "p1",
      "instagram"
    );
  });

  it("lists generations for property", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(listPropertyGenerations).mockResolvedValue([
      { id: "g1", channel: "facebook" }
    ] as never);

    const request = new NextRequest("http://localhost:3000/api/properties/p1/generations");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(vi.mocked(listPropertyGenerations)).toHaveBeenCalledWith(expect.anything(), "p1");
  });
});
