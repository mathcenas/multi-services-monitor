/*
  # Client Portal Schema

  ## Overview
  Creates a complete client portal system for IT service providers to showcase
  their work to business clients. Includes clients, servers, services, and
  IT service catalog tracking.

  ## New Tables

  ### `clients`
  Business clients/companies being served
  - `id` (uuid, primary key)
  - `name` (text) - Client company name
  - `description` (text, nullable) - Brief description
  - `contact_person` (text, nullable) - Main contact name
  - `contact_email` (text, nullable) - Contact email
  - `logo_url` (text, nullable) - Client logo URL
  - `is_active` (boolean) - Active status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `servers`
  Monitored servers linked to clients
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key) - Links to clients table
  - `name` (text) - Server name/hostname
  - `os` (text, nullable) - Operating system
  - `os_version` (text, nullable) - OS version
  - `last_seen` (timestamptz, nullable) - Last monitoring check
  - `notes` (text, nullable) - Internal notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `services`
  Services/applications monitored on servers
  - `id` (uuid, primary key)
  - `server_id` (uuid, foreign key) - Links to servers table
  - `name` (text) - Service name
  - `status` (text) - active/inactive/unknown
  - `check_command` (text) - Command to check service
  - `disk_path` (text, nullable) - Path to monitor disk space
  - `disk_usage` (integer, nullable) - Disk usage percentage
  - `disk_total` (text, nullable) - Total disk space
  - `disk_used` (text, nullable) - Used disk space
  - `disk_available` (text, nullable) - Available disk space
  - `version` (text, nullable) - Service version
  - `message` (text, nullable) - Status message
  - `last_check` (timestamptz, nullable) - Last check timestamp
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `it_services_catalog`
  IT services provided to clients (ISO 20000 style)
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key) - Links to clients table
  - `service_name` (text) - Service name (e.g., "Server Monitoring", "Backup Management")
  - `service_category` (text) - Category (e.g., "Infrastructure", "Security", "Backup")
  - `description` (text, nullable) - Service description
  - `status` (text) - active/planned/inactive
  - `sla_level` (text, nullable) - SLA tier (e.g., "Gold", "Silver", "Bronze")
  - `monthly_cost` (numeric, nullable) - Monthly service cost
  - `start_date` (date, nullable) - Service start date
  - `notes` (text, nullable) - Additional notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Public read access for client portal viewing
  - Write access requires authentication (for IT service provider)
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_person text,
  contact_email text,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create servers table
CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  os text,
  os_version text,
  last_seen timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text DEFAULT 'unknown',
  check_command text NOT NULL,
  disk_path text,
  disk_usage integer,
  disk_total text,
  disk_used text,
  disk_available text,
  version text,
  message text,
  last_check timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create IT services catalog table
CREATE TABLE IF NOT EXISTS it_services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  service_category text NOT NULL,
  description text,
  status text DEFAULT 'active',
  sla_level text,
  monthly_cost numeric(10,2),
  start_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_servers_client_id ON servers(client_id);
CREATE INDEX IF NOT EXISTS idx_services_server_id ON services(server_id);
CREATE INDEX IF NOT EXISTS idx_it_services_client_id ON it_services_catalog(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE it_services_catalog ENABLE ROW LEVEL SECURITY;

-- Policies for clients table
CREATE POLICY "Clients are viewable by everyone"
  ON clients FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Policies for servers table
CREATE POLICY "Servers are viewable by everyone"
  ON servers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert servers"
  ON servers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update servers"
  ON servers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete servers"
  ON servers FOR DELETE
  TO authenticated
  USING (true);

-- Policies for services table
CREATE POLICY "Services are viewable by everyone"
  ON services FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert services"
  ON services FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update services"
  ON services FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete services"
  ON services FOR DELETE
  TO authenticated
  USING (true);

-- Policies for IT services catalog table
CREATE POLICY "IT services are viewable by everyone"
  ON it_services_catalog FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert IT services"
  ON it_services_catalog FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update IT services"
  ON it_services_catalog FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete IT services"
  ON it_services_catalog FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_it_services_catalog_updated_at BEFORE UPDATE ON it_services_catalog
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
