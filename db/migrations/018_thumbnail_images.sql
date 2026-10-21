-- Keep the picture of each thumbnail version (320x180 mqdefault, ~10 KB): YouTube
-- only serves the current one, so past A/B variants are lost unless saved when seen.
ALTER TABLE video_variants ADD COLUMN IF NOT EXISTS image BYTEA;
