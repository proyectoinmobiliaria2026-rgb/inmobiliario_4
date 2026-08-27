import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-cookie";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { ok: false, reason: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
        { status: 500 }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
      full_name?: unknown;
    };

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";
    const full_name = typeof payload.full_name === "string" ? payload.full_name.trim() : "";

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ ok: false, reason: "Ingresa un correo electrónico válido" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, reason: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const signUp = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } }
    });

    if (signUp.error) {
      return NextResponse.json({ ok: false, reason: signUp.error.message }, { status: 400 });
    }

    const response = NextResponse.json({
      ok: true,
      needsConfirmation: !signUp.data.session,
      data: { user: { id: signUp.data.user?.id, email: signUp.data.user?.email } }
    });

    if (signUp.data.session) {
      response.cookies.set(ACCESS_TOKEN_COOKIE, signUp.data.session.access_token, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: signUp.data.session.expires_in
      });
      response.cookies.set(REFRESH_TOKEN_COOKIE, signUp.data.session.refresh_token, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30
      });
    }

    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
