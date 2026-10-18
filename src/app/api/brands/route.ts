import { NextRequest, NextResponse } from "next/server";
import { readDatabase, saveBrandCommercialNote, getBrandCommercialNote } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandNameQuery = searchParams.get("q");
    const brandId = searchParams.get("id");

    const db = readDatabase();

    // Case 1: Specific Brand Detail by ID
    if (brandId) {
      const brand = db.brands.find((b) => b.id === brandId);
      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      // Find all sponsorships for this brand
      const sponsorships = db.sponsorships.filter((s) => s.brandId === brand.id);
      
      // Resolve related videos and channels
      const collaborations = sponsorships.map((sp) => {
        const video = db.videos.find((v) => v.id === sp.videoId);
        const channel = db.channels.find((c) => c.id === sp.channelId);
        return {
          sponsorshipId: sp.id,
          detectionMethod: sp.detectionMethod,
          confidenceScore: sp.confidenceScore,
          evidence: sp.evidence,
          timeCode: sp.timeCode,
          status: sp.status,
          detectedAt: sp.detectedAt,
          video,
          channel,
        };
      });

      // Commercial CRM Note
      const note = getBrandCommercialNote(brand.id);

      // Distinct channels
      const uniqueChannelIds = Array.from(new Set(collaborations.map((c) => c.channel?.id).filter(Boolean)));
      const uniqueChannels = uniqueChannelIds.map((cid) => db.channels.find((ch) => ch.id === cid));

      // Metrics
      const totalViews = collaborations.reduce((acc, c) => acc + (c.video?.viewCount || 0), 0);
      const sortedDates = collaborations.map((c) => new Date(c.video?.publishedAt || c.detectedAt).getTime()).sort((a, b) => a - b);
      const firstCollab = sortedDates.length > 0 ? new Date(sortedDates[0]).toISOString() : null;
      const lastCollab = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]).toISOString() : null;

      return NextResponse.json({
        brand,
        collaborations,
        uniqueChannels,
        metrics: {
          totalCollaborations: collaborations.length,
          totalViews,
          channelsCount: uniqueChannels.length,
          firstCollab,
          lastCollab,
        },
        commercialNote: note,
      });
    }

    // Case 2: Global Brands List & Search
    let matchedBrands = db.brands;
    if (brandNameQuery && brandNameQuery.trim() !== "") {
      const norm = brandNameQuery.toLowerCase().trim();
      matchedBrands = db.brands.filter(
        (b) => b.normalizedName.includes(norm) || b.name.toLowerCase().includes(norm) || b.industry?.toLowerCase().includes(norm)
      );
    }

    const brandsWithStats = matchedBrands.map((brand) => {
      const sps = db.sponsorships.filter((s) => s.brandId === brand.id);
      const vids = sps.map((s) => db.videos.find((v) => v.id === s.videoId)).filter(Boolean);
      const totalViews = vids.reduce((acc, v) => acc + (v?.viewCount || 0), 0);
      const chIds = Array.from(new Set(sps.map((s) => s.channelId)));
      const chs = chIds.map((cid) => db.channels.find((c) => c.id === cid)).filter(Boolean);

      const sortedDates = sps.map((s) => new Date(s.detectedAt).getTime()).sort((a, b) => a - b);
      const lastDetected = sortedDates.length > 0 ? new Date(sortedDates[sortedDates.length - 1]).toISOString() : brand.createdAt;

      const note = getBrandCommercialNote(brand.id);

      return {
        id: brand.id,
        name: brand.name,
        website: brand.website,
        industry: brand.industry,
        contactEmail: brand.contactEmail,
        contactRole: brand.contactRole,
        collaborationsCount: sps.length,
        creatorsCount: chs.length,
        creators: chs,
        totalViews,
        lastDetected,
        commercialStatus: note?.commercialStatus || "A contacter",
        isFavorite: note?.isFavorite || false,
      };
    });

    return NextResponse.json({
      brands: brandsWithStats,
      totalCount: brandsWithStats.length,
    });
  } catch (err: any) {
    console.error("Error in brands API route:", err);
    return NextResponse.json({ error: err.message || "Failed to load brands" }, { status: 500 });
  }
}

// POST: Save Commercial Note & Status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, content, commercialStatus, isFavorite } = body;

    if (!brandId) {
      return NextResponse.json({ error: "brandId is required" }, { status: 400 });
    }

    const updated = saveBrandCommercialNote(brandId, {
      content,
      commercialStatus,
      isFavorite,
    });

    return NextResponse.json({ note: updated, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save note" }, { status: 500 });
  }
}
