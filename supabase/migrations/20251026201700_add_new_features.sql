-- Add new tables for AI extractions, bank transactions, tax rates, and enhance recurring logic

-- Table for uploaded files
CREATE TABLE uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  uploaded_at timestamp with time zone default now(),
  extracted_data jsonb,
  status text default 'pending'
);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own files" ON uploaded_files FOR ALL TO authenticated USING (user_id = auth.uid());

-- Table for AI extractions
CREATE TABLE ai_extractions (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references uploaded_files(id) not null,
  extracted_text text,
  extracted_fields jsonb,
  created_at timestamp with time zone default now()
);

ALTER TABLE ai_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view extractions for their files" ON ai_extractions FOR SELECT TO authenticated USING (
  file_id IN (SELECT id FROM uploaded_files WHERE user_id = auth.uid())
);

-- Table for bank transactions
CREATE TABLE bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  account_id text not null,
  amount numeric not null,
  date timestamp with time zone not null,
  description text,
  balance numeric,
  status text default 'pending',
  matched_invoice_id uuid references invoices(id),
  created_at timestamp with time zone default now()
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their bank transactions" ON bank_transactions FOR ALL TO authenticated USING (user_id = auth.uid());

-- Table for tax rates
CREATE TABLE tax_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  rate numeric not null,
  region text,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tax rates" ON tax_rates FOR ALL TO authenticated USING (user_id = auth.uid());

-- Enhance recurring_invoices with state machine
CREATE TYPE recurring_state AS ENUM ('draft', 'active', 'paused', 'canceled');

ALTER TABLE recurring_invoices ADD COLUMN state recurring_state default 'draft';
ALTER TABLE recurring_invoices ADD COLUMN rules jsonb;
ALTER TABLE recurring_invoices ADD COLUMN last_state_change_at timestamp with time zone;

-- Table for recurring invoice history
CREATE TABLE recurring_invoice_history (
  id uuid primary key default gen_random_uuid(),
  recurring_invoice_id uuid references recurring_invoices(id) not null,
  old_state recurring_state,
  new_state recurring_state,
  changed_at timestamp with time zone default now(),
  changed_by uuid references auth.users(id)
);

ALTER TABLE recurring_invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their recurring invoices" ON recurring_invoice_history FOR SELECT TO authenticated USING (
  recurring_invoice_id IN (SELECT id FROM recurring_invoices WHERE user_id = auth.uid())
);