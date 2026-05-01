export interface Client {
  id: string;
  name: string;
  description?: string;
  contact_person?: string;
  contact_email?: string;
  logo_url?: string;
  portal_slug?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  servers?: Server[];
  it_services?: ITService[];
}

export interface Server {
  id: string;
  client_id: string;
  name: string;
  os?: string;
  os_version?: string;
  last_seen?: string;
  notes?: string;
  push_token?: string;
  agent_version?: string;
  agent_type?: string;
  cpu_usage?: number;
  memory_usage?: number;
  memory_total_mb?: number;
  memory_used_mb?: number;
  memory_available_mb?: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  services?: Service[];
  service_count?: number;
  services_down?: number;
}

export interface Service {
  id: string;
  server_id: string;
  name: string;
  type?: string;
  job_type?: string;
  status: string;
  check_command: string;
  description?: string;
  check_interval?: number;
  disk_path?: string;
  disk_threshold?: number;
  disk_usage?: number;
  disk_total?: string;
  disk_used?: string;
  disk_available?: string;
  version?: string;
  latest_version?: string;
  message?: string;
  last_check?: string;
  created_at: string;
  updated_at: string;
  server?: Server;
  uptime_7days?: Array<{
    date: string;
    uptime: number;
  }>;
  current_status?: string;
  current_message?: string;
  last_checked?: string;
}

export interface ITService {
  id: string;
  client_id: string;
  service_name: string;
  service_category: string;
  description?: string;
  status: string;
  sla_level?: string;
  monthly_cost?: number;
  start_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface NetworkConnection {
  id: number;
  server_id: string;
  username?: string;
  hostname?: string;
  ip_address: string;
  protocol: string;
  share_name?: string;
  connected_at?: string;
  disconnected_at?: string;
  last_seen: string;
  is_active: boolean;
  created_at: string;
}

export interface ConnectionStats {
  protocol: string;
  count: number;
}

export interface DashboardServer extends Server {
  services: Service[];
  client?: Client;
}
