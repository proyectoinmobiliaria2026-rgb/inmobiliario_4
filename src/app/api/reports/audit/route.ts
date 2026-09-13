import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import type { AuditFilters } from "@/lib/services/event-log-service";
import { listAuditEvents } from "@/lib/services/event-log-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthContext(request);

    const filters: AuditFilters = {
      entityType: request.nextUrl.searchParams.get("entityType") ?? undefined,
      eventType: request.nextUrl.searchParams.get("eventType") ?? undefined,
      limit: Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 200)
    };

    const events = await listAuditEvents(supabase, user.id, filters);
    return NextResponse.json({ ok: true, data: events });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
