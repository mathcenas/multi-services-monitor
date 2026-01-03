import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import db from './db.js';
import { getAllLatestVersions } from './version-checker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..');
app.use(express.static(distPath));

app.get('/api/servers', (req, res) => {
  try {
    const servers = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM services WHERE server_id = s.id) as service_count,
        (SELECT COUNT(*) FROM services sv
         LEFT JOIN service_status ss ON sv.id = ss.service_id
         WHERE sv.server_id = s.id
         AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = sv.id)
         AND ss.status = 'down') as services_down
      FROM servers s
      ORDER BY s.name
    `).all();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

app.get('/api/servers/:id', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

app.post('/api/servers', (req, res) => {
  try {
    const { name, hostname, ip_address, cloud_provider, description } = req.body;
    const result = db.prepare(`
      INSERT INTO servers (name, hostname, ip_address, cloud_provider, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, hostname, ip_address, cloud_provider, description);

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create server' });
  }
});

app.put('/api/servers/:id', (req, res) => {
  try {
    const { name, hostname, ip_address, cloud_provider, description } = req.body;
    db.prepare(`
      UPDATE servers
      SET name = ?, hostname = ?, ip_address = ?, cloud_provider = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, hostname, ip_address, cloud_provider, description, req.params.id);

    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
    res.json(server);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update server' });
  }
});

app.delete('/api/servers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM servers WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

app.get('/api/servers/:serverId/services', async (req, res) => {
  try {
    const services = db.prepare(`
      SELECT s.id, s.server_id, s.name, s.type, s.check_command, s.description,
        s.current_version, s.created_at, s.updated_at,
        s.disk_path, s.disk_threshold, s.disk_usage, s.disk_total, s.disk_used, s.disk_available,
        ss.status as current_status,
        ss.message as current_message,
        ss.checked_at as last_checked
      FROM services s
      LEFT JOIN service_status ss ON s.id = ss.service_id
        AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
      WHERE s.server_id = ?
      ORDER BY s.name
    `).all(req.params.serverId) as any[];

    const latestVersions = await getAllLatestVersions();

    const servicesWithLatest = services.map(service => ({
      ...service,
      latest_version: latestVersions[service.name.toLowerCase()] || null
    }));

    res.json(servicesWithLatest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/servers/:serverId/services.json', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const services = db.prepare(`
      SELECT name, type, check_command, description, disk_path, disk_threshold
      FROM services
      WHERE server_id = ?
      ORDER BY name
    `).all(req.params.serverId);

    const config = {
      server: server.name,
      hostname: server.hostname,
      ip_address: server.ip_address,
      services: services
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

app.post('/api/servers/:serverId/services', (req, res) => {
  try {
    const { name, type, check_command, description, disk_path, disk_threshold } = req.body;
    const result = db.prepare(`
      INSERT INTO services (server_id, name, type, check_command, description, disk_path, disk_threshold)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.serverId, name, type || 'systemd', check_command, description, disk_path || null, disk_threshold || 80);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const { name, type, check_command, description, disk_path, disk_threshold } = req.body;
    db.prepare(`
      UPDATE services
      SET name = ?, type = ?, check_command = ?, description = ?, disk_path = ?, disk_threshold = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, type, check_command, description, disk_path || null, disk_threshold || 80, req.params.id);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/services/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.post('/api/status', (req, res) => {
  try {
    const { server_name, service_name, status, message, version, disk_usage, disk_total, disk_used, disk_available } = req.body;

    const server = db.prepare('SELECT id FROM servers WHERE name = ?').get(server_name) as any;
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const service = db.prepare('SELECT id FROM services WHERE server_id = ? AND name = ?').get(server.id, service_name) as any;
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (version) {
      updates.push('current_version = ?');
      values.push(version);
    }

    if (disk_usage !== undefined) {
      updates.push('disk_usage = ?', 'disk_total = ?', 'disk_used = ?', 'disk_available = ?');
      values.push(disk_usage, disk_total, disk_used, disk_available);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(service.id);
      db.prepare(`
        UPDATE services
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }

    db.prepare(`
      INSERT INTO service_status (service_id, status, message)
      VALUES (?, ?, ?)
    `).run(service.id, status, message);

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const servers = db.prepare(`
      SELECT s.*
      FROM servers s
      ORDER BY s.name
    `).all() as any[];

    const latestVersions = await getAllLatestVersions();

    const result = servers.map((server: any) => {
      const services = db.prepare(`
        SELECT s.id, s.server_id, s.name, s.type, s.check_command, s.description,
          s.current_version, s.created_at, s.updated_at,
          s.disk_path, s.disk_threshold, s.disk_usage, s.disk_total, s.disk_used, s.disk_available,
          ss.status as current_status,
          ss.message as current_message,
          ss.checked_at as last_checked
        FROM services s
        LEFT JOIN service_status ss ON s.id = ss.service_id
          AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
        WHERE s.server_id = ?
        ORDER BY s.name
      `).all(server.id) as any[];

      const servicesWithLatest = services.map(service => ({
        ...service,
        latest_version: latestVersions[service.name.toLowerCase()] || null
      }));

      return {
        ...server,
        services: servicesWithLatest
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/health/server/:serverId', (req, res) => {
  try {
    const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.serverId) as any;
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const services = db.prepare(`
      SELECT s.id, s.name,
        ss.status as current_status
      FROM services s
      LEFT JOIN service_status ss ON s.id = ss.service_id
        AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
      WHERE s.server_id = ?
      ORDER BY s.name
    `).all(req.params.serverId) as any[];

    const servicesDown = services.filter(s => s.current_status === 'down');
    const totalServices = services.length;
    const healthyServices = totalServices - servicesDown.length;

    res.json({
      status: servicesDown.length === 0 ? 'healthy' : 'unhealthy',
      server: server.name,
      hostname: server.hostname,
      total_services: totalServices,
      healthy_services: healthyServices,
      down_services: servicesDown.length,
      services_down: servicesDown.map(s => s.name)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check server health' });
  }
});

app.get('/api/health/all', (req, res) => {
  try {
    const servers = db.prepare('SELECT * FROM servers ORDER BY name').all() as any[];

    const results = servers.map((server: any) => {
      const services = db.prepare(`
        SELECT s.id, s.name,
          ss.status as current_status
        FROM services s
        LEFT JOIN service_status ss ON s.id = ss.service_id
          AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
        WHERE s.server_id = ?
      `).all(server.id) as any[];

      const servicesDown = services.filter(s => s.current_status === 'down');

      return {
        server_id: server.id,
        server: server.name,
        hostname: server.hostname,
        status: servicesDown.length === 0 ? 'healthy' : 'unhealthy',
        total_services: services.length,
        down_services: servicesDown.length,
        services_down: servicesDown.map(s => s.name)
      };
    });

    const totalServers = results.length;
    const healthyServers = results.filter(r => r.status === 'healthy').length;
    const totalServicesDown = results.reduce((sum, r) => sum + r.down_services, 0);

    res.json({
      status: totalServicesDown === 0 ? 'healthy' : 'unhealthy',
      total_servers: totalServers,
      healthy_servers: healthyServers,
      unhealthy_servers: totalServers - healthyServers,
      total_services_down: totalServicesDown,
      servers: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check health' });
  }
});

app.get('/api/health/service/:serviceId', (req, res) => {
  try {
    const service = db.prepare(`
      SELECT s.*, srv.name as server_name, srv.hostname,
        ss.status as current_status,
        ss.message as current_message,
        ss.checked_at as last_checked
      FROM services s
      JOIN servers srv ON s.server_id = srv.id
      LEFT JOIN service_status ss ON s.id = ss.service_id
        AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
      WHERE s.id = ?
    `).get(req.params.serviceId) as any;

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      status: service.current_status || 'unknown',
      service: service.name,
      server: service.server_name,
      hostname: service.hostname,
      message: service.current_message,
      last_checked: service.last_checked
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check service health' });
  }
});

app.get('/api/health/disk/:serviceId', (req, res) => {
  try {
    const service = db.prepare(`
      SELECT s.*, srv.name as server_name, srv.hostname,
        ss.checked_at as last_checked
      FROM services s
      JOIN servers srv ON s.server_id = srv.id
      LEFT JOIN service_status ss ON s.id = ss.service_id
        AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
      WHERE s.id = ?
    `).get(req.params.serviceId) as any;

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!service.disk_path) {
      return res.status(400).json({ error: 'Service does not have disk monitoring configured' });
    }

    const threshold = service.disk_threshold || 80;
    const usage = service.disk_usage || 0;
    const status = usage >= threshold ? 'critical' : usage >= (threshold * 0.8) ? 'warning' : 'ok';

    res.json({
      status: status,
      service: service.name,
      server: service.server_name,
      hostname: service.hostname,
      disk_path: service.disk_path,
      disk_usage: service.disk_usage,
      disk_total: service.disk_total,
      disk_used: service.disk_used,
      disk_available: service.disk_available,
      disk_threshold: threshold,
      message: `Disk usage at ${service.disk_usage}% (threshold: ${threshold}%)`,
      last_checked: service.last_checked
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check disk health' });
  }
});

app.get('/monitor-agent.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', 'monitor-agent.sh');
    const script = readFileSync(scriptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent.sh"');
    res.send(script);
  } catch (error) {
    res.status(404).json({ error: 'Monitor agent script not found' });
  }
});

app.get('/monitor-agent.ps1', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', 'monitor-agent.ps1');
    const script = readFileSync(scriptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent.ps1"');
    res.send(script);
  } catch (error) {
    res.status(404).json({ error: 'PowerShell monitor agent script not found' });
  }
});

app.get('/monitor-agent-mikrotik.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', 'monitor-agent-mikrotik.sh');
    const script = readFileSync(scriptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent-mikrotik.sh"');
    res.send(script);
  } catch (error) {
    res.status(404).json({ error: 'MikroTik monitor agent script not found' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
