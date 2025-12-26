export interface Server {
  id: number;
  name: string;
  hostname: string;
  ip_address: string;
  cloud_provider: string;
  description: string;
  created_at: string;
  updated_at: string;
  service_count?: number;
  services_down?: number;
}

export interface Service {
  id: number;
  server_id: number;
  name: string;
  type: string;
  check_command: string;
  description: string;
  created_at: string;
  updated_at: string;
  current_status?: string;
  current_message?: string;
  last_checked?: string;
}

export interface DashboardServer extends Server {
  services: Service[];
}
