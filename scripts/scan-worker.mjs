/**
 * Background YouTube scan worker — keeps PostgreSQL fresh so the app never has
 * to call YouTube while a user waits. Only uses official channels:
 *   1. Channel RSS feeds (free, published by YouTube) → new uploads
 *   2. Data API videos.list (1 unit / 50 videos) → fresh stats, by priority
 *   3. Data API channels.list (1 unit / 50 channels) → subscriber counts
 *   4. Scores in SQL: channel median, outlier multiplier, views per hour
 *   5. Discord report of exactly what was collected
 *
 * Usage:  node scripts/scan-worker.mjs          (loop every SCAN_INTERVAL_MINUTES)
 *         node scripts/scan-worker.mjs --once   (single scan, then exit)
 */
import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch {}

const num = (key, fallback) => Number(process.env[key] ?? fallback);
const CONFIG = {
  intervalMinutes: num('SCAN_INTERVAL_MINUTES', 30),
  rssChannelsPerScan: num('SCAN_RSS_CHANNELS', 400),
  rssConcurrency: num('SCAN_RSS_CONCURRENCY', 6),
  dailyQuota: num('YOUTUBE_DAILY_QUOTA', 10000),
  // Share of the daily quota the worker may use; the rest stays for the app.
  workerQuotaShare: num('SCAN_QUOTA_SHARE', 0.7),
  // Relevance filters: a video gets a relevance score only if it clears all of them.
  minSubscribers: num('OUTLIER_MIN_SUBS', 1000),
  minViewsLong: num('OUTLIER_MIN_VIEWS_LONG', 10000),
  minViewsShort: num('OUTLIER_MIN_VIEWS_SHORT', 50000),
  // Baseline floor so "usually 0 views, now 1K" doesn't read as a 1000x outlier.
  medianFloorLong: num('OUTLIER_MEDIAN_FLOOR_LONG', 1000),
  medianFloorShort: num('OUTLIER_MEDIAN_FLOOR_SHORT', 5000),
  reportWindowHours: num('REPORT_WINDOW_HOURS', 72),
  reportTopLong: num('REPORT_TOP_LONG', 4),
  reportTopShorts: num('REPORT_TOP_SHORTS', 4),
  growthReportHours: num('GROWTH_REPORT_HOURS', 6),
  // Every channel's RSS is read once per rotation; channels per scan adapts to the pool size.
  rssRotationHours: num('SCAN_RSS_ROTATION_HOURS', 4),
  // Channel discovery
  discoveryIntervalHours: num('DISCOVERY_INTERVAL_HOURS', 6),
  discoveryRegions: (process.env.DISCOVERY_REGIONS ?? 'US,GB,CA,FR,DE,ES,BR,IN').split(',').map((s) => s.trim()).filter(Boolean),
  discoverySearchesPerRun: num('DISCOVERY_SEARCHES_PER_RUN', 2),
  discoveryFeaturedPerRun: num('DISCOVERY_FEATURED_PER_RUN', 50),
  discoveryMaxNewPerRun: num('DISCOVERY_MAX_NEW_PER_RUN', 300),
  discoveryMinSubs: num('DISCOVERY_MIN_SUBS', 1000),
  // Skips media giants (labels, TV shows) that trending charts are full of.
  discoveryMaxSubs: num('DISCOVERY_MAX_SUBS', 10_000_000),
  discoverySeedQueries: (
    process.env.DISCOVERY_QUERIES ??
    'rise and fall documentary,true crime documentary,minecraft mod,ai short drama,survival skills history,' +
      'business documentary,personal finance,ecommerce,faceless channel,documentaire,histoire vraie,' +
      'storytime,science explained,history documentary,tech review'
  ).split(',').map((s) => s.trim()).filter(Boolean),
};

// Trending charts per category; categories a region doesn't support just return an error.
const TRENDING_CATEGORIES = [null, 1, 17, 20, 22, 23, 24, 25, 26, 27, 28];

const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.YOUTUBE_API_KEY;
const WEBHOOK_URL = process.env.DISCORD_SCAN_WEBHOOK_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL manquant (voir .env.local)');
if (!API_KEY) throw new Error('YOUTUBE_API_KEY manquant (voir .env.local)');
if (!WEBHOOK_URL) console.warn('⚠️ DISCORD_SCAN_WEBHOOK_URL absent : aucun rapport Discord ne sera envoyé.');

const sql = postgres(DATABASE_URL, { max: 4, onnotice: () => {} });
const API_BASE = 'https://www.googleapis.com/youtube/v3';
const RSS_USER_AGENT = 'Mozilla/5.0 (compatible; OutlrScanner/1.0)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

async function mapLimit(items, limit, fn) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Quota ledger (YouTube resets the quota at midnight Pacific time)
// ---------------------------------------------------------------------------

async function quotaUsedToday() {
  const [row] = await sql`
    SELECT units FROM api_quota_usage
    WHERE day = (now() AT TIME ZONE 'America/Los_Angeles')::date`;
  return row?.units ?? 0;
}

async function recordQuota(endpoint, units) {
  await sql`
    INSERT INTO api_quota_usage (day, units, calls)
    VALUES ((now() AT TIME ZONE 'America/Los_Angeles')::date, ${units}, jsonb_build_object(${endpoint}::text, 1))
    ON CONFLICT (day) DO UPDATE SET
      units = api_quota_usage.units + EXCLUDED.units,
      calls = api_quota_usage.calls || jsonb_build_object(
        ${endpoint}::text, COALESCE((api_quota_usage.calls->>${endpoint})::int, 0) + 1
      )`;
}

// Units spent by the current scan (reset at the start of each scan).
let scanQuotaUnits = 0;

