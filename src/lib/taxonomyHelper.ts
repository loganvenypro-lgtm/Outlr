/**
 * Algrow & 1of10 Taxonomy & Subject Extraction Engine
 * Infers Category, Niche, Sub-niche, Clean Subject and Title Format
 */

import { classifyTitle, type NicheId } from "./nicheClassifier";

export const ALGROW_CATEGORIES = [
  "All Categories",
  "Tutorial",
  "Educational",
  "Documentary",
  "Gaming",
  "Reviews",
  "Commentary",
  "Compilation",
  "Stories",
  "Interview",
  "Challenge Videos",
  "DIY",
  "Speeches",
  "Memes",
  "News",
] as const;

export const ALGROW_NICHES = [
  "Any niche",
  "Business & e-commerce",
  "Finance & investing",
  "News & politics",
  "Stories & drama",
  "Gaming",
  "Sports",
  "Celebrity & entertainment",
  "History",
  "Religion & spirituality",
  "Comedy & memes",
  "True crime",
  "Education & science",
  "Autos",
] as const;

export const ALGROW_SUB_NICHES: Record<string, string[]> = {
  "All Sub-Niches": [],
  "Any niche": [
    "Internet Personalities",
    "Minecraft & SMP",
    "True Crime & Mystery",
    "Science Explained",
    "SupercSars & Mechanics",
    "Reddit Stories",
    "Gaming Documentaries",
    "Historical Deep Dives",
  ],
  "Business & e-commerce": ["Dropshipping & E-commerce", "Ads & Media Buying", "Marketing & Copywriting", "Make Money Online", "Agency & Entrepreneurship"],
  "Finance & investing": ["Stock Market", "Crypto", "Real Estate", "Personal Finance", "Economy"],
  "News & politics": ["Global Politics", "Elections", "War & Conflicts", "Geopolitics", "Law & Court"],
  "Stories & drama": ["Reddit Stories", "Confessions", "Family Drama", "Cheating & Relationships", "Mysteries"],
  "Gaming": ["Minecraft & SMP", "Roblox & Challenges", "Gaming Documentaries", "Speedruns & Lore", "FPS & Esports"],
  "Sports": ["Football & Soccer", "Basketball & NBA", "UFC & Boxing", "Athletes & Stories", "Extreme Sports"],
  "Celebrity & entertainment": ["Internet Personalities", "Streamers & Drama", "Creator Documentaries", "Pop Culture", "Controversies"],
  "History": ["Historical Deep Dives", "Ancient Civilizations", "WW2 & Battles", "Empires & Kings", "Lost Relics"],
  "Religion & spirituality": ["Spiritual Philosophy", "Biblical Mysteries", "Meditation & Monks", "Faith Stories"],
  "Comedy & memes": ["Memes & Viral Humor", "Skits & Parodies", "Try Not to Laugh", "Irony & Commentary"],
  "True crime": ["True Crime & Mystery", "Cold Cases & Missing", "Unsolved Mysteries", "Criminal Psychology", "Police Interrogations"],
  "Education & science": ["Science Explained", "Physics & Space", "AI Tools & Automation", "Engineering Marvels", "Psychology"],
  "Autos": ["Supercars & Mechanics", "Car Restorations", "Tuning & Racing", "Luxury Vehicles", "Electric & Future Cars"],
};

