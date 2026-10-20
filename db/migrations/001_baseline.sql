-- Baseline schema, generated from the live database on 2026-10-20.
-- Source of truth for the tables; supersedes prisma/schema.prisma and the ad-hoc CREATE TABLE in scripts/.
-- Apply on an empty database:  psql "$DATABASE_URL" -f db/migrations/001_baseline.sql

CREATE TABLE IF NOT EXISTS channel_alerts (
  id VARCHAR(64) NOT NULL,
  channel_id VARCHAR(64) NOT NULL,
  channel_name VARCHAR(255) NOT NULL,
  channel_avatar TEXT,
  video_id VARCHAR(32) NOT NULL,
  video_title TEXT NOT NULL,
  video_thumbnail TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  views BIGINT NOT NULL,
  baseline_views INTEGER NOT NULL,
  outlier_multiplier REAL NOT NULL,
  alert_type VARCHAR(64) NOT NULL,
  severity VARCHAR(32) DEFAULT 'info'::character varying,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT channel_alerts_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS channels (
  id VARCHAR(64) NOT NULL,
  youtube_channel_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(255),
  thumbnail_url TEXT,
  subscriber_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  median_views INTEGER DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT channels_youtube_channel_id_key UNIQUE (youtube_channel_id),
  CONSTRAINT channels_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS folders (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(32) DEFAULT 'blue'::character varying,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT folders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS tracked_channels (
  id VARCHAR(64) NOT NULL,
  channel_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  handle VARCHAR(255),
  avatar TEXT,
  subscribers INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  folder_id VARCHAR(64),
  tags TEXT[] DEFAULT '{}'::text[],
  notes TEXT,
  baseline_views INTEGER DEFAULT 1000,
  last_checked_at TIMESTAMPTZ DEFAULT now(),
  added_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT tracked_channels_channel_id_key UNIQUE (channel_id),
  CONSTRAINT tracked_channels_pkey PRIMARY KEY (id),
  CONSTRAINT tracked_channels_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  plan VARCHAR(32) DEFAULT 'Pro'::character varying,
  role VARCHAR(32) DEFAULT 'user'::character varying,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS videos (
  id VARCHAR(64) NOT NULL,
  youtube_video_id VARCHAR(32) NOT NULL,
  channel_id VARCHAR(64),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  duration_formatted VARCHAR(32),
  duration_seconds INTEGER DEFAULT 0,
  is_short BOOLEAN DEFAULT false,
  outlier_multiplier REAL DEFAULT 1.0,
  viral_breakout_score REAL DEFAULT 0.0,
  views_per_day REAL DEFAULT 0.0,
  title_pattern VARCHAR(100),
  category VARCHAR(100),
  niche VARCHAR(100),
  sub_niche VARCHAR(100),
  analyzed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT videos_youtube_video_id_key UNIQUE (youtube_video_id),
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_channels_yt_id ON channels USING btree (youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_videos_outlier ON videos USING btree (outlier_multiplier DESC);
CREATE INDEX IF NOT EXISTS idx_videos_pub ON videos USING btree (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_short ON videos USING btree (is_short);
CREATE INDEX IF NOT EXISTS idx_videos_vbs ON videos USING btree (viral_breakout_score DESC);
