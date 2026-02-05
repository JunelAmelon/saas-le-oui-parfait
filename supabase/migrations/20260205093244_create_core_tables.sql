/*
  # Schema initial Le Oui Parfait

  ## Description
  Migration initiale pour la plateforme SaaS de wedding planning Le Oui Parfait.
  
  ## Tables créées
  
  ### 1. profiles
  Profils des utilisateurs (wedding planners)
  - `id` (uuid, FK vers auth.users)
  - `email` (text)
  - `full_name` (text)
  - `avatar_url` (text)
  - `phone` (text)
  - `role` (text) - admin, wedding_planner, assistant
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 2. agency
  Informations sur l'agence Le Oui Parfait
  - `id` (uuid, PK)
  - `name` (text)
  - `logo_url` (text)
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `city` (text)
  - `postal_code` (text)
  - `country` (text)
  - `website` (text)
  - `description` (text)
  - `siret` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 3. prospects
  Prospects / Leads commerciaux
  - `id` (uuid, PK)
  - `first_name` (text)
  - `last_name` (text)
  - `email` (text)
  - `phone` (text)
  - `partner_first_name` (text)
  - `partner_last_name` (text)
  - `partner_email` (text)
  - `partner_phone` (text)
  - `event_date` (date)
  - `event_location` (text)
  - `estimated_budget` (numeric)
  - `guest_count` (integer)
  - `status` (text) - new, contacted, qualified, converted, lost, archived
  - `source` (text) - website, referral, social_media, event, other
  - `notes` (text)
  - `assigned_to` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 4. events
  Événements / Mariages
  - `id` (uuid, PK)
  - `reference` (text) - ex: J-380
  - `client_first_name` (text)
  - `client_last_name` (text)
  - `client_email` (text)
  - `client_phone` (text)
  - `partner_first_name` (text)
  - `partner_last_name` (text)
  - `partner_email` (text)
  - `partner_phone` (text)
  - `event_date` (date)
  - `event_time` (time)
  - `venue_name` (text)
  - `venue_address` (text)
  - `venue_city` (text)
  - `venue_postal_code` (text)
  - `guest_count` (integer)
  - `budget_total` (numeric)
  - `budget_spent` (numeric)
  - `status` (text) - confirmed, in_progress, completed, cancelled
  - `event_type` (text) - wedding, engagement, anniversary, other
  - `notes` (text)
  - `assigned_to` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 5. vendors
  Prestataires
  - `id` (uuid, PK)
  - `name` (text)
  - `category` (text) - venue, catering, photography, video, music, flowers, decoration, transport, other
  - `contact_name` (text)
  - `email` (text)
  - `phone` (text)
  - `website` (text)
  - `address` (text)
  - `city` (text)
  - `postal_code` (text)
  - `notes` (text)
  - `rating` (integer) - 1 à 5
  - `is_favorite` (boolean)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 6. event_vendors
  Liaison événements-prestataires
  - `id` (uuid, PK)
  - `event_id` (uuid, FK vers events)
  - `vendor_id` (uuid, FK vers vendors)
  - `service_description` (text)
  - `price` (numeric)
  - `status` (text) - pending, confirmed, paid, cancelled
  - `contract_signed` (boolean)
  - `created_at` (timestamp)
  
  ### 7. quotes
  Devis
  - `id` (uuid, PK)
  - `reference` (text)
  - `event_id` (uuid, FK vers events, nullable)
  - `prospect_id` (uuid, FK vers prospects, nullable)
  - `issue_date` (date)
  - `valid_until` (date)
  - `status` (text) - draft, sent, accepted, rejected, expired
  - `subtotal` (numeric)
  - `tax_rate` (numeric)
  - `tax_amount` (numeric)
  - `total` (numeric)
  - `notes` (text)
  - `created_by` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ### 8. invoices
  Factures
  - `id` (uuid, PK)
  - `reference` (text)
  - `event_id` (uuid, FK vers events)
  - `quote_id` (uuid, FK vers quotes, nullable)
  - `type` (text) - deposit, final, avoir
  - `issue_date` (date)
  - `due_date` (date)
  - `status` (text) - draft, sent, paid, overdue, cancelled
  - `subtotal` (numeric)
  - `tax_rate` (numeric)
  - `tax_amount` (numeric)
  - `total` (numeric)
  - `amount_paid` (numeric)
  - `payment_method` (text)
  - `payment_date` (date)
  - `notes` (text)
  - `created_by` (uuid, FK vers profiles)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies restrictives basées sur l'authentification
*/

-- Création de la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  role text DEFAULT 'wedding_planner' CHECK (role IN ('admin', 'wedding_planner', 'assistant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Création de la table agency
CREATE TABLE IF NOT EXISTS agency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Le Oui Parfait',
  logo_url text,
  email text,
  phone text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'France',
  website text,
  description text,
  siret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view agency"
  ON agency FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update agency"
  ON agency FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Création de la table prospects
CREATE TABLE IF NOT EXISTS prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  partner_first_name text,
  partner_last_name text,
  partner_email text,
  partner_phone text,
  event_date date,
  event_location text,
  estimated_budget numeric DEFAULT 0,
  guest_count integer DEFAULT 0,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived')),
  source text DEFAULT 'website' CHECK (source IN ('website', 'referral', 'social_media', 'event', 'other')),
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prospects"
  ON prospects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create prospects"
  ON prospects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update prospects"
  ON prospects FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete prospects"
  ON prospects FOR DELETE
  TO authenticated
  USING (true);

-- Création de la table events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE,
  client_first_name text NOT NULL,
  client_last_name text NOT NULL,
  client_email text,
  client_phone text,
  partner_first_name text,
  partner_last_name text,
  partner_email text,
  partner_phone text,
  event_date date NOT NULL,
  event_time time,
  venue_name text,
  venue_address text,
  venue_city text,
  venue_postal_code text,
  guest_count integer DEFAULT 0,
  budget_total numeric DEFAULT 0,
  budget_spent numeric DEFAULT 0,
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')),
  event_type text DEFAULT 'wedding' CHECK (event_type IN ('wedding', 'engagement', 'anniversary', 'other')),
  notes text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (true);

-- Création de la table vendors
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('venue', 'catering', 'photography', 'video', 'music', 'flowers', 'decoration', 'transport', 'other')),
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  city text,
  postal_code text,
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (true);

-- Création de la table event_vendors
CREATE TABLE IF NOT EXISTS event_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  service_description text,
  price numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),
  contract_signed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view event vendors"
  ON event_vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage event vendors"
  ON event_vendors FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Création de la table quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL,
  issue_date date DEFAULT CURRENT_DATE,
  valid_until date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quotes"
  ON quotes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create quotes"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update quotes"
  ON quotes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete quotes"
  ON quotes FOR DELETE
  TO authenticated
  USING (true);

-- Création de la table invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  type text DEFAULT 'deposit' CHECK (type IN ('deposit', 'final', 'avoir')),
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric DEFAULT 0,
  tax_rate numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  payment_method text,
  payment_date date,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (true);

-- Création d'index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_assigned_to ON prospects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_assigned_to ON events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_event_vendors_event_id ON event_vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_vendors_vendor_id ON event_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_event_id ON invoices(event_id);

-- Insertion des données initiales pour l'agence
INSERT INTO agency (name, email, phone, city, country)
VALUES ('Le Oui Parfait', 'contact@leouiparfait.fr', '+33 X XX XX XX XX', 'Paris', 'France')
ON CONFLICT DO NOTHING;