export function inferVideoCategory(title: string): string {
  const t = (title || "").toLowerCase();
  if (/tutorial|how to|guide|step by step|tips|tuto|comment/i.test(t)) return "Tutorial";
  if (/challenge|survived|100 days|24 hours|impossible|survie|défi/i.test(t)) return "Challenge Videos";
  if (/documentary|investigation|iceberg|rabbit hole|rise and fall|downfall|the story of|truth about|enquête/i.test(t)) return "Documentary";
  if (/review|tested|critique|avis|unboxing|worth it/i.test(t)) return "Reviews";
  if (/interview|podcast|talks with|conversation|interviewed/i.test(t)) return "Interview";
  if (/reaction|reacts|exposed|response|drama|commentary/i.test(t)) return "Commentary";
  if (/compilation|best of|moments|highlights|fails|wins/i.test(t)) return "Compilation";
  if (/diy|craft|woodworking|restoration|build|handmade|fabriquer/i.test(t)) return "DIY";
  if (/speech|motivation|discipline|rules|mindset|discours/i.test(t)) return "Speeches";
  if (/meme|funny|try not to laugh|shitpost|yall/i.test(t)) return "Memes";
  if (/breaking|news|update|announcement|alert|dernière minute/i.test(t)) return "News";
  if (/story|reddit|stories|confession|what happened|historia|conte/i.test(t)) return "Stories";
  if (/science|physics|math|biology|history|ancient|learn|explained|cours/i.test(t)) return "Educational";
  if (/minecraft|roblox|gta|fortnite|game|gaming|speedrun|pokemon|zelda|smp/i.test(t)) return "Gaming";
  // Business / money / tech advice without a "how to" is still educational, not a documentary.
  const niche = classifyTitle(title);
  if (niche === "business_ecommerce" || niche === "finance_investing" || niche === "tech_ai") return "Educational";
  return "Documentary";
}

const NICHE_TO_ALGROW: Partial<Record<NicheId, string>> = {
  business_ecommerce: "Business & e-commerce",
  finance_investing: "Finance & investing",
  tech_ai: "Education & science",
  science_education: "Education & science",
  true_crime: "True crime",
  documentary_history: "History",
  gaming: "Gaming",
  challenge_entertainment: "Celebrity & entertainment",
  sports: "Sports",
  news_politics: "News & politics",
  autos: "Autos",
  comedy: "Comedy & memes",
  stories_drama: "Stories & drama",
};

export function inferVideoNiche(title: string, rawQuery?: string): string {
  // Weighted, word-boundary classifier first (the regexes below match substrings,
  // e.g. "ai" in "said" or "war" in "software"), the title alone before its context.
  const classified = classifyTitle(title) ?? classifyTitle(title, rawQuery);
  const mapped = classified ? NICHE_TO_ALGROW[classified] : undefined;
  if (mapped) return mapped;

  const t = `${title || ""} ${rawQuery || ""}`.toLowerCase();
  if (/crime|mystery|killer|dark|murder|unsolved|police|detective|investigation|creepy/i.test(t)) return "True crime";
  if (/politics|election|president|war|government|news|court|senate|trump|biden|putin|geopolitics/i.test(t)) return "News & politics";
  if (/minecraft|roblox|gta|fortnite|speedrun|game|gaming|nintendo|zelda|smp|valve|steam/i.test(t)) return "Gaming";
  if (/football|soccer|nba|basketball|sports|athlete|olympics|boxe|ufc|mma|goal|champion/i.test(t)) return "Sports";
  if (/ishowspeed|mrbeast|kai cenat|logan paul|streamer|celebrity|youtuber|actor|hollywood|pop culture/i.test(t)) return "Celebrity & entertainment";
  if (/history|ancient|roman|empire|ww2|war|medieval|egypt|century|historical/i.test(t)) return "History";
  if (/god|jesus|bible|quran|religion|spirituality|buddha|faith|prayer|monk/i.test(t)) return "Religion & spirituality";
  if (/car|supercar|ferrari|bmw|engine|motor|auto|vehicle|drive|tuning|truck/i.test(t)) return "Autos";
  if (/meme|comedy|funny|humor|joke|prank|laugh/i.test(t)) return "Comedy & memes";
  if (/science|physics|space|nasa|mars|universe|quantum|biology|math|tech|ai|technology/i.test(t)) return "Education & science";
  if (/story|drama|cheating|relationship|reddit|confession|family|secrets/i.test(t)) return "Stories & drama";
  return "Celebrity & entertainment";
}

export interface VideoTaxonomy {
  category: string;
  niche: string;
  subNiche: string;
  subject: string;
  titleFormat: string;
}

