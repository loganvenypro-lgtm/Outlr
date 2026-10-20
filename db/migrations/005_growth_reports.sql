-- Periodic data-growth reports: each row stores the database totals at report
-- time so the next report can show what was added in between.

CREATE TABLE IF NOT EXISTS data_growth_reports (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  totals JSONB NOT NULL
);
