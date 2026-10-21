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

// Channels with strong, recognisable packaging (documentaries, true crime, video essays)
// for the hero wall. Order sets the mix; each contributes its most-watched long-form videos.
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

  // Fall back to the general showcase if the curated channels drop out of the index.
  const picked = pickHeroVideos(index);
  const heroVideos = picked.length >= 18 ? picked : videos;

  const creators = [...new Map(heroVideos.filter((v) => v.channelAvatar).map((v) => [v.channelTitle, v])).values()]
    .sort((a, b) => b.channelSubscribers - a.channelSubscribers)
    .map((v) => ({ name: v.channelTitle, avatar: v.channelAvatar!, subscribers: v.channelSubscribers }));

  return <LandingPage videos={videos} heroVideos={heroVideos} creators={creators} niches={niches} stats={stats} />;
}
