/**
 * YouTube Monetization & Revenue Estimation Engine
 * Calculates estimated RPM, Monthly Revenue range, and Annual Earnings
 * based on channel niche, geography, content format, video duration, and views velocity.
 */

export interface NicheRpmBenchmark {
  niche: string;
  category: string;
  minRpm: number; // in USD per 1,000 views
  avgRpm: number;
  maxRpm: number;
  description: string;
}

export const NICHE_RPM_BENCHMARKS: Record<string, NicheRpmBenchmark> = {
  "finance": {
    niche: "Finance, Crypto & Investing",
    category: "Finance",
    minRpm: 8.0,
    avgRpm: 14.5,
    maxRpm: 32.0,
    description: "Sujets à très haute valeur commerciale (trading, immobilier, banque, SaaS).",
  },
  "business": {
    niche: "Business, SaaS & Side Hustle",
    category: "Business",
    minRpm: 6.5,
    avgRpm: 11.0,
    maxRpm: 22.0,
    description: "Public d'entrepreneurs et de professionnels avec fort pouvoir d'achat.",
  },
  "tech": {
    niche: "AI Tools, Tech & Software",
    category: "Education & science",
    minRpm: 4.5,
    avgRpm: 8.5,
    maxRpm: 18.0,
    description: "Annonceurs B2B technologiques, outils de productivité et cours IA.",
  },
  "education": {
    niche: "Education & Science",
    category: "Education & science",
    minRpm: 3.5,
    avgRpm: 6.5,
    maxRpm: 12.0,
    description: "Documentaires scientifiques, ingénierie et vulgarisation intellectuelle.",
  },
  "autos": {
    niche: "Autos & Supercars",
    category: "Autos",
    minRpm: 4.0,
    avgRpm: 7.0,
    maxRpm: 14.0,
    description: "Assurances, accessoires automobiles et concessions haut de gamme.",
  },
  "true_crime": {
    niche: "True Crime & Mysteries",
    category: "True crime",
    minRpm: 2.8,
    avgRpm: 5.2,
    maxRpm: 9.5,
    description: "Forte durée de visionnage (format long) mais restrictions occasionnelles sur la violence.",
  },
  "history": {
    niche: "History & Documentaries",
    category: "History",
    minRpm: 3.0,
    avgRpm: 5.5,
    maxRpm: 10.0,
    description: "Rétention très élevée sur des formats documentaires de plus de 20 minutes.",
  },
  "gaming": {
    niche: "Gaming & Challenges",
    category: "Gaming",
    minRpm: 1.5,
    avgRpm: 3.2,
    maxRpm: 6.5,
    description: "Fort volume de vues compensant un RPM modéré. Matériel et jeux partenaires.",
  },
  "entertainment": {
    niche: "Celebrity & Entertainment",
    category: "Celebrity & entertainment",
    minRpm: 1.8,
    avgRpm: 3.8,
    maxRpm: 7.5,
    description: "Audience très large et virale avec monétisation grand public.",
  },
  "comedy": {
    niche: "Comedy & Memes",
    category: "Comedy & memes",
    minRpm: 1.2,
    avgRpm: 2.6,
    maxRpm: 5.0,
    description: "Vidéos courtes ou moyennes à fort taux de partage mais RPM publicitaire moyen.",
  },
  "sports": {
    niche: "Sports & Fitness",
    category: "Sports",
    minRpm: 2.5,
    avgRpm: 4.8,
    maxRpm: 9.0,
    description: "Nutrition sportive, équipementiers et paris sportifs.",
  },
  "general": {
    niche: "General Knowledge & Documentaries",
    category: "All Categories",
    minRpm: 2.5,
    avgRpm: 4.5,
    maxRpm: 8.5,
    description: "Audience générale équilibrée sur YouTube.",
  },
};

export interface ChannelRevenueEstimation {
  detectedNicheKey: string;
  detectedNicheLabel: string;
  estimatedRpm: {
    min: number;
    avg: number;
    max: number;
  };
  monthlyViews: number;
  estimatedMonthlyEarnings: {
    min: number;
    avg: number;
    max: number;
  };
  estimatedAnnualEarnings: {
    min: number;
    avg: number;
    max: number;
  };
  isMonetizedLikely: boolean;
  monetizationConfidence: "High" | "Medium" | "Low";
  monetizationCriteria: {
    has1kSubs: boolean;
    hasSufficientViews: boolean;
  };
  assumptions: string[];
}

/**
 * Detect niche key from channel title, description and recent video titles
 */
