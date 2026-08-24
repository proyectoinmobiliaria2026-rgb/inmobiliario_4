import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { listPropertyGenerations } from "@/lib/services/content-generation-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id } = await context.params;

    const generations = await listPropertyGenerations(supabase, id);
    return NextResponse.json({ ok: true, data: generations });
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
