-- Admin area: who is admin, and a trace of every onboarding analysis (the competitor
-- engine result and the AI's explanation), which was only streamed to the browser.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS onboarding_analyses (
  id            BIGSERIAL PRIMARY KEY,
  user_id       VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  input_channel TEXT,
  niche         VARCHAR(64),
  role          VARCHAR(32),
  reference     JSONB,
  competitors   JSONB NOT NULL DEFAULT '[]'::jsonb,
  insights      JSONB,
  error         TEXT,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS onboarding_analyses_user_idx ON onboarding_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS onboarding_analyses_created_idx ON onboarding_analyses (created_at DESC);
