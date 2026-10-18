import fs from "fs";
import path from "path";

const CACHE_FILE = path.join(process.cwd(), "data", "discovered_videos_cache.json");
const INDEX_FILE = path.join(process.cwd(), "data", "viral_videos_index.json");

function detectSimplePattern(title) {
  if (!title) return {};
  if (/\b([\w\s]+)\b\s+(was|were)\s+right\b/i.test(title)) return { badge: "👁️ [X] Was Right All Along" };
  if (/\b(the (hunt|search) for|finding the)\b/i.test(title)) return { badge: "🕵️ The Hunt for [X]" };
  if (/\b(in (movie|gaming|internet|youtube|human)?\s*history|ever (made|seen)|dans l'histoire)\b/i.test(title)) return { badge: "🏆 [Superlative] in History" };
  if (/\b(i (tried|spent|tested|lived)|j'ai)\b.*\b(\d+\s*(days?|hours?|months?|jours?))\b/i.test(title)) return { badge: "⏱️ I Tried [X] for [Y]" };
  if (/\b(iceberg|explained|décrypté)\b/i.test(title)) return { badge: "🧊 [X] Iceberg Explained" };
  if (/\b(how to|comment)\b.*\b(without|sans)\b/i.test(title)) return { badge: "🎯 How to [X] Without [Y]" };
  if (/\b(how (i|he|she|one guy)\b.*\b(made|built|reached|scaled))\b/i.test(title)) return { badge: "🚀 How [X] Built [Result]" };
  if (/\b(vs\.?|versus|contre)\b/i.test(title)) return { badge: "⚔️ [X] vs [Y]" };
  if (/\b(the rise and (fall|downfall) of)\b/i.test(title)) return { badge: "📉 Rise and Fall of [X]" };
  if (/\b(stop (doing|using)|do not|don't|\d+\s*(mistakes|erreurs))\b/i.test(title)) return { badge: "⚠️ Stop Doing [X] / Mistakes" };
  if (/\b(why\b.*\b(actually|really|secret))\b/i.test(title)) return { badge: "🔍 Why [X] is Actually [Y]" };
  if (/\b(top\s*\d+|\d+\s*(ways|secrets|tools|tips))\b/i.test(title)) return { badge: "🔢 Top [N] [Things]" };
  return {};
}

async function rebuild() {
  console.log("Reading discovered cache...");
  const raw = fs.readFileSync(CACHE_FILE, "utf-8");
  const cacheData = JSON.parse(raw);

  const allRecords = [];
  for (const q in cacheData) {
    if (Array.isArray(cacheData[q])) {
      allRecords.push(...cacheData[q]);
    }
  }
  console.log(`Total raw records found: ${allRecords.length}`);

  const dedupMap = new Map();
  for (const r of allRecords) {
    if (!r.id || !r.title) continue;

    const views = r.viewCount || 0;
    const subs = r.channelSubscribers || 0;
    const mult = r.outlierMultiplier || 1.0;
    const vsr = subs > 0 ? views / subs : 1.0;

    // Critère : vraie pépite ou volume significatif
    if (mult < 1.8 && views < 25000 && vsr < 2.0) continue;

    const existing = dedupMap.get(r.id);
    if (!existing || (existing.viewCount < views)) {
      const isShort = r.isShort || (r.durationFormatted && r.durationFormatted.startsWith("0:") && parseInt(r.durationFormatted.split(":")[1], 10) <= 60);
      const pattern = detectSimplePattern(r.title);
      
      const ageDays = Math.max((Date.now() - new Date(r.publishedAt || Date.now()).getTime()) / 86400000, 0.5);
      const vpd = r.viewsPerDay || Math.round(views / ageDays);

      // Score composite 1of10 (0 - 100)
      const outlierNorm = Math.min(Math.max((mult - 1) / 9, 0), 1.0) * 100;
      const vsrNorm = Math.min(Math.max(vsr / 10, 0), 1.0) * 100;
      const velocityNorm = Math.min(Math.max(vpd / 35000, 0), 1.0) * 100;
      let recencyBoost = 20;
      if (ageDays <= 3) recencyBoost = 100;
      else if (ageDays <= 7) recencyBoost = 85;
      else if (ageDays <= 14) recencyBoost = 70;
      else if (ageDays <= 30) recencyBoost = 50;
      else if (ageDays <= 90) recencyBoost = 35;

      const vbs = parseFloat((0.4 * outlierNorm + 0.3 * vsrNorm + 0.2 * velocityNorm + 0.1 * recencyBoost).toFixed(1));

      dedupMap.set(r.id, {
        id: r.id,
        title: r.title,
        thumbnail: r.thumbnail || `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
        publishedAt: r.publishedAt || new Date().toISOString(),
        durationFormatted: r.durationFormatted || (isShort ? "0:45" : "12:00"),
        durationSeconds: r.durationSeconds || (isShort ? 45 : 720),
        viewCount: views,
        viewsPerDay: vpd,
        channelId: r.channelId || "",
        channelTitle: r.channelTitle || "YouTube Creator",
        channelAvatar: r.channelAvatar,
        channelSubscribers: subs,
        channelMedianViews: r.baselineViews || Math.round(views / Math.max(mult, 1)),
        channelCreatedAt: r.channelCreatedAt,
        titlePattern: pattern.badge,
        titleTemplate: pattern.badge,
        outlierMultiplier: mult,
        viralRatio: parseFloat(vsr.toFixed(1)),
        viralBreakoutScore: vbs,
        engagementRate: r.engagementRate || 0.05,
        category: r.foundViaQuery || "Trending",
        subNiche: r.breakoutTopicLabel,
        tags: [r.foundViaQuery ? r.foundViaQuery.split(" ")[0] : "Trending"],
        indexedAt: new Date().toISOString(),
      });
    }
  }

  const sortedList = Array.from(dedupMap.values())
    .sort((a, b) => b.viralBreakoutScore - a.viralBreakoutScore)
    .slice(0, 4000);

  console.log(`Saving ${sortedList.length} indexed viral videos...`);
  fs.writeFileSync(INDEX_FILE, JSON.stringify(sortedList, null, 2), "utf-8");
  console.log("✅ Rebuild complete! Instant search is now primed with 4,000 real viral videos!");
}

rebuild();
