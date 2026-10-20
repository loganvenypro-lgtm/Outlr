import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:marleybouba@localhost:5432/newiq';
const sql = postgres(connectionString);

async function initSchemaAndMigrate() {
  console.log("🚀 Initialisation des tables PostgreSQL...");

  try {
    // 1. Création des tables
    await sql`
      CREATE TABLE IF NOT EXISTS channels (
        id VARCHAR(64) PRIMARY KEY,
        youtube_channel_id VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        handle VARCHAR(255),
        thumbnail_url TEXT,
        subscriber_count INT DEFAULT 0,
        total_views BIGINT DEFAULT 0,
        video_count INT DEFAULT 0,
        median_views INT DEFAULT 0,
        category VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS videos (
        id VARCHAR(64) PRIMARY KEY,
        youtube_video_id VARCHAR(32) UNIQUE NOT NULL,
        channel_id VARCHAR(64) REFERENCES channels(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        thumbnail_url TEXT,
        published_at TIMESTAMPTZ NOT NULL,
        view_count BIGINT DEFAULT 0,
        like_count INT DEFAULT 0,
        comment_count INT DEFAULT 0,
        duration_formatted VARCHAR(32),
        duration_seconds INT DEFAULT 0,
        is_short BOOLEAN DEFAULT FALSE,
        outlier_multiplier REAL DEFAULT 1.0,
        viral_breakout_score REAL DEFAULT 0.0,
        views_per_day REAL DEFAULT 0.0,
        title_pattern VARCHAR(100),
        category VARCHAR(100),
        niche VARCHAR(100),
        sub_niche VARCHAR(100),
        analyzed_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS folders (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(32) DEFAULT 'blue',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tracked_channels (
        id VARCHAR(64) PRIMARY KEY,
        channel_id VARCHAR(64) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        handle VARCHAR(255),
        avatar TEXT,
        subscribers INT DEFAULT 0,
        total_views BIGINT DEFAULT 0,
        video_count INT DEFAULT 0,
        folder_id VARCHAR(64) REFERENCES folders(id) ON DELETE SET NULL,
        tags TEXT[] DEFAULT '{}',
        notes TEXT,
        baseline_views INT DEFAULT 1000,
        last_checked_at TIMESTAMPTZ DEFAULT NOW(),
        added_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS channel_alerts (
        id VARCHAR(64) PRIMARY KEY,
        channel_id VARCHAR(64) NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        channel_avatar TEXT,
        video_id VARCHAR(32) NOT NULL,
        video_title TEXT NOT NULL,
        video_thumbnail TEXT,
        published_at TIMESTAMPTZ NOT NULL,
        views BIGINT NOT NULL,
        baseline_views INT NOT NULL,
        outlier_multiplier REAL NOT NULL,
        alert_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) DEFAULT 'info',
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // Index de performance pour lecture ultra rapide (0-15ms)
    await sql`CREATE INDEX IF NOT EXISTS idx_videos_vbs ON videos (viral_breakout_score DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_videos_outlier ON videos (outlier_multiplier DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_videos_short ON videos (is_short);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_videos_pub ON videos (published_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_channels_yt_id ON channels (youtube_channel_id);`;

    console.log("✅ Tables et index PostgreSQL créés avec succès !");

    // 2. Migration des Dossiers & Tracked Channels depuis sponsor_database.json
    console.log("📦 Ingestion de sponsor_database.json...");
    if (fs.existsSync("data/sponsor_database.json")) {
      const sdb = JSON.parse(fs.readFileSync("data/sponsor_database.json", "utf8"));
      
      for (const f of sdb.folders || []) {
        await sql`
          INSERT INTO folders (id, name, color, description, created_at)
          VALUES (${f.id}, ${f.name}, ${f.color || 'blue'}, ${f.description || null}, ${f.createdAt || new Date()})
          ON CONFLICT (id) DO NOTHING;
        `;
      }

      for (const tc of sdb.trackedChannels || []) {
        await sql`
          INSERT INTO tracked_channels (id, channel_id, name, handle, avatar, subscribers, total_views, video_count, folder_id, tags, notes, baseline_views, last_checked_at, added_at)
          VALUES (
            ${tc.id}, ${tc.channelId}, ${tc.name}, ${tc.handle || null}, ${tc.avatar}, 
            ${tc.subscribers || 0}, ${tc.totalViews || 0}, ${tc.videoCount || 0}, 
            ${tc.folderId || null}, ${tc.tags || []}, ${tc.notes || null}, 
            ${tc.baselineViews || 1000}, ${tc.lastCheckedAt || new Date()}, ${tc.addedAt || new Date()}
          )
          ON CONFLICT (channel_id) DO UPDATE SET
            subscribers = EXCLUDED.subscribers,
            total_views = EXCLUDED.total_views;
        `;
      }
    }

    // 3. Ingestion des chaînes depuis channel_stats_cache.json
    console.log("📦 Ingestion des chaînes uniques...");
    const channelMap = new Map();
    if (fs.existsSync("data/channel_stats_cache.json")) {
      const csc = JSON.parse(fs.readFileSync("data/channel_stats_cache.json", "utf8"));
      for (const [chId, data] of Object.entries(csc)) {
        if (!chId) continue;
        channelMap.set(chId, {
          id: `ch-${chId}`,
          youtubeChannelId: chId,
          name: data.title || "Chaîne YouTube",
          thumbnailUrl: data.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chId}`,
          medianViews: data.medianViews || 0,
          subscriberCount: data.subscribers || 0,
        });
      }
    }

    // 4. Ingestion de viral_videos_index.json (3 000 vidéos atypiques)
    console.log("📦 Ingestion des 3 000 vidéos atypiques (viral_videos_index.json)...");
    let insertedVids = 0;
    if (fs.existsSync("data/viral_videos_index.json")) {
      const viral = JSON.parse(fs.readFileSync("data/viral_videos_index.json", "utf8"));
      
      // Assurer l'existence des chaînes d'abord
      for (const v of viral) {
        const chYtId = v.channelId || `gen-${v.id}`;
        if (!channelMap.has(chYtId)) {
          channelMap.set(chYtId, {
            id: `ch-${chYtId}`,
            youtubeChannelId: chYtId,
            name: v.channelTitle || "Créateur YouTube",
            thumbnailUrl: v.channelAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${chYtId}`,
            medianViews: v.channelMedianViews || 0,
            subscriberCount: v.channelSubscribers || 0,
          });
        }
      }

      // Insertion en batch des chaînes
      const channelsArray = Array.from(channelMap.values());
      console.log(`⏳ Insertion de ${channelsArray.length} chaînes dans PostgreSQL...`);
      for (const ch of channelsArray) {
        await sql`
          INSERT INTO channels (id, youtube_channel_id, name, thumbnail_url, median_views, subscriber_count)
          VALUES (${ch.id}, ${ch.youtubeChannelId}, ${ch.name}, ${ch.thumbnailUrl}, ${ch.medianViews}, ${ch.subscriberCount})
          ON CONFLICT (youtube_channel_id) DO UPDATE SET
            median_views = EXCLUDED.median_views,
            subscriber_count = EXCLUDED.subscriber_count;
        `;
      }

      // Insertion des vidéos
      console.log(`⏳ Insertion des vidéos dans PostgreSQL...`);
      for (const v of viral) {
        const chYtId = v.channelId || `gen-${v.id}`;
        const chInternalId = `ch-${chYtId}`;
        const isShort = (v.durationSeconds !== undefined && v.durationSeconds <= 70) || v.title.toLowerCase().includes("#short");

        await sql`
          INSERT INTO videos (
            id, youtube_video_id, channel_id, title, thumbnail_url, published_at,
            view_count, duration_formatted, duration_seconds, is_short,
            outlier_multiplier, viral_breakout_score, views_per_day,
            title_pattern, category, sub_niche
          )
          VALUES (
            ${`vid-${v.id}`}, ${v.id}, ${chInternalId}, ${v.title}, ${v.thumbnail}, ${new Date(v.publishedAt)},
            ${v.viewCount || 0}, ${v.durationFormatted || '10:00'}, ${v.durationSeconds || 600}, ${isShort},
            ${v.outlierMultiplier || 1.0}, ${v.viralBreakoutScore || 0.0}, ${v.viewsPerDay || 0.0},
            ${v.titlePattern || null}, ${v.category || 'General'}, ${v.subNiche || null}
          )
          ON CONFLICT (youtube_video_id) DO UPDATE SET
            view_count = EXCLUDED.view_count,
            outlier_multiplier = EXCLUDED.outlier_multiplier,
            viral_breakout_score = EXCLUDED.viral_breakout_score;
        `;
        insertedVids++;
      }
    }

    // Récupération des totaux vérifiés
    const countChannels = await sql`SELECT count(*) FROM channels`;
    const countVideos = await sql`SELECT count(*) FROM videos`;
    const countTracked = await sql`SELECT count(*) FROM tracked_channels`;

    console.log("\n🎉 ========================================================");
    console.log("   MIGRATION POSTGRESQL TERMINÉE AVEC SUCCÈS !");
    console.log(`   - Chaînes en base : ${countChannels[0].count}`);
    console.log(`   - Vidéos atypiques indexées : ${countVideos[0].count}`);
    console.log(`   - Chaînes suivies (Tracked) : ${countTracked[0].count}`);
    console.log("========================================================\n");

  } catch (err) {
    console.error("❌ Erreur pendant la migration :", err);
  } finally {
    await sql.end();
  }
}

initSchemaAndMigrate();
