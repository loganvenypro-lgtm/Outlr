import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";
import { createMcpKey, mcpKeyJson, MCP_KEY_NAME_MAX, MCP_KEYS_PER_USER } from "@/lib/mcpKeys";

export const dynamic = "force-dynamic";

const session = (request: NextRequest) => verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");

/** The signed-in user's active Claude (MCP) keys, newest first. */
export async function GET(request: NextRequest) {
  const user = session(request);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rows = await sql`
    SELECT id, name, key_prefix, created_at, last_used_at FROM mcp_api_keys
    WHERE user_id = ${user.userId} AND revoked_at IS NULL
    ORDER BY created_at DESC`;
  return NextResponse.json({ keys: rows.map(mcpKeyJson) });
}

/** Create a key. The response carries the plain key, the only time it is ever shown. */
export async function POST(request: NextRequest) {
  const user = session(request);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = (typeof body.name === "string" ? body.name.trim() : "") || "Claude";
  if (name.length > MCP_KEY_NAME_MAX) {
    return NextResponse.json({ error: `Nom trop long (${MCP_KEY_NAME_MAX} caractères max).` }, { status: 400 });
  }

  const [{ count }] = await sql`
    SELECT count(*)::int AS count FROM mcp_api_keys WHERE user_id = ${user.userId} AND revoked_at IS NULL`;
  if (count >= MCP_KEYS_PER_USER) {
    return NextResponse.json({ error: `Maximum ${MCP_KEYS_PER_USER} clés actives. Révoque-en une d'abord.` }, { status: 400 });
  }

  const { key, record } = await createMcpKey(user.userId, name);
  return NextResponse.json({ key, record }, { status: 201 });
}

/** Revoke a key (`?id=...`): Claude loses access right away. */
export async function DELETE(request: NextRequest) {
  const user = session(request);
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id") ?? "";
  const revoked = await sql`
    UPDATE mcp_api_keys SET revoked_at = now()
    WHERE id = ${id} AND user_id = ${user.userId} AND revoked_at IS NULL
    RETURNING id`;
  if (revoked.length === 0) return NextResponse.json({ error: "Clé introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
