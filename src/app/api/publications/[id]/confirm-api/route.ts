import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { confirmApiPublication, failApiPublication } from "@/lib/services/publication-service";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  if (reason === "Publication not found") return NextResponse.json({ ok: false, reason }, { status: 404 });
  const isValidation = /required|Expected|must be|length|No fields|cannot be|no longer|Invalid|not found/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const body = await request.json();
    const { externalId, publicationUrl } = body;
    if (!externalId) return NextResponse.json({ ok: false, reason: "externalId is required" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await confirmApiPublication(supabase, (await context.params).id, externalId, publicationUrl ?? "") });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const body = await request.json();
    const { errorMessage } = body;
    if (!errorMessage) return NextResponse.json({ ok: false, reason: "errorMessage is required" }, { status: 400 });
    return NextResponse.json({ ok: true, data: await failApiPublication(supabase, (await context.params).id, errorMessage) });
  } catch (error) { return errorResponse(error); }
}