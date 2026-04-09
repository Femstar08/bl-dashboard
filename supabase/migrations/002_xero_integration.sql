-- Xero OAuth token storage
CREATE TABLE IF NOT EXISTS bl_xero_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL UNIQUE,        -- Xero organisation ID
  tenant_name text,                       -- Xero organisation name
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scopes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Xero invoices cache for MRR calculation
CREATE TABLE IF NOT EXISTS bl_xero_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  xero_invoice_id text NOT NULL UNIQUE,
  xero_contact_id text,
  contact_name text,
  invoice_number text,
  reference text,
  invoice_type text,                      -- ACCREC (sales) or ACCPAY (bills)
  status text,                            -- DRAFT, SUBMITTED, AUTHORISED, PAID, VOIDED
  currency_code text DEFAULT 'GBP',
  sub_total numeric(10,2),
  total_tax numeric(10,2),
  total numeric(10,2),
  amount_due numeric(10,2),
  amount_paid numeric(10,2),
  date date,
  due_date date,
  is_recurring boolean DEFAULT false,
  line_items jsonb,
  synced_at timestamptz DEFAULT now()
);

-- Index for MRR queries
CREATE INDEX idx_xero_invoices_type_status ON bl_xero_invoices(invoice_type, status);
CREATE INDEX idx_xero_invoices_date ON bl_xero_invoices(date DESC);

-- Sync log
CREATE TABLE IF NOT EXISTS bl_xero_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,                -- 'invoices', 'contacts', 'full'
  status text NOT NULL,                   -- 'started', 'completed', 'failed'
  records_synced int DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Add actual MRR column to revenue targets (populated by Xero sync)
ALTER TABLE bl_revenue_targets ADD COLUMN IF NOT EXISTS consulting_actual numeric(10,2) DEFAULT 0;
ALTER TABLE bl_revenue_targets ADD COLUMN IF NOT EXISTS saas_actual numeric(10,2) DEFAULT 0;

-- Enable RLS
ALTER TABLE bl_xero_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bl_xero_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bl_xero_sync_log ENABLE ROW LEVEL SECURITY;

-- Policies: allow all for authenticated users (internal dashboard)
CREATE POLICY "Authenticated users can manage xero tokens" ON bl_xero_tokens FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage xero invoices" ON bl_xero_invoices FOR ALL USING (true);
CREATE POLICY "Authenticated users can manage xero sync log" ON bl_xero_sync_log FOR ALL USING (true);
