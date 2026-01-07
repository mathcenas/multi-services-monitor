# Agent Logs and Status Checking

## How Status Checks Work

### Linux Agent (monitor-agent.sh)

The agent runs **check commands** you configure for each service:

```bash
# Example: Apache service check
systemctl is-active apache2
```

**How it determines GREEN (active) vs RED (inactive):**

1. The agent runs your check command
2. If the command **exits with code 0** = **GREEN** (service is active)
3. If the command **exits with non-zero** = **RED** (service is down)

**Common check commands:**
- `systemctl is-active apache2` - Systemd services
- `docker ps --filter name=nginx --filter status=running -q` - Docker containers
- `pgrep -f "node app.js"` - Process checks
- `curl -sf http://localhost:3000/health` - HTTP health checks

### Windows Agent (monitor-agent.ps1)

The agent runs **PowerShell expressions** you configure:

```powershell
# Example: IIS service check
(Get-Service -Name "W3SVC").Status -eq "Running"
```

**How it determines GREEN vs RED:**

1. The agent evaluates your PowerShell expression
2. If the expression returns **$true** or exits with **code 0** = **GREEN**
3. If the expression returns **$false** or throws error = **RED**

**Common check commands:**
- `(Get-Service -Name "W3SVC").Status -eq "Running"` - Windows services
- `Test-Path "C:\inetpub" -PathType Container` - Path existence
- `(Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing).StatusCode -eq 200` - HTTP checks

## Viewing Agent Logs

### Linux Logs

**If running as systemd service:**
```bash
# View recent logs
sudo journalctl -u monitor-agent -f

# View last 100 lines
sudo journalctl -u monitor-agent -n 100

# View logs from today
sudo journalctl -u monitor-agent --since today

# View logs with specific date
sudo journalctl -u monitor-agent --since "2024-01-07 10:00:00"
```

**If running as cron job or manually:**
```bash
# Check the agent's log file (if configured)
tail -f /var/log/monitor-agent.log

# Or check syslog
tail -f /var/log/syslog | grep monitor-agent
```

**Check agent status:**
```bash
# If running as systemd service
sudo systemctl status monitor-agent

# Check if process is running
ps aux | grep monitor-agent
```

### Windows Logs

**If running as Windows Service:**
```powershell
# View service status
Get-Service MonitorAgent

# View recent Application event logs
Get-EventLog -LogName Application -Source "MonitorAgent" -Newest 50

# Filter for errors
Get-EventLog -LogName Application -Source "MonitorAgent" -EntryType Error -Newest 20
```

**If running as Task Scheduler:**
```powershell
# Check task status
Get-ScheduledTask -TaskName "MonitorAgent"

# View task history
Get-ScheduledTask -TaskName "MonitorAgent" | Get-ScheduledTaskInfo

# Check if process is running
Get-Process | Where-Object { $_.ProcessName -like "*powershell*" }
```

**View agent log file (if configured):**
```powershell
# If log file exists
Get-Content "C:\ProgramData\MonitorAgent\agent.log" -Tail 50 -Wait
```

### MikroTik Agent Logs

**On the Linux server running the agent:**
```bash
# View systemd logs
sudo journalctl -u monitor-mikrotik -f

# View last 100 lines
sudo journalctl -u monitor-mikrotik -n 100

# Check status
sudo systemctl status monitor-mikrotik
```

### Rsnapshot Agent Logs

**On the backup server:**
```bash
# View systemd logs
sudo journalctl -u monitor-rsnapshot -f

# View rsnapshot logs
tail -f /var/log/rsnapshot.log

# Check backup directories
ls -lh /backup/*/

# Check status
sudo systemctl status monitor-rsnapshot
```

## Testing Check Commands Manually

### Linux - Test Before Adding to Dashboard

```bash
# Test a systemd service check
systemctl is-active apache2
echo $?  # Should print 0 if active, non-zero if inactive

# Test a docker check
docker ps --filter name=nginx --filter status=running -q
# Should output container ID if running

# Test a process check
pgrep -f "node app.js"
# Should output process ID if running

# Test an HTTP check
curl -sf http://localhost:3000/health
echo $?  # Should print 0 if successful
```

