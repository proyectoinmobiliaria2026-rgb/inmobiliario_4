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

vi.mock("@/lib/services/scheduler-service", () => {
  return {
    runDueSchedulerJobs: vi.fn()
  };
});

import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { runDueSchedulerJobs } from "@/lib/services/scheduler-service";
import { POST } from "./route";

describe("/api/scheduler/run integration", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns 401 without session or cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.mocked(requireAuthContext).mockRejectedValue(new UnauthorizedError("Missing bearer token or session cookie"));

    const request = new NextRequest("http://localhost:3000/api/scheduler/run", { method: "POST" });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
  });

  it("runs due jobs with an authenticated session", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.mocked(requireAuthContext).mockResolvedValue({
      supabase: {} as never,
      user: { id: "user-1" } as never
    });
    vi.mocked(runDueSchedulerJobs).mockResolvedValue({ processed: 2, published: 1, retried: 1, failed: 0, skipped: 0 });

    const request = new NextRequest("http://localhost:3000/api/scheduler/run", { method: "POST" });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toMatchObject({ processed: 2, published: 1 });
  });

  it("authorizes cron requests with the shared secret and uses a service client", async () => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.mocked(runDueSchedulerJobs).mockResolvedValue({ processed: 1, published: 1, retried: 0, failed: 0, skipped: 0 });

    const request = new NextRequest("http://localhost:3000/api/scheduler/run", {
      method: "POST",
      headers: { "x-cron-secret": "cron-secret" }
    });
    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.processed).toBe(1);
    expect(requireAuthContext).not.toHaveBeenCalled();
  });
});
