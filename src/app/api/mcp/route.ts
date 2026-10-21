import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { sql } from "@/lib/postgres";
import { resolveMcpKey } from "@/lib/mcpKeys";
import { MCP_SERVER_INFO, registerOutlrTools } from "@/lib/mcp/outlrTools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hosted Outlr MCP server (Streamable HTTP, stateless). Each user connects their
 * Claude with a personal key from Settings > Claude, sent as `Authorization: Bearer`
 * or as `?key=` for clients that only take a URL (claude.ai custom connectors).
 */
async function handle(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const key = bearer ?? request.nextUrl.searchParams.get("key") ?? "";
  const owner = key ? await resolveMcpKey(key.trim()) : null;
  if (!owner) {
    return NextResponse.json(
      { error: "Clé Outlr manquante ou révoquée. Crée-en une dans Paramètres > Claude." },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="outlr"' } }
    );
  }

  const server = new McpServer(MCP_SERVER_INFO);
  registerOutlrTools(server, sql, { allowSql: owner.isAdmin });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
