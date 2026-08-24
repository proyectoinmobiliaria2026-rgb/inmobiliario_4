import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { createPropertyMedia, listPropertyMedia } from "@/lib/services/property-media-service";
import { parseCreatePropertyMediaInput } from "@/lib/validators/media";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id } = await context.params;
    const media = await listPropertyMedia(supabase, id);
    return NextResponse.json({ ok: true, data: media });
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

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, user } = await requireAuthContext(request);
    const { id } = await context.params;
    const formData = await request.formData();
    const input = parseCreatePropertyMediaInput(formData, id);
    const media = await createPropertyMedia(supabase, user.id, input);
    return NextResponse.json({ ok: true, data: media }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("required") || reason.includes("must be") ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
