# Connection Monitoring Fix

## Issues Fixed

### 1. Backup Service Detection
- **Problem**: Rsnapshot backups weren't being counted in the backup status widget
- **Fix**: Updated `isBackupService()` to detect "rsnapshot" in addition to "backup" and "veeam"
- **Result**: All backup jobs (Veeam, rsnapshot, etc.) now show correctly in the dashboard

### 2. Duplicate Server Creation
- **Problem**: Agent sending `SERVER_ID=1` created duplicate servers with invalid IDs
- **Fix**: Added validation to reject server IDs that aren't 32-character hex UUIDs
- **Result**: System now requires proper server IDs like `1adf33dc9ef39ee3572f87059aaded6a`

### 3. OMV Connections Agent Version
- **Problem**: OMV connections agent version wasn't tracked for updates
- **Fix**: Added `monitor-agent-omv-connections.sh` v1.3.3 to version tracking
- **Result**: Dashboard shows agent version and update notifications

## How to Fix Your Environment

### Step 1: Clean Up Duplicate Servers

Run this command to delete invalid server entries:

```bash
curl -X DELETE https://stats.cenas-support.com/api/debug/cleanup-invalid-servers
```

This will remove servers with IDs like "1" and "1.0" and their orphaned connections.

### Step 2: Update Your Agent Configuration

On your NAS (or wherever the OMV connections agent runs), update the environment variable:

**Current (WRONG):**
```bash
export SERVER_ID=1
```

**Correct:**
```bash
export SERVER_ID=1adf33dc9ef39ee3572f87059aaded6a
```

You can find your correct SERVER_ID from the dashboard:
1. Go to https://stats.cenas-support.com
2. Find your "nas" server in the RBUY client
3. The ID is in the URL or visible in the debug endpoint

### Step 3: Restart the Agent

After updating SERVER_ID, restart the agent:

```bash
# If running as systemd service
sudo systemctl restart monitor-agent-omv-connections

# If running manually
sudo -E ./monitor-agent-omv-connections.sh
```

### Step 4: Verify

Check the debug endpoint to confirm:
```bash
curl https://stats.cenas-support.com/api/debug/servers
```

You should now see:
- No entries in `invalidServers`
- All connections under the correct server ID
- Only valid 32-character hex UUIDs

## Expected Behavior

**Before Fix:**
- Connections scattered across "1", "1.0", and "1adf33dc9ef39ee3572f87059aaded6a"
- Backup jobs missing from dashboard
- OMV agent version not tracked

**After Fix:**
- All connections under one server: "1adf33dc9ef39ee3572f87059aaded6a"
- Backup jobs show in dashboard widget
- OMV agent shows version and update status
- New invalid IDs rejected with clear error message

## Testing the Fix

1. Clean up: `curl -X DELETE https://stats.cenas-support.com/api/debug/cleanup-invalid-servers`
2. Update SERVER_ID in your environment
3. Restart agent
4. Run debug mode: `sudo -E ./monitor-agent-omv-connections.sh debug`
5. Check output - should show successful connection reporting
6. Visit dashboard - should see connections under correct server

## Error Messages

If you see this error in agent logs:
```
Invalid server_id format. Must be a 32-character hex UUID.
```

This means your SERVER_ID is incorrect. Update it to your full server UUID.

## Questions?

- Check debug endpoint: `https://stats.cenas-support.com/api/debug/servers`
- View server logs when the agent reports connections
- Run agent in debug mode for detailed output
