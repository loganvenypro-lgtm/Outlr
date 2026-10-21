import { NextRequest } from "next/server";
import { discoverTrueCompetitors } from "@/lib/trueCompetitorService";
import { explainCompetitors } from "@/lib/competitorInsights";
import { NICHE_BY_ID, nicheTsQuery, type NicheId } from "@/lib/nicheClassifier";
import { sql } from "@/lib/postgres";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** The biggest channel of a niche in our database: the reference for creators without a channel. */
async function referenceChannelForNiche(nicheId: NicheId): Promise<{ id: string; name: string } | null> {
  const query = nicheTsQuery(nicheId);
  if (!query) return null;
  const [row] = await sql`
    SELECT c.youtube_channel_id, c.name, count(*)::int AS hits
    FROM videos v JOIN channels c ON c.id = v.channel_id
    WHERE to_tsvector('simple', v.title) @@ to_tsquery('simple', ${query})
      AND v.published_at > now() - interval '365 days'
      AND COALESCE(c.subscriber_count, 0) >= 50000
    GROUP BY c.youtube_channel_id, c.name, c.subscriber_count
    HAVING count(*) >= 3
    ORDER BY count(*) * ln(COALESCE(c.subscriber_count, 0) + 1) DESC
    LIMIT 1`;
  return row ? { id: row.youtube_channel_id as string, name: row.name as string } : null;
}

/**
 * Live onboarding analysis, streamed as NDJSON: one event per line as each stage
 * of the competitor engine lands, then the AI's explanation of the matches.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel")?.trim() ?? "";
  const niche = searchParams.get("niche") as NicheId | null;
  const role = searchParams.get("role") ?? "creator";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };

      try {
        let target = channel;
        if (!target && niche && NICHE_BY_ID[niche]) {
          send({ type: "log", message: `Recherche de la chaîne de référence « ${NICHE_BY_ID[niche].label} »` });
          const ref = await referenceChannelForNiche(niche);
          if (!ref) throw new Error("Pas encore assez de données sur cette niche.");
          send({ type: "log", message: `Référence de ta niche : ${ref.name}` });
          target = ref.id;
        }
        if (!target) throw new Error("Lien de chaîne manquant.");

        const result = await discoverTrueCompetitors(target, send);
        send({ type: "done", result });

        send({ type: "log", message: "L'IA analyse pourquoi ces chaînes te correspondent…" });
        send({ type: "insights", insights: await explainCompetitors(result, role) });
      } catch (err: any) {
        send({ type: "error", message: err?.message || "Impossible d'analyser cette chaîne." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
