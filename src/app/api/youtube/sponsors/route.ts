import { NextRequest, NextResponse } from "next/server";
import { getRecentVideos, getChannelDetails } from "@/lib/youtube";
import { auditChannelSponsors } from "@/lib/sponsorIntelligence";
import { 
  upsertChannel, 
  upsertVideo, 
  upsertBrand, 
  recordSponsorship, 
  readDatabase 
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadsPlaylistId = searchParams.get("playlistId");
    const channelId = searchParams.get("channelId");

    if (!uploadsPlaylistId || uploadsPlaylistId.trim() === "") {
      return NextResponse.json({ error: "playlistId is required" }, { status: 400 });
    }

    // 1. Retrieve channel metadata if channelId provided
    let dbChannelRecord: any = null;
    if (channelId) {
      const channelDetail = await getChannelDetails(channelId);
      if (channelDetail) {
        dbChannelRecord = upsertChannel({
          youtubeChannelId: channelDetail.id,
          name: channelDetail.title,
          handle: channelDetail.customUrl,
          thumbnailUrl: channelDetail.avatar,
          subscriberCount: channelDetail.subscriberCount,
          totalViews: channelDetail.viewCount,
          videoCount: channelDetail.videoCount,
        });
      }
    }

    // 2. Retrieve recent videos
    const videos = await getRecentVideos(uploadsPlaylistId.trim(), 12);

    // 3. Run deep sponsor & email audit
    const reports = await auditChannelSponsors(videos);

    // 4. Save to Local Database (Persistence & De-duplication)
    for (const report of reports) {
      const dbVideo = upsertVideo({
        youtubeVideoId: report.videoId,
        channelId: dbChannelRecord ? dbChannelRecord.id : channelId || "unknown",
        title: report.videoTitle,
        description: "",
        thumbnailUrl: report.videoThumbnail,
        publishedAt: report.publishedAt,
        viewCount: report.viewCount,
        videoUrl: `https://www.youtube.com/watch?v=${report.videoId}`,
        durationFormatted: report.durationFormatted,
      });

      for (const sp of report.sponsors) {
        const dbBrand = upsertBrand({
          name: sp.sponsorName,
          website: sp.sponsorUrl,
          industry: sp.category,
          contactEmail: sp.sponsorEmail,
        });

        // Determine method & status
        let method: any = "description_keyword";
        let status: any = "sponsor_probable";

        if (sp.timeCode) {
          method = "sponsorblock_timestamp";
          status = "sponsor_confirmed";
        } else if (sp.contextSnippet?.includes("Lien sponsorisé")) {
          method = "affiliate_url";
          status = "affiliate_link";
        } else if (sp.contextSnippet?.includes("Code Promo")) {
          method = "promo_code";
          status = "sponsor_confirmed";
        }

        recordSponsorship({
          brandId: dbBrand.id,
          channelId: dbChannelRecord ? dbChannelRecord.id : channelId || "unknown",
          videoId: dbVideo.id,
          detectionMethod: method,
          confidenceScore: sp.confidence,
          evidence: sp.contextSnippet,
          timeCode: sp.timeCode,
          status,
        });
      }
    }

    // Aggregate summary of all brands sponsoring this channel
    const brandMap = new Map<string, { count: number; email?: string; category?: string; url?: string }>();
    const allChannelEmails = new Set<string>();

    reports.forEach((rep) => {
      rep.extractedEmails.forEach((e) => allChannelEmails.add(e));
      rep.sponsors.forEach((sp) => {
        const key = sp.sponsorName;
        const existing = brandMap.get(key) || { count: 0, email: sp.sponsorEmail, category: sp.category, url: sp.sponsorUrl };
        existing.count += 1;
        if (sp.sponsorEmail) existing.email = sp.sponsorEmail;
        if (sp.category) existing.category = sp.category;
        if (sp.sponsorUrl) existing.url = sp.sponsorUrl;
        brandMap.set(key, existing);
      });
    });

    const uniqueBrands = Array.from(brandMap.entries()).map(([name, data]) => ({
      brandName: name,
      placementsCount: data.count,
      contactEmail: data.email,
      category: data.category,
      websiteUrl: data.url,
    }));

    return NextResponse.json({
      reports,
      uniqueBrands,
      channelEmailsFound: Array.from(allChannelEmails),
      savedToLocalDb: true,
    });
  } catch (err: any) {
    console.error("Error in sponsor audit API:", err);
    return NextResponse.json({ error: err.message || "Failed to audit sponsors" }, { status: 500 });
  }
}