async function youtubeApi(endpoint, params, cost = 1) {
  const query = new URLSearchParams({ ...params, key: API_KEY });
  const res = await fetch(`${API_BASE}/${endpoint}?${query}`, { signal: AbortSignal.timeout(15000) });
  await recordQuota(`${endpoint}.list`, cost);
  scanQuotaUnits += cost;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body.error?.errors?.[0]?.reason ?? `HTTP ${res.status}`;
    const err = new Error(`YouTube API ${endpoint}.list : ${reason}`);
    err.quotaExceeded = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
    throw err;
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// RSS
// ---------------------------------------------------------------------------

function decodeXml(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

async function fetchRss(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': RSS_USER_AGENT, Accept: 'application/atom+xml,application/xml' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return { status: res.status, entries: [] };

  const xml = await res.text();
  const channelName = decodeXml(xml.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? '');
  const entries = [];
  for (const [, block] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    const publishedAt = block.match(/<published>([^<]+)<\/published>/)?.[1];
    if (!id || !title || !publishedAt) continue;
    entries.push({
      id,
      title: decodeXml(title),
      description: decodeXml(block.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? ''),
      publishedAt,
      thumbnail: block.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: Number(block.match(/<media:statistics[^>]+views="(\d+)"/)?.[1] ?? 0),
      isShort: /href="[^"]*\/shorts\//.test(block),
    });
  }
  return { status: 200, channelName, entries };
}

async function scanRss(stats) {
  // Tracked channels may not exist in `channels` yet.
  await sql`
    INSERT INTO channels (id, youtube_channel_id, name, handle, thumbnail_url, subscriber_count, total_views, video_count)
    SELECT 'ch-' || channel_id, channel_id, name, handle, avatar, subscribers, total_views, video_count
    FROM tracked_channels
    ON CONFLICT (youtube_channel_id) DO NOTHING`;

  // Read every channel once per rotation unless SCAN_RSS_CHANNELS pins a fixed count.
  const [{ active }] = await sql`SELECT count(*)::int AS active FROM channels WHERE rss_error_count < 5`;
  const scansPerRotation = Math.max(1, (CONFIG.rssRotationHours * 60) / CONFIG.intervalMinutes);
  const limit = process.env.SCAN_RSS_CHANNELS
    ? CONFIG.rssChannelsPerScan
    : Math.min(3000, Math.max(CONFIG.rssChannelsPerScan, Math.ceil(active / scansPerRotation)));

  const channels = await sql`
    SELECT c.id, c.youtube_channel_id
    FROM channels c
    LEFT JOIN tracked_channels tc ON tc.channel_id = c.youtube_channel_id
    WHERE c.rss_error_count < 5
    ORDER BY (tc.channel_id IS NOT NULL) DESC, c.last_rss_at NULLS FIRST
    LIMIT ${limit}`;

  const freshCutoff = Date.now() - 24 * 3600 * 1000;
  stats.rss.attempted = channels.length;

  await mapLimit(channels, CONFIG.rssConcurrency, async (channel) => {
    if (stats.rss.rateLimited) return;
    await sleep(100 + Math.random() * 200);

    let feed;
    try {
      feed = await fetchRss(channel.youtube_channel_id);
    } catch {
      stats.rss.failed++;
      return;
    }

    if (feed.status === 404) {
      stats.rss.notFound++;
      await sql`UPDATE channels SET rss_error_count = rss_error_count + 1, last_rss_at = now() WHERE id = ${channel.id}`;
      return;
    }
    if (feed.status === 429 || feed.status >= 500) {
      // Back off for the rest of this scan instead of hammering YouTube.
      stats.rss.rateLimited = true;
      return;
    }
    if (feed.status !== 200) {
      stats.rss.failed++;
      return;
    }

    stats.rss.ok++;
    stats.rss.entries += feed.entries.length;
    await sql`
      UPDATE channels
      SET last_rss_at = now(), rss_error_count = 0, name = COALESCE(NULLIF(${feed.channelName}, ''), name)
      WHERE id = ${channel.id}`;
    if (feed.entries.length === 0) return;

    const rows = feed.entries.map((e) => ({
      id: `vid-${e.id}`,
      youtube_video_id: e.id,
      channel_id: channel.id,
      title: e.title,
      description: e.description,
      thumbnail_url: e.thumbnail,
      published_at: e.publishedAt,
      view_count: e.views,
      is_short: e.isShort,
    }));
    const upserted = await sql`
      INSERT INTO videos ${sql(rows)}
      ON CONFLICT (youtube_video_id) DO UPDATE SET
        title = EXCLUDED.title,
        thumbnail_url = EXCLUDED.thumbnail_url,
        view_count = GREATEST(videos.view_count, EXCLUDED.view_count),
        is_short = videos.is_short OR EXCLUDED.is_short
      RETURNING (xmax = 0) AS inserted, published_at`;
    for (const row of upserted) {
      if (!row.inserted) continue;
      stats.rss.newVideos++;
      if (new Date(row.published_at).getTime() > freshCutoff) stats.rss.newFreshVideos++;
    }
  });
}

// ---------------------------------------------------------------------------
// Data API refreshes
// ---------------------------------------------------------------------------

function parseIsoDuration(iso) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso ?? '') ?? [];
  const seconds = (Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
  const h = Math.floor(seconds / 3600);
  const mm = Math.floor((seconds % 3600) / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  return { seconds, formatted: h > 0 ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}` };
}

async function refreshVideoStats(stats, maxCalls) {
  if (maxCalls <= 0) return;
  // Priority: < 48 h hourly, < 7 d twice a day, < 30 d every 3 days,
  // everything else before stored stats turn 30 days old (API data policy).
  const videos = await sql`
    SELECT youtube_video_id, published_at > now() - interval '48 hours' AS hot
    FROM videos
    WHERE (published_at > now() - interval '48 hours' AND (last_stats_at IS NULL OR last_stats_at < now() - interval '1 hour'))
       OR (published_at > now() - interval '7 days' AND (last_stats_at IS NULL OR last_stats_at < now() - interval '12 hours'))
       OR (published_at > now() - interval '30 days' AND (last_stats_at IS NULL OR last_stats_at < now() - interval '3 days'))
       OR last_stats_at IS NULL
       OR last_stats_at < now() - interval '25 days'
    ORDER BY
      CASE
        WHEN published_at > now() - interval '48 hours' THEN 0
        WHEN published_at > now() - interval '7 days' THEN 1
        WHEN published_at > now() - interval '30 days' THEN 2
        ELSE 3
      END,
      last_stats_at NULLS FIRST,
      published_at DESC
    LIMIT ${maxCalls * 50}`;

  stats.videos.requested = videos.length;
  const hotIds = new Set(videos.filter((v) => v.hot).map((v) => v.youtube_video_id));

  for (const batch of chunk(videos.map((v) => v.youtube_video_id), 50)) {
    // Extra parts cost nothing: videos.list is 1 unit whatever the parts.
    const data = await youtubeApi('videos', { part: 'snippet,statistics,contentDetails', id: batch.join(','), maxResults: '50' });
    stats.videos.apiCalls++;

    const returned = new Set();
    await sql.begin(async (tx) => {
      for (const item of data.items ?? []) {
        returned.add(item.id);
        const views = Number(item.statistics?.viewCount ?? 0);
        const likes = item.statistics?.likeCount != null ? Number(item.statistics.likeCount) : null;
        const comments = item.statistics?.commentCount != null ? Number(item.statistics.commentCount) : null;
        const duration = parseIsoDuration(item.contentDetails?.duration);
        const snippet = item.snippet ?? {};
        await tx`
          UPDATE videos SET
            title = COALESCE(${snippet.title ?? null}, title),
            category_id = ${snippet.categoryId ? Number(snippet.categoryId) : null},
            tags = ${snippet.tags ? tx.array(snippet.tags) : null},
            language = ${snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? null},
            view_count = ${views},
            like_count = ${likes},
            comment_count = ${comments},
            duration_seconds = ${duration.seconds},
            duration_formatted = ${duration.formatted},
            is_short = is_short OR ${duration.seconds > 0 && duration.seconds <= 60},
            last_stats_at = now(),
            analyzed_at = now()
          WHERE youtube_video_id = ${item.id}`;
        await tx`
          INSERT INTO video_stat_snapshots (youtube_video_id, view_count, like_count, comment_count)
          VALUES (${item.id}, ${views}, ${likes}, ${comments})
          ON CONFLICT DO NOTHING`;
        stats.videos.refreshed++;
        if (hotIds.has(item.id)) stats.videos.hot++;
      }
      // Private/deleted videos: don't retry them every scan.
      const missing = batch.filter((id) => !returned.has(id));
      if (missing.length) {
        await tx`UPDATE videos SET last_stats_at = now() WHERE youtube_video_id IN ${tx(missing)}`;
        stats.videos.unavailable += missing.length;
      }
    });
  }
}

async function refreshChannelStats(stats, maxCalls) {
  if (maxCalls <= 0) return;
  const channels = await sql`
    SELECT c.youtube_channel_id
    FROM channels c
    LEFT JOIN tracked_channels tc ON tc.channel_id = c.youtube_channel_id
    WHERE c.rss_error_count < 5 AND (c.last_stats_at IS NULL OR c.last_stats_at < now() - interval '20 hours')
    ORDER BY (tc.channel_id IS NOT NULL) DESC, c.last_stats_at NULLS FIRST
    LIMIT ${maxCalls * 50}`;
  stats.channels.requested = channels.length;

  for (const batch of chunk(channels.map((c) => c.youtube_channel_id), 50)) {
    const data = await youtubeApi('channels', { part: 'snippet,statistics', id: batch.join(','), maxResults: '50' });
    stats.channels.apiCalls++;

    const returned = new Set();
    await sql.begin(async (tx) => {
      for (const item of data.items ?? []) {
        returned.add(item.id);
        const s = item.statistics ?? {};
        await tx`
          UPDATE channels SET
            name = COALESCE(${item.snippet?.title ?? null}, name),
            handle = COALESCE(${item.snippet?.customUrl ?? null}, handle),
            thumbnail_url = COALESCE(${item.snippet?.thumbnails?.default?.url ?? null}, thumbnail_url),
            country = COALESCE(${item.snippet?.country ?? null}, country),
            subscriber_count = ${s.hiddenSubscriberCount ? null : Number(s.subscriberCount ?? 0)},
            total_views = ${Number(s.viewCount ?? 0)},
            video_count = ${Number(s.videoCount ?? 0)},
            last_stats_at = now(),
            updated_at = now()
          WHERE youtube_channel_id = ${item.id}`;
        // Daily history for Channel Trends (+views / +subscribers over 24 h).
        await tx`
          INSERT INTO channel_stat_snapshots (youtube_channel_id, subscriber_count, total_views, video_count)
          VALUES (
            ${item.id}, ${s.hiddenSubscriberCount ? null : Number(s.subscriberCount ?? 0)},
            ${Number(s.viewCount ?? 0)}, ${Number(s.videoCount ?? 0)}
          )
          ON CONFLICT DO NOTHING`;
        stats.channels.refreshed++;
      }
      // Terminated/unknown channels: stop polling them.
      const missing = batch.filter((id) => !returned.has(id));
      if (missing.length) {
        await tx`
          UPDATE channels SET last_stats_at = now(), rss_error_count = 5
          WHERE youtube_channel_id IN ${tx(missing)}`;
        stats.channels.missing += missing.length;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Channel discovery (every DISCOVERY_INTERVAL_HOURS)
// ---------------------------------------------------------------------------

const DISCOVERY_STOPWORDS = new Set(
  `the a an and or of to in on for with is are was be this that it my your our you i me we they he she his her at by
  from as how what why who when where vs not no do does did can will just new video videos official full part ep
  episode live shorts short youtube channel day days year years first best top get got make made one two all out up
  into about over more most so if but its i'm don't le la les de des du un une et en est pour pas qui que sur avec
  dans ce cette mon ma mes il elle on je tu nous vous ils par plus fait faire`.split(/\s+/),
);

function titleTokens(title) {
  return (title ?? '')
    .toLowerCase()
    .replace(/https?:\S+/g, ' ')
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 2 && !DISCOVERY_STOPWORDS.has(w) && !/^\d+$/.test(w));
}

// Two-word phrases over-represented in this week's relevant outliers, across several channels.
async function trendingPhrases(limit) {
  const rows = await sql`
    SELECT title, channel_id,
      (relevance_score IS NOT NULL AND outlier_multiplier >= 3 AND published_at > now() - interval '7 days') AS outlier
    FROM videos
    WHERE published_at > now() - interval '120 days'`;
  const outlierCount = rows.filter((r) => r.outlier).length;
  if (outlierCount === 0) return [];

  const phrases = new Map();
  for (const row of rows) {
    const words = titleTokens(row.title);
    const bigrams = new Set(words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`));
    for (const phrase of bigrams) {
      let p = phrases.get(phrase);
      if (!p) phrases.set(phrase, (p = { base: 0, outliers: 0, channels: new Set() }));
      p.base++;
      if (row.outlier) {
        p.outliers++;
        p.channels.add(row.channel_id);
      }
    }
  }
  return [...phrases]
    .map(([phrase, p]) => ({ phrase, channels: p.channels.size, lift: p.outliers / outlierCount / (p.base / rows.length) }))
    .filter((p) => p.channels >= 3 && p.lift >= 3)
    .sort((a, b) => b.channels * Math.log(b.lift) - a.channels * Math.log(a.lift))
    .slice(0, limit)
    .map((p) => p.phrase);
}

