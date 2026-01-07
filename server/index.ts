import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { getLatestVersion, getAllLatestVersions } from './version-checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..');

app.get('/monitor-agent.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent.sh');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent.sh"');
    res.sendFile(scriptPath);
  } catch (error) {
    res.status(404).json({ error: 'Monitor agent script not found' });
  }
});

app.get('/monitor-agent.ps1', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent.ps1');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent.ps1"');
    res.sendFile(scriptPath);
  } catch (error) {
    res.status(404).json({ error: 'PowerShell monitor agent script not found' });
  }
});

app.get('/monitor-agent-mikrotik.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent-mikrotik.sh');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent-mikrotik.sh"');
    res.sendFile(scriptPath);
  } catch (error) {
    res.status(404).json({ error: 'MikroTik monitor agent script not found' });
  }
});

app.get('/monitor-agent-rsnapshot.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent-rsnapshot.sh');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent-rsnapshot.sh"');
    res.sendFile(scriptPath);
  } catch (error) {
    res.status(404).json({ error: 'Rsnapshot monitor agent script not found' });
  }
});

app.get('/api/agent-version', (req, res) => {
  const versions = {
    'monitor-agent.sh': '1.1.0',
    'monitor-agent.ps1': '1.1.0',
    'monitor-agent-mikrotik.sh': '1.1.0',
    'monitor-agent-rsnapshot.sh': '1.1.0'
  };
  res.json(versions);
});

