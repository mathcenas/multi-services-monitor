import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'monitoring.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    contact_person TEXT,
    contact_email TEXT,
    logo_url TEXT,
    portal_slug TEXT UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT,
    name TEXT NOT NULL,
    hostname TEXT,
    ip_address TEXT,
    cloud_provider TEXT,
    os TEXT,
    os_version TEXT,
    last_seen DATETIME,
    description TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    server_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'systemd',
    check_command TEXT NOT NULL,
    status TEXT DEFAULT 'unknown',
    description TEXT,
    version TEXT,
    disk_path TEXT,
    disk_threshold INTEGER DEFAULT 80,
    disk_usage INTEGER,
    disk_total TEXT,
    disk_used TEXT,
    disk_available TEXT,
    message TEXT,
    last_check DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    UNIQUE(server_id, name)
  );

  CREATE TABLE IF NOT EXISTS service_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS it_services_catalog (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_category TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    sla_level TEXT,
    monthly_cost REAL,
    start_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_servers_client_id ON servers(client_id);
  CREATE INDEX IF NOT EXISTS idx_services_server_id ON services(server_id);
  CREATE INDEX IF NOT EXISTS idx_it_services_client_id ON it_services_catalog(client_id);
  CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
  CREATE INDEX IF NOT EXISTS idx_service_status_service_id ON service_status(service_id);
  CREATE INDEX IF NOT EXISTS idx_service_status_checked_at ON service_status(checked_at DESC);

  CREATE TRIGGER IF NOT EXISTS update_clients_updated_at
  AFTER UPDATE ON clients
  BEGIN
    UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_servers_updated_at
  AFTER UPDATE ON servers
  BEGIN
    UPDATE servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_services_updated_at
  AFTER UPDATE ON services
  BEGIN
    UPDATE services SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

  CREATE TRIGGER IF NOT EXISTS update_it_services_catalog_updated_at
  AFTER UPDATE ON it_services_catalog
  BEGIN
    UPDATE it_services_catalog SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

const checkColumn = (table: string, column: string): boolean => {
  const result = db.prepare(`
    SELECT COUNT(*) as count
    FROM pragma_table_info('${table}')
    WHERE name = ?
  `).get(column) as { count: number };
  return result.count > 0;
};

if (!checkColumn('servers', 'client_id')) {
  console.log('Adding client_id column to servers table...');
  db.exec(`ALTER TABLE servers ADD COLUMN client_id TEXT;`);
  console.log('Migration completed: client_id column added');
}

if (!checkColumn('servers', 'os')) {
  console.log('Adding os columns to servers table...');
  db.exec(`
    ALTER TABLE servers ADD COLUMN os TEXT;
    ALTER TABLE servers ADD COLUMN os_version TEXT;
    ALTER TABLE servers ADD COLUMN last_seen DATETIME;
    ALTER TABLE servers ADD COLUMN notes TEXT;
  `);
  console.log('Migration completed: os columns added');
}

if (!checkColumn('services', 'status')) {
  console.log('Adding status columns to services table...');
  db.exec(`
    ALTER TABLE services ADD COLUMN status TEXT DEFAULT 'unknown';
    ALTER TABLE services ADD COLUMN version TEXT;
    ALTER TABLE services ADD COLUMN message TEXT;
    ALTER TABLE services ADD COLUMN last_check DATETIME;
  `);
  console.log('Migration completed: status columns added');
}

if (!checkColumn('services', 'disk_path')) {
  console.log('Adding disk monitoring columns to services table...');
  db.exec(`
    ALTER TABLE services ADD COLUMN disk_path TEXT;
    ALTER TABLE services ADD COLUMN disk_threshold INTEGER DEFAULT 80;
    ALTER TABLE services ADD COLUMN disk_usage INTEGER;
    ALTER TABLE services ADD COLUMN disk_total TEXT;
    ALTER TABLE services ADD COLUMN disk_used TEXT;
    ALTER TABLE services ADD COLUMN disk_available TEXT;
  `);
  console.log('Migration completed: disk monitoring columns added');
}

if (!checkColumn('clients', 'portal_slug')) {
  console.log('Adding portal_slug column to clients table...');
  db.exec(`ALTER TABLE clients ADD COLUMN portal_slug TEXT UNIQUE;`);
  console.log('Migration completed: portal_slug column added');
}

export default db;
