import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { deletePropertyMedia, updatePropertyMedia } from "@/lib/services/property-media-service";
import { parseUpdatePropertyMediaInput } from "@/lib/validators/media";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; mediaId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id, mediaId } = await context.params;
    const payload = await request.json();
    const input = parseUpdatePropertyMediaInput(payload);
    const media = await updatePropertyMedia(supabase, id, mediaId, input);
    return NextResponse.json({ ok: true, data: media });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("No fields") || reason.includes("must be") ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id, mediaId } = await context.params;
    await deletePropertyMedia(supabase, id, mediaId);
    return NextResponse.json({ ok: true });
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
