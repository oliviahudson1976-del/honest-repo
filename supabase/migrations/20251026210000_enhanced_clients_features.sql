-- Enhanced Client Features Migration
-- Adds comprehensive client management capabilities

-- Add new fields to clients table
ALTER TABLE clients ADD COLUMN tax_id text;
ALTER TABLE clients ADD COLUMN payment_terms text DEFAULT 'Net 30';
ALTER TABLE clients ADD COLUMN preferred_currency text DEFAULT 'USD';
ALTER TABLE clients ADD COLUMN health_score integer DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100);
ALTER TABLE clients ADD COLUMN tags text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN last_activity_at timestamp with time zone;
ALTER TABLE clients ADD COLUMN last_activity_type text;

-- Create client_contacts table for role-based contacts
CREATE TABLE client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  role text not null CHECK (role IN ('primary', 'billing', 'technical')),
  name text not null,
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage contacts for their clients" ON client_contacts FOR ALL TO authenticated USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Create client_documents table for file attachments
CREATE TABLE client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size integer,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamp with time zone default now(),
  description text,
  is_active boolean DEFAULT true
);

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents for their clients" ON client_documents FOR ALL TO authenticated USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Create client_communication_log table for tracking interactions
CREATE TABLE client_communication_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  activity_type text not null CHECK (activity_type IN ('invoice_sent', 'payment_received', 'reminder_sent', 'note_added', 'document_uploaded', 'contact_updated')),
  description text not null,
  related_id uuid, -- Can reference invoices, payments, etc.
  metadata jsonb,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

ALTER TABLE client_communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communication logs for their clients" ON client_communication_log FOR SELECT TO authenticated USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert communication logs for their clients" ON client_communication_log FOR INSERT TO authenticated WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Create client_invoice_settings table for auto-billing preferences
CREATE TABLE client_invoice_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null unique,
  allow_auto_charge boolean DEFAULT false,
  auto_reminders boolean DEFAULT true,
  reminder_frequency text DEFAULT 'overdue_only' CHECK (reminder_frequency IN ('yes', 'no', 'overdue_only')),
  default_due_days integer DEFAULT 30,
  auto_send_invoice boolean DEFAULT false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

ALTER TABLE client_invoice_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage invoice settings for their clients" ON client_invoice_settings FOR ALL TO authenticated USING (
  client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())
);

-- Create indexes for better performance
CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX idx_client_contacts_role ON client_contacts(role);
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_communication_log_client_id ON client_communication_log(client_id);
CREATE INDEX idx_client_communication_log_created_at ON client_communication_log(created_at DESC);
CREATE INDEX idx_clients_health_score ON clients(health_score);
CREATE INDEX idx_clients_tags ON clients USING gin(tags);
CREATE INDEX idx_clients_user_id_created_at ON clients(user_id, created_at DESC);

-- Create function to update client health score based on invoice payment history
CREATE OR REPLACE FUNCTION update_client_health_score()
RETURNS trigger AS $$
DECLARE
  client_uuid uuid;
  overdue_count integer;
  total_invoiced numeric;
  total_paid numeric;
  new_health_score integer;
BEGIN
  -- Get client_id from the affected invoice
  client_uuid := NEW.client_id;

  -- Count overdue invoices (more than 30 days past due)
  SELECT COUNT(*) INTO overdue_count
  FROM invoices
  WHERE client_id = client_uuid
    AND status = 'overdue'
    AND due_date < (CURRENT_DATE - INTERVAL '30 days');

  -- Calculate total invoiced vs paid for this client
  SELECT
    COALESCE(SUM(total), 0),
    COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)
  INTO total_invoiced, total_paid
  FROM invoices
  WHERE client_id = client_uuid;

  -- Calculate health score (0-100)
  -- Start with 100, subtract points for overdue invoices and payment ratio
  new_health_score := 100;

  -- Deduct points for overdue invoices (max 50 points)
  new_health_score := new_health_score - (overdue_count * 15);
  IF new_health_score < 50 THEN new_health_score := 50; END IF;

  -- Deduct points based on payment ratio (max 50 points)
  IF total_invoiced > 0 THEN
    new_health_score := new_health_score - ((1 - (total_paid / total_invoiced)) * 50);
  END IF;

  -- Ensure score stays within bounds
  new_health_score := GREATEST(0, LEAST(100, new_health_score));

  -- Update the client's health score and last activity
  UPDATE clients
  SET
    health_score = new_health_score,
    last_activity_at = now(),
    last_activity_type = 'invoice_updated',
    updated_at = now()
  WHERE id = client_uuid;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update health score when invoices change
CREATE TRIGGER trigger_update_client_health_score
  AFTER INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_client_health_score();

-- Create function to log client activities
CREATE OR REPLACE FUNCTION log_client_activity(
  p_client_id uuid,
  p_activity_type text,
  p_description text,
  p_related_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO client_communication_log (
    client_id,
    activity_type,
    description,
    related_id,
    metadata
  ) VALUES (
    p_client_id,
    p_activity_type,
    p_description,
    p_related_id,
    p_metadata
  ) RETURNING id INTO log_id;

  -- Update client's last activity
  UPDATE clients
  SET
    last_activity_at = now(),
    last_activity_type = p_activity_type,
    updated_at = now()
  WHERE id = p_client_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;