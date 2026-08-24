import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { getDashboardSummary } from "@/lib/services/dashboard-service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);
    const summary = await getDashboardSummary(supabase);
    return NextResponse.json({ ok: true, data: summary });
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
