import { NextRequest, NextResponse } from "next/server";
import { readDatabase } from "@/lib/db";
import { KNOWN_SPONSORS } from "@/lib/sponsorIntelligence";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array required" }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;

    // Load real-time database context (channels, brands, sponsorships)
    const db = readDatabase();
    const channelsSample = db.channels.slice(0, 5).map((c) => ({
      name: c.name,
      handle: c.handle,
      subscribers: c.subscriberCount,
      totalViews: c.totalViews,
      videoCount: c.videoCount,
    }));

    const brandsSample = db.brands.slice(0, 15).map((b) => ({
      name: b.name,
      industry: b.industry,
      contactEmail: b.contactEmail,
      contactRole: b.contactRole,
    }));

    const knownBrandsSample = Object.values(KNOWN_SPONSORS).slice(0, 20).map((s) => ({
      name: s.name,
      email: s.email,
      category: s.category,
      role: s.contactRole,
    }));

    const sponsorshipsSample = db.sponsorships.slice(0, 10).map((sp) => {
      const b = db.brands.find((brand) => brand.id === sp.brandId);
      const v = db.videos.find((vid) => vid.id === sp.videoId);
      const c = db.channels.find((ch) => ch.id === sp.channelId);
      return {
        brand: b?.name,
        creator: c?.name,
        videoTitle: v?.title,
        timeCode: sp.timeCode,
        status: sp.status,
      };
    });

    const systemPrompt = `Tu es l'agent IA expert de NewIQ (plateforme de Creator Intelligence & Sponsor Discovery inspirée de ViewStats et MeetSponsors).
Tu réponds en français avec un ton professionnel, précis, analytique et orienté business/agences d'influence.

Voici les données réelles issues de la base locale de l'application :
- Chaînes analysées : ${JSON.stringify(channelsSample)}
- Marques partenaires & contacts : ${JSON.stringify([...brandsSample, ...knownBrandsSample])}
- Collaborations et timecodes récents : ${JSON.stringify(sponsorshipsSample)}
- Total de marques répertoriées : ${db.brands.length}
- Total de partenariats indexés : ${db.sponsorships.length}

Tes missions :
1. Donner les contacts et emails vérifiés des décideurs marketing des marques quand l'utilisateur le demande.
2. Analyser les sponsors des chaînes YouTube (timecodes exacts, preuves, vidéos).
3. Calculer des estimations de budget et CPM réalistes (18€-35€ CPM selon la niche).
4. Rédiger des e-mails de démarchage personnalisés et percutants pour les marques.

Sois concis, utilise du markdown avec du gras et des puces claires.`;

    // Call Groq API with the provided key and ultra-fast inference
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
          temperature: 0.6,
          max_tokens: 800,
        }),
      });

      if (groqResponse.ok) {
        const groqData = await groqResponse.json();
        const reply = groqData.choices?.[0]?.message?.content;
        if (reply) {
          return NextResponse.json({ reply, engine: "groq-gpt-oss-120b" });
        }
      }
    }

    // Fallback if Groq API fails or key is missing
    return NextResponse.json({ 
      reply: "Je suis opérationnel. Posez-moi vos questions sur les créateurs, marques et sponsors !" 
    });
  } catch (err: any) {
    console.error("AI Route error:", err);
    return NextResponse.json({ error: err.message || "Erreur IA" }, { status: 500 });
  }
}