export function detectChannelNicheKey(
  channelTitle: string,
  description: string,
  sampleTitles: string[] = []
): string {
  const text = `${channelTitle} ${description} ${sampleTitles.join(" ")}`.toLowerCase();

  if (/trading|crypto|bitcoin|invest|bourse|finance|money|patrimoine|dividendes|wealth/i.test(text)) {
    return "finance";
  }
  if (/business|saas|e-commerce|shopify|dropship|side hustle|freelance|marketing|agence/i.test(text)) {
    return "business";
  }
  if (/ai |artificial intelligence|software|coding|python|automation|tech|gadgets|developer/i.test(text)) {
    return "tech";
  }
  if (/crime|murder|police|enqu[eê]te|killer|cold case|fbi|interrogatoire|disparition/i.test(text)) {
    return "true_crime";
  }
  if (/history|histoire|ancient|guerre|empire|ww2|century|rome|civilization/i.test(text)) {
    return "history";
  }
  if (/supercar|ferrari|bmw|moteur|tuning|voiture|automobile|restauration|mechanic/i.test(text)) {
    return "autos";
  }
  if (/minecraft|roblox|gta|fortnite|gaming|gameplay|nintendo|zelda|esports|speedrun/i.test(text)) {
    return "gaming";
  }
  if (/sports|football|nba|fitness|bodybuilding|mma|ufc|musculation|soccer/i.test(text)) {
    return "sports";
  }
  if (/science|space|physique|univers|astronomie|nasa|biologie|math/i.test(text)) {
    return "education";
  }
  if (/meme|comedy|blague|humour|prank|drole/i.test(text)) {
    return "comedy";
  }
  if (/drama|streamer|mrbeast|ishowspeed|celebrity|célébrité|interview|vlog/i.test(text)) {
    return "entertainment";
  }
  return "general";
}

/**
 * Compute revenue estimations for a given channel based on monthly views and niche benchmarks
 */
