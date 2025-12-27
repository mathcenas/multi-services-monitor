import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

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

app.get('/api/servers/:serverId/services', (req, res) => {
  try {
    const services = db.prepare(`
      SELECT s.*,
        ss.status as current_status,
        ss.message as current_message,
        ss.checked_at as last_checked
      FROM services s
      LEFT JOIN service_status ss ON s.id = ss.service_id
        AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
      WHERE s.server_id = ?
      ORDER BY s.name
    `).all(req.params.serverId);
    res.json(services);
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
      SELECT name, type, check_command, description
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
    const { name, type, check_command, description } = req.body;
    const result = db.prepare(`
      INSERT INTO services (server_id, name, type, check_command, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.serverId, name, type || 'systemd', check_command, description);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', (req, res) => {
  try {
    const { name, type, check_command, description } = req.body;
    db.prepare(`
      UPDATE services
      SET name = ?, type = ?, check_command = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, type, check_command, description, req.params.id);

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
    const { server_name, service_name, status, message } = req.body;

    const server = db.prepare('SELECT id FROM servers WHERE name = ?').get(server_name) as any;
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const service = db.prepare('SELECT id FROM services WHERE server_id = ? AND name = ?').get(server.id, service_name) as any;
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
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

app.get('/api/dashboard', (req, res) => {
  try {
    const servers = db.prepare(`
      SELECT s.*
      FROM servers s
      ORDER BY s.name
    `).all() as any[];

    const result = servers.map((server: any) => {
      const services = db.prepare(`
        SELECT s.*,
          ss.status as current_status,
          ss.message as current_message,
          ss.checked_at as last_checked
        FROM services s
        LEFT JOIN service_status ss ON s.id = ss.service_id
          AND ss.id = (SELECT MAX(id) FROM service_status WHERE service_id = s.id)
        WHERE s.server_id = ?
        ORDER BY s.name
      `).all(server.id);

      return {
        ...server,
        services
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
