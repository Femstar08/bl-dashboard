-- Requirements table
CREATE TABLE IF NOT EXISTS bl_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE NOT NULL,
  phase text NOT NULL,
  domain text NOT NULL,
  requirement text NOT NULL,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Backlog',
  assigned_to text,
  complexity text DEFAULT 'M',
  dependencies text[] DEFAULT '{}',
  acceptance_criteria text,
  saas_tier_gate text DEFAULT 'All Tiers',
  upgrade_feature boolean DEFAULT false,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phases table
CREATE TABLE IF NOT EXISTS bl_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase text UNIQUE NOT NULL,
  description text,
  week_target text,
  dependencies text,
  total_reqs integer DEFAULT 0,
  critical_count integer DEFAULT 0,
  gate_criteria text
);

-- Content calendar table
CREATE TABLE IF NOT EXISTS bl_content_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week integer NOT NULL,
  publish_date date NOT NULL,
  day text NOT NULL,
  channel text NOT NULL,
  format text NOT NULL,
  pillar text NOT NULL,
  topic text NOT NULL,
  key_message text,
  cta text,
  script_draft text,
  status text NOT NULL DEFAULT 'To Draft',
  performance jsonb,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments table (polymorphic)
CREATE TABLE IF NOT EXISTS bl_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_id uuid REFERENCES bl_comments(id),
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Sync config table
CREATE TABLE IF NOT EXISTS bl_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  google_sheet_id text,
  sheet_tab text,
  last_synced_at timestamptz,
  sync_enabled boolean DEFAULT false
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bl_requirements_phase ON bl_requirements(phase);
CREATE INDEX IF NOT EXISTS idx_bl_requirements_status ON bl_requirements(status);
CREATE INDEX IF NOT EXISTS idx_bl_requirements_priority ON bl_requirements(priority);
CREATE INDEX IF NOT EXISTS idx_bl_content_calendar_status ON bl_content_calendar(status);
CREATE INDEX IF NOT EXISTS idx_bl_content_calendar_publish_date ON bl_content_calendar(publish_date);
CREATE INDEX IF NOT EXISTS idx_bl_comments_entity ON bl_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bl_comments_parent ON bl_comments(parent_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER trg_bl_requirements_updated
  BEFORE UPDATE ON bl_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bl_content_calendar_updated
  BEFORE UPDATE ON bl_content_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bl_comments_updated
  BEFORE UPDATE ON bl_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
