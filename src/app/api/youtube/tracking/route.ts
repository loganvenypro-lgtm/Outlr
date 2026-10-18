import { NextRequest, NextResponse } from "next/server";
import { 
  getFolders, 
  createFolder, 
  deleteFolder, 
  getTrackedChannels, 
  trackChannel, 
  untrackChannel, 
  updateTrackedChannel,
  getChannelAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
  createChannelAlert
} from "@/lib/db";
import { searchChannels } from "@/lib/youtube";
import { parseISO8601Duration } from "@/lib/utils";
import { scrapeChannelRss } from "@/lib/youtube-scraper";

export const dynamic = "force-dynamic";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * GET: Retrieves tracking overview (folders, tracked channels, alerts, recent performer videos)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || undefined;
    const sync = searchParams.get("sync") === "true";

    const folders = getFolders();
    let channels = getTrackedChannels(folderId);
    let alerts = getChannelAlerts();

    // If sync requested or on initial check, fetch latest uploads for tracked channels to detect new videos and breakouts
    const apiKey = process.env.YOUTUBE_API_KEY;
    const recentPerformers: any[] = [];
    const nowMs = Date.now();

    if (channels.length > 0 && sync) {
      // High-speed parallel RSS Radar scan across all tracked channels (0 quota, live views)
      const syncPromises = channels.slice(0, 30).map(async (channel) => {
        try {
          const rssVideos = await scrapeChannelRss(channel.channelId);
          for (const r of rssVideos.slice(0, 5)) {
            const pubDate = new Date(r.publishedAt).getTime();
            const ageHours = Math.max((nowMs - pubDate) / (1000 * 3600), 0.25);
            const ageDays = ageHours / 24;

            const views = r.viewCount;
            const baseline = channel.baselineViews || 5000;
            const multiplier = parseFloat((baseline > 0 ? views / baseline : 1).toFixed(1));

            // Calculate Views Per Hour (VPH) & Velocity Multiplier
            const vph = Math.round(views / ageHours);
            const baselineVph = Math.max(Math.round(baseline / (24 * 7)), 10); // baseline VPH over 7 days
            const vphMultiplier = parseFloat((vph / baselineVph).toFixed(1));

            // 1. Detection of BRAND NEW UPLOADS (< 48h old)
            if (ageDays <= 2) {
              createChannelAlert({
                channelId: channel.channelId,
                channelName: channel.name,
                channelAvatar: channel.avatar,
                videoId: r.id,
                videoTitle: r.title,
                videoThumbnail: r.thumbnail,
                publishedAt: r.publishedAt,
                views,
                baselineViews: baseline,
                outlierMultiplier: multiplier,
                alertType: "new_upload",
                severity: ageHours <= 6 ? "high" : "medium",
                message: `⚡ Sortie radar il y a ${Math.round(ageHours)}h : "${r.title.slice(0, 50)}..." (${views.toLocaleString()} vues, ${vph.toLocaleString()} vues/h)`,
              });
            }

            // 2. Detection of Breakout videos (Outlier >= 2.0x or VPH >= 2.5x)
            if (multiplier >= 2.0 || (ageHours <= 72 && vphMultiplier >= 2.5)) {
              const maxRatio = Math.max(multiplier, vphMultiplier);
              createChannelAlert({
                channelId: channel.channelId,
                channelName: channel.name,
                channelAvatar: channel.avatar,
                videoId: r.id,
                videoTitle: r.title,
                videoThumbnail: r.thumbnail,
                publishedAt: r.publishedAt,
                views,
                baselineViews: baseline,
                outlierMultiplier: maxRatio,
                alertType: "breakout_video",
                severity: maxRatio >= 4.0 ? "high" : "medium",
                message: `🔥 ALERTE RADAR : Cette vidéo surperforme de ${maxRatio}x la moyenne de ${channel.name} (${vph.toLocaleString()} vues/h) après seulement ${Math.round(ageHours)}h !`,
              });
            }

            recentPerformers.push({
              video: {
                id: r.id,
                title: r.title,
                thumbnail: r.thumbnail,
                publishedAt: r.publishedAt,
                views,
                vph,
                vphMultiplier,
                durationFormatted: "Vidéo",
                outlierMultiplier: Math.max(multiplier, vphMultiplier),
                isNewUpload: ageDays <= 7,
              },
              channel: {
                id: channel.channelId,
                name: channel.name,
                avatar: channel.avatar,
                handle: channel.handle,
              },
            });
          }

          updateTrackedChannel(channel.channelId, {
            lastCheckedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error(`Error scanning RSS for ${channel.name}:`, e);
        }
      });

      await Promise.all(syncPromises);
      alerts = getChannelAlerts();
      channels = getTrackedChannels(folderId);
    }

    // Sort recent performers: prioritize newest release date first, then highest multiplier
    recentPerformers.sort((a, b) => {
      const dateA = new Date(a.video.publishedAt).getTime();
      const dateB = new Date(b.video.publishedAt).getTime();
      return dateB - dateA;
    });

    const stats = {
      totalTrackedChannels: channels.length,
      totalAlertsCount: alerts.length,
      unreadAlertsCount: alerts.filter((a) => !a.isRead).length,
      activeFoldersCount: folders.length,
    };

    return NextResponse.json({
      folders,
      channels,
      alerts,
      recentPerformers: recentPerformers.slice(0, 15),
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load tracking data" }, { status: 500 });
  }
}

/**
 * POST: Add a new channel to track, create folder, or trigger actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "track_channel";

    // 1. Create a Folder
    if (action === "create_folder") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json({ error: "Le nom du dossier est requis" }, { status: 400 });
      }
      const folder = createFolder(body.name, body.color || "blue", body.description);
      return NextResponse.json({ success: true, folder });
    }

    // 2. Track a Channel
    if (action === "track_channel") {
      let channelMeta = body.channel;

      // If only query/handle/URL was provided, fetch metadata via searchChannels
      if (!channelMeta && body.query) {
        const found = await searchChannels(body.query);
        if (found.length === 0) {
          return NextResponse.json({ error: "Chaîne introuvable sur YouTube" }, { status: 404 });
        }
        const top = found[0];
        channelMeta = {
          channelId: top.id,
          name: top.title,
          handle: top.customUrl || `@${top.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          avatar: top.thumbnail,
          subscribers: top.subscriberCount || 0,
          totalViews: top.viewCount || 0,
          videoCount: top.videoCount || 0,
        };
      }

      if (!channelMeta || !channelMeta.channelId) {
        return NextResponse.json({ error: "Données de la chaîne manquantes" }, { status: 400 });
      }

      const tracked = trackChannel({
        channelId: channelMeta.channelId,
        name: channelMeta.name,
        handle: channelMeta.handle,
        avatar: channelMeta.avatar,
        subscribers: channelMeta.subscribers,
        totalViews: channelMeta.totalViews,
        videoCount: channelMeta.videoCount,
        folderId: body.folderId,
        tags: body.tags,
        notes: body.notes,
        baselineViews: body.baselineViews,
      });

      // Synchronize with continuous unified intelligence database
      try {
        const { upsertUnifiedChannel } = await import("@/lib/intelligenceDb");
        upsertUnifiedChannel({
          id: channelMeta.channelId,
          name: channelMeta.name,
          handle: channelMeta.handle,
          thumbnailUrl: channelMeta.avatar,
          avatarUrl: channelMeta.avatar,
          subscriberCount: channelMeta.subscribers,
          totalViews: channelMeta.totalViews,
          videoCount: channelMeta.videoCount,
          isTracked: true,
          discoverySource: "channel_tracking",
        });
      } catch (err) {
        // Non-blocking
      }

      return NextResponse.json({ success: true, tracked });
    }

    // 3. Mark alert as read
    if (action === "mark_read") {
      if (body.alertId === "all") {
        markAllAlertsAsRead();
      } else if (body.alertId) {
        markAlertAsRead(body.alertId);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed tracking action" }, { status: 500 });
  }
}

/**
 * PATCH: Update notes, folder, or tags of a tracked channel
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;
    if (!id || !updates) {
      return NextResponse.json({ error: "ID et modifications requis" }, { status: 400 });
    }
    const updated = updateTrackedChannel(id, updates);
    return NextResponse.json({ success: true, updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Untrack a channel or delete a folder
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const folderId = searchParams.get("folderId");

    if (channelId) {
      const deleted = untrackChannel(channelId);
      return NextResponse.json({ success: deleted });
    }

    if (folderId) {
      const deleted = deleteFolder(folderId);
      return NextResponse.json({ success: deleted });
    }

    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
