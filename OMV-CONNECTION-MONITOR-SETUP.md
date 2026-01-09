# OpenMediaVault Connection Monitor Setup

This guide will help you set up connection monitoring for your OpenMediaVault NAS, tracking active SMB/CIFS, NFS, SSH, and FTP connections in real-time.

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

### 3. Configure Environment Variables

Create a configuration file:

```bash
sudo nano /etc/default/monitor-agent-omv-connections
```

Add the following content:

```bash
API_URL="http://YOUR_DASHBOARD_SERVER:3001"
SERVER_NAME="YOUR_NAS_NAME"
HOSTNAME="$(hostname)"
CHECK_INTERVAL="300"
```

- `API_URL`: URL of your monitoring dashboard (include port if needed)
- `SERVER_NAME`: Name of your server as configured in the dashboard
- `CHECK_INTERVAL`: How often to check connections (in seconds, default: 300 = 5 minutes)

### 4. Test the Script

Run a test to verify the script can collect connection information:

```bash
sudo /usr/local/bin/monitor-agent-omv-connections.sh test
```

You should see JSON output with current connections (if any are active).

### 5. Create systemd Service

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

### 6. Enable and Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable monitor-agent-omv-connections
sudo systemctl start monitor-agent-omv-connections
```

### 7. Verify the Service is Running

Check the service status:

```bash
sudo systemctl status monitor-agent-omv-connections
```

View recent logs:

```bash
sudo journalctl -u monitor-agent-omv-connections -f
```

## What Gets Monitored

The agent tracks the following types of connections:

### SMB/CIFS Connections
- Windows file sharing connections
- Shows username, IP address, and shared folder
- Tracked via `smbstatus` command

### NFS Connections
- Linux/Unix NFS mounts
- Shows client IP addresses and mounted exports
- Tracked via `/proc/fs/nfsd` or `showmount`

### SSH Connections
- Remote terminal sessions
- Shows username and source IP address
- Tracked via `who` command

### FTP Connections (if FTP server is running)
- File transfer connections
- Shows username and IP address
- Tracked via `ftpwho` command

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

### Script not collecting SMB connections

Make sure Samba is installed and running:
```bash
sudo systemctl status smbd
```

### No NFS connections showing

Verify NFS server is running:
```bash
sudo systemctl status nfs-kernel-server
```

### Permission denied errors

The script requires root permissions to access connection information. Make sure the service is running as root.

### Cannot reach API server

Check network connectivity:
```bash
curl -v http://YOUR_DASHBOARD_SERVER:3001/api/health
```

Verify firewall rules allow outbound connections to your dashboard server.

## Updating the Script

To update to a newer version:

```bash
sudo systemctl stop monitor-agent-omv-connections
sudo curl -o /usr/local/bin/monitor-agent-omv-connections.sh \
  http://YOUR_DASHBOARD_SERVER:3001/monitor-agent-omv-connections.sh
sudo chmod +x /usr/local/bin/monitor-agent-omv-connections.sh
sudo systemctl start monitor-agent-omv-connections
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
