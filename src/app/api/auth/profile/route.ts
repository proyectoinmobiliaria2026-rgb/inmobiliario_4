import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);

    const payload = (await request.json().catch(() => ({}))) as {
      full_name?: unknown;
      phone?: unknown;
      company?: unknown;
    };

    const full_name = typeof payload.full_name === "string" ? payload.full_name.trim() : "";
    const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
    const company = typeof payload.company === "string" ? payload.company.trim() : "";

    if (!full_name) {
      return NextResponse.json({ ok: false, reason: "El nombre es obligatorio" }, { status: 400 });
    }

    const result = await supabase.auth.updateUser({ data: { full_name, phone, company } });
    if (result.error) {
      return NextResponse.json({ ok: false, reason: result.error.message }, { status: 400 });
    }

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
