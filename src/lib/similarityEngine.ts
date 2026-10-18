import { ChannelProfile, SimilarChannelCandidate, SimilarityBreakdown } from "@/types/similarChannels";
import { parseISO8601Duration } from "./utils";
import { getTrackedChannels } from "./db";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

const STOP_WORDS = new Set([
  "the", "and", "this", "that", "with", "from", "your", "what", "how", "why", "when",
  "where", "video", "official", "channel", "about", "more", "like", "subscribe", "dans",
  "avec", "pour", "cette", "plus", "vous", "nous", "tout", "faire", "comment", "votre",
  "mon", "mes", "sur", "les", "des", "une", "est", "sont", "par", "ont", "qui", "que"
]);

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Tokenize and normalize text into clean keywords
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u00FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Jaccard or term-overlap similarity between two sets of keywords (0 to 100)
 */
function computeKeywordOverlap(setA: string[], setB: string[]): { score: number; shared: string[] } {
  if (setA.length === 0 || setB.length === 0) return { score: 0, shared: [] };

  const a = new Set(setA);
  const b = new Set(setB);
  const shared: string[] = [];

  for (const item of a) {
    if (b.has(item)) shared.push(item);
  }

  const union = new Set([...setA, ...setB]);
  const jaccard = shared.length / union.size;
  // Scale dynamically
  const score = Math.min(100, Math.round(jaccard * 180 + shared.length * 5));
  return { score, shared: Array.from(new Set(shared)) };
}

/**
 * Extract Dominant Keywords from Channel Metadata and Recent Videos
 */
export function extractChannelDominantKeywords(channel: {
  title: string;
  description: string;
  videoTitles: string[];
}): string[] {
  const allText = `${channel.title} ${channel.title} ${channel.description} ${channel.videoTitles.join(" ")}`;
  const tokens = extractKeywords(allText);

  const freq = new Map<string, number>();
  for (const t of tokens) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([w]) => w);
}

/**
 * Core Algorithm: calculateChannelSimilarity(referenceChannel, candidateChannel)
 * 5 Configurable components:
 * A. Thematic Similarity — 40%
 * B. Video Titles Similarity — 25%
 * C. Content Format Similarity — 15%
 * D. Potential Audience / Channel Scale Similarity — 10%
 * E. Performance & View Distribution Similarity — 10%
 */
export function calculateChannelSimilarity(
  ref: {
    dominantKeywords: string[];
    videoTitles: string[];
    avgDurationSeconds: number;
    subscribers: number;
    typicalViews: number;
  },
  candidate: {
    title: string;
    description: string;
    videoTitles: string[];
    avgDurationSeconds: number;
    subscribers: number;
    typicalViews: number;
  }
): { score: number; breakdown: SimilarityBreakdown } {
  // A. Thematic Similarity (40%)
  const candidateKeywords = extractChannelDominantKeywords({
    title: candidate.title,
    description: candidate.description,
    videoTitles: candidate.videoTitles,
  });

  const { score: thematicRaw, shared: sharedKeywords } = computeKeywordOverlap(
    ref.dominantKeywords,
    candidateKeywords
  );
  const thematicScore = Math.min(100, Math.max(10, thematicRaw));

  // B. Video Titles Similarity (25%)
  const refTitleTokens = extractKeywords(ref.videoTitles.join(" "));
  const candidateTitleTokens = extractKeywords(candidate.videoTitles.join(" "));
  const { score: titleOverlap } = computeKeywordOverlap(refTitleTokens, candidateTitleTokens);
  const titlesScore = Math.min(100, titleOverlap);

  // C. Content Format Similarity (15%)
  // Compare average video duration
  let formatScore = 80;
  if (ref.avgDurationSeconds > 0 && candidate.avgDurationSeconds > 0) {
    const ratio = Math.min(ref.avgDurationSeconds, candidate.avgDurationSeconds) /
      Math.max(ref.avgDurationSeconds, candidate.avgDurationSeconds);
    formatScore = Math.round(ratio * 100);
  }

  // D. Potential Audience / Channel Scale Similarity (10%)
  let audienceScore = 50;
  if (ref.subscribers > 0 && candidate.subscribers > 0) {
    const logRef = Math.log10(ref.subscribers);
    const logCand = Math.log10(candidate.subscribers);
    const diff = Math.abs(logRef - logCand);
    audienceScore = Math.max(20, Math.min(100, Math.round(100 - diff * 25)));
  }

  // E. Performance Similarity (10%)
  let performanceScore = 50;
  if (ref.typicalViews > 0 && candidate.typicalViews > 0) {
    const logRefV = Math.log10(ref.typicalViews);
    const logCandV = Math.log10(candidate.typicalViews);
    const diffV = Math.abs(logRefV - logCandV);
    performanceScore = Math.max(20, Math.min(100, Math.round(100 - diffV * 25)));
  }

  // Weighted total: 0.40 * A + 0.25 * B + 0.15 * C + 0.10 * D + 0.10 * E
  const weighted =
    thematicScore * 0.4 +
    titlesScore * 0.25 +
    formatScore * 0.15 +
    audienceScore * 0.1 +
    performanceScore * 0.1;

  const finalScore = Math.round(Math.min(99, Math.max(15, weighted)));

  return {
    score: finalScore,
    breakdown: {
      thematicScore,
      titlesScore,
      formatScore,
      audienceScore,
      performanceScore,
      sharedKeywords: sharedKeywords.slice(0, 8),
    },
  };
}

/**
 * Identifies Channel ID from user's input URL or handle
 */
export async function resolveChannelId(input: string): Promise<string> {
  const apiKey = getApiKey();
  const trimmed = input.trim();

  // Pattern 1: Direct ID
  if (/^UC[\w-]{21,23}$/.test(trimmed)) {
    return trimmed;
  }

  // Pattern 2: URL containing channel/UC...
  if (trimmed.includes("/channel/")) {
    const id = trimmed.split("/channel/")[1]?.split("/")[0]?.split("?")[0];
    if (id && /^UC[\w-]{21,23}$/.test(id)) return id;
  }

  // Pattern 3: URL containing /@handle or @handle
  let handle = "";
  if (trimmed.includes("/@")) {
    handle = trimmed.split("/@")[1]?.split("/")[0]?.split("?")[0];
  } else if (trimmed.startsWith("@")) {
    handle = trimmed.substring(1);
  }

  if (handle) {
    const res = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.items?.[0]?.id) return data.items[0].id;
  }

  // Pattern 4: User or custom c/ URL fallback via search.list
  let query = trimmed;
  if (trimmed.includes("youtube.com/")) {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    query = url.pathname.replace(/^\/(c|user)\//, "").replace(/\//g, " ");
  }

  const sRes = await fetch(
    `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${apiKey}`
  );
  const sData = await sRes.json();
  if (sData.items?.[0]?.snippet?.channelId) {
    return sData.items[0].snippet.channelId;
  }

  throw new Error("Impossible de trouver une chaîne YouTube correspondant à cette URL.");
}
