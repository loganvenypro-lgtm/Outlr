import { sql } from "@/lib/postgres";
import { loadViralVideosIndex, type IndexedViralVideo } from "@/lib/viralVideosIndex";
import { LandingPage, type LandingStats, type LandingVideo } from "@/components/landing/landing-page";

// The showcase uses real outliers from the index; refresh it hourly.
export const revalidate = 3600;

// Index categories are raw search queries, so the explorer groups them into readable niches.
const NICHES: { name: string; match: RegExp }[] = [
  { name: "Rise & Fall", match: /rise|fall|downfall/i },
  { name: "Tech & IA", match: /hack|cyber|\bai\b|saas|tech/i },
  { name: "Gaming", match: /minecraft|roblox|gaming|fortnite/i },
  { name: "Business", match: /business|dropshipping|money|\$|million|empire/i },
  { name: "Mystère & crime", match: /crime|iceberg|disturbing|horror|myst/i },
];

// Placeholder titles and ambient "background" uploads are noise on a landing page.
const JUNK_TITLE = /^video [\w-]+$|background|no music|screen saver/i;

// Channels with strong, recognisable packaging (documentaries, true crime, video essays)
// for the hero wall. Order sets the mix; each contributes its most-watched long-form outliers
// (×3 or more, since the wall shows the multiplier).
const HERO_CHANNELS: { name: string; take: number }[] = [
  { name: "fern", take: 4 },
  { name: "Veritasium", take: 3 },
  { name: "Nick Crowley", take: 2 },
  { name: "48 Hours", take: 2 },
  { name: "Nexpo", take: 2 },
  { name: "Cybernews", take: 2 },
  { name: "Real Stories", take: 2 },
  { name: "Farrell McGuire", take: 2 },
  { name: "Dr Insanity", take: 2 },
  { name: "Thomas Flight", take: 2 },
  { name: "Blackfiles", take: 2 },
  { name: "Chilling Scares", take: 2 },
  { name: "Banijay Crime - Crime Documentary", take: 1 },
  { name: "Beppo", take: 2 },
  { name: "Abyssal Detective", take: 1 },
  { name: "Blueprint", take: 1 },
  { name: "DW Documentary", take: 1 },
  { name: "Unreal True Crime", take: 1 },
  { name: "Visual Venture", take: 1 },
  { name: "Parke Jones", take: 1 },
];

/** Interleaves the hero channels so no two neighbouring cards share a channel. */
function pickHeroVideos(index: IndexedViralVideo[]): LandingVideo[] {
  const perChannel = HERO_CHANNELS.map(({ name, take }) =>
    index
      .filter(
        (v) =>
          v.channelTitle.toLowerCase() === name.toLowerCase() &&
          v.durationSeconds >= 180 &&
          v.outlierMultiplier >= 3 &&
          v.thumbnail.includes("maxresdefault") &&
          !JUNK_TITLE.test(v.title)
      )
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, take)
  );

  const out: LandingVideo[] = [];
  for (let round = 0; perChannel.some((list) => list[round]); round++) {
    for (const list of perChannel) if (list[round]) out.push(toLandingVideo(list[round]));
  }
  return out;
}

function toLandingVideo(v: IndexedViralVideo): LandingVideo {
  return {
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    channelTitle: v.channelTitle,
    channelAvatar: v.channelAvatar ?? null,
    channelSubscribers: v.channelSubscribers,
    viewCount: v.viewCount,
    outlierMultiplier: v.outlierMultiplier,
    publishedAt: v.publishedAt,
    duration: v.durationFormatted,
  };
}

// Uploads whose views don't come from their packaging: film reuploads, music, test signals, TV episodes.
const NOT_A_BREAKOUT = /full movie|official|#|cover|bass test|lyrics|trailer|\bmusic\b|S\d+E\d+/i;
// Titles outside the Latin script read as noise to a French-speaking visitor.
const NON_LATIN = /[^\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{Sc}\p{Sm}]/u;

const isShowcaseBreakout = (title: string) => !NOT_A_BREAKOUT.test(title) && !NON_LATIN.test(title) && !JUNK_TITLE.test(title);

