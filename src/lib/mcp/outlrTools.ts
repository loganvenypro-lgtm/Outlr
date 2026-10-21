/**
 * Outlr MCP tools, shared by the local stdio server (scripts/mcp-server.mjs)
 * and the hosted endpoint (/api/mcp). Read-only: every query runs in a READ ONLY
 * transaction with a statement timeout, and user data is never exposed.
 *
 * Relative imports with extensions only: Node loads this file directly (type stripping).
 */
import type { Sql, TransactionSql } from "postgres";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NICHES, nicheTsQuery, type NicheId } from "../nicheClassifier.ts";

type Tx = TransactionSql<Record<string, never>>;

export const MCP_SERVER_INFO = { name: "outlr", version: "1.1.0" };

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v), 2) }],
});
const failure = (err: unknown) => ({
  content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
  isError: true,
});

const formatSchema = (fallback: "long" | "short" | "any") => z.enum(["long", "short", "any"]).default(fallback);
const formatFilter = (tx: Tx, format: "long" | "short" | "any") =>
  format === "any" ? tx`` : tx`AND v.is_short = ${format === "short"}`;

// Niches aren't stored per video: match titles on the app's niche vocabulary, like the app does
const nicheSchema = z
  .enum(NICHES.map((n) => n.id) as [NicheId, ...NicheId[]])
  .optional()
  .describe(`Niche: ${NICHES.map((n) => `${n.id} (${n.label})`).join(", ")}`);
const nicheFilter = (tx: Tx, niche: NicheId | undefined) =>
  niche ? tx`AND to_tsvector('simple', v.title) @@ to_tsquery('simple', ${nicheTsQuery(niche)!})` : tx``;

const videoColumns = (tx: Tx) => tx`
  v.youtube_video_id, v.title, v.published_at, v.view_count, v.like_count, v.comment_count,
  v.duration_seconds, v.is_short, v.outlier_multiplier, v.views_per_day, v.views_per_hour,
  v.relevance_score, v.title_pattern,
  c.name AS channel_name, c.handle AS channel_handle, c.youtube_channel_id, c.subscriber_count, c.median_views
`;

/**
 * Registers the Outlr tools on `server`. `allowSql` adds the free-form read-only
 * SQL tool: keep it to trusted callers (local use, admins), since a string check
 * can't fully keep a crafted query away from other tables.
 */
