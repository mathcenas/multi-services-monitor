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
sudo apt-get install -y jq curl samba
```

**Note:** Samba is usually already installed on OpenMediaVault, but we need to ensure the `smbstatus` command is available.

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

### 5. Test the Script

Run a test to verify the script can collect connection information:

```bash
sudo /usr/local/bin/monitor-agent-omv-connections.sh test
```

The test output will show:
- Whether `smbstatus` command is available
- Raw output from `smbstatus`
- Parsed connection data in JSON format

Example output:
```
=== Testing smbstatus Connection Detection ===

✓ smbstatus command available

=== Raw smbstatus Output (first 30 lines) ===
---
Samba version 4.9.5-Debian
PID     Username     Group        Machine                                   Protocol Version  Encryption           Signing
----------------------------------------------------------------------------------------------------------------------------------------
69812   acruz        users        192.168.3.111 (ipv4:192.168.3.111:52509)  SMB3_11           -                    AES-128-CMAC
67944   acontatore   users        192.168.3.178 (ipv4:192.168.3.178:49289)  SMB3_11           -                    AES-128-CMAC
---

=== Parsed Connection Data ===
[
  {
    "username": "acruz",
    "ip_address": "192.168.3.111",
    "hostname": "192.168.3.111",
    "protocol": "SMB"
  },
  {
    "username": "acontatore",
    "ip_address": "192.168.3.178",
    "hostname": "192.168.3.178",
    "protocol": "SMB"
  }
]

✓ JSON validation: OK
✓ Found 2 unique connection(s)
```

If you see `Found 0 unique connection(s)`, verify:
- Users are actively accessing SMB shares
- Run `sudo smbstatus` manually to see if it shows connections

### 6. Create systemd Service

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/monitor-agent-omv-connections.service
```

Add the following content:

```ini
[Unit]
Description=OpenMediaVault Connection Monitor Agent
After=network.target smbd.service

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

### 7. Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable monitor-agent-omv-connections
sudo systemctl start monitor-agent-omv-connections
```

### 8. Verify the Service is Running

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
[2026-01-09 12:15:30] OpenMediaVault SMB Connection Monitor Agent v1.3.0
[2026-01-09 12:15:30] Monitoring SMB/Windows connections via smbstatus for server: nas
[2026-01-09 12:15:30] Collecting connection information...
[2026-01-09 12:15:30] Found 21 active connection(s)
[2026-01-09 12:15:30] Reporting connections to API...
[2026-01-09 12:15:30] Successfully reported connections
```

## What Gets Monitored

The agent tracks SMB/CIFS connections using the `smbstatus` command.

### SMB/CIFS Connections
- Windows file sharing connections
- Shows username and IP address of connected users
- Tracked via `smbstatus` (real-time connection query)
- Shows all active SMB sessions
- **No special configuration required** - works out of the box with any Samba installation

The script uses `smbstatus` to get live connection data directly from the Samba daemon.

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

1. **Run the test command:**
   ```bash
   sudo /usr/local/bin/monitor-agent-omv-connections.sh test
   ```

   Check if `smbstatus` command is available and showing output.

2. **Check smbstatus directly:**
   ```bash
   sudo smbstatus
   ```

   This should show all active SMB connections. If it shows connections but the script finds 0, please report this issue.

3. **Check if users are actually connected:**
   - Make sure someone is actively using SMB shares
   - Open a file from the NAS via Windows Explorer (don't just browse)
   - Run `sudo smbstatus` again to verify connections appear

4. **Verify Samba is running:**
   ```bash
   sudo systemctl status smbd
   ```

   If not running, start it:
   ```bash
   sudo systemctl start smbd
   ```

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

### smbstatus command not found

If the test shows "smbstatus command not found":
```bash
sudo apt-get update
sudo apt-get install -y samba
```

On OpenMediaVault, Samba should already be installed. If not, you may need to enable SMB/CIFS service in the OMV web interface first.

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