export function inferVideoTaxonomy(video: {
  title: string;
  category?: string;
  subNiche?: string;
  titlePattern?: string;
  titleTemplate?: string;
}): VideoTaxonomy {
  const title = video.title || "";
  const t = title.toLowerCase();

  const category = inferVideoCategory(title);
  const niche = inferVideoNiche(title, video.category);
  let subNiche = "Internet Culture";

  if (niche === "Celebrity & entertainment") subNiche = "Internet Personalities";
  else if (niche === "Gaming") subNiche = /minecraft/i.test(t) ? "Minecraft & SMP" : "Gaming & Challenges";
  else if (niche === "True crime") subNiche = "True Crime & Mystery";
  else if (niche === "Education & science") subNiche = "Science & AI Tools";
  else if (niche === "Autos") subNiche = "Supercars & Mechanics";
  else if (niche === "Stories & drama") subNiche = "Reddit Stories & Drama";
  else if (niche === "News & politics") subNiche = "Global News & Politics";
  else if (niche === "History") subNiche = "Historical Deep Dives";
  else if (niche === "Sports") subNiche = "Sports Highlights & Stories";
  else if (niche === "Comedy & memes") subNiche = "Memes & Viral Humor";
  else if (niche === "Religion & spirituality") subNiche = "Spiritual Philosophy";
  else if (niche === "Business & e-commerce") subNiche = /drop ?ship|shopify|e-?com|fba|store/i.test(t) ? "Dropshipping & E-commerce" : /ads?|roas|cpm|media buy/i.test(t) ? "Ads & Media Buying" : "Make Money Online";
  else if (niche === "Finance & investing") subNiche = /crypto|bitcoin|ethereum/i.test(t) ? "Crypto" : /real estate|immobilier/i.test(t) ? "Real Estate" : "Stock Market";

  // Clean Subject Extraction
  let subject = title
    .replace(/[#@][\w\d_]+/g, "")
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .replace(/(\bwas right all along|\bthe entire story of|\biceberg explained|\bexplained|\bchallenge|\bdocumentary|\bcase study|\bfull movie)/gi, "")
    .replace(/[^\w\s'-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (/ishowspeed/i.test(title)) {
    subject = "Ishowspeed Controversy";
  } else if (/coraline/i.test(title)) {
    subject = "Coraline Explained";
  } else if (subject.length > 38) {
    const words = subject.split(" ").slice(0, 5).join(" ");
    subject = words;
  }

  if (!subject || subject.length < 3) {
    subject = title.slice(0, 30);
  }

  // Title Format Extraction
  let titleFormat = video.titleTemplate || video.titlePattern || "";
  if (!titleFormat) {
    if (/was right/i.test(title)) {
      titleFormat = "[PERSON] Was Right All Along...";
    } else if (/the entire story of/i.test(title)) {
      titleFormat = "The Entire Story of [X] Explained";
    } else if (/iceberg/i.test(title)) {
      titleFormat = "The [TOPIC] Iceberg Explained";
    } else if (/in history/i.test(title)) {
      titleFormat = "The [SUPERLATIVE] in History";
    } else if (/i spent|i tried/i.test(title)) {
      titleFormat = "I Tried [X] for [Y] Days";
    } else if (/how to/i.test(title)) {
      titleFormat = "How to [GOAL] Without [PAIN]";
    } else if (/why/i.test(title)) {
      titleFormat = "Why [X] is Actually [Y]";
    } else if (title.includes(":") || title.includes("|") || title.includes(" - ")) {
      // Structure-based extraction like "[PERSON]: [THING] | [THING]"
      const parts = title.split(/[:|•-]/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        titleFormat = parts.map((_, i) => i === 0 ? "[SUBJECT]" : "[CONCEPT]").join(" | ");
      } else {
        titleFormat = "[SUBJECT]: [HOOK]";
      }
    } else {
      // Abstract syntax structure
      const rawWords = title.trim().split(/\s+/).slice(0, 5);
      if (rawWords.length >= 3) {
        titleFormat = rawWords.map((w) => {
          if (/^(in|the|on|at|for|with|to|of|and|a|an)$/i.test(w)) return w;
          if (/^(forest|space|city|world|room|house|island|school|airport)$/i.test(w)) return "[PLACE]";
          return "[THING]";
        }).join(" ") + "...";
      } else {
        titleFormat = "[TOPIC] Deep Dive & Analysis";
      }
    }
  }

  // Clean any leading emojis from template
  titleFormat = titleFormat.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u, "");

  return {
    category,
    niche,
    subNiche,
    subject,
    titleFormat,
  };
}
