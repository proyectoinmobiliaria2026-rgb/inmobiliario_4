import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { deleteProperty, getPropertyById, updateProperty } from "@/lib/services/property-service";
import { parseUpdatePropertyInput } from "@/lib/validators/property";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id } = await context.params;
    const property = await getPropertyById(supabase, id);
    if (!property) {
      return NextResponse.json({ ok: false, reason: "Property not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: property });
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id } = await context.params;
    const payload = await request.json();
    const input = parseUpdatePropertyInput(payload);
    const property = await updateProperty(supabase, id, input);
    return NextResponse.json({ ok: true, data: property });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 401 });
    }

    const reason = error instanceof Error ? error.message : "Unknown error";
    const isValidationError =
      reason.includes("No fields") ||
      reason.includes("Expected") ||
      reason.includes("must be") ||
      reason.includes("length") ||
      reason.includes("Cannot publish");
    const status = isValidationError ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase } = await requireAuthContext(request);
    const { id } = await context.params;
    await deleteProperty(supabase, id);
    return NextResponse.json({ ok: true });
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
