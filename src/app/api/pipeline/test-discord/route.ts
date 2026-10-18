import { NextRequest, NextResponse } from "next/server";
import {
  sendSingleConsolidatedReportToDiscord,
  DISCORD_WEBHOOK_URL,
  OutlierVideoAlert,
} from "@/lib/discordWebhook";

export const dynamic = "force-dynamic";

/**
 * Endpoint de test pour valider instantanément la réception du Webhook Discord
 * avec un rapport synthétique unique contenant un exemple d'outlier massif
 */
export async function GET(request: NextRequest) {
  try {
    const sampleAlerts: OutlierVideoAlert[] = [
      {
        id: "dJZD4ij1Hlw",
        title: "IShowSpeed Was Right All Along...",
        thumbnail: "https://i.ytimg.com/vi/dJZD4ij1Hlw/maxresdefault.jpg",
        publishedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        views: 5671207,
        durationFormatted: "21:16",
        durationSeconds: 1276,
        isShort: false,
        channelId: "UC_zenyttk_channel",
        channelTitle: "ZenyTTK",
        channelSubs: 5020,
        channelAvatar: "https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj",
        outlierMultiplier: 28.4,
        viralRatio: 1129.7, // 1130x les abonnés !
        velocityVpd: 1134000,
        channelMedianViews: 200000,
        compositeScore: 98.5,
        titlePattern: "[Vérité / Controverse]",
        category: "Storytelling & Gaming",
      },
      {
        id: "dQw4w9WgXcQ",
        title: "How I Built a $10,000/Month SaaS in 30 Days Without Coding",
        thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60",
        publishedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        views: 142500,
        durationFormatted: "14:20",
        durationSeconds: 860,
        isShort: false,
        channelId: "UC_sample_creator_101",
        channelTitle: "Modern Indie Builder",
        channelSubs: 12400,
        channelAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        outlierMultiplier: 18.4,
        viralRatio: 11.5,
        velocityVpd: 47500,
        channelMedianViews: 7700,
        compositeScore: 92.4,
        titlePattern: "[Comment j'ai créé]",
        category: "SaaS & Tech",
      },
    ];

    const result = await sendSingleConsolidatedReportToDiscord({
      channelsScanned: 35,
      totalVideosIngested: 525,
      totalViralViews: 5813707,
      outliers: sampleAlerts,
    }, DISCORD_WEBHOOK_URL);

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? "✅ Rapport consolidé unique envoyé avec succès sur votre Discord !"
        : "❌ Erreur lors de l'envoi vers Discord",
      details: result,
      samplesSent: sampleAlerts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
