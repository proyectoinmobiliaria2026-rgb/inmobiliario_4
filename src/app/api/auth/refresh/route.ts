import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session-cookie";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, reason: "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value?.trim();
  if (!refreshToken) {
    return NextResponse.json({ ok: false, reason: "Missing refresh token" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { ok: false, reason: error?.message ?? "Invalid refresh token" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    data: {
      user: {
        id: data.user.id,
        email: data.user.email
      }
    }
  });

  response.cookies.set(ACCESS_TOKEN_COOKIE, data.session.access_token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: data.session.expires_in
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, data.session.refresh_token, {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: REFRESH_COOKIE_MAX_AGE
  });

  return response;
}
