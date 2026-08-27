import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAuthContext(request);

    const payload = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json(
        { ok: false, reason: "Ingresa un correo electrónico válido" },
        { status: 400 }
      );
    }

    const update: { email: string; password?: string } = { email };
    if (password) {
      update.password = password;
    }

    const result = await supabase.auth.updateUser(update);
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
