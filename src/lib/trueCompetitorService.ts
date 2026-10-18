import { 
  NicheEditorialArchetype, 
  ChannelEditorialProfile, 
  CompetitorSimilarityBreakdown, 
  CompetitorChannel, 
  SimilarChannelsEngineResponse 
} from "@/types/competitorEngine";
import { parseISO8601Duration } from "./utils";
import { resolveChannelId } from "./similarityEngine";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY manquante");
  return key.trim();
}

/**
 * Stop words for semantic extraction
 */
const STOP_WORDS = new Set([
  "the", "and", "this", "that", "with", "from", "your", "what", "how", "why", "when",
  "where", "video", "official", "channel", "about", "more", "like", "subscribe", "dans",
  "avec", "pour", "cette", "plus", "vous", "nous", "tout", "faire", "comment", "votre",
  "mon", "mes", "sur", "les", "des", "une", "est", "sont", "par", "ont", "qui", "que",
  "part", "episode", "full", "hd", "2024", "2025", "2026"
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u00FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Editorial Archetype Classification based on actual video titles, descriptions & pacing
 */
export function classifyEditorialArchetype(
  titles: string[],
  description: string,
  avgDurationSeconds: number
): { archetype: NicheEditorialArchetype; label: string; tags: string[]; titlePatterns: string[] } {
  const joinedText = `${titles.join(" ")} ${description}`.toLowerCase();

  // 1. Investigation / Mystery / True Crime
  if (
    joinedText.match(/murder|unsolved|killer|mystery|hunt for|disappeared|investigation|crime|cartel|bizarre|rabbit hole|disturbing|conspiracy|dark web|secret/)
  ) {
    const patterns = [];
    if (titles.some((t) => t.toLowerCase().startsWith("the "))) patterns.push('"The [Subject]" Definitive Title');
    if (titles.some((t) => t.toLowerCase().includes("unsolved") || t.toLowerCase().includes("murder"))) patterns.push('Unsolved / Cold Case Mystery');
    if (titles.some((t) => t.toLowerCase().includes("hunt for"))) patterns.push('The Hunt / Manhunt Framing');

    return {
      archetype: "investigation_true_crime_mystery",
      label: "Documentaires Enquête, Crime & Mystères Internet",
      tags: ["Mini-documentaire", "Investigation", "True Crime", "Mystères", "Rabbit Hole"],
      titlePatterns: patterns.length > 0 ? patterns : ["Intrigue & Histoire Non Résolue"],
    };
  }

  // 2. Video Essay / High-production Documentary
  if (
    avgDurationSeconds >= 900 || // > 15 mins
    joinedText.match(/documentary|essay|rise and fall|downfall|history of|story of|evolution of|tragedy of|how .* ruined|the truth about/)
  ) {
    return {
      archetype: "video_essay_documentary",
      label: "Video Essay & Documentaire Long-Format",
      tags: ["Video Essay", "Documentaire Storytelling", "Histoire & Société", "Production Soignée"],
      titlePatterns: ['"The Rise and Fall of...", "The Story of..."', '"Why..." Deep Dive'],
    };
  }

  // 3. Finance & Business
  if (joinedText.match(/finance|invest|money|crypto|bitcoin|bourse|trading|economy|business|billionaire|wealth|passive income/)) {
    return {
      archetype: "finance_business_economics",
      label: "Business, Finance & Économie",
      tags: ["Finance", "Investissement", "Business Breakdown", "Marchés"],
      titlePatterns: ['"How [Company] Makes Money", "The Collapse of..."'],
    };
  }

  // 4. Tech & AI
  if (joinedText.match(/tech|ai|software|coding|artificial intelligence|hardware|apple|smartphone|gadget|developer|engineering/)) {
    return {
      archetype: "tech_ai_software_reviews",
      label: "Tech, Intelligence Artificielle & Ingénierie",
      tags: ["Tech Review", "IA & Outils", "Ingénierie", "Futurisme"],
      titlePatterns: ['"I Tested...", "The Future of [Tech]"'],
    };
  }

  // 5. High-Production Challenge, Stunt & Spectacle Entertainment (e.g. MrBeast, Mark Rober, Ryan Trahan, Airrack)
  if (
    joinedText.match(/survive|survived|hours in|stunt|challenge|giveaway|last to leave|win \$|prize|trapped|world's|bought|extreme|experiment|mrbeast/)
  ) {
    return {
      archetype: "gaming_challenges_entertainment",
      label: "Spectacle & Défis Extrêmes (Challenge & Stunt Entertainment)",
      tags: ["Défis Extrêmes", "Spectacle & Production", "Retention Maximale", "Concept Viral", "Grand Public"],
      titlePatterns: ['"I Spent [X] Hours in...", "Last to Leave [Place] Wins...", "$1 vs $1,000,000..."'],
    };
  }

  // 6. Gaming
  if (joinedText.match(/gameplay|minecraft|roblox|pokemon|gta|fortnite|hardcore|speedrun|gaming/)) {
    return {
      archetype: "gaming_challenges_entertainment",
      label: "Gaming, Défis & Divertissement",
      tags: ["Gaming", "Défis & Hardcore", "Mods & Gameplay", "Multiplayer"],
      titlePatterns: ['"100 Days...", "I beat [Game] but..."'],
    };
  }

  // 7. Science & Education
  if (joinedText.match(/science|physics|math|biology|space|nasa|quantum|experiment|veritasium|education/)) {
    return {
      archetype: "educational_science_engineering",
      label: "Vulgarisation Scientifique & Éducation",
      tags: ["Science", "Physique & Maths", "Expériences", "Éducation"],
      titlePatterns: ['"Why [Phenomenon] Happens", "The Paradox of..."'],
    };
  }

  return {
    archetype: "general_creator",
    label: "Créateur Généraliste & Divertissement",
    tags: ["Divertissement", "Créateur de Contenu", "Vlog / Lifestyle"],
    titlePatterns: ['Titres accrocheurs généralistes'],
  };
}

/**
 * Data Moat: Algorithmic Audience Demographics & Intent Profiling
 */
export function estimateAudienceDemographics(
  archetype: NicheEditorialArchetype,
  avgDuration: number,
  channelTitle: string,
  dominantWords: string[]
): import("@/types/competitorEngine").AudienceDemographicsProfile {
  const t = `${channelTitle} ${dominantWords.join(" ")}`.toLowerCase();

  // 1. High Adrenaline Spectacle (MrBeast, Airrack, Mark Rober, etc.)
  if (t.includes("beast") || t.includes("challenge") || t.includes("survive") || t.includes("extreme") || archetype === "gaming_challenges_entertainment") {
    return {
      primaryAgeBracket: "13-17",
      estimatedGenderSplit: { male: 68, female: 32 },
      intentArchetype: "High Adrenaline Spectacle",
      estimatedPacingRPM: "$3.50 - $7.00",
      geographicCore: ["US", "GB", "IN", "BR", "CA"],
      retentionSignature: "High Spike & Fast Cuts",
    };
  }

  // 2. Video Essay / Deep Investigation (Fern, Johnny Harris, Cipher, etc.)
  if (archetype === "video_essay_documentary" || archetype === "investigation_true_crime_mystery") {
    return {
      primaryAgeBracket: "25-34",
      estimatedGenderSplit: { male: 62, female: 38 },
      intentArchetype: "Deep Intellectual Curiosity",
      estimatedPacingRPM: "$8.00 - $14.00",
      geographicCore: ["US", "GB", "CA", "AU", "DE"],
      retentionSignature: "Narrative Cliffhangers",
    };
  }

  // 3. Finance & Business
  if (archetype === "finance_business_economics") {
    return {
      primaryAgeBracket: "25-34",
      estimatedGenderSplit: { male: 78, female: 22 },
      intentArchetype: "Skill & Practical Value",
      estimatedPacingRPM: "$8.00 - $14.00",
      geographicCore: ["US", "GB", "CA", "SG"],
      retentionSignature: "Slow Burn Longform",
    };
  }

  // 4. Tech & AI
  if (archetype === "tech_ai_software_reviews") {
    return {
      primaryAgeBracket: "18-24",
      estimatedGenderSplit: { male: 82, female: 18 },
      intentArchetype: "Skill & Practical Value",
      estimatedPacingRPM: "$8.00 - $14.00",
      geographicCore: ["US", "DE", "GB", "IN"],
      retentionSignature: "Slow Burn Longform",
    };
  }

  // Fallback Casual
  return {
    primaryAgeBracket: "18-24",
    estimatedGenderSplit: { male: 55, female: 45 },
    intentArchetype: "Casual Escapism",
    estimatedPacingRPM: "$3.50 - $7.00",
    geographicCore: ["US", "GB", "FR", "CA"],
    retentionSignature: "High Spike & Fast Cuts",
  };
}

/**
 * Generate targeted Competitor Graph queries based on Channel Identity
 */
export function generateCompetitorQueries(
  channelTitle: string,
  archetype: NicheEditorialArchetype,
  topVideoTitles: string[],
  dominantKeywords: string[]
): string[] {
  const queries = new Set<string>();

  // 1. Video-based competitor discovery: Find who else covered the EXACT same subjects/cases
  for (const title of topVideoTitles.slice(0, 4)) {
    const tokens = tokenize(title);
    if (tokens.length >= 3) {
      queries.add(`${tokens.slice(0, 4).join(" ")} documentary`);
    }
  }

  // 2. Archetype & Editorial Niche discovery
  if (archetype === "investigation_true_crime_mystery") {
    queries.add("mini documentary essay channel");
    queries.add("internet mystery documentary youtube");
    queries.add("unsolved case mini documentary");
    queries.add("Cipher Artium documentary");
    queries.add("creepy internet investigations");
  } else if (archetype === "video_essay_documentary") {
    queries.add("video essay documentary channels");
    queries.add("deep dive video essay storytelling");
    queries.add("cultural documentary video essay");
    queries.add("rise and fall documentary youtube");
  } else if (archetype === "finance_business_economics") {
    queries.add("business breakdown documentary");
    queries.add("company downfall documentary");
    queries.add("financial mini documentary channel");
  } else if (archetype === "tech_ai_software_reviews") {
    queries.add("tech documentary video essay");
    queries.add("ai tech deep dive channel");
    queries.add("silicon valley documentary");
  } else if (archetype === "gaming_challenges_entertainment") {
    const isMrBeastStyle = channelTitle.toLowerCase().includes("beast") || topVideoTitles.some((t) => t.toLowerCase().includes("survive") || t.toLowerCase().includes("hours in") || t.toLowerCase().includes("$"));
    if (isMrBeastStyle) {
      queries.add("extreme challenges entertainment channels");
      queries.add("survive 100 hours challenge youtube");
      queries.add("viral stunt challenge channels");
      queries.add("high production challenge videos");
    } else {
      queries.add("hardcore challenge gaming");
      queries.add("gaming video essay");
    }
  } else if (archetype === "educational_science_engineering") {
    queries.add("science documentary video essay");
    queries.add("physics engineering deep dive channel");
  }

  // 3. Dominant keywords cross search
  if (dominantKeywords.length >= 2) {
    queries.add(`${dominantKeywords[0]} ${dominantKeywords[1]} documentary essay`);
  }

  return Array.from(queries).slice(0, 8);
}

/**
 * Multi-factor Editorial Competitor Scoring Algorithm
 */
export function scoreCompetitorMatch(
  ref: ChannelEditorialProfile,
  candidate: {
    id: string;
    title: string;
    description: string;
    subscribers: number;
    typicalViews: number;
    avgDurationSeconds: number;
    videoTitles: string[];
  },
  coOccurrenceCount: number
): { score: number; breakdown: CompetitorSimilarityBreakdown } {
  // A. Editorial Archetype Match (35%)
  const candArchetype = classifyEditorialArchetype(
    candidate.videoTitles,
    candidate.description,
    candidate.avgDurationSeconds
  );

  let editorialArchetypeScore = 30;
  if (candArchetype.archetype === ref.archetype) {
    editorialArchetypeScore = 95;
  } else if (
    (ref.archetype === "investigation_true_crime_mystery" && candArchetype.archetype === "video_essay_documentary") ||
    (ref.archetype === "video_essay_documentary" && candArchetype.archetype === "investigation_true_crime_mystery")
  ) {
    editorialArchetypeScore = 80;
  }

  // B. Semantic Topic Overlap (25%)
  const refTokens = new Set(tokenize(ref.recentVideos.map((v) => v.title).join(" ")));
  const candTokens = new Set(tokenize(candidate.videoTitles.join(" ")));
  const shared: string[] = [];

  for (const t of refTokens) {
    if (candTokens.has(t)) shared.push(t);
  }

  const topicOverlapRatio = refTokens.size > 0 ? shared.length / Math.min(refTokens.size, candTokens.size) : 0;
  const semanticTopicScore = Math.min(100, Math.round(topicOverlapRatio * 150 + shared.length * 6 + coOccurrenceCount * 12));

  // C. Title Formula / Pacing Score (15%)
  let titleFormulaScore = 40;
  const hasTheFormula = candidate.videoTitles.some((t) => t.toLowerCase().startsWith("the "));
  const refHasTheFormula = ref.recentVideos.some((v) => v.title.toLowerCase().startsWith("the "));
  if (hasTheFormula && refHasTheFormula) titleFormulaScore += 30;

  const hasWhyFormula = candidate.videoTitles.some((t) => t.toLowerCase().startsWith("why "));
  const refHasWhyFormula = ref.recentVideos.some((v) => v.title.toLowerCase().startsWith("why "));
  if (hasWhyFormula && refHasWhyFormula) titleFormulaScore += 25;
  titleFormulaScore = Math.min(100, titleFormulaScore);

  // D. Format & Duration Pacing (15%)
  let formatPacingScore = 50;
  if (ref.avgDurationSeconds > 0 && candidate.avgDurationSeconds > 0) {
    const ratio = Math.min(ref.avgDurationSeconds, candidate.avgDurationSeconds) /
      Math.max(ref.avgDurationSeconds, candidate.avgDurationSeconds);
    formatPacingScore = Math.round(ratio * 100);
  }

  // E. Audience Scale Alignment (10%)
  let audienceScaleScore = 50;
  if (ref.subscriberCount > 0 && candidate.subscribers > 0) {
    const logDiff = Math.abs(Math.log10(ref.subscriberCount) - Math.log10(candidate.subscribers));
    audienceScaleScore = Math.max(20, Math.min(100, Math.round(100 - logDiff * 20)));
  }

  // Weighted Score
  const totalScore = Math.round(
    editorialArchetypeScore * 0.35 +
    semanticTopicScore * 0.25 +
    titleFormulaScore * 0.15 +
    formatPacingScore * 0.15 +
    audienceScaleScore * 0.10
  );

  const finalScore = Math.min(99, Math.max(25, totalScore));

  const explanation = `${candArchetype.label} • Formats de durée comparables (~${Math.round(candidate.avgDurationSeconds / 60)} min) avec une formule éditoriale axée sur ${shared.slice(0, 3).join(", ") || "le storytelling"}.`;

  return {
    score: finalScore,
    breakdown: {
      editorialArchetypeScore,
      semanticTopicScore,
      titleFormulaScore,
      formatPacingScore,
      audienceScaleScore,
      sharedTopics: shared.slice(0, 6),
      comparableExplanations: explanation,
    },
  };
}

/**
 * End-to-End Competitor Discovery Engine
 */
export async function discoverTrueCompetitors(channelInput: string): Promise<SimilarChannelsEngineResponse> {
  const startTime = Date.now();
  const apiKey = getApiKey();

  // Stage A: Resolve Channel ID
  const channelId = await resolveChannelId(channelInput);

  // Fetch Reference Channel
  const cRes = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics,brandingSettings&id=${channelId}&key=${apiKey}`,
    { next: { revalidate: 3600 } }
  );
  const cData = await cRes.json();
  const refItem = cData.items?.[0];
  if (!refItem) throw new Error("Chaîne de référence introuvable.");

  const uploadsId = refItem.contentDetails?.relatedPlaylists?.uploads;
  const subs = refItem.statistics?.hiddenSubscriberCount ? -1 : parseInt(refItem.statistics?.subscriberCount || "0", 10);
  const totalViews = parseInt(refItem.statistics?.viewCount || "0", 10);
  const videoCount = parseInt(refItem.statistics?.videoCount || "1", 10);

  // Fetch 15 Recent Videos of Reference Channel
  let recentVideos: any[] = [];
  if (uploadsId) {
    try {
      const pRes = await fetch(
        `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=15&key=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      const pData = await pRes.json();
      const vIds = (pData.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);

      if (vIds.length > 0) {
        const vRes = await fetch(
          `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${vIds.join(",")}&key=${apiKey}`,
          { next: { revalidate: 3600 } }
        );
        const vData = await vRes.json();
        recentVideos = (vData.items || []).map((v: any) => {
          const dur = parseISO8601Duration(v.contentDetails?.duration);
          return {
            id: v.id,
            title: v.snippet?.title || "",
            thumbnail: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || "",
            publishedAt: v.snippet?.publishedAt,
            views: parseInt(v.statistics?.viewCount || "0", 10),
            durationFormatted: dur.formatted,
            durationSeconds: dur.seconds,
          };
        });
      }
    } catch {}
  }

  // Calculate Reference Pacing & Metrics
  const viewCounts = recentVideos.map((v) => v.views);
  const typicalViews = viewCounts.length > 0
    ? Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length)
    : Math.round(totalViews / Math.max(videoCount, 1));

  const durations = recentVideos.map((v) => v.durationSeconds).filter(Boolean);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 900;
  const avgDurationFormatted = parseISO8601Duration(`PT${avgDuration}S`).formatted;

  const refTitles = recentVideos.map((v) => v.title);
  const archetypeInfo = classifyEditorialArchetype(
    refTitles,
    refItem.snippet?.description || "",
    avgDuration
  );

  const dominantTokens = tokenize(refTitles.join(" ")).slice(0, 10);

  const referenceProfile: ChannelEditorialProfile = {
    id: refItem.id,
    title: refItem.snippet?.title || "Chaîne",
    handle: refItem.snippet?.customUrl || `@${(refItem.snippet?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
    avatar: refItem.snippet?.thumbnails?.medium?.url || refItem.snippet?.thumbnails?.default?.url || "",
    banner: refItem.brandingSettings?.image?.bannerExternalUrl,
    description: refItem.snippet?.description || "",
    publishedAt: refItem.snippet?.publishedAt || "",
    country: refItem.snippet?.country,
    subscriberCount: subs,
    totalViews,
    videoCount,
    archetype: archetypeInfo.archetype,
    archetypeLabel: archetypeInfo.label,
    editorialTags: archetypeInfo.tags,
    titleFormulaStyle: archetypeInfo.titlePatterns,
    typicalViews,
    avgDurationSeconds: avgDuration,
    avgDurationFormatted,
    uploadFrequencyDays: 14,
    longformRatio: recentVideos.filter((v) => v.durationSeconds >= 600).length / Math.max(recentVideos.length, 1),
    recentVideos,
  };

  // Stage C & D: Multi-Query Exploration on Video Topic Clusters (Co-occurrence graph)
  const queries = generateCompetitorQueries(
    refItem.snippet?.title,
    archetypeInfo.archetype,
    refTitles,
    dominantTokens
  );

  const channelCoOccurrenceMap = new Map<string, number>();

  await Promise.all(
    queries.map(async (q) => {
      try {
        const sRes = await fetch(
          `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(q)}&maxResults=20&key=${apiKey}`,
          { next: { revalidate: 3600 } }
        );
        const sData = await sRes.json();
        for (const item of sData.items || []) {
          const cid = item.snippet?.channelId;
          if (cid && cid !== channelId) {
            channelCoOccurrenceMap.set(cid, (channelCoOccurrenceMap.get(cid) || 0) + 1);
          }
        }
      } catch {}
    })
  );

  // Take top candidates by co-occurrence count (highest appearing in the niche graph)
  const rankedCandidateIds = Array.from(channelCoOccurrenceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([cid]) => cid);

  // Batch fetch candidate channels info
  let candidateChannelsData: any[] = [];
  if (rankedCandidateIds.length > 0) {
    const cBatchRes = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics&id=${rankedCandidateIds.join(",")}&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    const cBatch = await cBatchRes.json();
    candidateChannelsData = cBatch.items || [];
  }

  // Stage E: Evaluate Candidate Videos and Score Match
  const competitors: CompetitorChannel[] = await Promise.all(
    candidateChannelsData.map(async (cand) => {
      const cSubs = cand.statistics?.hiddenSubscriberCount ? -1 : parseInt(cand.statistics?.subscriberCount || "0", 10);
      const cTotalViews = parseInt(cand.statistics?.viewCount || "0", 10);
      const cVideoCount = parseInt(cand.statistics?.videoCount || "1", 10);
      const cUploads = cand.contentDetails?.relatedPlaylists?.uploads;

      let cVideos: any[] = [];
      if (cUploads) {
        try {
          const pRes = await fetch(
            `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${cUploads}&maxResults=6&key=${apiKey}`,
            { next: { revalidate: 3600 } }
          );
          const pData = await pRes.json();
          const ids = (pData.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);

          if (ids.length > 0) {
            const vStatsRes = await fetch(
              `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${ids.join(",")}&key=${apiKey}`,
              { next: { revalidate: 3600 } }
            );
            const vStats = await vStatsRes.json();
            cVideos = (vStats.items || []).map((v: any) => {
              const dur = parseISO8601Duration(v.contentDetails?.duration);
              return {
                id: v.id,
                title: v.snippet?.title || "",
                thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || "",
                publishedAt: v.snippet?.publishedAt,
                views: parseInt(v.statistics?.viewCount || "0", 10),
                durationFormatted: dur.formatted,
                durationSeconds: dur.seconds,
              };
            });
          }
        } catch {}
      }

      const cTypicalViews = cVideos.length > 0
        ? Math.round(cVideos.reduce((a, b) => a + b.views, 0) / cVideos.length)
        : Math.round(cTotalViews / Math.max(cVideoCount, 1));

      const cDurations = cVideos.map((v) => v.durationSeconds).filter(Boolean);
      const cAvgDuration = cDurations.length > 0
        ? Math.round(cDurations.reduce((a, b) => a + b, 0) / cDurations.length)
        : 900;

      const coCount = channelCoOccurrenceMap.get(cand.id) || 1;

      const candArchetype = classifyEditorialArchetype(
        cVideos.map((v) => v.title),
        cand.snippet?.description || "",
        cAvgDuration
      );

      const { score, breakdown } = scoreCompetitorMatch(
        referenceProfile,
        {
          id: cand.id,
          title: cand.snippet?.title || "",
          description: cand.snippet?.description || "",
          subscribers: cSubs,
          typicalViews: cTypicalViews,
          avgDurationSeconds: cAvgDuration,
          videoTitles: cVideos.map((v) => v.title),
        },
        coCount
      );

      return {
        channel: {
          id: cand.id,
          title: cand.snippet?.title || "Chaîne",
          handle: cand.snippet?.customUrl || `@${(cand.snippet?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          avatar: cand.snippet?.thumbnails?.medium?.url || cand.snippet?.thumbnails?.default?.url || "",
          description: cand.snippet?.description || "",
          country: cand.snippet?.country,
          subscriberCount: cSubs,
          totalViews: cTotalViews,
          videoCount: cVideoCount,
          typicalViews: cTypicalViews,
          archetype: candArchetype.archetype,
          archetypeLabel: candArchetype.label,
        },
        similarityScore: score,
        breakdown,
        coOccurrenceCount: coCount,
        audienceDemographics: estimateAudienceDemographics(
          candArchetype.archetype,
          cAvgDuration,
          cand.snippet?.title || "",
          tokenize(cVideos.map((v) => v.title).join(" "))
        ),
        audienceOverlapRatio: Math.min(98, Math.max(25, Math.round(score * 0.92 + coCount * 3))),
        packagingSimilarity: Math.min(95, Math.max(30, Math.round((breakdown.titleFormulaScore + breakdown.editorialArchetypeScore) / 2))),
        topSimilarVideos: cVideos.slice(0, 3),
        discoverySource: coCount >= 3 ? "co_occurrence" : "editorial_graph",
      };
    })
  );

  // Reference Demographics estimation
  const refDemographics = estimateAudienceDemographics(
    archetypeInfo.archetype,
    avgDuration,
    refItem.snippet?.title || "",
    dominantTokens
  );

  // Sort descending by Similarity Score
  competitors.sort((a, b) => b.similarityScore - a.similarityScore);

  // Persist to Continuous Unified Intelligence Database
  try {
    const { 
      upsertUnifiedChannel, 
      upsertChannelDna, 
      saveChannelRelationship,
      upsertUnifiedVideo 
    } = await import("./intelligenceDb");

    // 1. Save reference channel
    upsertUnifiedChannel({
      id: referenceProfile.id,
      name: referenceProfile.title,
      handle: referenceProfile.handle,
      description: referenceProfile.description,
      thumbnailUrl: referenceProfile.avatar,
      avatarUrl: referenceProfile.avatar,
      subscriberCount: referenceProfile.subscriberCount,
      totalViews: referenceProfile.totalViews,
      videoCount: referenceProfile.videoCount,
      discoverySource: "similar_expansion",
    });

    // 2. Save reference DNA
    upsertChannelDna({
      channelId: referenceProfile.id,
      primaryNiche: archetypeInfo.label,
      secondaryNiches: archetypeInfo.tags,
      contentPillars: archetypeInfo.tags,
      dominantVideoFormats: avgDuration >= 600 ? ["documentary", "longform_essay"] : ["reaction_review"],
      editorialCharacteristics: archetypeInfo.titlePatterns,
      language: referenceProfile.country || "en",
      representativeVideoIds: recentVideos.slice(0, 5).map((v) => v.id),
      classificationConfidence: 0.95,
      analysisVersion: "v2.0",
      lastAnalysisDate: new Date().toISOString(),
      archetype: archetypeInfo.archetype,
      archetypeLabel: archetypeInfo.label,
      typicalViews,
      typicalDurationSeconds: avgDuration,
      uploadFrequencyDays: 14,
    });

    // 3. Save competitor channels & relationships
    for (const comp of competitors) {
      upsertUnifiedChannel({
        id: comp.channel.id,
        name: comp.channel.title,
        handle: comp.channel.handle,
        description: comp.channel.description,
        thumbnailUrl: comp.channel.avatar,
        avatarUrl: comp.channel.avatar,
        subscriberCount: comp.channel.subscriberCount,
        totalViews: comp.channel.totalViews,
        videoCount: comp.channel.videoCount,
        discoverySource: "similar_expansion",
      });

      saveChannelRelationship({
        sourceChannelId: referenceProfile.id,
        targetChannelId: comp.channel.id,
        similarityScore: comp.similarityScore,
        relationshipType: comp.similarityScore >= 80 ? "direct_competitor" : "niche_peer",
        sharedTopics: comp.breakdown.sharedTopics,
        coOccurrenceCount: comp.coOccurrenceCount,
        lastCalculated: new Date().toISOString(),
      });

      for (const tv of comp.topSimilarVideos) {
        upsertUnifiedVideo({
          id: tv.id,
          channelId: comp.channel.id,
          title: tv.title,
          thumbnailUrl: tv.thumbnail,
          publishedAt: tv.publishedAt,
          durationFormatted: tv.durationFormatted,
          durationSeconds: (tv as any).durationSeconds || 0,
          viewCount: tv.views,
        });
      }
    }
  } catch (persistErr) {
    console.error("[SimilarChannels] Persist to intelligence db error:", persistErr);
  }

  return {
    reference: {
      ...referenceProfile,
      demographics: refDemographics,
    },
    competitors,
    totalCandidatesEvaluated: rankedCandidateIds.length,
    editorialSignature: {
      archetype: archetypeInfo.label,
      keyThemes: archetypeInfo.tags,
      titlePatterns: archetypeInfo.titlePatterns,
      avgDuration: avgDurationFormatted,
    },
    executionTimeMs: Date.now() - startTime,
  };
}
