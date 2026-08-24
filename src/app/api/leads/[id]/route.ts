import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { deleteLead, getLeadById, updateLead } from "@/lib/services/lead-service";
import { parseUpdateLeadInput } from "@/lib/validators/lead";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  const isValidation = /required|Expected|must be|length|No fields|valid contact/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const lead = await getLeadById(supabase, (await context.params).id);
    if (!lead) return NextResponse.json({ ok: false, reason: "Lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true, data: lead });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const input = parseUpdateLeadInput(await request.json());
    return NextResponse.json({ ok: true, data: await updateLead(supabase, (await context.params).id, input) });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    await deleteLead(supabase, (await context.params).id);
    return NextResponse.json({ ok: true });
  } catch (error) { return errorResponse(error); }
}
