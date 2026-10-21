-- Per-user folders ("Dossiers") to save videos and channels. The older `folders`
-- table groups tracked channels and is unrelated. Items keep a snapshot of what the
-- card showed (title, thumbnail, stats) so a folder renders even if the video or
-- channel is not in our database.
CREATE TABLE IF NOT EXISTS saved_folders (
  id          VARCHAR(32) PRIMARY KEY,
  user_id     VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_folders_user_idx ON saved_folders (user_id, created_at);

CREATE TABLE IF NOT EXISTS saved_folder_items (
  folder_id   VARCHAR(32) NOT NULL REFERENCES saved_folders(id) ON DELETE CASCADE,
  item_type   VARCHAR(16) NOT NULL CHECK (item_type IN ('video', 'channel')),
  item_id     VARCHAR(64) NOT NULL,
  snapshot    JSONB NOT NULL DEFAULT '{}'::jsonb,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS saved_folder_items_item_idx ON saved_folder_items (item_type, item_id);
