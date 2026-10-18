import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { niche, topic } = await request.json();
    const groqKey = process.env.GROQ_API_KEY;

    const targetTopic = topic || niche || "IA et Tech";

    const systemPrompt = `Tu es le moteur d'idéation et de stratégie de contenu YouTube de TubeLab.
Ton objectif est de générer 4 concepts de vidéos YouTube à TRÈS FORT POTENTIEL VIRAL (Outliers).
Chaque concept doit comporter :
- Titre ultra-accrocheur (haut CTR)
- Idée de miniature (Thumbnail concept)
- Angle / Accroche des 30 premières secondes (Hook)
- RPM estimé et opportunité de sponsoring liée.

Réponds en français avec un formatage Markdown élégant.`;

    if (groqKey && groqKey.trim() !== "") {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Génère 4 idées de vidéos YouTube virales (Outlier concepts) pour la thématique : "${targetTopic}".` },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        const concepts = data.choices?.[0]?.message?.content;
        return NextResponse.json({ concepts });
      }
    }

    return NextResponse.json({
      concepts: `### 🚀 Idées Outliers pour "${targetTopic}" :\n\n` +
        `1. **"J'ai testé ce business pendant 30 jours (les résultats réels)"**\n` +
        `   - **Thumbnail :** Chiffres en rouge vs vert, expression choquée.\n` +
        `   - **Hook :** "Tout le monde dit que c'est saturé, alors j'ai investi 500€ pour voir la vérité..."\n\n` +
        `2. **"Pourquoi 99% des créateurs échouent (et l'erreur à éviter)"**\n` +
        `   - **Thumbnail :** Graphique qui chute brutalement avec une croix rouge.\n` +
        `   - **Hook :** "Si vous faites cette erreur, l'algorithme ne poussera jamais votre vidéo..."`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erreur d'idéation IA" }, { status: 500 });
  }
}
