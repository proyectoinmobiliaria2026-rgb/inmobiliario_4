import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-cookie";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function readCredentials(payload: unknown): { email: string; password: string } {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload");
  }

  const source = payload as Record<string, unknown>;
  const email = typeof source.email === "string" ? source.email.trim() : "";
  const password = typeof source.password === "string" ? source.password : "";

  if (!email) {
    throw new Error("email is required");
  }
  if (!password) {
    throw new Error("password is required");
  }

  return { email, password };
}

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

    const payload = await request.json();
    const { email, password } = readCredentials(payload);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const signIn = await supabase.auth.signInWithPassword({ email, password });

    if (signIn.error || !signIn.data.session || !signIn.data.user) {
      return NextResponse.json({ ok: false, reason: signIn.error?.message ?? "Invalid credentials" }, { status: 401 });
    }

    const response = NextResponse.json({
      ok: true,
      data: {
        user: {
          id: signIn.data.user.id,
          email: signIn.data.user.email
        }
      }
    });

    response.cookies.set(ACCESS_TOKEN_COOKIE, signIn.data.session.access_token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: signIn.data.session.expires_in
    });

    response.cookies.set(REFRESH_TOKEN_COOKIE, signIn.data.session.refresh_token, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    const status = reason.includes("required") || reason.includes("Invalid") ? 400 : 500;
    return NextResponse.json({ ok: false, reason }, { status });
  }
}