export function registerOutlrTools(server: McpServer, sql: Sql, { allowSql = false } = {}) {
  // Every tool goes through here so nothing can write, and nothing runs away
  const tool = <A>(handler: (tx: Tx, args: A) => Promise<unknown>) => async (args: A) => {
    try {
      return json(
        await sql.begin("READ ONLY", async (tx) => {
          await tx`SET LOCAL statement_timeout = '15s'`;
          return handler(tx as unknown as Tx, args);
        })
      );
    } catch (err) {
      return failure(err);
    }
  };

  server.registerTool(
    "search_outliers",
    {
      title: "Search outliers",
      description:
        "Videos performing far above their channel normal (outlier_multiplier = views / channel median). Filter by niche, format, age and size.",
      inputSchema: {
        niche: nicheSchema,
        query: z.string().optional().describe("Words that must appear in the title"),
        min_multiplier: z.number().default(3).describe("Minimum outlier multiplier"),
        format: formatSchema("long"),
        days: z.number().int().min(1).max(3650).default(30).describe("Only videos published in the last N days"),
        min_subscribers: z.number().int().optional(),
        max_subscribers: z.number().int().optional(),
        sort: z.enum(["multiplier", "views", "views_per_day", "relevance", "recent"]).default("multiplier"),
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    tool(async (tx, a) => {
      const order = {
        multiplier: tx`v.outlier_multiplier DESC`,
        views: tx`v.view_count DESC`,
        views_per_day: tx`v.views_per_day DESC`,
        relevance: tx`v.relevance_score DESC NULLS LAST`,
        recent: tx`v.published_at DESC`,
      }[a.sort];
      return tx`
        SELECT ${videoColumns(tx)}
        FROM videos v JOIN channels c ON c.id = v.channel_id
        WHERE v.outlier_multiplier >= ${a.min_multiplier}
          AND v.published_at >= now() - make_interval(days => ${a.days})
          ${formatFilter(tx, a.format)}
          ${nicheFilter(tx, a.niche)}
          ${a.query ? tx`AND to_tsvector('simple', v.title) @@ plainto_tsquery('simple', ${a.query})` : tx``}
          ${a.min_subscribers != null ? tx`AND c.subscriber_count >= ${a.min_subscribers}` : tx``}
          ${a.max_subscribers != null ? tx`AND c.subscriber_count <= ${a.max_subscribers}` : tx``}
        ORDER BY ${order}
        LIMIT ${a.limit}
      `;
    })
  );

  server.registerTool(
    "search_videos",
    {
      title: "Search videos by title",
      description: "Full-text search over every video title in the database, best performers first.",
      inputSchema: {
        query: z.string().min(1),
        format: formatSchema("any"),
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    tool(async (tx, a) => tx`
      SELECT ${videoColumns(tx)}
      FROM videos v JOIN channels c ON c.id = v.channel_id
      WHERE to_tsvector('simple', v.title) @@ plainto_tsquery('simple', ${a.query})
        ${formatFilter(tx, a.format)}
      ORDER BY v.outlier_multiplier DESC, v.view_count DESC
      LIMIT ${a.limit}
    `)
  );

  server.registerTool(
    "search_channels",
    {
      title: "Search channels",
      description: "Find channels by name/handle, niche or size, ranked by trend score, opportunity score or outlier rate.",
      inputSchema: {
        query: z.string().optional().describe("Name or handle, partial match"),
        niche: nicheSchema.describe("Channels with at least one video in this niche"),
        min_subscribers: z.number().int().optional(),
        max_subscribers: z.number().int().optional(),
        monetized: z.boolean().optional(),
        sort: z.enum(["trend", "opportunity", "outlier_rate", "subscribers"]).default("trend"),
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    tool(async (tx, a) => {
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
          ${a.query ? tx`AND (c.name ILIKE ${"%" + a.query + "%"} OR c.handle ILIKE ${"%" + a.query + "%"})` : tx``}
          ${a.niche ? tx`AND EXISTS (SELECT 1 FROM videos v WHERE v.channel_id = c.id ${nicheFilter(tx, a.niche)})` : tx``}
          ${a.min_subscribers != null ? tx`AND c.subscriber_count >= ${a.min_subscribers}` : tx``}
          ${a.max_subscribers != null ? tx`AND c.subscriber_count <= ${a.max_subscribers}` : tx``}
          ${a.monetized != null ? tx`AND c.monetized = ${a.monetized}` : tx``}
        ORDER BY ${order}
        LIMIT ${a.limit}
      `;
    })
  );

  server.registerTool(
    "get_channel",
    {
      title: "Channel details",
      description: "Full profile of one channel: stats, scores, subscriber growth and its top outlier videos.",
      inputSchema: {
        channel: z.string().min(1).describe("YouTube channel id (UC...), @handle or exact name"),
        top_videos: z.number().int().min(0).max(50).default(10),
      },
    },
    tool(async (tx, a) => {
      const handle = a.channel.startsWith("@") ? a.channel : "@" + a.channel;
      const [channel] = await tx`
        SELECT youtube_channel_id, name, handle, thumbnail_url, subscriber_count, total_views, video_count,
               median_views, country, channel_created_at, trend_score, recent_ratio, opportunity_score,
               outlier_rate, monetized, last_stats_at
        FROM channels
        WHERE youtube_channel_id = ${a.channel} OR handle ILIKE ${handle} OR name ILIKE ${a.channel}
        ORDER BY subscriber_count DESC LIMIT 1
      `;
      if (!channel) throw new Error(`No channel matches "${a.channel}"`);
      const [videos, growth] = await Promise.all([
        tx`
          SELECT v.youtube_video_id, v.title, v.published_at, v.view_count, v.is_short, v.outlier_multiplier, v.views_per_day
          FROM videos v JOIN channels c ON c.id = v.channel_id
          WHERE c.youtube_channel_id = ${channel.youtube_channel_id}
          ORDER BY v.outlier_multiplier DESC LIMIT ${a.top_videos}
        `,
        tx`
          SELECT date_trunc('day', captured_at) AS day, max(subscriber_count) AS subscribers, max(total_views) AS total_views
          FROM channel_stat_snapshots WHERE youtube_channel_id = ${channel.youtube_channel_id}
          GROUP BY 1 ORDER BY 1 DESC LIMIT 30
        `,
      ]);
      return { channel, top_videos: videos, daily_growth: growth };
    })
  );

  server.registerTool(
    "niche_overview",
    {
      title: "Niche overview",
      description:
        "Every niche with its video count, outlier count and median multiplier over a period — to spot which niches are hot.",
      inputSchema: {
        days: z.number().int().min(1).max(3650).default(30),
        format: formatSchema("long"),
      },
    },
    tool(async (tx, a) => {
      const rows = await Promise.all(
        NICHES.map(async (n) => {
          const [row] = await tx<{ outliers: string }[]>`
            SELECT count(*) AS videos,
                   count(*) FILTER (WHERE v.outlier_multiplier >= 3) AS outliers,
                   round(percentile_cont(0.5) WITHIN GROUP (ORDER BY v.outlier_multiplier)::numeric, 2) AS median_multiplier,
                   round(avg(v.views_per_day)::numeric) AS avg_views_per_day,
                   count(DISTINCT v.channel_id) AS channels
            FROM videos v
            WHERE v.published_at >= now() - make_interval(days => ${a.days})
              ${formatFilter(tx, a.format)}
              ${nicheFilter(tx, n.id)}
          `;
          return { niche: n.id, label: n.label, ...row };
        })
      );
      return rows.sort((x, y) => Number(y.outliers) - Number(x.outliers));
    })
  );

  server.registerTool(
    "database_stats",
    {
      title: "Database stats",
      description: "Size and freshness of the Outlr database: how many channels, videos and outliers, and the newest video.",
      inputSchema: {},
    },
    tool(async (tx) => {
      const [counts] = await tx`
        SELECT (SELECT count(*) FROM channels) AS channels,
               (SELECT count(*) FROM videos) AS videos,
               (SELECT count(*) FROM videos WHERE outlier_multiplier >= 3) AS outliers,
               (SELECT max(published_at) FROM videos) AS newest_video
      `;
      return counts;
    })
  );

  if (!allowSql) return;

  server.registerTool(
    "run_sql",
    {
      title: "Run read-only SQL",
      description:
        "Run any SELECT on the Outlr database for questions the other tools do not cover. Main tables: channels, videos, video_stat_snapshots, channel_stat_snapshots, channel_alerts, channel_monetization_events, scan_runs, api_quota_usage, discovery_queries. User tables are off limits. Results are capped at 200 rows.",
      inputSchema: { query: z.string().min(1).describe("A single SELECT / WITH statement") },
    },
    tool(async (tx, a) => {
      const query = a.query.trim().replace(/;\s*$/, "");
      if (!/^(select|with)\b/i.test(query) || query.includes(";")) {
        throw new Error("Only a single SELECT or WITH statement is allowed");
      }
      if (/\b(users|password_hash|saved_folders|saved_folder_items|mcp_api_keys|onboarding_analyses)\b/i.test(query)) {
        throw new Error("User data is off limits");
      }
      const rows = await tx.unsafe(`SELECT * FROM (${query}) AS q LIMIT 200`);
      return { row_count: rows.length, rows };
    })
  );
}
