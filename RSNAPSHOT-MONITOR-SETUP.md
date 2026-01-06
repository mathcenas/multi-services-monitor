# OpenMediaVault rsnapshot Monitor Agent Setup

This guide will help you set up monitoring for rsnapshot backup jobs running on OpenMediaVault.

## Prerequisites

- OpenMediaVault server with rsnapshot plugin installed
- rsnapshot jobs configured and running
- Access to the OpenMediaVault server via SSH
- curl and jq installed on the server

## Installation Steps

### 1. Download the Monitor Agent

SSH into your OpenMediaVault server and download the rsnapshot monitor agent:

```bash
curl -o /usr/local/bin/monitor-agent-rsnapshot.sh https://your-monitoring-server.com/monitor-agent-rsnapshot.sh
chmod +x /usr/local/bin/monitor-agent-rsnapshot.sh
```

### 2. Find Your rsnapshot Job UUIDs

Each rsnapshot job in OpenMediaVault has a unique UUID. You need to find these UUIDs:

```bash
ls /var/lib/openmediavault/rsnapshot.d/
```

You should see files like:
```
rsnapshot-ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2.conf
rsnapshot-f0fdd531-926e-47e8-823d-0b6ff93bd566.conf
rsnapshot-c4ae9a05-3da3-49cf-a306-70ce782524af.conf
```

The UUID is the part between `rsnapshot-` and `.conf`.

### 3. Verify rsnapshot Log Format

Check that your rsnapshot logs are in the expected format:

```bash
tail -20 /var/log/rsnapshot.log
```

You should see entries like:
```
[2026-01-01T01:55:09] /usr/bin/rsnapshot -c /var/lib/openmediavault/rsnapshot.d/rsnapshot-ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2.conf daily: completed successfully
[2026-01-01T02:00:02] /usr/bin/rsnapshot -c /var/lib/openmediavault/rsnapshot.d/rsnapshot-ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2.conf yearly: started
```

### 4. Configure the Monitor Agent

Set environment variables for the agent:

```bash
export MONITOR_API_URL="https://your-monitoring-server.com"
export SERVER_ID="123"
export CHECK_INTERVAL="300"
export RSNAPSHOT_LOG="/var/log/rsnapshot.log"
```

### 5. Add Services in Web Interface

Go to your monitoring dashboard and add services for each rsnapshot job:

#### Example 1: Daily Backup

- **Name**: Client ABC Daily Backup
- **Type**: backup
- **Job Type**: daily
- **Check Command**: `ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25`
- **Description**: Daily backup of Client ABC data
- **Check Interval**: 3600 seconds (1 hour)
- **Disk Path**: `/mnt/backup` (optional, for monitoring backup destination)

#### Example 2: Weekly Backup (auto-detect max age)

- **Name**: Client XYZ Weekly Backup
- **Type**: backup
- **Job Type**: weekly
- **Check Command**: `f0fdd531-926e-47e8-823d-0b6ff93bd566 weekly`
- **Description**: Weekly backup of Client XYZ
- **Check Interval**: 7200 seconds (2 hours)

#### Example 3: Monthly Backup

- **Name**: Archive Monthly Backup
- **Type**: backup
- **Job Type**: monthly
- **Check Command**: `c4ae9a05-3da3-49cf-a306-70ce782524af monthly 768`
- **Description**: Monthly archive backup
- **Check Interval**: 14400 seconds (4 hours)
- **Disk Path**: `/srv/dev-disk-by-uuid-xxx/backup`

### 6. Test the Agent

Run the agent manually to test:

```bash
/usr/local/bin/monitor-agent-rsnapshot.sh
```

You should see output like:
```
Starting rsnapshot monitoring agent...
API URL: https://your-monitoring-server.com/api
Server ID: 123
Server Name: omv-server
Check Interval: 300 seconds
rsnapshot Log: /var/log/rsnapshot.log

Fetching configuration for server ID: 123
Configuration received, checking 3 rsnapshot job(s)...
Checking rsnapshot job: Client ABC Daily Backup...
  Status: active
  Message: Completed successfully 12h ago
  Backup Age: 12 hours
  Disk: 65% used at /mnt/backup
All rsnapshot jobs checked and reported
```

Press `Ctrl+C` to stop the test.

### 7. Create Systemd Service

Create a systemd service file for the agent:

```bash
sudo nano /etc/systemd/system/monitor-agent-rsnapshot.service
```

Add the following content:

```ini
[Unit]
Description=rsnapshot Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Environment="MONITOR_API_URL=https://your-monitoring-server.com"
Environment="SERVER_ID=123"
Environment="CHECK_INTERVAL=300"
Environment="RSNAPSHOT_LOG=/var/log/rsnapshot.log"
ExecStart=/usr/local/bin/monitor-agent-rsnapshot.sh
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
```