function discoveredVideoRow(item, videoId, channelId, withStats) {
  const snippet = item.snippet ?? {};
  const stats = item.statistics ?? {};
  const duration = withStats ? parseIsoDuration(item.contentDetails?.duration) : null;
  return {
    id: `vid-${videoId}`,
    youtube_video_id: videoId,
    channel_id: channelId,
    title: snippet.title ?? '',
    description: snippet.description ?? '',
    thumbnail_url: snippet.thumbnails?.high?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    published_at: snippet.publishedAt,
    view_count: withStats ? Number(stats.viewCount ?? 0) : 0,
    like_count: withStats && stats.likeCount != null ? Number(stats.likeCount) : null,
    comment_count: withStats && stats.commentCount != null ? Number(stats.commentCount) : null,
    duration_seconds: duration?.seconds ?? 0,
    duration_formatted: duration?.formatted ?? null,
    is_short: duration ? duration.seconds > 0 && duration.seconds <= 60 : false,
    category_id: snippet.categoryId ? Number(snippet.categoryId) : null,
    language: snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? null,
    last_stats_at: withStats ? new Date() : null,
  };
}

async function discoveryDue() {
  const [row] = await sql`SELECT max(started_at) AS last FROM scan_runs WHERE stats->'discovery'->>'ran' = 'true'`;
  return !row.last || Date.now() - new Date(row.last).getTime() >= CONFIG.discoveryIntervalHours * 3600 * 1000;
}

