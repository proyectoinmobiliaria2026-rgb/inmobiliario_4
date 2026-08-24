import { createClient } from "@supabase/supabase-js";
import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { runDueSchedulerJobs } from "@/lib/services/scheduler-service";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ ok: false, reason }, { status: 500 });
}

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase service configuration");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  try {
    let supabase;
    if (isCronAuthorized(request)) {
      supabase = createServiceClient();
    } else {
      ({ supabase } = await requireAuthContext(request));
    }
    const summary = await runDueSchedulerJobs(supabase);
    return NextResponse.json({ ok: true, data: summary });
  } catch (error) { return errorResponse(error); }
}
