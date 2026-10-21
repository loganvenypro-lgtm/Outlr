import { loadViralVideosIndex, type IndexedViralVideo } from "@/lib/viralVideosIndex";
import { LandingPage, type LandingVideo } from "@/components/landing/landing-page";

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

  const stats = {
    videos: index.length,
    channels: new Set(index.map((v) => v.channelId)).size,
    topMultiplier: Math.round(Math.max(0, ...videos.map((v) => v.outlierMultiplier))),
  };

  return <LandingPage videos={videos} niches={niches} stats={stats} />;
}
