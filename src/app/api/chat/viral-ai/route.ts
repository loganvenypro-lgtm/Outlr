import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { detectTitlePattern } from "@/lib/titlePatternDetector";

export const dynamic = "force-dynamic";

interface RAGContextVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelSubscribers: number;
  channelMedianViews?: number;
  viewCount: number;
  outlierMultiplier: number;
  viralBreakoutScore: number;
  viralRatio: number;
  viewsPerDay: number;
  durationFormatted: string;
  isShort: boolean;
  category: string;
  niche?: string;
  titlePattern?: string;
  publishedAt: string;
}

let cachedViralIndex: RAGContextVideo[] | null = null;
let lastCacheLoad = 0;

function loadViralDatabase(): RAGContextVideo[] {
  const now = Date.now();
  if (cachedViralIndex && now - lastCacheLoad < 60000) {
    return cachedViralIndex;
  }

  const dataDir = path.join(process.cwd(), "data");
  const viralPath = path.join(dataDir, "viral_videos_index.json");
  const discoveredPath = path.join(dataDir, "discovered_videos_cache.json");

  const list: RAGContextVideo[] = [];
  const seenIds = new Set<string>();

  if (fs.existsSync(viralPath)) {
    try {
      const raw = fs.readFileSync(viralPath, "utf-8");
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item.id || seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          const pattern = item.titlePattern || detectTitlePattern(item.title).badge;
          const isShort =
            item.durationFormatted === "0:60" ||
            (item.durationFormatted &&
              item.durationFormatted.startsWith("0:") &&
              parseInt(item.durationFormatted.split(":")[1], 10) <= 60);

          list.push({
            id: item.id,
            title: item.title,
            channelTitle: item.channelTitle || "Créateur",
            channelSubscribers: item.channelSubscribers || 1000,
            channelMedianViews: item.channelMedianViews || 5000,
            viewCount: item.viewCount || 0,
            outlierMultiplier: parseFloat((item.outlierMultiplier || 1).toFixed(1)),
            viralBreakoutScore: item.viralBreakoutScore || 50,
            viralRatio: parseFloat(
              (item.viralRatio || (item.viewCount || 0) / Math.max(item.channelSubscribers || 1, 1)).toFixed(1)
            ),
            viewsPerDay: item.viewsPerDay || 0,
            durationFormatted: item.durationFormatted || "10:00",
            isShort: Boolean(isShort),
            category: item.category || "Outlier",
            niche: item.niche,
            titlePattern: pattern,
            publishedAt: item.publishedAt || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn("Could not load viral_videos_index for RAG:", err);
    }
  }

  // Si l'index viral est petit, compléter avec discovered_videos_cache
  if (list.length < 500 && fs.existsSync(discoveredPath)) {
    try {
      const raw = fs.readFileSync(discoveredPath, "utf-8");
      const parsed = JSON.parse(raw);
      for (const q in parsed) {
        if (!Array.isArray(parsed[q])) continue;
        for (const v of parsed[q]) {
          if (!v.id || seenIds.has(v.id)) continue;
          seenIds.add(v.id);
          const pattern = detectTitlePattern(v.title).badge;
          list.push({
            id: v.id,
            title: v.title,
            channelTitle: v.channelTitle || "Créateur",
            channelSubscribers: v.channelSubscribers || 1000,
            channelMedianViews: v.baselineViews || 5000,
            viewCount: v.viewCount || 0,
            outlierMultiplier: parseFloat((v.outlierMultiplier || 1).toFixed(1)),
            viralBreakoutScore: 50,
            viralRatio: parseFloat(((v.viewCount || 0) / Math.max(v.channelSubscribers || 1, 1)).toFixed(1)),
            viewsPerDay: v.viewsPerDay || 0,
            durationFormatted: v.durationFormatted || "10:00",
            isShort: false,
            category: q.split(/\s+/)[0] || "Outlier",
            titlePattern: pattern,
            publishedAt: v.publishedAt || new Date().toISOString(),
          });
        }
      }
    } catch {}
  }

  cachedViralIndex = list;
  lastCacheLoad = now;
  return list;
}

/**
 * Recherche vectorielle/sémantique simplifiée basée sur les mots-clés,
 * l'URL YouTube, l'ID vidéo ou les concepts dans la question de l'utilisateur.
 */
function findRelevantVideos(query: string, allVideos: RAGContextVideo[], limit = 6): RAGContextVideo[] {
  if (!query) return allVideos.slice(0, limit);

  const cleanQuery = query.toLowerCase();

  // Extraction éventuelle d'un ID de vidéo ou d'une URL YouTube
  const ytMatch = query.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const directHit = allVideos.find((v) => v.id === ytMatch[1]);
    if (directHit) {
      return [directHit, ...allVideos.filter((v) => v.id !== ytMatch[1]).slice(0, limit - 1)];
    }
  }

  // Tokenisation
  const tokens = cleanQuery
    .replace(/[^\w\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = allVideos.map((video) => {
    let score = 0;
    const titleLower = video.title.toLowerCase();
    const channelLower = video.channelTitle.toLowerCase();
    const catLower = video.category.toLowerCase();
    const patternLower = (video.titlePattern || "").toLowerCase();

    // Match exact du titre ou de la chaîne
    if (titleLower.includes(cleanQuery)) score += 50;
    if (channelLower.includes(cleanQuery)) score += 40;

    for (const token of tokens) {
      if (titleLower.includes(token)) score += 10;
      if (channelLower.includes(token)) score += 8;
      if (catLower.includes(token)) score += 5;
      if (patternLower.includes(token)) score += 6;
    }

    // Poids supplémentaire pour les vrais outliers récents
    score += Math.min(video.outlierMultiplier * 2, 25);
    score += Math.min(video.viralBreakoutScore * 0.1, 10);

    return { video, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.video);
}

export async function POST(request: NextRequest) {
  try {
    const { messages, specificVideoId } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user" || m.sender === "user")?.content || "";

    const allVideos = loadViralDatabase();
    const relevantVideos = specificVideoId
      ? allVideos.filter((v) => v.id === specificVideoId)
      : findRelevantVideos(lastUserMessage, allVideos, 5);

    // Contexte synthétique injecté à l'IA
    const videoContext = relevantVideos.map((v) => ({
      id: v.id,
      title: v.title,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      channel: v.channelTitle,
      subs: v.channelSubscribers,
      views: v.viewCount,
      outlierMultiplier: `${v.outlierMultiplier}x la médiane (${v.channelMedianViews || "N/A"})`,
      viralRatio: `${v.viralRatio}x ses abonnés`,
      velocityVpd: `+${v.viewsPerDay}/jour`,
      duration: v.durationFormatted,
      format: v.isShort ? "Short (<60s)" : "Longform (>60s)",
      scoreComposite: `${v.viralBreakoutScore}/100`,
      titlePattern: v.titlePattern || "Non spécifié",
      niche: v.category,
      publishedAt: v.publishedAt,
    }));

    // Métriques globales pour enrichir le contexte
    const totalVideosCount = allVideos.length;
    const topPerformer = allVideos[0];

    const systemPrompt = `Tu es l'agent IA YouTube Viral Strategist & Packaging Expert de la plateforme NewIQ / Algrow / 1of10.
Tu es ultra-spécialisé dans la rétro-ingénierie algorithmique de YouTube, l'analyse de CTR (titre + miniature), la psychologie des spectateurs, et l'explication précise de POURQUOI une vidéo a explosé (outlier).

TU AS ACCÈS DIRECT À TOUTE LA BASE DE DONNÉES DU SCANNER YOUTUBE :
- Plus de 14 600 vidéos scrapées et 3 000 pépites virales indexées.
- Métriques exactes : VSR (Vues / Abonnés), Multiplicateur d'Outlier (Vues / Médiane de la chaîne), Vélocité (VPD), Score Composite (0-100), Format et Title Patterns.

CONTEXTE EN TEMPS RÉEL DES VIDÉOS PERTINENTES LIÉES À LA DEMANDE :
${JSON.stringify(videoContext, null, 2)}

BASE DE RÉFÉRENCE GLOBALE :
- Total d'outliers qualifiés en mémoire : ${totalVideosCount}
- Exemple de Top Pépite : "${topPerformer?.title}" (${topPerformer?.viewCount?.toLocaleString()} vues, ${topPerformer?.outlierMultiplier}x la médiane).

TES COMPÉTENCES D'ANALYSTE :
1. **Rétro-Ingénierie du Succès ("Pourquoi ça a marché ?")** :
   - Expliquer les 3 piliers :
     a) **Le Packaging (CTR)** : Déconstruire le titre (curiosité, tension, pattern psychologique ex: *Was Right All Along*, *The Hunt for*, *Iceberg*, *Superlatif historique*) et la promesse de la miniature.
     b) **Le Rétention & Storytelling (AVD)** : Pourquoi le sujet accroche dès les 30 premières secondes (enjeu immédiat, boucle ouverte, validation contre-intuitive).
     c) **L'Algorithme (VSR & Outlier)** : Expliquer la mécanique de sortie de bulle (quand une petite chaîne de 5k abonnés fait 2M de vues parce que le sujet dépasse son audience de base).

2. **Idéation & Plan d'Action Concret** :
   - Donner 3 variantes de titres optimisés pour reproduire le format sur d'autres niches.
   - Décrire le concept de la miniature idéale (sujet central, expression faciale, texte < 3 mots, contraste de couleur).

3. **Style de Réponse** :
   - Réponds en français.
   - Ton : Direct, expert, percutant, inspirant, orienté créateur pro (style MrBeast, Colin & Samir, Paddy Galloway).
   - Formate avec du markdown impeccable : titres clairs, gras sur les métriques clés, listes à puces.
   - Cite toujours les chiffres réels de la vidéo (vues, multiplicateur, VSR) quand tu l'analyses.`;

    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey && groqKey.trim() !== "") {
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: any) => ({
              role: m.role || (m.sender === "user" ? "user" : "assistant"),
              content: m.content || m.text,
            })),
          ],
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const reply = groqData.choices?.[0]?.message?.content;
        if (reply) {
          return NextResponse.json({
            reply,
            engine: "groq-gpt-oss-120b",
            matchedVideos: relevantVideos,
          });
        }
      } else {
        const errText = await groqResponse.text();
        console.warn("[Groq Chat Error]", groqResponse.status, errText);
      }
    }

    // Réponse de secours intelligente si le réseau ou la clé flanche
    const fallbackVideo = relevantVideos[0];
    const fallbackReply = `### 🧠 Analyse Stratégique YouTube

${
  fallbackVideo
    ? `**Vidéo analysée :** [${fallbackVideo.title}](https://www.youtube.com/watch?v=${fallbackVideo.id})
- **Chaîne :** ${fallbackVideo.channelTitle} (${fallbackVideo.channelSubscribers.toLocaleString()} abonnés)
- **Performance :** **${fallbackVideo.viewCount.toLocaleString()} vues** (${fallbackVideo.outlierMultiplier}x sa médiane de chaîne)
- **Ratio d'Audience (VSR) :** **${fallbackVideo.viralRatio}x** ses abonnés
- **Format :** ${fallbackVideo.isShort ? "⚡ Short (<60s)" : `⏱️ Longform (${fallbackVideo.durationFormatted})`}
- **Pattern détecté :** \`${fallbackVideo.titlePattern || "High-Curiosity Structure"}\`

#### 🎯 Pourquoi cette vidéo a explosé :
1. **Sortie de bulle algorithmique :** Avec un ratio VSR supérieur à 3x, YouTube a recommandé cette vidéo bien au-delà des abonnés habituels vers la page d'accueil (Browse Features).
2. **Packaging à forte curiosité :** Le titre applique une tension immédiate (*boucle ouverte*), incitant au clic sans être un piège à clics déceptif.
3. **Vélocité élevée (+${fallbackVideo.viewsPerDay.toLocaleString()} vues/jour) :** L'algorithme a validé un taux de satisfaction initial élevé (taux de clic + rétention sur les premières minutes).`
    : `Je dispose des données sur plus de 14 000 vidéos et 3 000 outliers analysés. Donnez-moi un lien de vidéo YouTube ou un sujet (ex: *True Crime, Iceberg, IA*) pour que je déconstruise pourquoi elle a performé !`
}`;

    return NextResponse.json({
      reply: fallbackReply,
      engine: "local-rag-fallback",
      matchedVideos: relevantVideos,
    });
  } catch (error: any) {
    console.error("[Viral Chat Route Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process viral chat" },
      { status: 500 }
    );
  }
}
