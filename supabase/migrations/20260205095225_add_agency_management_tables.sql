/*
  # Extension des fonctionnalités Agence

  ## Description
  Ajout des tables pour gérer les nouvelles fonctionnalités de l'agence:
  - Fiches clients
  - Todos
  - Post-it (notes)
  - Contrats
  - Signatures électroniques
  - Campagnes email
  
  ## Tables créées
  
  ### 1. client_files
  Fiches clients détaillées (mariés)
  - `id` (uuid, PK)
  - `event_id` (uuid, FK vers events)
  - `couple_photo_url` (text)
  - `wedding_story` (text)
  - `preferences` (jsonb)
  - `special_requests` (text)
  - `dietary_restrictions` (text)
  - `accessibility_needs` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 2. todos
  Gestion des tâches
  - `id` (uuid, PK)
  - `title` (text)
  - `description` (text)
  - `status` (text) - todo, in_progress, done, cancelled
  - `priority` (text) - low, medium, high, urgent
  - `due_date` (date)
  - `event_id` (uuid, FK vers events, nullable)
  - `assigned_to` (uuid, FK vers profiles)
  - `created_by` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 3. sticky_notes
  Post-it/Notes rapides
  - `id` (uuid, PK)
  - `title` (text)
  - `content` (text)
  - `color` (text) - yellow, pink, blue, green, purple
  - `position_x` (integer)
  - `position_y` (integer)
  - `created_by` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 4. contracts
  Contrats clients
  - `id` (uuid, PK)
  - `reference` (text)
  - `event_id` (uuid, FK vers events)
  - `type` (text) - service_contract, venue_contract, vendor_contract
  - `title` (text)
  - `content` (text)
  - `status` (text) - draft, sent, signed, cancelled
  - `total_amount` (numeric)
  - `created_by` (uuid, FK vers profiles)
  - `signed_at` (timestamp)
  - `signature_url` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 5. signatures
  Signatures électroniques
  - `id` (uuid, PK)
  - `contract_id` (uuid, FK vers contracts)
  - `signer_name` (text)
  - `signer_email` (text)
  - `signature_data` (text)
  - `ip_address` (text)
  - `signed_at` (timestamp)
  - `created_at` (timestamp)
  
  ### 6. email_campaigns
  Campagnes email
  - `id` (uuid, PK)
  - `name` (text)
  - `subject` (text)
  - `content` (text)
  - `status` (text) - draft, scheduled, sent, cancelled
  - `scheduled_for` (timestamp)
  - `sent_at` (timestamp)
  - `recipients_count` (integer)
  - `opened_count` (integer)
  - `clicked_count` (integer)
  - `created_by` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 7. email_campaign_recipients
  Destinataires des campagnes
  - `id` (uuid, PK)
  - `campaign_id` (uuid, FK vers email_campaigns)
  - `email` (text)
  - `status` (text) - pending, sent, opened, clicked, bounced
  - `sent_at` (timestamp)
  - `opened_at` (timestamp)
  - `clicked_at` (timestamp)
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies restrictives basées sur l'authentification
*/

-- Création de la table client_files
CREATE TABLE IF NOT EXISTS client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  couple_photo_url text,
  wedding_story text,
  preferences jsonb DEFAULT '{}'::jsonb,
  special_requests text,
  dietary_restrictions text,
  accessibility_needs text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view client files"
  ON client_files FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage client files"
  ON client_files FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table todos
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view todos"
  ON todos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create todos"
  ON todos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update todos"
  ON todos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete todos"
  ON todos FOR DELETE
  TO authenticated
  USING (true);

-- Création de la table sticky_notes
CREATE TABLE IF NOT EXISTS sticky_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text NOT NULL,
  color text DEFAULT 'yellow' CHECK (color IN ('yellow', 'pink', 'blue', 'green', 'purple')),
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sticky notes"
  ON sticky_notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage sticky notes"
  ON sticky_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'service_contract' CHECK (type IN ('service_contract', 'venue_contract', 'vendor_contract')),
  title text NOT NULL,
  content text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
  total_amount numeric DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  signed_at timestamptz,
  signature_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table signatures
CREATE TABLE IF NOT EXISTS signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signature_data text,
  ip_address text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signatures"
  ON signatures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage signatures"
  ON signatures FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table email_campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  content text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipients_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email campaigns"
  ON email_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage email campaigns"
  ON email_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table email_campaign_recipients
CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'bounced')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view campaign recipients"
  ON email_campaign_recipients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage campaign recipients"
  ON email_campaign_recipients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création d'index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_client_files_event_id ON client_files(event_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_event_id ON todos(event_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_contracts_event_id ON contracts(event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_signatures_contract_id ON signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON email_campaign_recipients(campaign_id);