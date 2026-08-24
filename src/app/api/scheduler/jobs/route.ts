import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { listSchedulerJobs } from "@/lib/services/scheduler-service";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  const isValidation = /required|Expected|must be|Invalid/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);
    const params = request.nextUrl.searchParams;
    const pageRaw = Number(params.get("page") ?? "1");
    const pageSizeRaw = Number(params.get("pageSize") ?? "20");
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const pageSize = Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 100 ? pageSizeRaw : 20;
    const data = await listSchedulerJobs(supabase, { status: params.get("status") ?? undefined, page, pageSize });
    return NextResponse.json({ ok: true, data });
  } catch (error) { return errorResponse(error); }
}