async function runDiscovery(stats) {
  const d = (stats.discovery = {
    ran: true,
    quota: 0,
    trending: { calls: 0, errors: 0, videos: 0 },
    search: { queries: [], videos: 0 },
    featured: { checked: 0, found: 0 },
    candidates: 0,
    vetted: 0,
    added: 0,
    rejected: 0,
    addedBy: { trending: 0, search: 0, featured: 0 },
    videosInserted: 0,
  });
  const unitsBefore = scanQuotaUnits;
  const candidates = new Map(); // YouTube channel id -> source that found it first
  const videos = new Map(); // YouTube video id -> { item, withStats }
  const addCandidate = (id, source) => {
    if (id && !candidates.has(id)) candidates.set(id, source);
  };

  // 1. Trending charts per region and category (1 unit per 50 videos, stats included).
  for (const region of CONFIG.discoveryRegions) {
    for (const category of TRENDING_CATEGORIES) {
      try {
        const data = await youtubeApi('videos', {
          part: 'snippet,statistics,contentDetails',
          chart: 'mostPopular',
          regionCode: region,
          maxResults: '50',
          ...(category ? { videoCategoryId: String(category) } : {}),
        });
        d.trending.calls++;
        for (const item of data.items ?? []) {
          d.trending.videos++;
          if (item.snippet?.categoryId === '10') continue; // music labels aren't creator material
          addCandidate(item.snippet?.channelId, 'trending');
          videos.set(item.id, { item, withStats: true });
        }
      } catch (err) {
        if (err.quotaExceeded) throw err;
        d.trending.errors++;
      }
    }
  }

  // 2. Niche searches (100 units each): configured seeds + phrases trending among this week's outliers.
  for (const query of CONFIG.discoverySeedQueries) {
    await sql`INSERT INTO discovery_queries (query, source) VALUES (${query.toLowerCase()}, 'seed') ON CONFLICT DO NOTHING`;
  }
  for (const phrase of await trendingPhrases(5)) {
    await sql`INSERT INTO discovery_queries (query, source) VALUES (${phrase}, 'auto') ON CONFLICT DO NOTHING`;
  }
  const queries = await sql`
    SELECT query, source FROM discovery_queries
    WHERE last_run_at IS NULL OR last_run_at < now() - interval '3 days'
    ORDER BY last_run_at NULLS FIRST, created_at DESC
    LIMIT ${CONFIG.discoverySearchesPerRun}`;
  const publishedAfter = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const channelsByQuery = new Map();
  for (const { query, source } of queries) {
    let items = [];
    try {
      const data = await youtubeApi(
        'search',
        { part: 'snippet', type: 'video', order: 'viewCount', publishedAfter, maxResults: '50', q: query },
        100,
      );
      items = data.items ?? [];
    } catch (err) {
      if (err.quotaExceeded) throw err;
    }
    const found = new Set();
    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;
      d.search.videos++;
      addCandidate(item.snippet?.channelId, 'search');
      found.add(item.snippet?.channelId);
      if (!videos.has(videoId)) videos.set(videoId, { item, withStats: false });
    }
    channelsByQuery.set(query, found);
    d.search.queries.push(source === 'auto' ? `${query} (auto)` : query);
    await sql`
      UPDATE discovery_queries
      SET last_run_at = now(), runs = runs + 1, videos_found = videos_found + ${items.length}
      WHERE query = ${query}`;
  }

  // 3. Channels featured by our best performers (1 unit per channel).
  const featuredSources = await sql`
    SELECT c.id, c.youtube_channel_id
    FROM channels c
    LEFT JOIN LATERAL (
      SELECT max(relevance_score) AS best FROM videos v
      WHERE v.channel_id = c.id AND v.published_at > now() - interval '30 days'
    ) r ON true
    WHERE c.rss_error_count < 5
      AND (c.featured_checked_at IS NULL OR c.featured_checked_at < now() - interval '30 days')
    ORDER BY r.best DESC NULLS LAST, c.subscriber_count DESC NULLS LAST
    LIMIT ${CONFIG.discoveryFeaturedPerRun}`;
  for (const source of featuredSources) {
    try {
      const data = await youtubeApi('channelSections', { part: 'contentDetails', channelId: source.youtube_channel_id });
      for (const section of data.items ?? []) {
        for (const id of section.contentDetails?.channels ?? []) {
          d.featured.found++;
          addCandidate(id, 'featured');
        }
      }
    } catch (err) {
      if (err.quotaExceeded) throw err;
    }
    d.featured.checked++;
    await sql`UPDATE channels SET featured_checked_at = now() WHERE id = ${source.id}`;
  }

  // 4. Vet unknown channels: visible subscriber count above the floor and at least 5 videos.
  d.candidates = candidates.size;
  const candidateIds = [...candidates.keys()];
  const known = new Set();
  if (candidateIds.length) {
    const rows = await sql`
      SELECT youtube_channel_id FROM channels WHERE youtube_channel_id IN ${sql(candidateIds)}
      UNION
      SELECT youtube_channel_id FROM discovery_rejected
      WHERE rejected_at > now() - interval '30 days' AND youtube_channel_id IN ${sql(candidateIds)}`;
    for (const row of rows) known.add(row.youtube_channel_id);
  }
  // Niche sources first: trending alone can fill the per-run cap.
  const sourcePriority = { featured: 0, search: 1, trending: 2 };
  const toVet = candidateIds
    .filter((id) => !known.has(id))
    .sort((a, b) => sourcePriority[candidates.get(a)] - sourcePriority[candidates.get(b)])
    .slice(0, CONFIG.discoveryMaxNewPerRun);
  const added = new Set();
  const reject = (id, reason) =>
    sql`
      INSERT INTO discovery_rejected (youtube_channel_id, reason) VALUES (${id}, ${reason})
      ON CONFLICT (youtube_channel_id) DO UPDATE SET rejected_at = now(), reason = EXCLUDED.reason`;

  for (const batch of chunk(toVet, 50)) {
    const data = await youtubeApi('channels', { part: 'snippet,statistics', id: batch.join(','), maxResults: '50' });
    const returned = new Set();
    for (const item of data.items ?? []) {
      returned.add(item.id);
      d.vetted++;
      const s = item.statistics ?? {};
      const subs = s.hiddenSubscriberCount ? null : Number(s.subscriberCount ?? 0);
      const reason =
        subs == null ? 'hidden_subscribers'
        : subs < CONFIG.discoveryMinSubs ? 'too_small'
        : subs > CONFIG.discoveryMaxSubs ? 'too_big'
        : Number(s.videoCount ?? 0) < 5 ? 'too_few_videos'
        : null;
      if (reason) {
        d.rejected++;
        await reject(item.id, reason);
        continue;
      }
      const source = candidates.get(item.id);
      await sql`
        INSERT INTO channels (
          id, youtube_channel_id, name, handle, thumbnail_url, subscriber_count, total_views, video_count,
          country, last_stats_at, discovered_via, discovered_at
        ) VALUES (
          ${`ch-${item.id}`}, ${item.id}, ${item.snippet?.title ?? item.id}, ${item.snippet?.customUrl ?? null},
          ${item.snippet?.thumbnails?.default?.url ?? null}, ${subs}, ${Number(s.viewCount ?? 0)},
          ${Number(s.videoCount ?? 0)}, ${item.snippet?.country ?? null}, now(), ${source}, now()
        )
        ON CONFLICT (youtube_channel_id) DO NOTHING`;
      added.add(item.id);
      d.added++;
      d.addedBy[source]++;
    }
    for (const id of batch.filter((id) => !returned.has(id))) {
      d.rejected++;
      await reject(id, 'not_found');
    }
  }
  for (const [query, found] of channelsByQuery) {
    const newChannels = [...found].filter((id) => added.has(id)).length;
    if (newChannels) await sql`UPDATE discovery_queries SET new_channels = new_channels + ${newChannels} WHERE query = ${query}`;
  }

  // 5. Store the discovered videos of channels we now track.
  const videoChannelIds = [...new Set([...videos.values()].map((v) => v.item.snippet?.channelId).filter(Boolean))];
  const channelIdByYt = new Map();
  if (videoChannelIds.length) {
    const rows = await sql`SELECT id, youtube_channel_id FROM channels WHERE youtube_channel_id IN ${sql(videoChannelIds)}`;
    for (const row of rows) channelIdByYt.set(row.youtube_channel_id, row.id);
  }
  const rows = [];
  const snapshots = [];
  for (const [videoId, { item, withStats }] of videos) {
    const channelId = channelIdByYt.get(item.snippet?.channelId);
    if (!channelId || !item.snippet?.publishedAt) continue;
    const row = discoveredVideoRow(item, videoId, channelId, withStats);
    rows.push(row);
    if (withStats) {
      snapshots.push({ youtube_video_id: videoId, view_count: row.view_count, like_count: row.like_count, comment_count: row.comment_count });
    }
  }
  for (const batch of chunk(rows, 500)) {
    const upserted = await sql`
      INSERT INTO videos ${sql(batch)}
      ON CONFLICT (youtube_video_id) DO UPDATE SET
        view_count = GREATEST(videos.view_count, EXCLUDED.view_count),
        like_count = COALESCE(EXCLUDED.like_count, videos.like_count),
        comment_count = COALESCE(EXCLUDED.comment_count, videos.comment_count),
        category_id = COALESCE(EXCLUDED.category_id, videos.category_id),
        last_stats_at = COALESCE(EXCLUDED.last_stats_at, videos.last_stats_at)
      RETURNING (xmax = 0) AS inserted`;
    d.videosInserted += upserted.filter((r) => r.inserted).length;
  }
  for (const batch of chunk(snapshots, 500)) {
    await sql`INSERT INTO video_stat_snapshots ${sql(batch)} ON CONFLICT DO NOTHING`;
  }

  d.quota = scanQuotaUnits - unitsBefore;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

