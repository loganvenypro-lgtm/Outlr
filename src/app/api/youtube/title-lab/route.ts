import { NextRequest, NextResponse } from "next/server";
import { formatCompactNumber, parseISO8601Duration } from "@/lib/utils";

export const dynamic = "force-dynamic";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * Heuristic fallback generator when AI key is unavailable or fails
 */
function generateHeuristicVariations(topic: string, angle: string) {
  const t = topic.trim();
  return [
    {
      title: `The Untold Truth About ${t}`,
      score: 94,
      hookType: "Curiosity & Revelation",
      psychologicalTrigger: "FOMO & Exclusivité",
      ctrBenchmark: "High (8-12%)",
      thumbnailVisualIdea: `Gros plan contrasté, texte jaune percutant "THE TRUTH", flou d'arrière-plan avec élément secret.`,
    },
    {
      title: `Why ${t} Is Actually A Huge Mistake`,
      score: 91,
      hookType: "Negative Framing",
      psychologicalTrigger: "Aversion à la perte & Urgence",
      ctrBenchmark: "Very High (9-14%)",
      thumbnailVisualIdea: `Flèche rouge pointant vers un détail dramatique, expression choquée ou graphique qui s'effondre.`,
    },
    {
      title: `I Tested ${t} For 30 Days (Here's What Happened)`,
      score: 89,
      hookType: "Personal Challenge / Storytelling",
      psychologicalTrigger: "Preuve sociale & Curiosité empirique",
      ctrBenchmark: "High (7-11%)",
      thumbnailVisualIdea: `Split screen Avant / Après (Jour 1 vs Jour 30), badge de progression temporel.`,
    },
    {
      title: `The Downfall of ${t}: What Really Happened?`,
      score: 96,
      hookType: "Mini-Documentary & Rise/Fall",
      psychologicalTrigger: "Fascination morbide & Enquête",
      ctrBenchmark: "Viral (10-15%)",
      thumbnailVisualIdea: `Ambiance sombre, silhouette mystérieuse, titre textuel court 3 mots max en majuscules.`,
    },
    {
      title: `Stop Doing ${t} Like This (Do This Instead)`,
      score: 88,
      hookType: "Contrarian Advice",
      psychologicalTrigger: "Autorité & Gain d'efficacité immédiat",
      ctrBenchmark: "Solid (7-10%)",
      thumbnailVisualIdea: `Croix rouge sur une mauvaise habitude, coche verte sur la méthode secrète.`,
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, angle, channelContext } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: "Le sujet de la vidéo est requis." }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // 1. Fetch real viral benchmarks from YouTube Data API for this exact topic
    let realViralBench: any[] = [];
    if (apiKey) {
      try {
        const sRes = await fetch(
          `${YOUTUBE_API_BASE}/search?part=snippet&type=video&q=${encodeURIComponent(topic)}&order=viewCount&maxResults=8&key=${apiKey}`
        );
        const sData = await sRes.json();
        const vIds = (sData.items || []).map((it: any) => it.id?.videoId).filter(Boolean);

        if (vIds.length > 0) {
          const vRes = await fetch(
            `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,statistics&id=${vIds.join(",")}&key=${apiKey}`
          );
          const vData = await vRes.json();
          realViralBench = (vData.items || []).map((v: any) => {
            const dur = parseISO8601Duration(v.contentDetails?.duration);
            return {
              id: v.id,
              title: v.snippet?.title,
              views: parseInt(v.statistics?.viewCount || "0", 10),
              thumbnail: v.snippet?.thumbnails?.medium?.url,
              durationFormatted: dur.formatted,
            };
          });
        }
      } catch (e) {
        console.error("YouTube viral benchmark error:", e);
      }
    }

    // 2. Leverage Groq AI (Llama-3 / GPT-OSS) for high CTR title formulas and thumbnail concept generation
    let generatedTitles: any[] = [];

    if (groqKey) {
      try {
        const prompt = `You are a world-class YouTube Packaging & Viral Hook Strategist (like MrBeast, Paddy Galloway, April Han).
Generate 6 ultra-high CTR video titles and detailed thumbnail visual directions for this topic: "${topic}".
Angle requested: "${angle || "high viral curiosity"}".
Context of the channel: "${channelContext || "Creator focused on educational & entertaining content"}".

Requirements for titles:
- Must use proven high-performing YouTube frameworks (Negative framing, Curiosity gap, Timeframes, The Definitive Documentary, Contrarian).
- Under 65 characters where possible so titles don't get truncated on mobile.
- Clean without cringe emojis.
- Provide a CTR potential score (out of 100), the Hook Type, the Psychological Trigger, and an exact Thumbnail Visual Direction (composition, color contrast, text on thumbnail).

Respond ONLY with valid JSON in this exact structure:
[
  {
    "title": "Title here",
    "score": 95,
    "hookType": "Curiosity Gap",
    "psychologicalTrigger": "FOMO",
    "ctrBenchmark": "High (9-13%)",
    "thumbnailVisualIdea": "Exact visual description with lighting, facial expression and 2-3 word overlay."
  }
]`;

        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" },
          }),
        });

        const aiData = await aiRes.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          generatedTitles = Array.isArray(parsed) ? parsed : parsed.titles || parsed.variations || [];
        }
      } catch (err) {
        console.warn("Groq AI title generation fallback:", err);
      }
    }

    if (!generatedTitles || generatedTitles.length === 0) {
      generatedTitles = generateHeuristicVariations(topic, angle || "general");
    }

    return NextResponse.json({
      topic,
      generatedTitles,
      realViralBench: realViralBench.slice(0, 6),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur Title Lab" }, { status: 500 });
  }
}
