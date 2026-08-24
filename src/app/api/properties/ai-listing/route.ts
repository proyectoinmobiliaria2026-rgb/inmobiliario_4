import { getAIService } from "@/lib/ai/factory";
import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { parseListingDraftInput } from "@/lib/validators/property";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
  const reason = error instanceof Error ? error.message : "Unknown error";
  const isValidation = /required|Expected|must be|Invalid|contains invalid/i.test(reason);
  return NextResponse.json({ ok: false, reason }, { status: isValidation ? 400 : 500 });
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthContext(request);
    const input = parseListingDraftInput(await request.json());
    const draft = await getAIService().generateListing(input);
    return NextResponse.json({ ok: true, data: draft });
  } catch (error) { return errorResponse(error); }
}
