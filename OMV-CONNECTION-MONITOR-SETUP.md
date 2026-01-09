# OpenMediaVault Connection Monitor Setup

This guide will help you set up connection monitoring for your OpenMediaVault NAS, tracking active SMB/CIFS Windows connections in real-time.

## Quick Start

The easiest way to get started is through the web UI:

1. Log into your monitoring dashboard
2. Go to "Servers" section
3. Click "Add Server" or edit an existing server
4. Expand the "Connection Monitoring (Optional)" section
5. Follow the installation commands shown
6. Download the script directly from the UI

## Prerequisites

- OpenMediaVault NAS with SSH access
- Root or sudo privileges
- Your monitoring dashboard server accessible from the NAS

## Installation Steps

### 1. Install Required Dependencies

SSH into your OpenMediaVault server and install the required packages:

```bash
sudo apt-get update
sudo apt-get install -y jq curl
```

### 2. Download the Monitoring Script

Download the connection monitoring script to your NAS:

```bash
sudo curl -o /usr/local/bin/monitor-agent-omv-connections.sh \
  http://YOUR_DASHBOARD_SERVER:3001/monitor-agent-omv-connections.sh

sudo chmod +x /usr/local/bin/monitor-agent-omv-connections.sh
```

Replace `YOUR_DASHBOARD_SERVER` with your dashboard server's IP address or hostname.

### 3. Add Server to Dashboard First

**IMPORTANT:** Before configuring the script, you must add your NAS server to the monitoring dashboard:

