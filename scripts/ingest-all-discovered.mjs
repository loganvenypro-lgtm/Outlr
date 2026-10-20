import postgres from 'postgres';
import fs from 'fs';

try { process.loadEnvFile('.env.local'); } catch {}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant (voir .env.local)');
const sql = postgres(connectionString);

async function migrateAllDiscoveredVideos() {
  console.log("🚀 Démarrage de l'ingestion complète des 16 650 vidéos et de leurs chaînes...");

  if (!fs.existsSync("data/discovered_videos_cache.json")) {
    console.log("Fichier data/discovered_videos_cache.json non trouvé.");
    await sql.end();
    return;
  }

  const rawCache = JSON.parse(fs.readFileSync("data/discovered_videos_cache.json", "utf8"));
  
  // 1. Extraire toutes les vidéos uniques
  const videoMap = new Map();
  const channelMap = new Map();

  for (const queryKey of Object.keys(rawCache)) {
    const list = rawCache[queryKey] || [];
    for (const v of list) {
      if (!v || !v.id) continue;
      
      const chYtId = v.channelId || `gen-${v.id}`;
      if (!channelMap.has(chYtId)) {
        channelMap.set(chYtId, {
          id: `ch-${chYtId}`,
          youtubeChannelId: chYtId,
          name: v.channelTitle || "Créateur YouTube",
          thumbnailUrl: v.channelAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chYtId}`,
          medianViews: v.baselineViews || 0,
          subscriberCount: v.channelSubscribers || 0,
        });
      }

      if (!videoMap.has(v.id)) {
        videoMap.set(v.id, {
          ...v,
          chYtId,
          queryKey
        });
      }
    }
  }

  console.log(`📊 Statistiques brutes : ${channelMap.size} chaînes uniques et ${videoMap.size} vidéos uniques.`);

  // 2. Insérer toutes les chaînes par lots (batches)
  const channelsList = Array.from(channelMap.values());
  const CHUNK_SIZE = 500;
  
  console.log(`⏳ Insertion des ${channelsList.length} chaînes dans PostgreSQL...`);
  for (let i = 0; i < channelsList.length; i += CHUNK_SIZE) {
    const chunk = channelsList.slice(i, i + CHUNK_SIZE);
    for (const ch of chunk) {
      await sql`
        INSERT INTO channels (id, youtube_channel_id, name, thumbnail_url, median_views, subscriber_count)
        VALUES (${ch.id}, ${ch.youtubeChannelId}, ${ch.name}, ${ch.thumbnailUrl}, ${ch.medianViews}, ${ch.subscriberCount})
        ON CONFLICT (youtube_channel_id) DO UPDATE SET
          median_views = GREATEST(channels.median_views, EXCLUDED.median_views),
          subscriber_count = GREATEST(channels.subscriber_count, EXCLUDED.subscriber_count);
      `;
    }
  }

  // 3. Insérer toutes les vidéos par lots
  const videosList = Array.from(videoMap.values());
  console.log(`⏳ Insertion des ${videosList.length} vidéos dans PostgreSQL...`);

  for (let i = 0; i < videosList.length; i += CHUNK_SIZE) {
    const chunk = videosList.slice(i, i + CHUNK_SIZE);
    for (const v of chunk) {
      const chInternalId = `ch-${v.chYtId}`;
      const isShort = (v.durationSeconds !== undefined && v.durationSeconds <= 70) || (v.title && v.title.toLowerCase().includes("#short"));
      const pubDate = v.publishedAt ? new Date(v.publishedAt) : new Date();

      await sql`
        INSERT INTO videos (
          id, youtube_video_id, channel_id, title, description, thumbnail_url, published_at,
          view_count, duration_formatted, duration_seconds, is_short,
          outlier_multiplier, viral_breakout_score, views_per_day,
          title_pattern, category, sub_niche
        )
        VALUES (
          ${`vid-${v.id}`}, ${v.id}, ${chInternalId}, ${v.title || 'Vidéo YouTube'}, ${v.description || null},
          ${v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}, ${pubDate},
          ${v.viewCount || 0}, ${v.durationFormatted || '10:00'}, ${v.durationSeconds || 600}, ${isShort},
          ${v.outlierMultiplier || 1.0}, ${v.viralBreakoutScore || 0.0}, ${v.viewsPerDay || 0.0},
          ${v.titlePattern || null}, ${v.category || v.foundViaQuery || 'Trending'}, ${v.breakoutTopicLabel || v.subNiche || null}
        )
        ON CONFLICT (youtube_video_id) DO UPDATE SET
          view_count = EXCLUDED.view_count,
          outlier_multiplier = GREATEST(videos.outlier_multiplier, EXCLUDED.outlier_multiplier),
          viral_breakout_score = GREATEST(videos.viral_breakout_score, EXCLUDED.viral_breakout_score);
      `;
    }
    console.log(`   ➔ ${Math.min(i + CHUNK_SIZE, videosList.length)} / ${videosList.length} vidéos ingérées...`);
  }

  const totalChannels = await sql`SELECT count(*) FROM channels`;
  const totalVideos = await sql`SELECT count(*) FROM videos`;

  console.log("\n🎉 ========================================================");
  console.log("   INGESTION TOTALE TERMINÉE !");
  console.log(`   - Total chaînes dans Postgres : ${totalChannels[0].count}`);
  console.log(`   - Total vidéos dans Postgres : ${totalVideos[0].count}`);
  console.log("========================================================\n");

  await sql.end();
}

migrateAllDiscoveredVideos().catch(console.error);