### Windows - Test Before Adding to Dashboard

```powershell
# Test a Windows service check
(Get-Service -Name "W3SVC").Status -eq "Running"
# Should return True if running

# Test with exit code
if ((Get-Service -Name "MSSQLSERVER").Status -eq "Running") { exit 0 } else { exit 1 }
$LASTEXITCODE  # Should be 0 if running

# Test path existence
Test-Path "C:\inetpub" -PathType Container
# Should return True if exists

# Test HTTP endpoint
(Invoke-WebRequest -Uri "http://localhost" -UseBasicParsing).StatusCode -eq 200
# Should return True if successful
```

## Understanding Status Messages in Dashboard

The dashboard shows:
- **Status**: UP/DOWN (green/red indicator)
- **Last Check**: How long ago the agent checked
- **Message**: Details from the check (error messages, etc.)
- **Version**: Service version detected (if available)

### Status Color Meanings

| Color | Status | Meaning |
|-------|--------|---------|
| Green | UP/Active | Check command succeeded (exit code 0 or returned true) |
| Red | DOWN/Inactive | Check command failed (non-zero exit code or returned false) |
| Gray | Unknown | No recent check or agent not reporting |
| Orange | Warning | Disk space warning or other non-critical issue |

## Troubleshooting

### Service shows RED but should be UP

**1. Test the check command manually:**
```bash
# On Linux
systemctl is-active your-service
echo $?

# On Windows
(Get-Service -Name "YourService").Status -eq "Running"
```

**2. Check agent logs** (see sections above)

**3. Verify service name matches:**
- The service name in the dashboard must match exactly
- Case-sensitive on Linux
- Check for typos

**4. Check agent permissions:**
```bash
# On Linux - agent needs permission to check services
sudo -u monitor-agent systemctl is-active apache2

# On Windows - run PowerShell as Administrator
```

### Agent not reporting

**1. Check if agent is running:**
```bash
# Linux
sudo systemctl status monitor-agent
ps aux | grep monitor-agent

# Windows
Get-Service MonitorAgent
Get-Process | Where-Object { $_.Name -like "*powershell*" }
```

**2. Check network connectivity:**
```bash
# Can the agent reach the dashboard?
curl -v https://your-dashboard-url/api/status

# On Windows
Invoke-WebRequest -Uri "https://your-dashboard-url/api/status" -Method GET
```

**3. Verify SERVER_ID or SERVER_NAME:**
- Check that the agent configuration matches a server in the dashboard
- View agent logs for "Server not found" errors

### No logs appearing

**Linux - Enable systemd logging:**
```bash
# Ensure service has proper logging
sudo systemctl edit monitor-agent

# Add these lines:
[Service]
StandardOutput=journal
StandardError=journal
SyslogIdentifier=monitor-agent
```

**Windows - Enable event logging:**
- Check Event Viewer → Windows Logs → Application
- Look for "MonitorAgent" source

## Real-Time Monitoring

### Watch agent activity in real-time

**Linux:**
```bash
# Watch systemd journal
sudo journalctl -u monitor-agent -f

# Watch with grep filter
sudo journalctl -u monitor-agent -f | grep -i "error\|failed"
```

**Windows:**
```powershell
# Watch event log
Get-EventLog -LogName Application -Source "MonitorAgent" -Newest 1 -Wait

# Or use PowerShell transcription
# Add to agent script:
Start-Transcript -Path "C:\ProgramData\MonitorAgent\agent.log" -Append
```

## Log Retention

**Linux (systemd):**
```bash
# Configure journald retention
sudo vi /etc/systemd/journald.conf

# Set these values:
SystemMaxUse=500M
MaxRetentionSec=7d
```

**Windows Event Log:**
```powershell
# Configure Application log size
# Event Viewer → Right-click Application → Properties
# Set Maximum log size and retention policy
```

## Performance Monitoring

### Check agent performance

**Linux:**
```bash
# CPU and memory usage
ps aux | grep monitor-agent
top -p $(pgrep -f monitor-agent)
```

**Windows:**
```powershell
# Get process stats
Get-Process | Where-Object { $_.Name -like "*powershell*" } |
  Select-Object Name, CPU, WorkingSet, StartTime
```
