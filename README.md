# Service Monitor

A web-based service monitoring system for managing and monitoring services across multiple servers (Linux and Windows) in different cloud environments.

## Features

- **Cross-Platform Support**: Monitor both Linux/Unix and Windows servers
- **Server Management**: Add and manage multiple servers
- **Service Configuration**: Define services to monitor with custom check commands
- **Disk Space Monitoring**: Individual disk monitoring per service with customizable thresholds
- **Network Connection Tracking**: Monitor active SMB/CIFS, NFS, SSH, and FTP connections on OpenMediaVault and other NAS systems
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

Four monitoring agents are included to check services and report back to the API:

- **`monitor-agent.sh`** - For Linux/Unix servers (Bash)
- **`monitor-agent.ps1`** - For Windows servers (PowerShell)
- **`monitor-agent-mikrotik.sh`** - For MikroTik RouterOS devices (via SSH)
- **`monitor-agent-rsnapshot.sh`** - For OpenMediaVault rsnapshot backups (Log Parser)

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

**OpenMediaVault rsnapshot:**
```bash
export MONITOR_API_URL="https://stats.cenas-support.com"
export SERVER_ID="3"
export CHECK_INTERVAL="300"
export RSNAPSHOT_LOG="/var/log/rsnapshot.log"
./monitor-agent-rsnapshot.sh
```

### Detailed Setup Instructions

For complete installation and configuration instructions, including:
- Running as a system service (systemd/Windows Service)
- Service check command examples
- Disk monitoring configuration
- MikroTik SSH setup and monitoring
- CPU/RAM threshold configuration
- rsnapshot backup monitoring
- Troubleshooting tips

**See the complete setup guides:**
- General Monitoring: [MONITOR-AGENT-SETUP.md](./MONITOR-AGENT-SETUP.md)
- rsnapshot Backups: [RSNAPSHOT-MONITOR-SETUP.md](./RSNAPSHOT-MONITOR-SETUP.md)

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

**TCP Port Checks**
- Name: MySQL Port Check
- Type: custom
- Check Command: `192.168.1.100:3306`

**External Service Check**
- Name: Google DNS
- Type: custom
- Check Command: `8.8.8.8:53`

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

#### OpenMediaVault rsnapshot Backups

The rsnapshot monitor agent parses log files to monitor backup jobs:

**Daily Backup:**
- Name: Client ABC Daily Backup
- Type: backup
- Job Type: daily
- Check Command: `ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25`
- Check Interval: 3600
- Disk Path: `/mnt/backup`

**Weekly Backup:**
- Name: Client XYZ Weekly Backup
- Type: backup
- Job Type: weekly
- Check Command: `f0fdd531-926e-47e8-823d-0b6ff93bd566 weekly`
- Check Interval: 7200

**Monthly Backup:**
- Name: Archive Monthly Backup
- Type: backup
- Job Type: monthly
- Check Command: `c4ae9a05-3da3-49cf-a306-70ce782524af monthly 768`
- Check Interval: 14400
- Disk Path: `/srv/dev-disk-by-uuid-xxx/backup`

**Finding rsnapshot Job UUIDs:**
```bash
ls /var/lib/openmediavault/rsnapshot.d/
# Look for: rsnapshot-[UUID].conf
```

**Check Command Format:**
```
[UUID] [job_type] [max_age_hours]
```

Example: `ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25`
- UUID from config filename
- job_type: hourly, daily, weekly, monthly, yearly
- max_age_hours: optional (defaults: hourly=2h, daily=25h, weekly=192h, monthly=768h, yearly=8784h)

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