1. Open your monitoring dashboard web interface
2. Go to the "Servers" section
3. Click "Add Server"
4. Fill in the server details (name should match your NAS hostname)
5. Save the server
6. **Copy the Server ID** from the server details page (it's a long UUID like `a1b2c3d4-...`)

### 4. Configure Environment Variables

Create a configuration file:

```bash
sudo nano /etc/default/monitor-agent-omv-connections
```

Add the following content:

```bash
MONITOR_API_URL="http://YOUR_DASHBOARD_SERVER:3001"
SERVER_ID="YOUR_SERVER_UUID_FROM_DASHBOARD"
CHECK_INTERVAL="300"
```

- `MONITOR_API_URL`: URL of your monitoring dashboard (include port if needed)
- `SERVER_ID`: **Required** - The UUID from the dashboard (from step 3 above)
- `CHECK_INTERVAL`: How often to check connections (in seconds, default: 300 = 5 minutes)

**Note:** The SERVER_ID must match the UUID shown in your dashboard, not just a number.

### 5. Enable SMB Audit Logging in OpenMediaVault

**CRITICAL:** The script requires Samba audit logging to be enabled. If you see "Auditar SMB/CIFS" in your OMV interface (under Services > SMB/CIFS > Logs tab), it means audit logging is available.

To verify audit logging is working:

1. In OMV web interface, go to **Services > SMB/CIFS > Logs**
2. Select **"Auditar SMB/CIFS"** from the dropdown
3. You should see connection logs with operations like `pwrite`, `unlink`, `pread`
4. If you see logs there, the script will be able to parse them

If audit logs are not showing:

```bash
# Check if the audit VFS module is configured
sudo grep "vfs objects.*audit" /etc/samba/smb.conf

# If not configured, you may need to add it to your share configuration
# This is typically done through OMV's web interface under Shared Folders settings
```

### 6. Test the Script

Run a test to verify the script can collect connection information:

```bash
sudo /usr/local/bin/monitor-agent-omv-connections.sh test
```

The test output will show:
- Which log sources are available
- How many audit entries were found
- Recent SMB operations
- Parsed connection data in JSON format

Example output:
```
=== Testing SMB Audit Log Parsing ===

Checking available log sources...
✓ journalctl available
  Found 47 SMB audit entries in journalctl (last 10 minutes)

=== Recent SMB Operations (last 10) ===
---
Jan 09 12:14:20 nas smbd_audit: daniela.leon|192.168.3.133|DESKTOP-ABC|ok|NAS-RBUY|pwrite|...
Jan 09 12:11:15 nas smbd_audit: daniela.leon|192.168.3.133|DESKTOP-ABC|ok|NAS-RBUY|unlink|...
---

=== Parsed Connection Data ===
[
  {
    "username": "daniela.leon",
    "ip_address": "192.168.3.133",
    "hostname": "192.168.3.133",
    "protocol": "SMB",
    "share_name": "NAS-RBUY"
  }
]

✓ JSON validation: OK
✓ Found 1 unique connection(s)
```

If you see `Found 0 unique connection(s)`, verify:
- Audit logging is enabled (see step 5)
- Users are actively accessing SMB shares
- The log format matches what the script expects

### 7. Create systemd Service

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/monitor-agent-omv-connections.service
```

Add the following content:

```ini
[Unit]
Description=OpenMediaVault Connection Monitor Agent
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/default/monitor-agent-omv-connections
ExecStart=/usr/local/bin/monitor-agent-omv-connections.sh
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
```

### 8. Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable monitor-agent-omv-connections
sudo systemctl start monitor-agent-omv-connections
```

### 9. Verify the Service is Running

Check the service status:

```bash
sudo systemctl status monitor-agent-omv-connections
```

View recent logs:

```bash
sudo journalctl -u monitor-agent-omv-connections -f
```

You should see logs like:
```
[2026-01-09 12:15:30] OpenMediaVault SMB Connection Monitor Agent v1.2.0
[2026-01-09 12:15:30] Collecting connection information...
[2026-01-09 12:15:30] Found 1 active connection(s)
[2026-01-09 12:15:30] Reporting connections to API...
[2026-01-09 12:15:30] Successfully reported connections
```

## What Gets Monitored

The agent specifically tracks SMB/CIFS connections by parsing Samba audit logs.

### SMB/CIFS Connections
- Windows file sharing connections
- Shows username, IP address, and shared folder
- Tracked via Samba audit logs (smbd_audit module)
- Monitors file operations: pwrite, pread, connect, mkdir, rmdir, unlink, rename
- **Important:** Requires Samba audit VFS module to be enabled in OMV

The script looks for logs in multiple locations:
1. `journalctl -u smbd` (systemd journal)
2. `/var/log/syslog`
3. `/var/log/samba/audit.log`
4. `/var/log/samba-audit.log`
5. `/var/log/samba/log.smbd`

## Viewing Connection Data

1. Log into your monitoring dashboard
2. Navigate to the Dashboard
3. Find your NAS server
4. Click the "Connections" button on the server card
5. View active and recent connections

The connection inventory shows:
- **Active Connections**: Currently connected users
- **Recent Connections**: Recently disconnected sessions
- **Statistics**: Connection counts by protocol

## Troubleshooting

### Script not finding any connections (Found 0 unique connections)

This is the most common issue. Follow these steps:

1. **Verify audit logging is enabled:**
   ```bash
   sudo /usr/local/bin/monitor-agent-omv-connections.sh test
   ```

   Check the "Checking available log sources" section. It should show a count > 0.

2. **Check OMV web interface:**
   - Go to Services > SMB/CIFS > Logs
   - Select "Auditar SMB/CIFS"
   - You should see audit logs with operations like `pwrite`, `unlink`, etc.
   - If empty, audit logging may not be enabled

3. **Verify Samba audit VFS module:**
   ```bash
   sudo grep "vfs objects" /etc/samba/smb.conf
   ```

   Should include `audit` in the list. Example:
   ```
   vfs objects = audit
   ```

4. **Check if users are actually connected:**
   - Make sure someone is actively using SMB shares
   - Try copying a file to/from the NAS via Windows Explorer
   - Run the test command again

5. **Check journal logs directly:**
   ```bash
   sudo journalctl -u smbd -n 100 --since "5 minutes ago" | grep -E "(pwrite|pread|connect)"
   ```

   If this shows nothing, the audit logs aren't being generated.

### SMB service not running

Make sure Samba is installed and running:
```bash
sudo systemctl status smbd
```

If not running:
```bash
sudo systemctl start smbd
sudo systemctl enable smbd
```

### Permission denied errors

The script requires root permissions to access connection information. Make sure the service is running as root (check the systemd service file).

### Cannot reach API server

Check network connectivity:
```bash
curl -v http://YOUR_DASHBOARD_SERVER:3001/api/health
```

Verify firewall rules allow outbound connections to your dashboard server.

### Log format doesn't match

If you see audit logs in OMV but the script isn't parsing them, run:
```bash
sudo journalctl -u smbd -n 20 --since "5 minutes ago" | grep smbd_audit
```

Send this output to support for analysis. The log format may need adjustment.

## Updating the Script

### Automatic Updates (Recommended)

The script includes automatic update functionality. By default, it checks for updates every 24 hours and updates itself automatically when a new version is available.

To verify auto-update is enabled:
```bash
grep AUTO_UPDATE /etc/default/monitor-agent-omv-connections
```

Should show:
```
AUTO_UPDATE="true"
```

You can see update activity in the logs:
```bash
sudo journalctl -u monitor-agent-omv-connections | grep -i update
```

### Manual Update

To manually update to a newer version:

```bash
sudo systemctl stop monitor-agent-omv-connections
sudo curl -o /usr/local/bin/monitor-agent-omv-connections.sh \
  http://YOUR_DASHBOARD_SERVER:3001/monitor-agent-omv-connections.sh
sudo chmod +x /usr/local/bin/monitor-agent-omv-connections.sh
sudo systemctl start monitor-agent-omv-connections
```

### Disable Auto-Updates

If you prefer to update manually:

```bash
sudo nano /etc/default/monitor-agent-omv-connections
```

Change:
```bash
AUTO_UPDATE="false"
```

## Uninstallation

To remove the connection monitor:

```bash
sudo systemctl stop monitor-agent-omv-connections
sudo systemctl disable monitor-agent-omv-connections
sudo rm /etc/systemd/system/monitor-agent-omv-connections.service
sudo rm /usr/local/bin/monitor-agent-omv-connections.sh
sudo rm /etc/default/monitor-agent-omv-connections
sudo systemctl daemon-reload
```

## Security Considerations

- The agent runs as root to access system connection information
- Connection data is sent unencrypted by default
- Consider using HTTPS for the API_URL if sensitive
- Connection logs contain IP addresses and usernames
- Data is stored in your monitoring database

## Support

For issues or questions:
- Check the service logs: `sudo journalctl -u monitor-agent-omv-connections -n 100`
- Verify the dashboard server is accessible
- Ensure the server name matches what's configured in the dashboard
