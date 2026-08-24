import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { generatePropertyContent } from "@/lib/services/content-generation-service";
import { parseGenerateContentInput } from "@/lib/validators/content";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuthContext(request);
    const { id } = await context.params;

    const payload = await request.json();
    const { channel } = parseGenerateContentInput(payload);

    const generation = await generatePropertyContent(supabase, user.id, id, channel);
    return NextResponse.json({ ok: true, data: generation }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    if (reason === "Property not found") {
      return NextResponse.json({ ok: false, reason }, { status: 404 });
    }

    const status = reason.includes("must be") || reason.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
