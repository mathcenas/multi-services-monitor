# Service Monitor

A web-based service monitoring system for managing and monitoring services across multiple servers (Linux and Windows) in different cloud environments.

## Features

- **Cross-Platform Support**: Monitor both Linux/Unix and Windows servers
- **Server Management**: Add and manage multiple servers
- **Service Configuration**: Define services to monitor with custom check commands
- **Disk Space Monitoring**: Individual disk monitoring per service with customizable thresholds
- **JSON Configuration Export**: Export monitoring configuration as JSON
- **Monitoring Dashboard**: Real-time view of service status across all servers
- **REST API**: Update service status from monitoring agents
- **SQLite Database**: Lightweight, portable database
- **Docker Ready**: Easy deployment with Docker
- **Uptime Kuma Integration**: JSON endpoints for external monitoring tools

## Quick Start

### Using Docker Compose

1. Build and start the application:
```bash
docker-compose up -d
```

2. Access the web interface at `http://localhost:5178`

3. The API is available at `http://localhost:3001/api`

### Manual Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

This starts both the frontend (port 5178) and backend (port 3001).

## API Endpoints

### Server Management
- `GET /api/servers` - List all servers
- `POST /api/servers` - Create a new server
- `PUT /api/servers/:id` - Update a server
- `DELETE /api/servers/:id` - Delete a server

### Service Management
- `GET /api/servers/:serverId/services` - List services for a server
- `GET /api/servers/:serverId/services.json` - Get JSON config for monitoring agents
- `POST /api/servers/:serverId/services` - Add a service to a server
- `PUT /api/services/:id` - Update a service
- `DELETE /api/services/:id` - Delete a service

### Status Reporting
- `POST /api/status` - Report service status
  ```json
  {
    "server_name": "web-server-01",
    "service_name": "apache2",
    "status": "active",
    "message": "Service is running"
  }
  ```

### Dashboard
- `GET /api/dashboard` - Get all servers and their service statuses

## Monitoring Agents

Three monitoring agents are included to check services and report back to the API:

- **`monitor-agent.sh`** - For Linux/Unix servers (Bash)
- **`monitor-agent.ps1`** - For Windows servers (PowerShell)
- **`monitor-agent-mikrotik.sh`** - For MikroTik RouterOS devices (via SSH)

### Quick Setup

**Linux/Unix:**
```bash
export MONITOR_API_URL="https://stats.cenas-support.com"
export SERVER_ID="1"
export CHECK_INTERVAL="60"
./monitor-agent.sh
```

**Windows (PowerShell):**
```powershell
.\monitor-agent.ps1 -ApiUrl "https://stats.cenas-support.com" -ServerId "1" -CheckInterval 60
```

**MikroTik RouterOS:**
```bash
export MONITOR_API_URL="https://stats.cenas-support.com"
export SERVER_ID="2"
export SERVER_NAME="mikrotik-router"
export MIKROTIK_HOST="192.168.88.1"
export MIKROTIK_USER="admin"
export MIKROTIK_KEY="/root/.ssh/mikrotik_monitor"
./monitor-agent-mikrotik.sh
```

### Detailed Setup Instructions

For complete installation and configuration instructions, including:
- Running as a system service (systemd/Windows Service)
- Service check command examples
- Disk monitoring configuration
- MikroTik SSH setup and monitoring
- CPU/RAM threshold configuration
- Troubleshooting tips

**See the complete setup guide:** [MONITOR-AGENT-SETUP.md](./MONITOR-AGENT-SETUP.md)

## Configuration Examples

### Adding a Server

Through the web UI:
1. Go to "Manage Servers"
2. Click "Add Server"
3. Fill in the details:
   - Name: web-server-01
   - Hostname: server.example.com
   - IP Address: 192.168.1.100
   - Cloud Provider: AWS

### Adding Services

For each server, add the services you want to monitor:

#### Linux/Unix Services

**Apache2**
- Name: apache2
- Type: systemd
- Check Command: `systemctl is-active apache2`
- Disk Path: `/var/www` (optional)

**Samba File Server**
- Name: smbd
- Type: systemd
- Check Command: `systemctl is-active smbd`
- Disk Path: `/mnt/nas`
- Threshold: 90%

**MySQL**
- Name: mysql
- Type: systemd
- Check Command: `systemctl is-active mysql`
- Disk Path: `/var/lib/mysql`

**Docker Container**
- Name: myapp
- Type: docker
- Check Command: `docker ps --filter name=myapp --filter status=running -q`

**Custom Process**
- Name: custom-app
- Type: process
- Check Command: `pgrep -f custom-app`

#### Windows Services

**IIS Web Server**
- Name: IIS
- Type: custom
- Check Command: `(Get-Service -Name "W3SVC").Status -eq "Running"`
- Disk Path: `C:\inetpub`

**SQL Server**
- Name: SQL Server
- Type: custom
- Check Command: `(Get-Service -Name "MSSQLSERVER").Status -eq "Running"`
- Disk Path: `D:\SQLData`
- Threshold: 85%

**File Server**
- Name: File Server (R: Drive)
- Type: custom
- Check Command: `Test-Path "R:\" -PathType Container`
- Disk Path: `R:\`
- Threshold: 90%

**Windows Service**
- Name: Windows Update
- Type: custom
- Check Command: `(Get-Service -Name "wuauserv").Status -eq "Running"`

#### MikroTik RouterOS

MikroTik monitoring is handled automatically by the `monitor-agent-mikrotik.sh` script which monitors:
- **System Resources** (CPU, RAM, uptime, temperature) - Monitored automatically
- **RouterOS Version** - Detected automatically
- **Network Interfaces** - Add as services in dashboard
- **IP Services** - Add as services in dashboard

**Monitor Network Interface:**
- Name: ether1
- Type: interface
- Check Command: `ether1`

**Monitor WAN Connection:**
- Name: PPPoE WAN
- Type: interface
- Check Command: `pppoe-out1`

**Monitor SSH Service:**
- Name: SSH Service
- Type: service
- Check Command: `ssh`

**Monitor API Service:**
- Name: API
- Type: service
- Check Command: `api`

**Custom RouterOS Command:**
- Name: Active Connections
- Type: custom
- Check Command: `/ip firewall connection print count-only`

## Database

The application uses SQLite with the database stored at:
- Development: `./monitoring.db`
- Docker: `./monitoring.db` (persisted in the project root directory)

## Building for Production

```bash
# Build frontend
npm run build

# Build backend
npm run build:server

# Start production server
npm run start:server
```

## Environment Variables

- `PORT` - API server port (default: 3001)
- `DB_PATH` - Path to SQLite database file
- `NODE_ENV` - Environment (development/production)

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **Icons**: Lucide React

## License

MIT
