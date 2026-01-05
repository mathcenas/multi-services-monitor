export interface Client {
  id: string;
  name: string;
  description?: string;
  contact_person?: string;
  contact_email?: string;
  logo_url?: string;
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
  status: string;
  check_command: string;
  disk_path?: string;
  disk_usage?: number;
  disk_total?: string;
  disk_used?: string;
  disk_available?: string;
  version?: string;
  message?: string;
  last_check?: string;
  created_at: string;
  updated_at: string;
  server?: Server;
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

export interface DashboardServer extends Server {
  services: Service[];
}
