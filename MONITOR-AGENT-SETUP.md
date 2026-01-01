# Monitor Agent Setup Guide

This guide explains how to install and configure the monitoring agent on both Linux/Unix and Windows servers.

## Overview

The monitoring agent is a lightweight script that runs on your servers to:
- Check service status
- Monitor disk space usage
- Report version information
- Send status updates to the dashboard

## Linux/Unix Installation

### Prerequisites
- `curl` installed
- `jq` installed (for JSON parsing)
- Bash shell

### Installation Steps

1. **Download the monitoring agent:**
   ```bash
   curl -o monitor-agent.sh https://your-dashboard-url.com/monitor-agent.sh
   chmod +x monitor-agent.sh
   ```

2. **Configure environment variables:**
   ```bash
   export MONITOR_API_URL="https://stats.cenas-support.com"
   export SERVER_ID="1"  # Get this from the dashboard
   export CHECK_INTERVAL="60"  # Check every 60 seconds
   ```

3. **Run the agent:**
   ```bash
   ./monitor-agent.sh
   ```

4. **Run as a systemd service (recommended):**

   Create `/etc/systemd/system/monitor-agent.service`:
   ```ini
   [Unit]
   Description=Service Monitoring Agent
   After=network.target

   [Service]
   Type=simple
   User=root
   Environment="MONITOR_API_URL=https://stats.cenas-support.com"
   Environment="SERVER_ID=1"
   Environment="CHECK_INTERVAL=60"
   ExecStart=/opt/monitor-agent/monitor-agent.sh
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start the service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable monitor-agent
   sudo systemctl start monitor-agent
   sudo systemctl status monitor-agent
   ```

### Linux Service Check Examples

```bash
# Systemd service
systemctl is-active apache2

# Docker container
docker ps --filter name=nginx --filter status=running -q

# Process check
pgrep mysqld

# Custom URL check
curl -s https://api.example.com/health | grep -q "ok"
```

---

## Windows Installation

### Prerequisites
- PowerShell 5.1 or higher
- Administrator privileges (for some checks)

### Installation Steps

1. **Download the monitoring agent:**

   Download `monitor-agent.ps1` to a folder like `C:\MonitorAgent\`

2. **Configure execution policy (if needed):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Set environment variables (optional):**
   ```powershell
   $env:MONITOR_API_URL = "https://stats.cenas-support.com"
   $env:SERVER_ID = "1"
   ```

4. **Run the agent manually:**
   ```powershell
   cd C:\MonitorAgent
   .\monitor-agent.ps1 -ApiUrl "https://stats.cenas-support.com" -ServerId "1" -CheckInterval 60
   ```

5. **Run as a Windows Service (recommended):**

   Install as a service using NSSM (Non-Sucking Service Manager):

   - Download NSSM from https://nssm.cc/download
   - Extract to a folder (e.g., `C:\nssm`)
   - Open PowerShell as Administrator:

   ```powershell
   # Install the service
   C:\nssm\nssm.exe install MonitorAgent "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
       "-ExecutionPolicy Bypass -NoProfile -File C:\MonitorAgent\monitor-agent.ps1 -ApiUrl https://stats.cenas-support.com -ServerId 1 -CheckInterval 60"

   # Set service to restart on failure
   C:\nssm\nssm.exe set MonitorAgent AppRestartDelay 10000

   # Start the service
   Start-Service MonitorAgent

   # Check status
   Get-Service MonitorAgent
   ```

   **Alternative: Using Task Scheduler:**

   1. Open Task Scheduler
   2. Create a new task with these settings:
      - **General tab:**
        - Name: Monitor Agent
        - Run whether user is logged on or not
        - Run with highest privileges
      - **Triggers tab:**
        - At system startup
      - **Actions tab:**
        - Action: Start a program
        - Program: `powershell.exe`
        - Arguments: `-ExecutionPolicy Bypass -NoProfile -File "C:\MonitorAgent\monitor-agent.ps1" -ApiUrl "https://stats.cenas-support.com" -ServerId "1" -CheckInterval 60`
      - **Conditions tab:**
        - Uncheck "Start the task only if the computer is on AC power"
      - **Settings tab:**
        - If task fails, restart every: 1 minute
        - Attempt to restart up to: 999 times

### Windows Service Check Examples

```powershell
# Windows service status
(Get-Service -Name "W3SVC").Status -eq "Running"

# Check if service is running (exit code style)
if ((Get-Service -Name "MSSQLSERVER").Status -eq "Running") { exit 0 } else { exit 1 }

# Docker container (if Docker Desktop is installed)
docker ps --filter name=nginx --filter status=running -q

# Process check
Get-Process -Name "mysqld" -ErrorAction SilentlyContinue

# Custom check - Test if port is listening
Test-NetConnection -ComputerName localhost -Port 80 -InformationLevel Quiet

