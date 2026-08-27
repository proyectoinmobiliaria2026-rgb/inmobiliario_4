import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);

    const payload = (await request.json().catch(() => ({}))) as { password?: unknown };
    const newPassword = typeof payload.password === "string" ? payload.password : "";

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, reason: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const result = await supabase.auth.updateUser({ password: newPassword });
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