### 8. Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable monitor-agent-rsnapshot.service
sudo systemctl start monitor-agent-rsnapshot.service
```

### 9. Check Service Status

```bash
sudo systemctl status monitor-agent-rsnapshot.service
```

View logs:
```bash
sudo journalctl -u monitor-agent-rsnapshot.service -f
```

## Check Command Format

The check command format is:

```
[UUID] [job_type] [max_age_hours]
```

**Parameters:**
- `UUID` (required): The rsnapshot job UUID from the config filename
- `job_type` (required): The backup interval (hourly, daily, weekly, monthly, yearly)
- `max_age_hours` (optional): Maximum hours before backup is considered stale

**Examples:**
```
ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2 daily 25
f0fdd531-926e-47e8-823d-0b6ff93bd566 weekly
c4ae9a05-3da3-49cf-a306-70ce782524af monthly 768
```

## Default Max Age by Job Type

If you omit the `max_age_hours` parameter, these defaults are used:

| Job Type | Default Max Age |
|----------|----------------|
| hourly   | 2 hours        |
| daily    | 25 hours       |
| weekly   | 192 hours (8 days) |
| monthly  | 768 hours (32 days) |
| yearly   | 8784 hours (366 days) |

## Status Detection

The agent detects the following statuses from the rsnapshot log:

| Log Message | Status | Description |
|-------------|--------|-------------|
| `completed successfully` | active | Backup completed successfully within threshold |
| `completed successfully` (old) | stale | Backup completed but exceeds max age threshold |
| `completed, but with some warnings` | warning | Backup completed with warnings |
| `ERROR:` | inactive | Backup failed with error |
| `started` | running | Backup currently in progress |

## Common Issues

### Issue: "No log entries found"

**Solution:** Verify the UUID is correct and the job has run at least once:
```bash
grep "ac1b4ee4-4a7d-4139-a01d-6aeb62df88b2" /var/log/rsnapshot.log
```

### Issue: "Log file not found"

**Solution:** Check if rsnapshot is logging to a different location:
```bash
find /var/log -name "*rsnapshot*" -type f
```

Set the correct path with:
```bash
export RSNAPSHOT_LOG="/var/log/path/to/rsnapshot.log"
```

### Issue: Backup shows as "stale" but ran recently

**Solution:** Adjust the `max_age_hours` parameter in the check command. For example, if your daily backup runs at night, use 26-30 hours instead of 25.

### Issue: Multiple backup jobs not all showing up

**Solution:** Make sure you've added a separate service entry in the web interface for each rsnapshot job you want to monitor.

## Disk Monitoring

You can optionally monitor the disk space of your backup destination by adding a **Disk Path** when configuring the service:

- `/mnt/backup` - Standard mount point
- `/srv/dev-disk-by-uuid-xxx/backup` - OMV UUID-based path
- Any valid path on the server

The agent will report:
- Disk usage percentage
- Total space
- Used space
- Available space

This creates a separate monitoring card in the dashboard with disk-specific alerts.

## Example JSON Output

The agent sends data to your monitoring server in this format:

```json
{
  "server_name": "omv-server",
  "service_name": "Client ABC Daily Backup",
  "status": "active",
  "message": "Completed successfully 12h ago",
  "version": "12h ago",
  "disk_usage": 65,
  "disk_total": "1.8T",
  "disk_used": "1.2T",
  "disk_available": "645G"
}
```

## Best Practices

1. **Monitor all critical backups**: Add a service entry for each important rsnapshot job
2. **Set appropriate thresholds**: Daily backups should have 25-30 hour thresholds, weekly 8-9 days, etc.
3. **Monitor disk space**: Always add disk path monitoring for backup destinations
4. **Check intervals**: Set check intervals based on backup frequency (hourly backups = 60s interval, daily = 3600s)
5. **Test after setup**: Run the agent manually first to ensure everything works before enabling the service

## Updating the Agent

To update the agent:

```bash
sudo systemctl stop monitor-agent-rsnapshot.service
curl -o /usr/local/bin/monitor-agent-rsnapshot.sh https://your-monitoring-server.com/monitor-agent-rsnapshot.sh
chmod +x /usr/local/bin/monitor-agent-rsnapshot.sh
sudo systemctl start monitor-agent-rsnapshot.service
```

## Uninstalling

To remove the agent:

```bash
sudo systemctl stop monitor-agent-rsnapshot.service
sudo systemctl disable monitor-agent-rsnapshot.service
sudo rm /etc/systemd/system/monitor-agent-rsnapshot.service
sudo rm /usr/local/bin/monitor-agent-rsnapshot.sh
sudo systemctl daemon-reload
```

## Support

For issues or questions, check:
- Agent logs: `sudo journalctl -u monitor-agent-rsnapshot.service -f`
- rsnapshot logs: `tail -f /var/log/rsnapshot.log`
- API connectivity: `curl https://your-monitoring-server.com/api/servers/123/services.json`