app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT * FROM clients ORDER BY name
    `).all();

    const clientsWithRelations = clients.map((client: any) => {
      const servers = db.prepare('SELECT * FROM servers WHERE client_id = ?').all(client.id);
      const it_services = db.prepare('SELECT * FROM it_services_catalog WHERE client_id = ?').all(client.id);
      return { ...client, servers, it_services };
    });

    res.json(clientsWithRelations);
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/api/clients/slug/:slug', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE portal_slug = ?').get(req.params.slug);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const c = client as any;
    const servers = db.prepare(`
      SELECT * FROM servers WHERE client_id = ?
    `).all(c.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const serversWithServices = servers.map((server: any) => {
      const services = db.prepare('SELECT * FROM services WHERE server_id = ?').all(server.id);

      const servicesWithUptime = services.map((service: any) => {
        const uptimeData = [];

        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date();
          dayStart.setDate(dayStart.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setHours(23, 59, 59, 999);

          const checks = db.prepare(`
            SELECT status FROM service_status
            WHERE service_id = ? AND checked_at >= ? AND checked_at <= ?
          `).all(service.id, dayStart.toISOString(), dayEnd.toISOString()) as any[];

          let uptime = 100;
          if (checks.length > 0) {
            const upChecks = checks.filter(c => c.status === 'up' || c.status === 'active').length;
            uptime = Math.round((upChecks / checks.length) * 100);
          }

          uptimeData.push({
            date: dayStart.toISOString().split('T')[0],
            uptime
          });
        }

        return { ...service, uptime_7days: uptimeData };
      });

      return { ...server, services: servicesWithUptime };
    });

    const it_services = db.prepare('SELECT * FROM it_services_catalog WHERE client_id = ?').all(c.id);

    res.json({ ...client, servers: serversWithServices, it_services });
  } catch (error) {
    console.error('Failed to fetch client by slug:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.get('/api/clients/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const servers = db.prepare(`
      SELECT * FROM servers WHERE client_id = ?
    `).all(req.params.id);

    const serversWithServices = servers.map((server: any) => {
      const services = db.prepare('SELECT * FROM services WHERE server_id = ?').all(server.id);
      return { ...server, services };
    });

    const it_services = db.prepare('SELECT * FROM it_services_catalog WHERE client_id = ?').all(req.params.id);

    res.json({ ...client, servers: serversWithServices, it_services });
  } catch (error) {
    console.error('Failed to fetch client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const { name, description, contact_person, contact_email, logo_url, is_active } = req.body;
    let portal_slug = generateSlug(name);

    let slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ?').get(portal_slug);
    let counter = 1;
    while (slugExists) {
      portal_slug = `${generateSlug(name)}-${counter}`;
      slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ?').get(portal_slug);
      counter++;
    }

    const client = db.prepare(`
      INSERT INTO clients (name, description, contact_person, contact_email, logo_url, portal_slug, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      name,
      description ?? null,
      contact_person ?? null,
      contact_email ?? null,
      logo_url ?? null,
      portal_slug,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    res.status(201).json(client);
  } catch (error) {
    console.error('Failed to create client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', (req, res) => {
  try {
    const { name, description, contact_person, contact_email, logo_url, is_active } = req.body;

    const oldClient = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id) as any;
    let portal_slug = oldClient.portal_slug;

    if (name && name !== oldClient.name) {
      portal_slug = generateSlug(name);
      let slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ? AND id != ?').get(portal_slug, req.params.id);
      let counter = 1;
      while (slugExists) {
        portal_slug = `${generateSlug(name)}-${counter}`;
        slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ? AND id != ?').get(portal_slug, req.params.id);
        counter++;
      }
    }

    db.prepare(`
      UPDATE clients
      SET name = ?, description = ?, contact_person = ?, contact_email = ?, logo_url = ?, portal_slug = ?, is_active = ?
      WHERE id = ?
    `).run(
      name,
      description ?? null,
      contact_person ?? null,
      contact_email ?? null,
      logo_url ?? null,
      portal_slug,
      is_active ? 1 : 0,
      req.params.id
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json(client);
  } catch (error) {
    console.error('Failed to update client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

app.get('/api/servers', (req, res) => {
  try {
    const servers = db.prepare('SELECT * FROM servers ORDER BY name').all();

    const serversWithRelations = servers.map((server: any) => {
      const client = server.client_id ? db.prepare('SELECT * FROM clients WHERE id = ?').get(server.client_id) : null;
      const services = db.prepare('SELECT * FROM services WHERE server_id = ?').all(server.id);
      return { ...server, client, services };
    });

    res.json(serversWithRelations);
  } catch (error) {
    console.error('Failed to fetch servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

app.get('/api/servers/:id', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const client = (server as any).client_id ? db.prepare('SELECT * FROM clients WHERE id = ?').get((server as any).client_id) : null;
    const services = db.prepare('SELECT * FROM services WHERE server_id = ?').all(req.params.id);

    res.json({ ...server, client, services });
  } catch (error) {
    console.error('Failed to fetch server:', error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

app.post('/api/servers', (req, res) => {
  try {
    const { client_id, name, hostname, ip_address, cloud_provider, os, os_version, description, notes } = req.body;
    const server = db.prepare(`
      INSERT INTO servers (client_id, name, hostname, ip_address, cloud_provider, os, os_version, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      client_id ?? null,
      name,
      hostname || name,
      ip_address ?? null,
      cloud_provider ?? null,
      os ?? null,
      os_version ?? null,
      description ?? null,
      notes ?? null
    );

    res.status(201).json(server);
  } catch (error) {
    console.error('Failed to create server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

app.put('/api/servers/:id', (req, res) => {
  try {
    const { client_id, name, hostname, ip_address, cloud_provider, os, os_version, last_seen, description, notes } = req.body;
    db.prepare(`
      UPDATE servers
      SET client_id = ?, name = ?, hostname = ?, ip_address = ?, cloud_provider = ?, os = ?, os_version = ?, last_seen = ?, description = ?, notes = ?
      WHERE id = ?
    `).run(
      client_id ?? null,
      name,
      hostname ?? null,
      ip_address ?? null,
      cloud_provider ?? null,
      os ?? null,
      os_version ?? null,
      last_seen ?? null,
      description ?? null,
      notes ?? null,
      req.params.id
    );

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    res.json(server);
  } catch (error) {
    console.error('Failed to update server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

app.delete('/api/servers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

app.get('/api/servers/:serverId/services', async (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services WHERE server_id = ? ORDER BY name').all(req.params.serverId) as any[];

    const servicesWithVersions = await Promise.all(services.map(async (service) => {
      if (service.version) {
        const latestVersion = await getLatestVersion(service.name);
        return { ...service, latest_version: latestVersion };
      }
      return service;
    }));

    res.json(servicesWithVersions);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/servers/:serverId/services.json', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.serverId);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const services = db.prepare('SELECT name, check_command, disk_path, check_interval FROM services WHERE server_id = ? ORDER BY name').all(req.params.serverId);

    const config = {
      server: (server as any).name,
      services: services
    };

    res.json(config);
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

app.get('/api/health/service/:id', (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);

    if (!service) {
      return res.status(404).json({
        status: 'error',
        message: 'Service not found'
      });
    }

    const s = service as any;
    const isUp = s.status === 'up' || s.status === 'active';
    const isDown = s.status === 'down' || s.status === 'inactive';
    const diskCritical = s.disk_usage !== null && s.disk_usage >= (s.disk_threshold || 90);

    let status = 'ok';
    let message = s.message || 'Service is running normally';

    if (isDown) {
      status = 'down';
      message = s.message || 'Service is not running';
    } else if (diskCritical) {
      status = 'warning';
      message = `Disk usage critical: ${s.disk_usage}% (threshold: ${s.disk_threshold}%)`;
    } else if (s.disk_usage !== null && s.disk_usage >= (s.disk_threshold || 90) * 0.8) {
      status = 'warning';
      message = `Disk usage high: ${s.disk_usage}%`;
    }

    const response = {
      status,
      message,
      service_name: s.name,
      current_status: s.status,
      version: s.version,
      disk_usage: s.disk_usage,
      disk_path: s.disk_path,
      disk_used: s.disk_used,
      disk_total: s.disk_total,
      last_check: s.last_check
    };

    res.json(response);
  } catch (error) {
    console.error('Failed to fetch service health:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch service health'
    });
  }
});

app.post('/api/servers/:serverId/services', (req, res) => {
  try {
    const { name, type, job_type, check_command, description, check_interval, disk_path, disk_threshold } = req.body;
    const service = db.prepare(`
      INSERT INTO services (server_id, name, type, job_type, check_command, description, check_interval, disk_path, disk_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      req.params.serverId,
      name,
      type || 'systemd',
      job_type ?? null,
      check_command,
      description ?? null,
      check_interval || 300,
      disk_path ?? null,
      disk_threshold || 80
    );

    res.status(201).json(service);
  } catch (error) {
    console.error('Failed to create service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const { name, type, job_type, check_command, status, description, check_interval, version, disk_path, disk_threshold, disk_usage, disk_total, disk_used, disk_available, message, last_check } = req.body;
    db.prepare(`
      UPDATE services
      SET name = ?, type = ?, job_type = ?, check_command = ?, status = ?, description = ?, check_interval = ?, version = ?,
          disk_path = ?, disk_threshold = ?, disk_usage = ?, disk_total = ?, disk_used = ?,
          disk_available = ?, message = ?, last_check = ?
      WHERE id = ?
    `).run(
      name,
      type || 'systemd',
      job_type ?? null,
      check_command ?? null,
      status ?? null,
      description ?? null,
      check_interval ?? null,
      version ?? null,
      disk_path ?? null,
      disk_threshold ?? null,
      disk_usage ?? null,
      disk_total ?? null,
      disk_used ?? null,
      disk_available ?? null,
      message ?? null,
      last_check ?? null,
      req.params.id
    );

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json(service);
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.post('/api/status', (req, res) => {
  try {
    const { server_name, service_name, status, message, version, disk_usage, disk_total, disk_used, disk_available } = req.body;

    let server = db.prepare('SELECT id, name FROM servers WHERE name = ? COLLATE NOCASE').get(server_name);
    if (!server) {
      server = db.prepare('SELECT id, name FROM servers WHERE hostname = ? COLLATE NOCASE').get(server_name);
    }
    if (!server) {
      const availableServers = db.prepare('SELECT id, name, hostname FROM servers').all();
      console.error('Server not found for name:', server_name);
      console.log('Available servers:', availableServers);
      const serverList = availableServers.map((s: any) => `"${s.name}"${s.hostname ? ` (hostname: "${s.hostname}")` : ''}`).join(', ');
      return res.status(404).json({
        error: 'Server not found',
        server_name,
        hint: `Set SERVER_NAME to one of: ${serverList || 'No servers configured'}`
      });
    }

    db.prepare('UPDATE servers SET last_seen = CURRENT_TIMESTAMP WHERE id = ?').run((server as any).id);

    const service = db.prepare('SELECT id FROM services WHERE server_id = ? AND name = ? COLLATE NOCASE').get((server as any).id, service_name);
    if (!service) {
      const availableServices = db.prepare('SELECT name FROM services WHERE server_id = ?').all((server as any).id);
      const serviceList = availableServices.map((s: any) => `"${s.name}"`).join(', ');
      console.error(`Service "${service_name}" not found on server "${(server as any).name}"`);
      console.log('Available services:', availableServices);
      return res.status(404).json({
        error: 'Service not found',
        service_name,
        server_name: (server as any).name,
        hint: `Available services: ${serviceList || 'No services configured'}`
      });
    }

    const updateFields = ['status = ?', 'message = ?', 'last_check = CURRENT_TIMESTAMP'];
    const updateValues = [status, message];

    if (version) {
      updateFields.push('version = ?');
      updateValues.push(version);
    }

    if (disk_usage !== undefined) {
      updateFields.push('disk_usage = ?', 'disk_total = ?', 'disk_used = ?', 'disk_available = ?');
      updateValues.push(disk_usage, disk_total, disk_used, disk_available);
    }

    updateValues.push((service as any).id);

    db.prepare(`UPDATE services SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    db.prepare(`
      INSERT INTO service_status (service_id, status, message, checked_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run((service as any).id, status, message || null);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to update status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/dashboard', (req, res) => {
  try {
    const servers = db.prepare('SELECT * FROM servers ORDER BY name').all();

    const serversWithRelations = servers.map((server: any) => {
      const client = server.client_id ? db.prepare('SELECT * FROM clients WHERE id = ?').get(server.client_id) : null;
      const services = db.prepare('SELECT * FROM services WHERE server_id = ?').all(server.id);
      return { ...server, client, services };
    });

    res.json(serversWithRelations);
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/clients/:clientId/it-services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM it_services_catalog WHERE client_id = ? ORDER BY service_name').all(req.params.clientId);
    res.json(services);
  } catch (error) {
    console.error('Failed to fetch IT services:', error);
    res.status(500).json({ error: 'Failed to fetch IT services' });
  }
});

app.post('/api/it-services', (req, res) => {
  try {
    const { client_id, service_name, service_category, description, status, sla_level, monthly_cost, start_date, notes } = req.body;
    const service = db.prepare(`
      INSERT INTO it_services_catalog (client_id, service_name, service_category, description, status, sla_level, monthly_cost, start_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      client_id,
      service_name,
      service_category,
      description ?? null,
      status || 'active',
      sla_level ?? null,
      monthly_cost ?? null,
      start_date ?? null,
      notes ?? null
    );

    res.status(201).json(service);
  } catch (error) {
    console.error('Failed to create IT service:', error);
    res.status(500).json({ error: 'Failed to create IT service' });
  }
});

app.put('/api/it-services/:id', (req, res) => {
  try {
    const { client_id, service_name, service_category, description, status, sla_level, monthly_cost, start_date, notes } = req.body;
    db.prepare(`
      UPDATE it_services_catalog
      SET client_id = ?, service_name = ?, service_category = ?, description = ?, status = ?, sla_level = ?, monthly_cost = ?, start_date = ?, notes = ?
      WHERE id = ?
    `).run(
      client_id,
      service_name,
      service_category,
      description ?? null,
      status,
      sla_level ?? null,
      monthly_cost ?? null,
      start_date ?? null,
      notes ?? null,
      req.params.id
    );

    const service = db.prepare('SELECT * FROM it_services_catalog WHERE id = ?').get(req.params.id);
    res.json(service);
  } catch (error) {
    console.error('Failed to update IT service:', error);
    res.status(500).json({ error: 'Failed to update IT service' });
  }
});

app.delete('/api/it-services/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM it_services_catalog WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete IT service:', error);
    res.status(500).json({ error: 'Failed to delete IT service' });
  }
});

app.get('/api/versions/latest', async (req, res) => {
  try {
    const versions = await getAllLatestVersions();
    res.json(versions);
  } catch (error) {
    console.error('Failed to fetch latest versions:', error);
    res.status(500).json({ error: 'Failed to fetch latest versions' });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const clients = db.prepare('SELECT * FROM clients').all();
    const servers = db.prepare('SELECT * FROM servers').all();
    const services = db.prepare('SELECT * FROM services').all();
    const itServices = db.prepare('SELECT * FROM it_services_catalog').all();

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        clients,
        servers,
        services,
        it_services: itServices,
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(backup);
  } catch (error) {
    console.error('Failed to export data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.post('/api/import', (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Invalid backup file' });
    }

    const { clients, servers, services, it_services } = data;

    db.prepare('DELETE FROM services').run();
    db.prepare('DELETE FROM servers').run();
    db.prepare('DELETE FROM it_services_catalog').run();
    db.prepare('DELETE FROM clients').run();

    const insertClient = db.prepare(`
      INSERT INTO clients (id, name, description, contact_person, contact_email, logo_url, portal_slug, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertServer = db.prepare(`
      INSERT INTO servers (id, client_id, name, hostname, ip_address, cloud_provider, os, os_version, last_seen, description, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertService = db.prepare(`
      INSERT INTO services (id, server_id, name, type, check_command, status, description, version, disk_path, disk_threshold, disk_usage, disk_total, disk_used, disk_available, message, last_check, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertITService = db.prepare(`
      INSERT INTO it_services_catalog (id, client_id, service_name, service_category, description, status, sla_level, monthly_cost, start_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    if (clients) {
      for (const client of clients) {
        let portal_slug = client.portal_slug || generateSlug(client.name);
        let slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ?').get(portal_slug);
        let counter = 1;
        while (slugExists) {
          portal_slug = `${generateSlug(client.name)}-${counter}`;
          slugExists = db.prepare('SELECT id FROM clients WHERE portal_slug = ?').get(portal_slug);
          counter++;
        }

        insertClient.run(
          client.id, client.name, client.description, client.contact_person,
          client.contact_email, client.logo_url, portal_slug,
          client.is_active !== undefined ? client.is_active : 1,
          client.created_at, client.updated_at
        );
      }
    }

    if (servers) {
      for (const server of servers) {
        insertServer.run(
          server.id, server.client_id, server.name, server.hostname,
          server.ip_address, server.cloud_provider, server.os, server.os_version,
          server.last_seen, server.description, server.notes,
          server.created_at, server.updated_at
        );
      }
    }

    if (services) {
      for (const service of services) {
        insertService.run(
          service.id, service.server_id, service.name, service.type,
          service.check_command, service.status, service.description,
          service.version, service.disk_path, service.disk_threshold,
          service.disk_usage, service.disk_total, service.disk_used,
          service.disk_available, service.message, service.last_check,
          service.created_at, service.updated_at
        );
      }
    }

    if (it_services) {
      for (const itService of it_services) {
        insertITService.run(
          itService.id, itService.client_id, itService.service_name, itService.service_category,
          itService.description, itService.status, itService.sla_level,
          itService.monthly_cost, itService.start_date, itService.notes,
          itService.created_at, itService.updated_at
        );
      }
    }

    res.json({
      success: true,
      imported: {
        clients: clients?.length || 0,
        servers: servers?.length || 0,
        services: services?.length || 0,
        it_services: it_services?.length || 0,
      }
    });
  } catch (error) {
    console.error('Failed to import data:', error);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
