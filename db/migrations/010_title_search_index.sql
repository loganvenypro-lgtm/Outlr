-- Full-text index on titles for "similar videos" in the video modal.
CREATE INDEX IF NOT EXISTS idx_videos_title_fts ON videos USING gin (to_tsvector('simple', title));