export function estimateChannelRevenue(channel: {
  subscriberCount?: number;
  viewCount: number;
  videoCount: number;
  publishedAt?: string;
  title: string;
  description?: string;
}, recentVideos: { viewCount: number; publishedAt: string; durationSeconds?: number }[] = []): ChannelRevenueEstimation {
  const nicheKey = detectChannelNicheKey(
    channel.title,
    channel.description || "",
    recentVideos.map(v => (v as any).title || "")
  );

  const benchmark = NICHE_RPM_BENCHMARKS[nicheKey] || NICHE_RPM_BENCHMARKS["general"];

  // Calculate Monthly Views velocity
  const now = Date.now();
  const ONE_DAY_MS = 86400000;
  const thirtyDaysAgo = now - 30 * ONE_DAY_MS;

  // 1. Direct recent videos published in the last 30 days
  const recent30dVideos = recentVideos.filter(v => new Date(v.publishedAt).getTime() >= thirtyDaysAgo);
  const viewsFromNewUploads30d = recent30dVideos.reduce((acc, v) => acc + v.viewCount, 0);

  // 2. Extrapolate monthly views:
  // If recentVideos sample is provided, calculate average views per day across recent videos
  let estimatedMonthlyViews = 0;
  if (recentVideos.length >= 3) {
    const oldestSampleDate = new Date(recentVideos[recentVideos.length - 1].publishedAt).getTime();
    const daysSpan = Math.max((now - oldestSampleDate) / ONE_DAY_MS, 5);
    const sampleTotalViews = recentVideos.reduce((acc, v) => acc + v.viewCount, 0);
    const dailyVelocity = sampleTotalViews / daysSpan;
    estimatedMonthlyViews = Math.round(dailyVelocity * 30);
  } else if (channel.videoCount > 0 && channel.publishedAt) {
    // Fallback: lifetime average scaled to active channel
    const channelAgeDays = Math.max((now - new Date(channel.publishedAt).getTime()) / ONE_DAY_MS, 30);
    const lifetimeDailyViews = channel.viewCount / channelAgeDays;
    estimatedMonthlyViews = Math.round(lifetimeDailyViews * 30);
  } else {
    estimatedMonthlyViews = Math.round(channel.viewCount * 0.05); // rough 5% per month
  }

  // Ensure minimum baseline
  estimatedMonthlyViews = Math.max(estimatedMonthlyViews, viewsFromNewUploads30d);

  // Check monetization eligibility (YouTube Partner Program requires 1,000 subscribers)
  const subs = channel.subscriberCount || 0;
  const has1kSubs = subs >= 1000;
  const hasSufficientViews = estimatedMonthlyViews >= 5000;
  const isMonetizedLikely = has1kSubs && hasSufficientViews;
  const monetizationConfidence = has1kSubs && subs >= 10000 ? "High" : has1kSubs ? "Medium" : "Low";

  // Calculate Earnings (Views / 1000 * RPM)
  const minEarnMonthly = Math.round((estimatedMonthlyViews / 1000) * benchmark.minRpm);
  const avgEarnMonthly = Math.round((estimatedMonthlyViews / 1000) * benchmark.avgRpm);
  const maxEarnMonthly = Math.round((estimatedMonthlyViews / 1000) * benchmark.maxRpm);

  return {
    detectedNicheKey: nicheKey,
    detectedNicheLabel: benchmark.niche,
    estimatedRpm: {
      min: benchmark.minRpm,
      avg: benchmark.avgRpm,
      max: benchmark.maxRpm,
    },
    monthlyViews: estimatedMonthlyViews,
    estimatedMonthlyEarnings: {
      min: minEarnMonthly,
      avg: avgEarnMonthly,
      max: maxEarnMonthly,
    },
    estimatedAnnualEarnings: {
      min: minEarnMonthly * 12,
      avg: avgEarnMonthly * 12,
      max: maxEarnMonthly * 12,
    },
    isMonetizedLikely,
    monetizationConfidence,
    monetizationCriteria: {
      has1kSubs,
      hasSufficientViews,
    },
    assumptions: [
      `RPM estimé à $${benchmark.avgRpm.toFixed(1)}/1k vues pour la niche "${benchmark.niche}".`,
      `Basé sur une vélocité mensuelle d'environ ${estimatedMonthlyViews.toLocaleString()} vues/mois.`,
      `Hors sponsors directs, merchandising et affiliations (revenus Adsense purs).`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Ad revenue from scanner data — only for channels whose ads were actually seen
// ---------------------------------------------------------------------------

/** YouTube category → niche, used when the titles don't give the niche away. */
const CATEGORY_NICHE: Record<number, string> = {
  1: "entertainment",
  2: "autos",
  10: "entertainment",
  17: "sports",
  20: "gaming",
  22: "entertainment",
  23: "comedy",
  24: "entertainment",
  26: "education",
  27: "education",
  28: "tech",
};

/**
 * RPM of the audience's market relative to the benchmarks above (US-weighted).
 * The language is the best proxy we have for where the viewers are.
 */
const LANGUAGE_RPM_FACTOR: Record<string, number> = {
  en: 1,
  de: 0.85,
  nl: 0.75,
  ja: 0.7,
  fr: 0.6,
  ko: 0.6,
  it: 0.5,
  pl: 0.35,
  es: 0.35,
  ar: 0.3,
  pt: 0.3,
  tr: 0.2,
  ru: 0.15,
  id: 0.15,
  hi: 0.12,
};
const DEFAULT_LANGUAGE_FACTOR = 0.5;

/** Shorts are paid from a shared pool: roughly $0.03–0.10 per 1,000 views, whatever the niche. */
const SHORTS_RPM = { min: 0.03, avg: 0.06, max: 0.1 };

type Range = { min: number; avg: number; max: number };

export interface AdRevenueEstimate {
  /** "unknown" until the scan worker has read the channel's ad status. */
  status: "monetized" | "not_monetized" | "unknown";
  nicheKey: string;
  nicheLabel: string;
  /** Blended RPM in USD per 1,000 views, after market and Shorts adjustments. */
  rpm: Range;
  dailyViews: number | null;
  daily: Range | null;
  monthly: Range | null;
}

export function estimateAdRevenue(input: {
  monetized: boolean | null;
  name: string;
  titles: string[];
  categoryId: number | null;
  language: string | null;
  /** Views the whole channel gains per day (snapshots), or null if not known yet. */
  dailyViews: number | null;
  /** Share of recent views that come from Shorts, 0–1. */
  shortsViewShare: number;
}): AdRevenueEstimate {
  let nicheKey = detectChannelNicheKey(input.name, "", input.titles);
  if (nicheKey === "general" && input.categoryId != null) nicheKey = CATEGORY_NICHE[input.categoryId] ?? "general";
  const benchmark = NICHE_RPM_BENCHMARKS[nicheKey] ?? NICHE_RPM_BENCHMARKS.general;

  const market = LANGUAGE_RPM_FACTOR[input.language?.split("-")[0] ?? ""] ?? DEFAULT_LANGUAGE_FACTOR;
  const shorts = Math.min(1, Math.max(0, input.shortsViewShare));
  const blend = (long: number, short: number) => Math.round(((1 - shorts) * long * market + shorts * short) * 100) / 100;
  const rpm = {
    min: blend(benchmark.minRpm, SHORTS_RPM.min),
    avg: blend(benchmark.avgRpm, SHORTS_RPM.avg),
    max: blend(benchmark.maxRpm, SHORTS_RPM.max),
  };

  const status = input.monetized === true ? "monetized" : input.monetized === false ? "not_monetized" : "unknown";
  const dailyViews = input.dailyViews != null ? Math.max(0, input.dailyViews) : null;
  const earn = (days: number): Range | null =>
    status === "monetized" && dailyViews != null
      ? {
          min: Math.round((dailyViews * days * rpm.min) / 1000),
          avg: Math.round((dailyViews * days * rpm.avg) / 1000),
          max: Math.round((dailyViews * days * rpm.max) / 1000),
        }
      : null;

  return { status, nicheKey, nicheLabel: benchmark.niche, rpm, dailyViews, daily: earn(1), monthly: earn(30) };
}
