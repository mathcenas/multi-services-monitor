import { Server, Service, DashboardServer, Client, ITService } from './types';

const API_BASE = '/api';

export async function getClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE}/clients`);
  if (!response.ok) throw new Error('Failed to fetch clients');
  return response.json();
}

export async function getClientById(id: string): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients/${id}`);
  if (!response.ok) throw new Error('Failed to fetch client');
  return response.json();
}

export async function getClientBySlug(slug: string): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients/slug/${slug}`);
  if (!response.ok) throw new Error('Failed to fetch client');
  return response.json();
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create client');
  return response.json();
}

export async function updateClient(id: string, data: Partial<Client>): Promise<Client> {
  const response = await fetch(`${API_BASE}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update client');
  return response.json();
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/clients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete client');
}

export async function getServers(): Promise<Server[]> {
  const response = await fetch(`${API_BASE}/servers`);
  if (!response.ok) throw new Error('Failed to fetch servers');
  return response.json();
}

export async function getServer(id: string): Promise<Server> {
  const response = await fetch(`${API_BASE}/servers/${id}`);
  if (!response.ok) throw new Error('Failed to fetch server');
  return response.json();
}

export async function createServer(data: Partial<Server>): Promise<Server> {
  const response = await fetch(`${API_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create server');
  return response.json();
}

export async function updateServer(id: string, data: Partial<Server>): Promise<Server> {
  const response = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update server');
  return response.json();
}

export async function rotateServerPushToken(id: string): Promise<Server> {
  const response = await fetch(`${API_BASE}/servers/${id}/rotate-token`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to rotate token');
  return response.json();
}

export interface ServiceHistoryEntry {
  id: number;
  status: string;
  message: string | null;
  checked_at: string;
}

export async function getServiceHistory(serviceId: string, hours = 168, limit = 100): Promise<ServiceHistoryEntry[]> {
  const response = await fetch(`${API_BASE}/services/${serviceId}/history?hours=${hours}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

export async function deleteServer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete server');
}

export async function getServices(serverId: string): Promise<Service[]> {
  const response = await fetch(`${API_BASE}/servers/${serverId}/services`);
  if (!response.ok) throw new Error('Failed to fetch services');
  return response.json();
}

export async function getServerConfig(serverId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/servers/${serverId}/services.json`);
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
}

export async function createService(serverId: string, data: Partial<Service>): Promise<Service> {
  const response = await fetch(`${API_BASE}/servers/${serverId}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create service');
  return response.json();
}

export async function updateService(id: string, data: Partial<Service>): Promise<Service> {
  const response = await fetch(`${API_BASE}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update service');
  return response.json();
}

export async function deleteService(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/services/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete service');
}

export async function getDashboard(): Promise<DashboardServer[]> {
  const response = await fetch(`${API_BASE}/dashboard`);
  if (!response.ok) throw new Error('Failed to fetch dashboard');
  return response.json();
}

export async function updateStatus(data: {
  server_name: string;
  service_name: string;
  status: string;
  message?: string;
  version?: string;
  disk_usage?: number;
  disk_total?: string;
  disk_used?: string;
  disk_available?: string;
}): Promise<void> {
  const response = await fetch(`${API_BASE}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update status');
}

export async function getITServices(clientId: string): Promise<ITService[]> {
  const response = await fetch(`${API_BASE}/clients/${clientId}/it-services`);
  if (!response.ok) throw new Error('Failed to fetch IT services');
  return response.json();
}

export async function createITService(data: Partial<ITService>): Promise<ITService> {
  const response = await fetch(`${API_BASE}/it-services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create IT service');
  return response.json();
}

export async function updateITService(id: string, data: Partial<ITService>): Promise<ITService> {
  const response = await fetch(`${API_BASE}/it-services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update IT service');
  return response.json();
}

export async function deleteITService(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/it-services/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete IT service');
}

export async function exportData(): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`);
  if (!response.ok) throw new Error('Failed to export data');
  return response.blob();
}

export async function importData(data: any): Promise<any> {
  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to import data');
  return response.json();
}
