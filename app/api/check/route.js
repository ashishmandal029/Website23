import { NextResponse } from "next/server";
import { checkFromCookieText } from "../../../lib/netflix";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

function checkAuth(request) {
  const expected = process.env.API_SECRET;
  if (!expected) return true;
  const header = request.headers.get("x-api-key") || "";
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  return header === expected || bearer === expected;
}

export async function POST(request) {
  try {
    if (!checkAuth(request)) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const cookieText = body.cookieText || body.cookies || body.cookie || "";

    if (!cookieText || !String(cookieText).trim()) {
      return NextResponse.json(
        { ok: false, error: "cookieText is required (netscape / json / key=value)" },
        { status: 400 }
      );
    }

    const result = await checkFromCookieText(cookieText);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Check failed" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/check",
    method: "POST",
    body: { cookieText: "<netscape | json | NetflixId=...>" },
  });
}
