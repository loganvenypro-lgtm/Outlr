/**
 * Outlr MCP server, local stdio version — lets Claude query the Outlr database
 * (outliers, channels, niches, trends). The tools live in src/lib/mcp/outlrTools.ts,
 * shared with the hosted endpoint /api/mcp; this one also gets the read-only SQL tool.
 *
 * Usage:  node scripts/mcp-server.mjs   (registered in .mcp.json as "outlr")
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCP_SERVER_INFO, registerOutlrTools } from '../src/lib/mcp/outlrTools.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile(path.join(root, '.env.local')); } catch {}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set (see .env.local)');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 3,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: !process.env.DATABASE_URL.includes('-pooler'),
});

const server = new McpServer(MCP_SERVER_INFO);
registerOutlrTools(server, sql, { allowSql: true });
await server.connect(new StdioServerTransport());
