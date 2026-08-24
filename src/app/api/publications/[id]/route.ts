import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { deletePublication, getPublicationById, updatePublication } from "@/lib/services/publication-service";
import { parseUpdatePublicationInput } from "@/lib/validators/publication";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  if (reason === "Publication not found") return NextResponse.json({ ok: false, reason }, { status: 404 });
  const isValidation = /required|Expected|must be|length|No fields|cannot be|no longer|Invalid|not found/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const publication = await getPublicationById(supabase, (await context.params).id);
    if (!publication) return NextResponse.json({ ok: false, reason: "Publication not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: publication });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const input = parseUpdatePublicationInput(await request.json());
    return NextResponse.json({ ok: true, data: await updatePublication(supabase, (await context.params).id, input) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    await deletePublication(supabase, (await context.params).id);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
