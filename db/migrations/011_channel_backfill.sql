-- When a channel's full upload history was imported (channel page, first open).
ALTER TABLE channels ADD COLUMN IF NOT EXISTS backfilled_at TIMESTAMPTZ;