/** Recent long-form breakouts from small channels (1k–100k subscribers), one per channel, for the proof section. */
async function loadBreakouts(index: IndexedViralVideo[]): Promise<LandingVideo[]> {
  try {
    const rows = await sql`
      SELECT DISTINCT ON (c.id)
        v.youtube_video_id, v.title, v.thumbnail_url, v.published_at, v.view_count, v.outlier_multiplier,
        v.duration_formatted, c.name, c.thumbnail_url AS avatar, c.subscriber_count
      FROM videos v
      JOIN channels c ON c.id = v.channel_id
      WHERE v.relevance_score IS NOT NULL
        AND NOT v.is_short
        AND v.duration_seconds >= 180
        AND c.subscriber_count BETWEEN 1000 AND 100000
        AND v.outlier_multiplier BETWEEN 10 AND 500
        AND v.view_count >= 100000
        AND v.published_at > now() - interval '120 days'
      ORDER BY c.id, v.outlier_multiplier DESC`;
    const picked = rows
      .filter((r) => isShowcaseBreakout(r.title))
      .sort((a, b) => b.outlier_multiplier - a.outlier_multiplier)
      .slice(0, 6)
      .map(
        (r): LandingVideo => ({
          id: r.youtube_video_id,
          title: r.title,
          thumbnail: r.thumbnail_url || `https://i.ytimg.com/vi/${r.youtube_video_id}/hqdefault.jpg`,
          channelTitle: r.name,
          channelAvatar: r.avatar ?? null,
          channelSubscribers: Number(r.subscriber_count),
          viewCount: Number(r.view_count),
          outlierMultiplier: Number(r.outlier_multiplier),
          publishedAt: new Date(r.published_at).toISOString(),
          duration: r.duration_formatted ?? "",
        })
      );
    if (picked.length >= 3) return picked;
  } catch {}

  return pickDistinctChannels(
    index
      .filter(
        (v) =>
          v.channelSubscribers >= 1_000 &&
          v.channelSubscribers <= 100_000 &&
          v.outlierMultiplier >= 10 &&
          v.outlierMultiplier <= 500 &&
          v.durationSeconds >= 180 &&
          v.viewCount >= 100_000 &&
          isShowcaseBreakout(v.title)
      )
      .sort((a, b) => b.outlierMultiplier - a.outlierMultiplier),
    6
  );
}

/** Headline counters from the scan database; the JSON index stands in when it can't be reached. */
async function loadStats(index: IndexedViralVideo[]): Promise<LandingStats> {
  try {
    const [row] = await sql`
      SELECT
        (SELECT count(*) FROM videos)::int AS videos,
        (SELECT count(*) FROM channels)::int AS channels,
        (SELECT coalesce(sum(view_count), 0) FROM videos)::float8 AS views,
        (SELECT count(*) FROM videos
          WHERE relevance_score IS NOT NULL AND outlier_multiplier >= 10)::int AS "bigOutliers",
        (SELECT count(*) FROM videos WHERE published_at > now() - interval '7 days')::int AS "freshWeek",
        (SELECT max(finished_at) FROM scan_runs WHERE status = 'ok') AS "updatedAt"`;
    return {
      videos: row.videos,
      channels: row.channels,
      views: row.views,
      bigOutliers: row.bigOutliers,
      freshWeek: row.freshWeek,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  } catch {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const lastIndexed = Math.max(0, ...index.map((v) => new Date(v.indexedAt).getTime() || 0));
    return {
      videos: index.length,
      channels: new Set(index.map((v) => v.channelId)).size,
      views: index.reduce((sum, v) => sum + v.viewCount, 0),
      bigOutliers: index.filter((v) => v.outlierMultiplier >= 10).length,
      freshWeek: index.filter((v) => new Date(v.publishedAt).getTime() > weekAgo).length,
      updatedAt: lastIndexed ? new Date(lastIndexed).toISOString() : null,
    };
  }
}

function pickDistinctChannels(list: IndexedViralVideo[], limit: number): LandingVideo[] {
  const seen = new Set<string>();
  const out: LandingVideo[] = [];
  for (const v of list) {
    if (seen.has(v.channelId)) continue;
    seen.add(v.channelId);
    out.push(toLandingVideo(v));
    if (out.length >= limit) break;
  }
  return out;
}

export default async function WelcomePage() {
  const index = await loadViralVideosIndex();

  // Long-form breakouts with a believable multiplier make the best showcase.
  const showcase = index
    .filter(
      (v) =>
        v.thumbnail &&
        !JUNK_TITLE.test(v.title) &&
        v.durationSeconds >= 120 &&
        v.viewCount >= 50_000 &&
        v.outlierMultiplier >= 5 &&
        v.outlierMultiplier <= 2_000
    )
    .sort((a, b) => b.viralBreakoutScore - a.viralBreakoutScore);

  const videos = pickDistinctChannels(showcase, 40);

  const niches = NICHES.map(({ name, match }) => ({
    name,
    videos: pickDistinctChannels(
      showcase.filter((v) => match.test(`${v.category} ${v.title}`)),
      6
    ),
  })).filter((n) => n.videos.length >= 3);

  const [stats, breakouts] = await Promise.all([loadStats(index), loadBreakouts(index)]);

  // Fall back to the general showcase if the curated channels drop out of the index.
  const picked = pickHeroVideos(index);
  const heroVideos = picked.length >= 18 ? picked : videos;

  const creators = [...new Map(heroVideos.filter((v) => v.channelAvatar).map((v) => [v.channelTitle, v])).values()]
    .sort((a, b) => b.channelSubscribers - a.channelSubscribers)
    .map((v) => ({ name: v.channelTitle, avatar: v.channelAvatar!, subscribers: v.channelSubscribers }));

  return (
    <LandingPage
      videos={videos}
      heroVideos={heroVideos}
      creators={creators}
      niches={niches}
      breakouts={breakouts}
      stats={stats}
    />
  );
}