async function computeScores() {
  // Median of matured videos (3 to 180 days old), separately for Shorts and long-form.
  await sql`
    WITH med AS (
      SELECT channel_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count) AS med
      FROM videos
      WHERE NOT is_short AND published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days'
      GROUP BY channel_id
      HAVING count(*) >= 5
    )
    UPDATE channels c SET median_views = LEAST(med.med, 2147483647)::int
    FROM med WHERE med.channel_id = c.id`;

  // Relevance score /100, only for videos that clear the filters:
  //   35 pts outlier multiplier (log scale, 30x = max)
  //   25 pts reach (log scale, 10K views = 0, ~3M = max)
  //   20 pts views/subscribers ratio (10x = max)
  //   20 pts freshness (linear over 7 days)
  await sql`
    WITH med AS (
      SELECT channel_id, is_short, percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count) AS med
      FROM videos
      WHERE published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days'
      GROUP BY channel_id, is_short
      HAVING count(*) >= 5
    ),
    vel AS (
      SELECT DISTINCT ON (youtube_video_id)
        youtube_video_id,
        (view_count - prev_views) / NULLIF(EXTRACT(EPOCH FROM captured_at - prev_at) / 3600, 0) AS vph
      FROM (
        SELECT youtube_video_id, view_count, captured_at,
          lag(view_count) OVER w AS prev_views,
          lag(captured_at) OVER w AS prev_at
        FROM video_stat_snapshots
        WHERE captured_at > now() - interval '3 days'
        WINDOW w AS (PARTITION BY youtube_video_id ORDER BY captured_at)
      ) s
      WHERE prev_views IS NOT NULL
      ORDER BY youtube_video_id, captured_at DESC
    ),
    scored AS (
      SELECT
        v.youtube_video_id,
        v.view_count::float8 AS views,
        v.is_short,
        c.subscriber_count AS subs,
        vel.vph,
        EXTRACT(EPOCH FROM now() - v.published_at)::float8 / 3600 AS age_h,
        CASE WHEN med.med IS NOT NULL THEN
          v.view_count::float8 / GREATEST(
            med.med,
            CASE WHEN v.is_short THEN ${CONFIG.medianFloorShort}::float8 ELSE ${CONFIG.medianFloorLong}::float8 END
          )
        END AS mult
      FROM videos v
      JOIN channels c ON c.id = v.channel_id
      LEFT JOIN med ON med.channel_id = v.channel_id AND med.is_short = v.is_short
      LEFT JOIN vel ON vel.youtube_video_id = v.youtube_video_id
      WHERE v.published_at > now() - interval '30 days'
    )
    UPDATE videos v SET
      views_per_day = s.views / GREATEST(s.age_h / 24, 1.0 / 24),
      views_per_hour = COALESCE(s.vph, s.views / GREATEST(s.age_h, 1)),
      outlier_multiplier = COALESCE(s.mult, v.outlier_multiplier),
      relevance_score = CASE
        WHEN s.mult IS NOT NULL
          AND COALESCE(s.subs, 0) >= ${CONFIG.minSubscribers}
          AND s.views >= CASE WHEN s.is_short THEN ${CONFIG.minViewsShort}::float8 ELSE ${CONFIG.minViewsLong}::float8 END
        THEN round((
            35 * LEAST(1, GREATEST(0, log(GREATEST(s.mult, 1)) / log(30::float8)))
          + 25 * LEAST(1, GREATEST(0, (log(GREATEST(s.views, 1)) - 4) / 2.5))
          + 20 * LEAST(1, log(1 + s.views / GREATEST(s.subs, 1)) / log(11::float8))
          + 20 * GREATEST(0, 1 - s.age_h / 168)
        )::numeric, 1)
        ELSE NULL
      END
    FROM scored s
    WHERE s.youtube_video_id = v.youtube_video_id`;

  await computeChannelTrends();

  await sql`DELETE FROM video_stat_snapshots WHERE captured_at < now() - interval '30 days'`;
  await sql`DELETE FROM channel_stat_snapshots WHERE captured_at < now() - interval '30 days'`;
}

// Channel trend score /100 — how much a channel beats its own normal right now:
//   40 pts recent performance: avg views of the last 14 days' videos vs channel median (log scale, 10x = max)
//   25 pts recent outliers: relevant >= 3x videos in 30 days (4 = max)
//   20 pts reach vs size: week's views / subscribers (3x = max)
//   15 pts growth: subscribers gained in 24 h (+0.5 % = max), or upload activity until a day of history exists
async function computeChannelTrends() {
  await sql.begin(async (tx) => {
    await tx`UPDATE channels SET trend_score = NULL, recent_ratio = NULL WHERE trend_score IS NOT NULL OR recent_ratio IS NOT NULL`;
    await tx`
      WITH med AS (
        SELECT channel_id, is_short, percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count) AS med
        FROM videos
        WHERE published_at BETWEEN now() - interval '180 days' AND now() - interval '3 days'
        GROUP BY channel_id, is_short
        HAVING count(*) >= 5
      ),
      recent AS (
        SELECT
          v.channel_id,
          avg(v.view_count::float8 / GREATEST(
            m.med,
            CASE WHEN v.is_short THEN ${CONFIG.medianFloorShort}::float8 ELSE ${CONFIG.medianFloorLong}::float8 END
          )) AS ratio,
          COALESCE(sum(v.view_count) FILTER (WHERE v.published_at > now() - interval '7 days'), 0)::float8 AS views_7d,
          count(*) FILTER (WHERE v.published_at > now() - interval '7 days')::float8 AS uploads_7d
        FROM videos v
        JOIN med m ON m.channel_id = v.channel_id AND m.is_short = v.is_short
        WHERE v.published_at > now() - interval '14 days'
        GROUP BY v.channel_id
      ),
      outliers AS (
        SELECT channel_id, count(*)::float8 AS n
        FROM videos
        WHERE published_at > now() - interval '30 days' AND relevance_score IS NOT NULL AND outlier_multiplier >= 3
        GROUP BY channel_id
      ),
      growth AS (
        SELECT
          youtube_channel_id,
          (array_agg(subscriber_count ORDER BY captured_at DESC))[1]
            - (array_agg(subscriber_count ORDER BY captured_at DESC) FILTER (WHERE captured_at <= now() - interval '20 hours'))[1]
            AS subs_24h
        FROM channel_stat_snapshots
        WHERE captured_at > now() - interval '4 days'
        GROUP BY youtube_channel_id
      ),
      scored AS (
        SELECT r.*, COALESCE(o.n, 0) AS outliers, g.subs_24h
        FROM recent r
        JOIN channels ch ON ch.id = r.channel_id
        LEFT JOIN outliers o ON o.channel_id = r.channel_id
        LEFT JOIN growth g ON g.youtube_channel_id = ch.youtube_channel_id
      )
      UPDATE channels c SET
        recent_ratio = s.ratio,
        trend_score = CASE WHEN COALESCE(c.subscriber_count, 0) >= ${CONFIG.minSubscribers} THEN round((
            40 * LEAST(1, ln(1 + GREATEST(0, s.ratio - 1)) / ln(10::float8))
          + 25 * LEAST(1, s.outliers / 4)
          + 20 * LEAST(1, log(1 + s.views_7d / GREATEST(c.subscriber_count, 1)) / log(4::float8))
          + 15 * CASE
              WHEN s.subs_24h IS NOT NULL AND c.subscriber_count > 0
                THEN LEAST(1, GREATEST(0, s.subs_24h::float8 / c.subscriber_count * 100 / 0.5))
              ELSE LEAST(1, s.uploads_7d / 3)
            END
        )::numeric, 1) END
      FROM scored s
      WHERE s.channel_id = c.id`;
  });
}

