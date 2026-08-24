import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookie";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function readBearerToken(request: NextRequest): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  return token;
}

function readAccessTokenFromCookie(request: NextRequest): string | null {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  return token?.trim() || null;
}

export async function requireAuthContext(request: NextRequest): Promise<{
  user: User;
  supabase: ReturnType<typeof createClient<any>>;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  let token: string;
  try {
    token = readBearerToken(request);
  } catch {
    const cookieToken = readAccessTokenFromCookie(request);
    if (!cookieToken) {
      throw new UnauthorizedError("Missing bearer token or session cookie");
    }
    token = cookieToken;
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const userResult = await authClient.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    throw new UnauthorizedError("Invalid token");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  return {
    user: userResult.data.user,
    supabase
  };
}
