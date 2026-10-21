/**
 * Outlr MCP server — lets Claude query the Outlr database (outliers, channels,
 * niches, trends) over stdio. Read-only: every query runs in a READ ONLY
 * transaction with a statement timeout, and the users table is never exposed.
 *
 * Usage:  node scripts/mcp-server.mjs   (registered in .mcp.json as "outlr")
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NICHES, nicheTsQuery } from '../src/lib/nicheClassifier.ts';

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

// Every tool goes through here so nothing can write, and nothing runs away
async function readOnly(fn) {
  return sql.begin('READ ONLY', async (tx) => {
    await tx`SET LOCAL statement_timeout = '15s'`;
    return fn(tx);
  });
}

const result = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? Number(v) : v), 2) }],
});
const failure = (err) => ({ content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true });

const tool = (handler) => async (args) => {
  try { return result(await readOnly((tx) => handler(tx, args))); } catch (err) { return failure(err); }
};

// Niches aren't stored per video: match titles on the app's niche vocabulary, like the app does
const nicheSchema = z.enum(NICHES.map((n) => n.id)).optional()
  .describe(`Niche: ${NICHES.map((n) => `${n.id} (${n.label})`).join(', ')}`);
const nicheFilter = (tx, niche) => niche
  ? tx`AND to_tsvector('simple', v.title) @@ to_tsquery('simple', ${nicheTsQuery(niche)})`
  : tx``;

const VIDEO_COLUMNS = (tx) => tx`
  v.youtube_video_id, v.title, v.published_at, v.view_count, v.like_count, v.comment_count,
  v.duration_seconds, v.is_short, v.outlier_multiplier, v.views_per_day, v.views_per_hour,
  v.relevance_score, v.title_pattern,
  c.name AS channel_name, c.handle AS channel_handle, c.youtube_channel_id, c.subscriber_count, c.median_views
`;

const server = new McpServer({ name: 'outlr', version: '1.0.0' });

server.registerTool('search_outliers', {
  title: 'Search outliers',
  description: 'Videos performing far above their channel normal (outlier_multiplier = views / channel median). Filter by niche, format, age and size.',
  inputSchema: {
    niche: nicheSchema,
    query: z.string().optional().describe('Words that must appear in the title'),
    min_multiplier: z.number().default(3).describe('Minimum outlier multiplier'),
    format: z.enum(['long', 'short', 'any']).default('long'),
    days: z.number().int().min(1).max(3650).default(30).describe('Only videos published in the last N days'),
    min_subscribers: z.number().int().optional(),
    max_subscribers: z.number().int().optional(),
    sort: z.enum(['multiplier', 'views', 'views_per_day', 'relevance', 'recent']).default('multiplier'),
    limit: z.number().int().min(1).max(100).default(25),
  },
}, tool((tx, a) => {
  const order = {
    multiplier: tx`v.outlier_multiplier DESC`,
    views: tx`v.view_count DESC`,
    views_per_day: tx`v.views_per_day DESC`,
    relevance: tx`v.relevance_score DESC NULLS LAST`,
    recent: tx`v.published_at DESC`,
  }[a.sort];
  return tx`
    SELECT ${VIDEO_COLUMNS(tx)}
    FROM videos v JOIN channels c ON c.id = v.channel_id
    WHERE v.outlier_multiplier >= ${a.min_multiplier}
      AND v.published_at >= now() - make_interval(days => ${a.days})
      ${a.format === 'any' ? tx`` : tx`AND v.is_short = ${a.format === 'short'}`}
      ${nicheFilter(tx, a.niche)}
      ${a.query ? tx`AND to_tsvector('simple', v.title) @@ plainto_tsquery('simple', ${a.query})` : tx``}
      ${a.min_subscribers != null ? tx`AND c.subscriber_count >= ${a.min_subscribers}` : tx``}
      ${a.max_subscribers != null ? tx`AND c.subscriber_count <= ${a.max_subscribers}` : tx``}
    ORDER BY ${order}
    LIMIT ${a.limit}
  `;
}));

server.registerTool('search_videos', {
  title: 'Search videos by title',
  description: 'Full-text search over every video title in the database, best performers first.',
  inputSchema: {
    query: z.string().min(1),
    format: z.enum(['long', 'short', 'any']).default('any'),
    limit: z.number().int().min(1).max(100).default(25),
  },
}, tool((tx, a) => tx`
  SELECT ${VIDEO_COLUMNS(tx)}
  FROM videos v JOIN channels c ON c.id = v.channel_id
  WHERE to_tsvector('simple', v.title) @@ plainto_tsquery('simple', ${a.query})
    ${a.format === 'any' ? tx`` : tx`AND v.is_short = ${a.format === 'short'}`}
  ORDER BY v.outlier_multiplier DESC, v.view_count DESC
  LIMIT ${a.limit}
`));

server.registerTool('search_channels', {
  title: 'Search channels',
  description: 'Find channels by name/handle, niche or size, ranked by trend score, opportunity score or outlier rate.',
  inputSchema: {
    query: z.string().optional().describe('Name or handle, partial match'),
    niche: nicheSchema.describe('Channels with at least one video in this niche'),
    min_subscribers: z.number().int().optional(),
    max_subscribers: z.number().int().optional(),
    monetized: z.boolean().optional(),
    sort: z.enum(['trend', 'opportunity', 'outlier_rate', 'subscribers']).default('trend'),
    limit: z.number().int().min(1).max(100).default(25),
  },
}, tool((tx, a) => {
  const order = {
    trend: tx`c.trend_score DESC NULLS LAST`,
    opportunity: tx`c.opportunity_score DESC NULLS LAST`,
    outlier_rate: tx`c.outlier_rate DESC NULLS LAST`,
    subscribers: tx`c.subscriber_count DESC`,
  }[a.sort];
  return tx`
    SELECT c.youtube_channel_id, c.name, c.handle, c.subscriber_count, c.total_views, c.video_count,
           c.median_views, c.trend_score, c.recent_ratio, c.opportunity_score, c.outlier_rate,
           c.monetized, c.country, c.channel_created_at
    FROM channels c
    WHERE true
      ${a.query ? tx`AND (c.name ILIKE ${'%' + a.query + '%'} OR c.handle ILIKE ${'%' + a.query + '%'})` : tx``}
      ${a.niche ? tx`AND EXISTS (SELECT 1 FROM videos v WHERE v.channel_id = c.id ${nicheFilter(tx, a.niche)})` : tx``}
      ${a.min_subscribers != null ? tx`AND c.subscriber_count >= ${a.min_subscribers}` : tx``}
      ${a.max_subscribers != null ? tx`AND c.subscriber_count <= ${a.max_subscribers}` : tx``}
      ${a.monetized != null ? tx`AND c.monetized = ${a.monetized}` : tx``}
    ORDER BY ${order}
    LIMIT ${a.limit}
  `;
}));

server.registerTool('get_channel', {
  title: 'Channel details',
  description: 'Full profile of one channel: stats, scores, subscriber growth and its top outlier videos.',
  inputSchema: {
    channel: z.string().min(1).describe('YouTube channel id (UC...), @handle or exact name'),
    top_videos: z.number().int().min(0).max(50).default(10),
  },
}, tool(async (tx, a) => {
  const handle = a.channel.startsWith('@') ? a.channel : '@' + a.channel;
  const [channel] = await tx`
    SELECT * FROM channels
    WHERE youtube_channel_id = ${a.channel} OR handle ILIKE ${handle} OR name ILIKE ${a.channel}
    ORDER BY subscriber_count DESC LIMIT 1
  `;
  if (!channel) throw new Error(`No channel matches "${a.channel}"`);
  const [videos, growth] = await Promise.all([
    tx`
      SELECT youtube_video_id, title, published_at, view_count, is_short, outlier_multiplier, views_per_day
      FROM videos WHERE channel_id = ${channel.id}
      ORDER BY outlier_multiplier DESC LIMIT ${a.top_videos}
    `,
    tx`
      SELECT date_trunc('day', captured_at) AS day, max(subscriber_count) AS subscribers, max(total_views) AS total_views
      FROM channel_stat_snapshots WHERE youtube_channel_id = ${channel.youtube_channel_id}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 30
    `,
  ]);
  return { channel, top_videos: videos, daily_growth: growth };
}));

server.registerTool('niche_overview', {
  title: 'Niche overview',
  description: 'Every niche with its video count, outlier count and median multiplier over a period — to spot which niches are hot.',
  inputSchema: {
    days: z.number().int().min(1).max(3650).default(30),
    format: z.enum(['long', 'short', 'any']).default('long'),
  },
}, tool(async (tx, a) => {
  const rows = await Promise.all(NICHES.map(async (n) => {
    const [row] = await tx`
      SELECT count(*) AS videos,
             count(*) FILTER (WHERE v.outlier_multiplier >= 3) AS outliers,
             round(percentile_cont(0.5) WITHIN GROUP (ORDER BY v.outlier_multiplier)::numeric, 2) AS median_multiplier,
             round(avg(v.views_per_day)::numeric) AS avg_views_per_day,
             count(DISTINCT v.channel_id) AS channels
      FROM videos v
      WHERE v.published_at >= now() - make_interval(days => ${a.days})
        ${a.format === 'any' ? tx`` : tx`AND v.is_short = ${a.format === 'short'}`}
        ${nicheFilter(tx, n.id)}
    `;
    return { niche: n.id, label: n.label, ...row };
  }));
  return rows.sort((x, y) => Number(y.outliers) - Number(x.outliers));
}));

server.registerTool('database_stats', {
  title: 'Database stats',
  description: 'Size and freshness of the Outlr database: channels, videos, last scans, today\'s API quota.',
  inputSchema: {},
}, tool(async (tx) => {
  const [[counts], scans, quota] = await Promise.all([
    tx`
      SELECT (SELECT count(*) FROM channels) AS channels,
             (SELECT count(*) FROM videos) AS videos,
             (SELECT count(*) FROM videos WHERE outlier_multiplier >= 3) AS outliers,
             (SELECT max(published_at) FROM videos) AS newest_video
    `,
    tx`SELECT started_at, finished_at, status, stats FROM scan_runs ORDER BY started_at DESC LIMIT 5`,
    tx`SELECT day, units FROM api_quota_usage ORDER BY day DESC LIMIT 1`,
  ]);
  return { ...counts, recent_scans: scans, quota: quota[0] ?? null };
}));

server.registerTool('run_sql', {
  title: 'Run read-only SQL',
  description: 'Run any SELECT on the Outlr database for questions the other tools do not cover. Main tables: channels, videos, video_stat_snapshots, channel_stat_snapshots, channel_alerts, channel_monetization_events, scan_runs, discovery_queries. The users table is off limits. Results are capped at 200 rows.',
  inputSchema: { query: z.string().min(1).describe('A single SELECT / WITH statement') },
}, tool(async (tx, a) => {
  const query = a.query.trim().replace(/;\s*$/, '');
  if (!/^(select|with)\b/i.test(query) || query.includes(';')) throw new Error('Only a single SELECT or WITH statement is allowed');
  if (/\b(users|password_hash|saved_folders|saved_folder_items)\b/i.test(query)) throw new Error('User data is off limits');
  const rows = await tx.unsafe(`SELECT * FROM (${query}) AS q LIMIT 200`);
  return { row_count: rows.length, rows };
}));

await server.connect(new StdioServerTransport());