// ---------------------------------------------------------------------------
// Discord report
// ---------------------------------------------------------------------------

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(Math.round(n ?? 0));
const compact = (n) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(n ?? 0));
const clock = (date) =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

function buildSummaryEmbed(runId, stats, totals, relevance) {
  const status = stats.error ? 'failed' : stats.rss.rateLimited || stats.quota.exhausted ? 'partial' : 'ok';
  const label = { ok: '✅ terminé', partial: '⚠️ terminé partiellement', failed: '❌ échoué' }[status];
  const color = { ok: 0x22c55e, partial: 0xf59e0b, failed: 0xef4444 }[status];
  const lines = (...items) => items.filter(Boolean).join('\n') || '—';

  const fields = [
    {
      name: '📡 Flux RSS (0 quota)',
      value: lines(
        `Chaînes scannées : **${fmt(stats.rss.ok)}** / ${fmt(stats.rss.attempted)}`,
        `Vidéos lues : **${fmt(stats.rss.entries)}**`,
        `Nouvelles vidéos : **${fmt(stats.rss.newVideos)}** (dont ${fmt(stats.rss.newFreshVideos)} de < 24 h)`,
        stats.rss.notFound && `Chaînes introuvables : ${fmt(stats.rss.notFound)}`,
        stats.rss.failed && `Erreurs réseau : ${fmt(stats.rss.failed)}`,
        stats.rss.rateLimited && '⚠️ YouTube a limité le RSS : phase arrêtée',
      ),
      inline: true,
    },
    {
      name: '📊 Stats API officielle',
      value: lines(
        `Vidéos rafraîchies : **${fmt(stats.videos.refreshed)}** / ${fmt(stats.videos.requested)}`,
        `dont < 48 h : ${fmt(stats.videos.hot)}`,
        stats.videos.unavailable && `Privées / supprimées : ${fmt(stats.videos.unavailable)}`,
        `Chaînes rafraîchies : **${fmt(stats.channels.refreshed)}** / ${fmt(stats.channels.requested)}`,
        stats.channels.missing && `Chaînes disparues : ${fmt(stats.channels.missing)}`,
      ),
      inline: true,
    },
    {
      name: '🔋 Quota YouTube',
      value: lines(
        `Ce scan : **${fmt(stats.quota.usedThisScan)}** unités`,
        `Aujourd'hui : ${fmt(stats.quota.usedToday)} / ${fmt(stats.quota.workerDailyBudget)}`,
        stats.quota.exhausted && '⚠️ Budget du jour atteint',
      ),
      inline: true,
    },
  ];

  if (totals) {
    fields.push({
      name: '🗄️ Base de données',
      value: `${fmt(totals.videos)} vidéos · ${fmt(totals.channels)} chaînes · ${fmt(totals.fresh)} vidéos de < 48 h · ${fmt(totals.snapshots)} relevés de vues`,
    });
  }

  const d = stats.discovery;
  if (d) {
    fields.push({
      name: `🧭 Découverte de chaînes (toutes les ${CONFIG.discoveryIntervalHours} h)`,
      value: lines(
        `Nouvelles chaînes : **${fmt(d.added)}** (tendances ${fmt(d.addedBy.trending)} · recherches ${fmt(d.addedBy.search)} · mises en avant ${fmt(d.addedBy.featured)})`,
        `Candidates : ${fmt(d.candidates)} · vérifiées ${fmt(d.vetted)} · écartées ${fmt(d.rejected)} (< ${compact(CONFIG.discoveryMinSubs)} ou > ${compact(CONFIG.discoveryMaxSubs)} abonnés, < 5 vidéos…)`,
        `Tendances : ${fmt(d.trending.videos)} vidéos sur ${CONFIG.discoveryRegions.join(', ')}`,
        d.search.queries.length && `Recherches : ${d.search.queries.join(' · ')}`,
        `Chaînes mises en avant : ${fmt(d.featured.found)} trouvées via ${fmt(d.featured.checked)} chaînes`,
        `Vidéos ajoutées : **${fmt(d.videosInserted)}** · quota : ${fmt(d.quota)} unités`,
        d.error && `⚠️ ${d.error}`,
      ).slice(0, 1024),
    });
  }

  if (relevance) {
    fields.push({
      name: '🎯 Filtres de pertinence',
      value: lines(
        `≥ ${fmt(CONFIG.minSubscribers)} abonnés · ≥ ${compact(CONFIG.minViewsLong)} vues (longues) · ≥ ${compact(CONFIG.minViewsShort)} vues (Shorts) · < ${CONFIG.reportWindowHours} h`,
        `Outliers ≥ 2x : **${fmt(relevance.kept)}** retenus · ${fmt(relevance.dropped)} écartés (petites chaînes / trop peu de vues)`,
      ),
    });
  }

  if (stats.error) fields.push({ name: '❌ Erreur', value: stats.error.slice(0, 1000) });

  const seconds = Math.round(stats.durationMs / 1000);
  const next = new Date(Date.now() + CONFIG.intervalMinutes * 60000);
  return {
    title: `Scan #${runId} ${label}`,
    color,
    fields,
    footer: { text: `Durée ${Math.floor(seconds / 60)} min ${seconds % 60} s · prochain scan vers ${clock(next)}` },
    timestamp: new Date().toISOString(),
  };
}

const CATEGORIES = {
  1: 'Film & Animation', 2: 'Auto', 10: 'Musique', 15: 'Animaux', 17: 'Sport', 19: 'Voyage',
  20: 'Gaming', 22: 'Vlog / People', 23: 'Humour', 24: 'Divertissement', 25: 'Actualité',
  26: 'Tutos & Style', 27: 'Éducation', 28: 'Science & Tech', 29: 'Associatif',
};

