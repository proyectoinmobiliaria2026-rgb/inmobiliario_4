import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { createLead, listLeads } from "@/lib/services/lead-service";
import { parseCreateLeadInput } from "@/lib/validators/lead";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  const isValidation = /required|Expected|must be|length|No fields|valid contact/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);
    const params = request.nextUrl.searchParams;
    const pageRaw = Number(params.get("page") ?? "1");
    const pageSizeRaw = Number(params.get("pageSize") ?? "10");
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const pageSize = Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 100 ? pageSizeRaw : 10;
    const data = await listLeads(supabase, { status: params.get("status") ?? undefined, search: params.get("search") ?? undefined, page, pageSize });
    return NextResponse.json({ ok: true, data });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthContext(request);
    const input = parseCreateLeadInput(await request.json());
    return NextResponse.json({ ok: true, data: await createLead(supabase, user.id, input) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
