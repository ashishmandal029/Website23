import { NextResponse } from "next/server";
import { generateFromCookieText } from "../../../lib/netflix";

export const runtime = "nodejs";
export const maxDuration = 300;

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

/**
 * Split bulk input into individual cookie blobs.
 * Supports:
 *  - JSON array of cookie objects / strings
 *  - Multiple blocks separated by --- or =====
 *  - One netscape dump per block
 */
function splitCookieBlocks(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  // JSON array
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data.map((item) =>
        typeof item === "string" ? item : JSON.stringify(item, null, 2)
      );
    }
  } catch {
    // not json
  }

  // Explicit separators
  if (/^\s*-{3,}\s*$/m.test(text) || /^\s*={3,}\s*$/m.test(text)) {
    return text
      .split(/\n\s*-{3,}\s*\n|\n\s*={3,}\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Multiple JSON objects back-to-back
  if (text.includes("}{")) {
    const parts = text
      .replace(/\}\s*\{/g, "}\n---\n{")
      .split(/\n---\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // Fallback: single block
  return [text];
}

export async function POST(request) {
  try {
    if (!checkAuth(request)) return unauthorized();

    const body = await request.json().catch(() => ({}));
    const raw =
      body.cookieText ||
      body.cookies ||
      body.cookie ||
      (Array.isArray(body.items) ? JSON.stringify(body.items) : "");

    const blocks = splitCookieBlocks(raw);
    if (!blocks.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No cookies found. Send cookieText with blocks separated by --- or a JSON array.",
        },
        { status: 400 }
      );
    }

    const limit = Math.min(
      Number(body.limit) > 0 ? Number(body.limit) : blocks.length,
      50
    );

    const results = [];
    let success = 0;
    let failed = 0;

    for (let i = 0; i < Math.min(blocks.length, limit); i++) {
      const cookieText = blocks[i];
      try {
        const result = await generateFromCookieText(cookieText);
        success++;
        results.push({
          index: i + 1,
          ok: true,
          loginUrl: result.loginUrl,
          expiryStr: result.expiryStr,
          details: result.details,
          detailsText: result.detailsText,
        });
      } catch (err) {
        failed++;
        results.push({
          index: i + 1,
          ok: false,
          error: err?.message || "Failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      success,
      failed,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Bulk generation failed" },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/bulk",
    method: "POST",
    body: {
      cookieText: "cookie block 1\\n---\\ncookie block 2",
      limit: 50,
    },
    note: "Max 50 cookies per request. Only working cookies return login links.",
  });
}
