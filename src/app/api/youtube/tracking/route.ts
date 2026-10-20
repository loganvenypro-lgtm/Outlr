import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { searchChannels } from "@/lib/youtube";
import { scrapeChannelRss } from "@/lib/youtube-scraper";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieves tracking overview directly from PostgreSQL (folders, tracked channels, alerts, recent performer videos)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || undefined;
    const sync = searchParams.get("sync") === "true";

    // 1. Fetch folders from PostgreSQL
    const rawFolders = await sql`
      SELECT id, name, color, description, created_at as "createdAt"
      FROM folders
      ORDER BY created_at ASC
    `;
    const folders = rawFolders.map((f: any) => ({
      id: f.id,
      name: f.name,
      color: f.color || "blue",
      description: f.description || "",
      createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
    }));

    // 2. Fetch tracked channels from PostgreSQL
    let rawChannels = [];
    if (folderId && folderId !== "all") {
      rawChannels = await sql`
        SELECT 
          id, 
          channel_id as "channelId", 
          name, 
          handle, 
          avatar, 
          subscribers, 
          total_views as "totalViews", 
          video_count as "videoCount", 
          folder_id as "folderId", 
          tags, 
          notes, 
          baseline_views as "baselineViews", 
          last_checked_at as "lastCheckedAt", 
          added_at as "addedAt"
        FROM tracked_channels
        WHERE folder_id = ${folderId}
        ORDER BY added_at DESC
      `;
    } else {
      rawChannels = await sql`
        SELECT 
          id, 
          channel_id as "channelId", 
          name, 
          handle, 
          avatar, 
          subscribers, 
          total_views as "totalViews", 
          video_count as "videoCount", 
          folder_id as "folderId", 
          tags, 
          notes, 
          baseline_views as "baselineViews", 
          last_checked_at as "lastCheckedAt", 
          added_at as "addedAt"
        FROM tracked_channels
        ORDER BY added_at DESC
      `;
    }

    const channels = rawChannels.map((c: any) => ({
      id: c.id,
      channelId: c.channelId,
      name: c.name,
      handle: c.handle || `@${c.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      avatar: c.avatar,
      subscribers: parseInt(c.subscribers || "0", 10),
      totalViews: parseInt(c.totalViews || "0", 10),
      videoCount: parseInt(c.videoCount || "0", 10),
      folderId: c.folderId,
      tags: Array.isArray(c.tags) ? c.tags : ["Concurrent"],
      notes: c.notes || "",
      baselineViews: parseInt(c.baselineViews || "5000", 10),
      lastCheckedAt: c.lastCheckedAt ? new Date(c.lastCheckedAt).toISOString() : new Date().toISOString(),
      addedAt: c.addedAt ? new Date(c.addedAt).toISOString() : new Date().toISOString(),
    }));

    // 3. Fetch alerts from PostgreSQL
    const rawAlerts = await sql`
      SELECT 
        id, 
        channel_id as "channelId", 
        channel_name as "channelName", 
        channel_avatar as "channelAvatar", 
        video_id as "videoId", 
        video_title as "videoTitle", 
        video_thumbnail as "videoThumbnail", 
        published_at as "publishedAt", 
        views, 
        baseline_views as "baselineViews", 
        outlier_multiplier as "outlierMultiplier", 
        alert_type as "alertType", 
        severity, 
        message, 
        is_read as "isRead", 
        created_at as "createdAt"
      FROM channel_alerts
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const alerts = rawAlerts.map((a: any) => ({
      id: a.id,
      channelId: a.channelId,
      channelName: a.channelName,
      channelAvatar: a.channelAvatar,
      videoId: a.videoId,
      videoTitle: a.videoTitle,
      videoThumbnail: a.videoThumbnail,
      publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : new Date().toISOString(),
      views: parseInt(a.views || "0", 10),
      baselineViews: parseInt(a.baselineViews || "5000", 10),
      outlierMultiplier: parseFloat(a.outlierMultiplier || "1.0"),
      alertType: a.alertType,
      severity: a.severity,
      message: a.message,
      isRead: !!a.isRead,
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
    }));

    // 4. Sync RSS Radar scan if requested
    const recentPerformers: any[] = [];
    const nowMs = Date.now();

    if (channels.length > 0 && sync) {
      const syncPromises = channels.slice(0, 25).map(async (channel) => {
        try {
          const rssVideos = await scrapeChannelRss(channel.channelId);
          for (const r of rssVideos.slice(0, 5)) {
            const pubDate = new Date(r.publishedAt).getTime();
            const ageHours = Math.max((nowMs - pubDate) / (1000 * 3600), 0.25);
            const ageDays = ageHours / 24;

            const views = r.viewCount;
            const baseline = channel.baselineViews || 5000;
            const multiplier = parseFloat((baseline > 0 ? views / baseline : 1).toFixed(1));

            const vph = Math.round(views / ageHours);
            const baselineVph = Math.max(Math.round(baseline / (24 * 7)), 10);
            const vphMultiplier = parseFloat((vph / baselineVph).toFixed(1));

            // Breakout detection
            if (multiplier >= 2.0 || (ageHours <= 72 && vphMultiplier >= 2.5)) {
              const maxRatio = Math.max(multiplier, vphMultiplier);
              // Insert alert once per video (the id is random, so dedupe on video_id + alert_type)
              try {
                await sql`
                  INSERT INTO channel_alerts (
                    id, channel_id, channel_name, channel_avatar, video_id, video_title, video_thumbnail, published_at, views, baseline_views, outlier_multiplier, alert_type, severity, message, is_read, created_at
                  )
                  SELECT
                    ${uuidv4()}, ${channel.channelId}, ${channel.name}, ${channel.avatar}, ${r.id}, ${r.title}, ${r.thumbnail}, ${r.publishedAt}, ${views}, ${baseline}, ${maxRatio}, 'breakout_video', ${maxRatio >= 4.0 ? 'high' : 'medium'}, ${`🔥 ALERTE RADAR : Cette vidéo surperforme de ${maxRatio}x (${vph.toLocaleString()} vues/h)`}, false, NOW()
                  WHERE NOT EXISTS (
                    SELECT 1 FROM channel_alerts WHERE video_id = ${r.id} AND alert_type = 'breakout_video'
                  )
                  ON CONFLICT DO NOTHING
                `;
              } catch {
                // Ignore alert duplicate
              }
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

          // Update last checked time in PostgreSQL (concurrency safe)
          await sql`
            UPDATE tracked_channels
            SET last_checked_at = NOW()
            WHERE channel_id = ${channel.channelId}
          `;
        } catch (e) {
          console.error(`Error scanning RSS for ${channel.name}:`, e);
        }
      });

      await Promise.all(syncPromises);
    }

    // Sort recent performers: newest first, then highest multiplier
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
    console.error("Error in /api/youtube/tracking GET:", err);
    return NextResponse.json({ error: err.message || "Failed to load tracking data from PostgreSQL" }, { status: 500 });
  }
}

/**
 * POST: Add a new channel to track, create folder, or trigger actions directly into PostgreSQL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || "track_channel";

    // 1. Create a Folder in PostgreSQL
    if (action === "create_folder") {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json({ error: "Le nom du dossier est requis" }, { status: 400 });
      }
      const folderId = `f-${uuidv4().slice(0, 8)}`;
      const folderName = body.name.trim();
      const folderColor = body.color || "blue";
      const folderDesc = body.description || null;

      await sql`
        INSERT INTO folders (id, name, color, description, created_at)
        VALUES (${folderId}, ${folderName}, ${folderColor}, ${folderDesc}, NOW())
      `;

      return NextResponse.json({
        success: true,
        folder: {
          id: folderId,
          name: folderName,
          color: folderColor,
          description: folderDesc,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // 2. Track a Channel in PostgreSQL
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

      const baseline = body.baselineViews || (channelMeta.videoCount > 0 ? Math.round(channelMeta.totalViews / channelMeta.videoCount) : 1000);
      const trackedId = uuidv4();
      const tags = body.tags || ["Concurrent"];

      // Upsert into PostgreSQL tracked_channels
      await sql`
        INSERT INTO tracked_channels (
          id, channel_id, name, handle, avatar, subscribers, total_views, video_count, folder_id, tags, notes, baseline_views, last_checked_at, added_at
        ) VALUES (
          ${trackedId}, 
          ${channelMeta.channelId}, 
          ${channelMeta.name}, 
          ${channelMeta.handle}, 
          ${channelMeta.avatar}, 
          ${channelMeta.subscribers || 0}, 
          ${channelMeta.totalViews || 0}, 
          ${channelMeta.videoCount || 0}, 
          ${body.folderId || null}, 
          ${tags}, 
          ${body.notes || ''}, 
          ${baseline}, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (channel_id) DO UPDATE SET
          name = EXCLUDED.name,
          handle = EXCLUDED.handle,
          avatar = EXCLUDED.avatar,
          subscribers = EXCLUDED.subscribers,
          total_views = EXCLUDED.total_views,
          video_count = EXCLUDED.video_count,
          last_checked_at = NOW()
      `;

      return NextResponse.json({
        success: true,
        tracked: {
          id: trackedId,
          channelId: channelMeta.channelId,
          name: channelMeta.name,
          handle: channelMeta.handle,
          avatar: channelMeta.avatar,
          subscribers: channelMeta.subscribers,
          totalViews: channelMeta.totalViews,
          videoCount: channelMeta.videoCount,
          baselineViews: baseline,
        },
      });
    }

    // 3. Mark alert as read in PostgreSQL
    if (action === "mark_read") {
      if (body.alertId === "all") {
        await sql`UPDATE channel_alerts SET is_read = true`;
      } else if (body.alertId) {
        await sql`UPDATE channel_alerts SET is_read = true WHERE id = ${body.alertId}`;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in /api/youtube/tracking POST:", err);
    return NextResponse.json({ error: err.message || "Failed tracking action in PostgreSQL" }, { status: 500 });
  }
}

/**
 * PATCH: Update notes, folder, or tags of a tracked channel in PostgreSQL
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;
    if (!id || !updates) {
      return NextResponse.json({ error: "ID et modifications requis" }, { status: 400 });
    }

    if (updates.notes !== undefined) {
      await sql`UPDATE tracked_channels SET notes = ${updates.notes} WHERE id = ${id} OR channel_id = ${id}`;
    }
    if (updates.folderId !== undefined) {
      await sql`UPDATE tracked_channels SET folder_id = ${updates.folderId || null} WHERE id = ${id} OR channel_id = ${id}`;
    }
    if (updates.tags !== undefined) {
      await sql`UPDATE tracked_channels SET tags = ${updates.tags} WHERE id = ${id} OR channel_id = ${id}`;
    }

    return NextResponse.json({ success: true, updated: updates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE: Untrack a channel or delete a folder in PostgreSQL
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const folderId = searchParams.get("folderId");

    if (channelId) {
      await sql`DELETE FROM tracked_channels WHERE channel_id = ${channelId} OR id = ${channelId}`;
      return NextResponse.json({ success: true });
    }

    if (folderId) {
      await sql`DELETE FROM folders WHERE id = ${folderId}`;
      await sql`UPDATE tracked_channels SET folder_id = NULL WHERE folder_id = ${folderId}`;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
