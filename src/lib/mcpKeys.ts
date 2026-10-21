import crypto from "crypto";
import { sql } from "@/lib/postgres";
import { isAdminUser } from "@/lib/admin";

export const MCP_KEY_NAME_MAX = 80;
export const MCP_KEYS_PER_USER = 10;

export interface McpKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const hashKey = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

export function mcpKeyJson(r: Record<string, unknown>): McpKey {
  return {
    id: r.id as string,
    name: r.name as string,
    prefix: r.key_prefix as string,
    createdAt: new Date(r.created_at as string).toISOString(),
    lastUsedAt: r.last_used_at ? new Date(r.last_used_at as string).toISOString() : null,
  };
}

/** Creates a key for the user. The plain key is returned only here, never stored. */
export async function createMcpKey(userId: string, name: string): Promise<{ key: string; record: McpKey }> {
  const key = `outlr_${crypto.randomBytes(24).toString("base64url")}`;
  const [row] = await sql`
    INSERT INTO mcp_api_keys (id, user_id, name, key_hash, key_prefix)
    VALUES (${crypto.randomBytes(12).toString("hex")}, ${userId}, ${name}, ${hashKey(key)}, ${key.slice(0, 12)})
    RETURNING id, name, key_prefix, created_at, last_used_at`;
  return { key, record: mcpKeyJson(row) };
}

/** Resolves a key sent to /api/mcp to its owner, or null if unknown or revoked. */
export async function resolveMcpKey(key: string): Promise<{ userId: string; isAdmin: boolean } | null> {
  if (!key.startsWith("outlr_")) return null;
  const [row] = await sql`
    UPDATE mcp_api_keys k SET last_used_at = now()
    FROM users u
    WHERE k.key_hash = ${hashKey(key)} AND k.revoked_at IS NULL AND u.id = k.user_id
    RETURNING u.id, u.email, u.role`;
  if (!row) return null;
  return { userId: row.id, isAdmin: isAdminUser({ email: row.email, role: row.role }) };
}
