import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '..');

app.get('/monitor-agent.sh', (req, res) => {
  try {
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent.sh');
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
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent.ps1');
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
    const scriptPath = path.join(__dirname, '..', '..', 'monitor-agent-mikrotik.sh');
    const script = readFileSync(scriptPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="monitor-agent-mikrotik.sh"');
    res.send(script);
  } catch (error) {
    res.status(404).json({ error: 'MikroTik monitor agent script not found' });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        servers(*),
        it_services:it_services_catalog(*)
      `)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        servers(
          *,
          services(*)
        ),
        it_services:it_services_catalog(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    console.error('Failed to fetch client:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to update client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

app.get('/api/servers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servers')
      .select(`
        *,
        client:clients(*),
        services(*)
      `)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

app.get('/api/servers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servers')
      .select(`
        *,
        client:clients(*),
        services(*)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Server not found' });
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch server:', error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

app.post('/api/servers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servers')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

app.put('/api/servers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to update server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

app.delete('/api/servers/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('servers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

app.get('/api/servers/:serverId/services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('server_id', req.params.serverId)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.get('/api/servers/:serverId/services.json', async (req, res) => {
  try {
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('*')
      .eq('id', req.params.serverId)
      .maybeSingle();

    if (serverError) throw serverError;
    if (!server) return res.status(404).json({ error: 'Server not found' });

    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, check_command, disk_path')
      .eq('server_id', req.params.serverId)
      .order('name');

    if (servicesError) throw servicesError;

    const config = {
      server: server.name,
      services: services
    };

    res.json(config);
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

app.post('/api/servers/:serverId/services', async (req, res) => {
  try {
    const serviceData = {
      server_id: req.params.serverId,
      ...req.body
    };

    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

app.post('/api/status', async (req, res) => {
  try {
    const { server_name, service_name, status, message, version, disk_usage, disk_total, disk_used, disk_available } = req.body;

    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('id')
      .eq('name', server_name)
      .maybeSingle();

    if (serverError) throw serverError;
    if (!server) return res.status(404).json({ error: 'Server not found' });

    await supabase
      .from('servers')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', server.id);

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id')
      .eq('server_id', server.id)
      .eq('name', service_name)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const updateData: any = {
      status,
      message,
      last_check: new Date().toISOString()
    };

    if (version) updateData.version = version;
    if (disk_usage !== undefined) {
      updateData.disk_usage = disk_usage;
      updateData.disk_total = disk_total;
      updateData.disk_used = disk_used;
      updateData.disk_available = disk_available;
    }

    const { error: updateError } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', service.id);

    if (updateError) throw updateError;

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Failed to update status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.get('/api/dashboard', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('servers')
      .select(`
        *,
        client:clients(*),
        services(*)
      `)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/clients/:clientId/it-services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('it_services_catalog')
      .select('*')
      .eq('client_id', req.params.clientId)
      .order('service_name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch IT services:', error);
    res.status(500).json({ error: 'Failed to fetch IT services' });
  }
});

app.post('/api/it-services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('it_services_catalog')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create IT service:', error);
    res.status(500).json({ error: 'Failed to create IT service' });
  }
});

app.put('/api/it-services/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('it_services_catalog')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to update IT service:', error);
    res.status(500).json({ error: 'Failed to update IT service' });
  }
});

app.delete('/api/it-services/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('it_services_catalog')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete IT service:', error);
    res.status(500).json({ error: 'Failed to delete IT service' });
  }
});

app.use(express.static(distPath));

app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
