import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { performManualAction } from "@/lib/services/publication-service";
import { parseManualActionInput } from "@/lib/validators/publication";
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
    const { action, metadata } = parseManualActionInput(await request.json());
    return NextResponse.json({ ok: true, data: await performManualAction(supabase, (await context.params).id, action, metadata) });
  } catch (error) { return errorResponse(error); }
}