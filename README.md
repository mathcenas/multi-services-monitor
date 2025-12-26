# Service Monitor

A web-based service monitoring system for managing and monitoring services across multiple Linux servers in different cloud environments.

## Features

- **Server Management**: Add and manage multiple Linux servers
- **Service Configuration**: Define services to monitor with custom check commands
- **JSON Configuration Export**: Export monitoring configuration as JSON
- **Monitoring Dashboard**: Real-time view of service status across all servers
- **REST API**: Update service status from monitoring agents
- **SQLite Database**: Lightweight, portable database
- **Docker Ready**: Easy deployment with Docker

## Quick Start

### Using Docker Compose

1. Build and start the application:
```bash
docker-compose up -d
```

2. Access the web interface at `http://localhost:5173`

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

This starts both the frontend (port 5173) and backend (port 3001).

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

## Linux Monitoring Agent

A sample monitoring script (`monitor-agent.sh`) is included to check services on your Linux servers and report back to the API.

### Setup on Linux Server

1. Copy `monitor-agent.sh` to your Linux server
2. Make it executable:
```bash
chmod +x monitor-agent.sh
```

3. Edit the script and set your API URL:
```bash
API_URL="http://your-monitor-server:3001/api"
```

4. Install `jq` (required for JSON parsing):
```bash
# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

5. Run the script with your server ID:
```bash
./monitor-agent.sh 1
```

6. Set up a cron job to run it periodically:
```bash
# Run every 5 minutes
*/5 * * * * /path/to/monitor-agent.sh 1
```

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

**Apache2**
- Name: apache2
- Type: systemd
- Check Command: `systemctl is-active apache2`

**Samba**
- Name: smbd
- Type: systemd
- Check Command: `systemctl is-active smbd`

**MySQL**
- Name: mysql
- Type: systemd
- Check Command: `systemctl is-active mysql`

**Docker Container**
- Name: myapp
- Type: docker
- Check Command: `docker ps | grep myapp`

**Custom Process**
- Name: custom-app
- Type: process
- Check Command: `pgrep -f custom-app`

## Database

The application uses SQLite with the database stored at:
- Development: `./monitoring.db`
- Docker: `/data/monitoring.db` (persisted in a volume)

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
