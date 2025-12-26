import { Server, Service, DashboardServer } from './types';

const API_BASE = '/api';

export const api = {
  async getServers(): Promise<Server[]> {
    const response = await fetch(`${API_BASE}/servers`);
    if (!response.ok) throw new Error('Failed to fetch servers');
    return response.json();
  },

  async getServer(id: number): Promise<Server> {
    const response = await fetch(`${API_BASE}/servers/${id}`);
    if (!response.ok) throw new Error('Failed to fetch server');
    return response.json();
  },

  async createServer(data: Partial<Server>): Promise<Server> {
    const response = await fetch(`${API_BASE}/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create server');
    return response.json();
  },

  async updateServer(id: number, data: Partial<Server>): Promise<Server> {
    const response = await fetch(`${API_BASE}/servers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update server');
    return response.json();
  },

  async deleteServer(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/servers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete server');
  },

  async getServices(serverId: number): Promise<Service[]> {
    const response = await fetch(`${API_BASE}/servers/${serverId}/services`);
    if (!response.ok) throw new Error('Failed to fetch services');
    return response.json();
  },

  async getServerConfig(serverId: number): Promise<any> {
    const response = await fetch(`${API_BASE}/servers/${serverId}/services.json`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  },

  async createService(serverId: number, data: Partial<Service>): Promise<Service> {
    const response = await fetch(`${API_BASE}/servers/${serverId}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create service');
    return response.json();
  },

  async updateService(id: number, data: Partial<Service>): Promise<Service> {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update service');
    return response.json();
  },

  async deleteService(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete service');
  },

  async getDashboard(): Promise<DashboardServer[]> {
    const response = await fetch(`${API_BASE}/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard');
    return response.json();
  },

  async updateStatus(data: { server_name: string; service_name: string; status: string; message?: string }): Promise<void> {
    const response = await fetch(`${API_BASE}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update status');
  },
};
