import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { createProperty, listProperties } from "@/lib/services/property-service";
import { parseCreatePropertyInput } from "@/lib/validators/property";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);

    const params = request.nextUrl.searchParams;
    const pageRaw = Number(params.get("page") ?? "1");
    const pageSizeRaw = Number(params.get("pageSize") ?? "10");
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const pageSize =
      Number.isInteger(pageSizeRaw) && pageSizeRaw >= 1 && pageSizeRaw <= 100 ? pageSizeRaw : 10;

    const result = await listProperties(supabase, {
      status: params.get("status") ?? undefined,
      propertyType: params.get("propertyType") ?? undefined,
      operationType: params.get("operationType") ?? undefined,
      search: params.get("search") ?? undefined,
      page,
      pageSize
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthContext(request);
    const payload = await request.json();
    const input = parseCreatePropertyInput(payload);
    const property = await createProperty(supabase, user.id, input);
    return NextResponse.json({ ok: true, data: property }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    const isValidationError =
      reason.includes("required") ||
      reason.includes("Expected") ||
      reason.includes("must be") ||
      reason.includes("length") ||
      reason.includes("Cannot publish");
    const status = isValidationError ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
