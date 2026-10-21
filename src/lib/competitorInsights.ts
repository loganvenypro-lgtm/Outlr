import type { CompetitorChannel, SimilarChannelsEngineResponse } from "@/types/competitorEngine";

export interface CompetitorInsights {
  /** Two or three sentences on where the channel stands in its niche. */
  summary: string;
  /** Why each competitor is recommended, keyed by channel id. */
  reasons: Record<string, { why: string; steal: string }>;
  engine: "groq" | "fallback";
}

const MODEL = "openai/gpt-oss-120b";

function fallbackInsights(result: SimilarChannelsEngineResponse, competitors: CompetitorChannel[]): CompetitorInsights {
  return {
    summary: `${result.reference.title} est classée « ${result.reference.archetypeLabel} ». Voici les chaînes qui visent la même audience avec des formats proches.`,
    reasons: Object.fromEntries(
      competitors.map((c) => [
        c.channel.id,
        {
          why: c.breakdown.comparableExplanations,
          steal: c.topSimilarVideos[0] ? `Regarde « ${c.topSimilarVideos[0].title} ».` : "",
        },
      ])
    ),
    engine: "fallback",
  };
}

/**
 * Asks the AI (Groq) why each competitor is recommended to this creator, in French,
 * from the real data the engine collected. Falls back to the engine's own
 * explanation when the key is missing or the call fails.
 */
export async function explainCompetitors(
  result: SimilarChannelsEngineResponse,
  role: string,
  limit = 8
): Promise<CompetitorInsights> {
  const competitors = result.competitors.slice(0, limit);
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || competitors.length === 0) return fallbackInsights(result, competitors);

  const ref = result.reference;
  const payload = {
    viewer: role === "agency" ? "une agence qui gère cette chaîne" : role === "aspiring" ? "un futur créateur qui s'inspire de cette chaîne" : "le créateur de cette chaîne",
    channel: {
      name: ref.title,
      subscribers: ref.subscriberCount,
      niche: ref.archetypeLabel,
      tags: ref.editorialTags,
      typicalViews: ref.typicalViews,
      avgMinutes: Math.round(ref.avgDurationSeconds / 60),
      recentTitles: ref.recentVideos.slice(0, 8).map((v) => v.title),
    },
    competitors: competitors.map((c) => ({
      id: c.channel.id,
      name: c.channel.title,
      subscribers: c.channel.subscriberCount,
      typicalViews: c.channel.typicalViews,
      similarity: c.similarityScore,
      sharedTopics: c.breakdown.sharedTopics,
      recentTitles: c.topSimilarVideos.map((v) => `${v.title} (${v.views} vues)`),
    })),
  };

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Tu es un stratège YouTube. On te donne une chaîne et des concurrents détectés automatiquement, avec leurs vrais titres et chiffres.
Réponds en français, tutoiement, ton direct et concret. Pas de généralités : cite des sujets, formats ou titres précis.
Renvoie uniquement du JSON :
{"summary": "2-3 phrases sur le positionnement de la chaîne dans sa niche",
 "reasons": {"<id concurrent>": {"why": "1-2 phrases : pourquoi cette chaîne est recommandée (audience, sujets, format communs)", "steal": "1 phrase : ce qu'il faut leur reprendre ou surveiller"}}}`,
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const fallback = fallbackInsights(result, competitors);
    const reasons: CompetitorInsights["reasons"] = {};
    for (const c of competitors) {
      const r = parsed.reasons?.[c.channel.id];
      reasons[c.channel.id] =
        r && typeof r.why === "string" ? { why: r.why, steal: typeof r.steal === "string" ? r.steal : "" } : fallback.reasons[c.channel.id];
    }
    return { summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary, reasons, engine: "groq" };
  } catch (err) {
    console.error("[CompetitorInsights] AI error:", err);
    return fallbackInsights(result, competitors);
  }
}