const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function buildVideoEmbed(v, rank) {
  const views = Number(v.view_count);
  const subs = v.subscriber_count;
  const multiplier = Number(v.outlier_multiplier);
  const usualViews = multiplier > 0 ? views / multiplier : null;
  const likes = v.like_count;
  const comments = v.comment_count;
  const engagement = views > 0 && likes != null ? ((likes + (comments ?? 0)) / views) * 100 : null;
  const publishedUnix = Math.floor(new Date(v.published_at).getTime() / 1000);
  const score = Number(v.relevance_score);

  const meta = [
    `${v.is_short ? '📱 Short' : '🎬 Vidéo longue'}${v.duration_formatted ? ` · ${v.duration_formatted}` : ''}`,
    CATEGORIES[v.category_id],
    v.language && `🗣️ ${v.language.toUpperCase()}`,
    v.country && `📍 ${v.country}`,
  ].filter(Boolean);

  return {
    author: {
      name: `${v.channel} · ${subs != null ? `${compact(subs)} abonnés` : 'abonnés masqués'}`,
      url: `https://www.youtube.com/channel/${v.youtube_channel_id}`,
      ...(v.channel_thumb ? { icon_url: v.channel_thumb } : {}),
    },
    title: truncate(`#${rank} · ${v.title}`, 256),
    url: `https://youtu.be/${v.youtube_video_id}`,
    description: meta.join('  ·  '),
    color: score >= 75 ? 0xef4444 : score >= 60 ? 0xf97316 : 0xeab308,
    thumbnail: { url: v.thumbnail_url || `https://i.ytimg.com/vi/${v.youtube_video_id}/hqdefault.jpg` },
    fields: [
      { name: '⭐ Score', value: `**${score.toFixed(0)}**/100`, inline: true },
      { name: '🔥 Outlier', value: `**${multiplier.toFixed(1)}x** la normale\n(${compact(usualViews)} vues habituelles)`, inline: true },
      { name: '📅 Publiée', value: `<t:${publishedUnix}:R>\n<t:${publishedUnix}:f>`, inline: true },
      { name: '👁️ Vues', value: `**${fmt(views)}**`, inline: true },
      { name: '⚡ Vitesse', value: `${compact(v.views_per_hour)} vues/h`, inline: true },
      { name: '👥 Vues / abonnés', value: subs ? `${(views / subs).toFixed(1)}x` : '—', inline: true },
      { name: '👍 Likes', value: likes != null ? fmt(likes) : 'masqués', inline: true },
      { name: '💬 Commentaires', value: comments != null ? fmt(comments) : 'désactivés', inline: true },
      { name: '📈 Engagement', value: engagement != null ? `${engagement.toFixed(1)} %` : '—', inline: true },
    ],
  };
}

// Best relevant videos of the window not reported in the last 24 h, one per channel.
async function pickTopVideos(isShort, limit) {
  const candidates = await sql`
    SELECT
      v.youtube_video_id, v.title, v.view_count, v.like_count, v.comment_count, v.outlier_multiplier,
      v.views_per_hour, v.is_short, v.duration_formatted, v.published_at, v.category_id, v.language,
      v.relevance_score, v.thumbnail_url,
      c.name AS channel, c.youtube_channel_id, c.subscriber_count, c.thumbnail_url AS channel_thumb, c.country
    FROM videos v
    JOIN channels c ON c.id = v.channel_id
    WHERE v.is_short = ${isShort}
      AND v.relevance_score IS NOT NULL
      AND v.published_at > now() - make_interval(hours => ${CONFIG.reportWindowHours})
      AND (v.discord_reported_at IS NULL OR v.discord_reported_at < now() - interval '24 hours')
    ORDER BY v.relevance_score DESC
    LIMIT ${limit * 5}`;
  const seenChannels = new Set();
  return candidates
    .filter((v) => !seenChannels.has(v.youtube_channel_id) && seenChannels.add(v.youtube_channel_id))
    .slice(0, limit);
}

async function sendReport(summary, longVideos, shortVideos) {
  await sendDiscord({ username: 'Outlr Scanner', embeds: [summary] });
  const sections = [
    ['🎬 Top vidéos longues', longVideos],
    ['📱 Top Shorts', shortVideos],
  ];
  for (const [heading, videos] of sections) {
    if (!videos.length) continue;
    await sendDiscord({
      username: 'Outlr Scanner',
      content: `## ${heading} · publiées il y a < ${CONFIG.reportWindowHours} h`,
      embeds: videos.map((v, i) => buildVideoEmbed(v, i + 1)),
    });
  }
  const reported = [...longVideos, ...shortVideos].map((v) => v.youtube_video_id);
  if (WEBHOOK_URL && reported.length) {
    await sql`UPDATE videos SET discord_reported_at = now() WHERE youtube_video_id IN ${sql(reported)}`;
  }
}

async function sendDiscord(payload) {
  if (!WEBHOOK_URL) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;
    if (res.status === 429) {
      const body = await res.json().catch(() => ({}));
      await sleep((body.retry_after ?? 2) * 1000);
      continue;
    }
    console.error('❌ Discord :', res.status, await res.text());
    return;
  }
}

// ---------------------------------------------------------------------------
// Growth report (every GROWTH_REPORT_HOURS): totals vs the previous report
// ---------------------------------------------------------------------------

async function collectTotals() {
  const [totals] = await sql`
    SELECT
      (SELECT count(*) FROM videos)::int AS videos,
      (SELECT count(*) FROM videos WHERE NOT is_short)::int AS long_videos,
      (SELECT count(*) FROM videos WHERE is_short)::int AS shorts,
      (SELECT count(*) FROM channels)::int AS channels,
      (SELECT count(*) FROM channels WHERE rss_error_count < 5)::int AS active_channels,
      (SELECT count(*) FROM channels WHERE discovered_via IS NOT NULL)::int AS discovered_channels,
      (SELECT count(*) FROM videos WHERE last_stats_at > now() - interval '24 hours')::int AS fresh_stats,
      (SELECT count(*) FROM video_stat_snapshots)::int AS snapshots,
      (SELECT count(*) FROM videos WHERE relevance_score IS NOT NULL)::int AS relevant,
      (SELECT count(*) FROM videos WHERE relevance_score IS NOT NULL AND outlier_multiplier >= 3
         AND published_at > now() - interval '7 days')::int AS outliers_7d`;
  return totals;
}

function delta(current, previous) {
  if (previous == null) return '';
  const diff = current - previous;
  const sign = diff >= 0 ? '+' : '−';
  const pct = previous > 0 ? ` · ${sign}${Math.abs((diff / previous) * 100).toFixed(1)} %` : '';
  return ` (${sign}${fmt(Math.abs(diff))}${pct})`;
}

