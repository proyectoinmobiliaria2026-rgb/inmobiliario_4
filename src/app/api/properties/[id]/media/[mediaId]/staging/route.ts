import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { generatePropertyStaging } from "@/lib/services/staging-service";
import { logEvent } from "@/lib/services/event-log-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; mediaId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuthContext(request);
    const { id, mediaId } = await context.params;
    const data = await generatePropertyStaging(supabase, user.id, id, mediaId);
    await logEvent(supabase, user.id, {
      eventType: "staging.generated",
      entityType: "property_media",
      entityId: mediaId,
      payload: { propertyId: id }
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("not found") ? 404 : reason.includes("required") || reason.includes("only") ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
