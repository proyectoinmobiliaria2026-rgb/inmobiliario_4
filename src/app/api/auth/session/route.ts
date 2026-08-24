import { UnauthorizedError, requireAuthContext } from "@/lib/auth/route-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuthContext(request);
    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        email: user.email
      }
    });
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
