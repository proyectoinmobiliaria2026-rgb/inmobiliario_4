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

vi.mock("@/lib/services/property-media-service", () => {
  return {
    listPropertyMedia: vi.fn(),
    createPropertyMedia: vi.fn(),
    updatePropertyMedia: vi.fn(),
    deletePropertyMedia: vi.fn()
  };
});

vi.mock("@/lib/validators/media", () => {
  return {
    parseCreatePropertyMediaInput: vi.fn(),
    parseUpdatePropertyMediaInput: vi.fn()
  };
});

import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import {
  createPropertyMedia,
  deletePropertyMedia,
  listPropertyMedia,
  updatePropertyMedia
} from "@/lib/services/property-media-service";
import { parseCreatePropertyMediaInput, parseUpdatePropertyMediaInput } from "@/lib/validators/media";
import { GET, POST } from "./[id]/media/route";
import { DELETE, PATCH } from "./[id]/media/[mediaId]/route";

describe("/api/properties/:id/media integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 in media list when unauthorized", async () => {
    vi.mocked(requireAuthContext).mockRejectedValue(new UnauthorizedError("Invalid token"));

    const request = new NextRequest("http://localhost:3000/api/properties/p1/media");
    const response = await GET(request, { params: Promise.resolve({ id: "p1" }) });

    expect(response.status).toBe(401);
  });

  it("uploads media and persists row", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(parseCreatePropertyMediaInput).mockReturnValue({
      propertyId: "p1",
      kind: "image",
      state: "original",
      file: new File(["content"], "photo.jpg", { type: "image/jpeg" })
    });
    vi.mocked(createPropertyMedia).mockResolvedValue({ id: "m1", kind: "image" } as never);

    const formData = new FormData();
    formData.set("kind", "image");
    formData.set("state", "original");
    formData.set("file", new File(["content"], "photo.jpg", { type: "image/jpeg" }));

    const request = {
      headers: new Headers({ authorization: "Bearer token" }),
      formData: async () => formData
    } as unknown as NextRequest;

    const response = await POST(request, { params: Promise.resolve({ id: "p1" }) });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(vi.mocked(createPropertyMedia)).toHaveBeenCalledTimes(1);
  });

  it("updates and deletes media", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(parseUpdatePropertyMediaInput).mockReturnValue({ state: "processed" });
    vi.mocked(updatePropertyMedia).mockResolvedValue({ id: "m1", state: "processed" } as never);
    vi.mocked(deletePropertyMedia).mockResolvedValue(undefined);
    vi.mocked(listPropertyMedia).mockResolvedValue([]);

    const patchRequest = new NextRequest("http://localhost:3000/api/properties/p1/media/m1", {
      method: "PATCH",
      body: JSON.stringify({ state: "processed" }),
      headers: {
        "content-type": "application/json",
        authorization: "Bearer token"
      }
    });
    const patchResponse = await PATCH(patchRequest, {
      params: Promise.resolve({ id: "p1", mediaId: "m1" })
    });

    const deleteRequest = new NextRequest("http://localhost:3000/api/properties/p1/media/m1", {
      method: "DELETE",
      headers: {
        authorization: "Bearer token"
      }
    });
    const deleteResponse = await DELETE(deleteRequest, {
      params: Promise.resolve({ id: "p1", mediaId: "m1" })
    });

    expect(patchResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
    expect(vi.mocked(updatePropertyMedia)).toHaveBeenCalledWith(expect.anything(), "p1", "m1", {
      state: "processed"
    });
    expect(vi.mocked(deletePropertyMedia)).toHaveBeenCalledWith(expect.anything(), "p1", "m1");
  });
});