async function maybeSendGrowthReport(force = false) {
  const [last] = await sql`SELECT created_at, totals FROM data_growth_reports ORDER BY created_at DESC LIMIT 1`;
  const dueAt = last ? new Date(last.created_at).getTime() + CONFIG.growthReportHours * 3600 * 1000 : 0;
  if (!force && Date.now() < dueAt) return;

  const now = await collectTotals();
  const prev = last?.totals;
  const since = last?.created_at ?? new Date(0);
  const [activity] = await sql`
    SELECT
      count(*)::int AS scans,
      count(*) FILTER (WHERE status = 'failed')::int AS failed,
      COALESCE(sum((stats->'rss'->>'ok')::int), 0)::int AS rss_reads,
      COALESCE(sum((stats->'rss'->>'newVideos')::int), 0)::int AS new_videos,
      COALESCE(sum((stats->'videos'->>'refreshed')::int), 0)::int AS videos_refreshed,
      COALESCE(sum((stats->'channels'->>'refreshed')::int), 0)::int AS channels_refreshed,
      COALESCE(sum((stats->'quota'->>'usedThisScan')::int), 0)::int AS quota
    FROM scan_runs
    WHERE started_at > ${since}`;

  const line = (label, key) => `${label} : **${fmt(now[key])}**${delta(now[key], prev?.[key])}`;
  const hours = last ? Math.round((Date.now() - new Date(last.created_at).getTime()) / 3600000) : null;
  const sinceUnix = last ? Math.floor(new Date(last.created_at).getTime() / 1000) : null;

  await sendDiscord({
    username: 'Outlr Scanner',
    embeds: [
      {
        title: last ? `📈 Croissance de la data · ${hours} dernières heures` : '📈 Croissance de la data · point de départ',
        description: last ? `Comparé au rapport du <t:${sinceUnix}:f>` : 'Premier rapport : les prochains montreront l’évolution.',
        color: 0x6366f1,
        fields: [
          {
            name: '🎞️ Vidéos en base',
            value: [line('Total', 'videos'), line('🎬 Longues', 'long_videos'), line('📱 Shorts', 'shorts')].join('\n'),
          },
          {
            name: '📡 Chaînes',
            value: [line('Total', 'channels'), line('Actives', 'active_channels'), line('Découvertes auto', 'discovered_channels')].join('\n'),
            inline: true,
          },
          {
            name: '📊 Qualité de la data',
            value: [
              line('Stats < 24 h', 'fresh_stats'),
              line('Relevés de vues', 'snapshots'),
              line('Vidéos pertinentes', 'relevant'),
              line('Outliers ≥ 3x (7 j)', 'outliers_7d'),
            ].join('\n'),
            inline: true,
          },
          {
            name: '⚙️ Activité sur la période',
            value: [
              `Scans : **${fmt(activity.scans)}**${activity.failed ? ` (dont ${activity.failed} en échec)` : ''}`,
              `Flux RSS lus : **${fmt(activity.rss_reads)}**`,
              `Nouvelles vidéos découvertes : **${fmt(activity.new_videos)}**`,
              `Stats vidéos rafraîchies : **${fmt(activity.videos_refreshed)}**`,
              `Chaînes rafraîchies : **${fmt(activity.channels_refreshed)}**`,
              `Quota YouTube consommé : **${fmt(activity.quota)}** unités`,
            ].join('\n'),
          },
        ],
        footer: { text: `Prochain rapport de croissance dans ${CONFIG.growthReportHours} h` },
        timestamp: new Date().toISOString(),
      },
    ],
  });
  await sql`INSERT INTO data_growth_reports (totals) VALUES (${sql.json(now)})`;
}

// ---------------------------------------------------------------------------
// Scan loop
// ---------------------------------------------------------------------------

async function runScan() {
  const startedAt = Date.now();
  const stats = {
    rss: { attempted: 0, ok: 0, notFound: 0, failed: 0, rateLimited: false, entries: 0, newVideos: 0, newFreshVideos: 0 },
    videos: { requested: 0, refreshed: 0, hot: 0, unavailable: 0, apiCalls: 0 },
    channels: { requested: 0, refreshed: 0, missing: 0, apiCalls: 0 },
    quota: { usedThisScan: 0, usedToday: 0, workerDailyBudget: 0, exhausted: false },
    durationMs: 0,
    error: null,
  };
  const [{ id: runId }] = await sql`INSERT INTO scan_runs DEFAULT VALUES RETURNING id`;
  console.log(`\n[${clock(new Date())}] 🚀 Scan #${runId} démarré`);

  let longVideos = [];
  let shortVideos = [];
  let totals = null;
  let relevance = null;
  scanQuotaUnits = 0;
  try {
    await scanRss(stats);

    if (await discoveryDue()) {
      try {
        await runDiscovery(stats);
      } catch (err) {
        if (err.quotaExceeded) stats.quota.exhausted = true;
        else console.error('❌ Découverte :', err);
        if (stats.discovery) stats.discovery.error = err.message;
      }
    }

    // Spread the worker's daily budget over the day's scans (x2 to catch up after downtime).
    const workerDailyBudget = Math.floor(CONFIG.dailyQuota * CONFIG.workerQuotaShare);
    const scansPerDay = Math.max(1, Math.floor(1440 / CONFIG.intervalMinutes));
    const budget = Math.max(
      0,
      Math.min(workerDailyBudget - (await quotaUsedToday()), Math.ceil((workerDailyBudget / scansPerDay) * 2)),
    );
    stats.quota.workerDailyBudget = workerDailyBudget;
    if (budget === 0) stats.quota.exhausted = true;

    const channelCalls = Math.min(Math.ceil(budget * 0.2), budget);
    try {
      await refreshVideoStats(stats, budget - channelCalls);
      await refreshChannelStats(stats, channelCalls);
    } catch (err) {
      if (!err.quotaExceeded) throw err;
      stats.quota.exhausted = true;
    }

    await computeScores();

    longVideos = await pickTopVideos(false, CONFIG.reportTopLong);
    shortVideos = await pickTopVideos(true, CONFIG.reportTopShorts);
    [relevance] = await sql`
      SELECT
        count(*) FILTER (WHERE relevance_score IS NOT NULL)::int AS kept,
        count(*) FILTER (WHERE relevance_score IS NULL)::int AS dropped
      FROM videos
      WHERE outlier_multiplier >= 2
        AND published_at > now() - make_interval(hours => ${CONFIG.reportWindowHours})`;
    [totals] = await sql`
      SELECT
        (SELECT count(*) FROM videos)::int AS videos,
        (SELECT count(*) FROM channels)::int AS channels,
        (SELECT count(*) FROM videos WHERE published_at > now() - interval '48 hours')::int AS fresh,
        (SELECT count(*) FROM video_stat_snapshots)::int AS snapshots`;
  } catch (err) {
    stats.error = err.message;
    console.error(`❌ Scan #${runId} :`, err);
  }

  stats.quota.usedThisScan = scanQuotaUnits;
  stats.quota.usedToday = await quotaUsedToday();
  stats.durationMs = Date.now() - startedAt;
  await sql`
    UPDATE scan_runs SET
      finished_at = now(),
      status = ${stats.error ? 'failed' : 'ok'},
      stats = ${sql.json(stats)},
      error = ${stats.error}
    WHERE id = ${runId}`;

  console.log(`✅ Scan #${runId} :`, JSON.stringify({ rss: stats.rss, videos: stats.videos, channels: stats.channels, quota: stats.quota }));
  await sendReport(buildSummaryEmbed(runId, stats, totals, relevance), longVideos, shortVideos);
  if (WEBHOOK_URL) await maybeSendGrowthReport(process.argv.includes('--growth-report'));
}

let running = false;
async function tick() {
  if (running) {
    console.warn('⏭️ Scan précédent encore en cours, cycle sauté.');
    return;
  }
  running = true;
  try {
    await runScan();
  } catch (err) {
    console.error('❌ Scan impossible :', err);
  } finally {
    running = false;
  }
}

console.log(`📡 Outlr Scanner — un scan toutes les ${CONFIG.intervalMinutes} min`);
await tick();
if (process.argv.includes('--once')) {
  await sql.end();
} else {
  setInterval(tick, CONFIG.intervalMinutes * 60 * 1000);
}