# File/folder exists
Test-Path "C:\inetpub\wwwroot" -PathType Container

# Website health check
(Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing).StatusCode -eq 200
```

### Disk Path Examples for Windows

```powershell
# Monitor C: drive
C:

# Monitor D: drive
D:\

# Monitor specific folder on any drive
C:\inetpub

# Monitor UNC path
\\server\share
```

---

## Configuration in Dashboard

1. **Add a Server:**
   - Go to the dashboard
   - Click "Add Server"
   - Enter server name and save
   - Note the Server ID displayed

2. **Add Services to Monitor:**
   - Select the server
   - Click "Add Service"
   - Fill in:
     - **Service Name:** Display name (e.g., "IIS", "SQL Server", "Apache")
     - **Service Type:** systemd, docker, process, or custom
     - **Check Command:** The command that verifies the service is running
     - **Disk Path (optional):** Path to monitor for disk usage (e.g., `C:` or `/var/lib/mysql`)
     - **Critical Threshold:** When to show critical status (default: 80%)

3. **Update Agent Configuration:**
   - Set `SERVER_ID` to match the ID from the dashboard
   - Restart the monitoring agent

---

## Service Type Examples

### Linux Services

| Service Type | Name | Check Command | Disk Path |
|-------------|------|--------------|-----------|
| systemd | apache2 | `systemctl is-active apache2` | `/var/www` |
| systemd | nginx | `systemctl is-active nginx` | - |
| systemd | mysql | `systemctl is-active mysql` | `/var/lib/mysql` |
| docker | nginx-container | `docker ps --filter name=nginx --filter status=running -q` | - |
| process | node-app | `pgrep -f "node app.js"` | - |
| custom | API Health | `curl -sf http://localhost:3000/health` | - |
| systemd | samba | `systemctl is-active smbd` | `/mnt/nas` |

### Windows Services

| Service Type | Name | Check Command | Disk Path |
|-------------|------|--------------|-----------|
| custom | IIS | `(Get-Service -Name "W3SVC").Status -eq "Running"` | `C:\inetpub` |
| custom | SQL Server | `(Get-Service -Name "MSSQLSERVER").Status -eq "Running"` | `D:\SQLData` |
| custom | Windows Update | `(Get-Service -Name "wuauserv").Status -eq "Running"` | - |
| custom | File Server | `Test-Path "\\\\server\\share" -PathType Container` | `E:\` |
| docker | docker-nginx | `docker ps --filter name=nginx --filter status=running -q` | - |
| custom | Website | `(Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing).StatusCode -eq 200` | - |
| custom | Port Check | `Test-NetConnection -ComputerName localhost -Port 443 -InformationLevel Quiet` | - |

---

## Troubleshooting

### Linux

**Agent not starting:**
```bash
# Check logs
journalctl -u monitor-agent -f

# Test configuration fetch
curl https://stats.cenas-support.com/api/servers/1/services.json

# Verify jq is installed
which jq
```

**Permission issues:**
```bash
# Make sure script is executable
chmod +x monitor-agent.sh

# For checking systemd services, agent needs appropriate permissions
```

### Windows

**Execution policy errors:**
```powershell
# Allow running scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Service not reporting:**
```powershell
# Check if agent is running
Get-Service MonitorAgent
Get-Process | Where-Object { $_.ProcessName -like "*powershell*" }

# Check logs in Event Viewer
# Or run manually to see errors
.\monitor-agent.ps1 -ApiUrl "https://stats.cenas-support.com" -ServerId "1"
```

**Permission issues:**
- Some checks require Administrator privileges
- Run PowerShell as Administrator or configure service to run as SYSTEM

---

## Integration with Uptime Kuma

Each service monitored creates a JSON endpoint:

**Service Status Endpoint:**
```
https://stats.cenas-support.com/api/status/{server_id}/{service_name}.json
```

**Disk Monitoring Endpoint (if disk_path is configured):**
```
https://stats.cenas-support.com/api/status/{server_id}/{service_name}/disk.json
```

**In Uptime Kuma:**
1. Create new monitor
2. Type: HTTP(s) - JSON Query
3. URL: Use the endpoint above
4. JSON Query: `$.status`
5. Expected Value: `active` (for service) or `ok`/`warning` (for disk)

---

## Notes

- **Check Interval:** Default is 60 seconds. Adjust based on your needs.
- **API URL:** Update to match your dashboard URL
- **Server ID:** Each server needs a unique ID from the dashboard
- **Disk Monitoring:** Optional per service. Creates separate monitoring endpoint.
- **Version Detection:** Automatic for common services (IIS, SQL Server, Apache, nginx, etc.)
- **Security:** Ensure API endpoints are properly secured if exposed to the internet

---

## Support

For issues or questions:
1. Check the agent logs
2. Verify network connectivity to the API
3. Ensure server ID is correct
4. Verify check commands work when run manually
