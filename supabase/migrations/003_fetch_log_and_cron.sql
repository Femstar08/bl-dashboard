-- Fetch log table for pipeline health tracking
CREATE TABLE IF NOT EXISTS bb_fetch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES bb_news_sources(id) ON DELETE SET NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  articles_found integer NOT NULL DEFAULT 0,
  articles_inserted integer NOT NULL DEFAULT 0,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_bb_fetch_log_source ON bb_fetch_log(source_id);
CREATE INDEX IF NOT EXISTS idx_bb_fetch_log_fetched_at ON bb_fetch_log(fetched_at DESC);

-- Enable pg_net extension for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
