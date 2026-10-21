-- Personal keys a user creates in Settings > Claude to connect Claude to /api/mcp.
-- Only the SHA-256 of the key is stored; the key itself is shown once at creation.
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id            VARCHAR(32) PRIMARY KEY,
  user_id       VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  key_hash      CHAR(64) NOT NULL UNIQUE,
  key_prefix    VARCHAR(16) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS mcp_api_keys_user_idx ON mcp_api_keys (user_id, created_at DESC);
