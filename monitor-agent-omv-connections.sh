#!/bin/bash

AGENT_VERSION="1.3.4"
API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
BASE_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}"
SERVER_NAME=$(hostname)
SERVER_ID="${SERVER_ID:-1}"
HOSTNAME=$(hostname)
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"
AUTO_UPDATE="${AUTO_UPDATE:-true}"
UPDATE_CHECK_INTERVAL="${UPDATE_CHECK_INTERVAL:-86400}"
LAST_UPDATE_CHECK_FILE="/tmp/monitor-agent-omv-connections-last-update-check"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

report_connections() {
    local server_name="$1"
    local connections_json="$2"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"server_id\": \"$SERVER_ID\",
            \"server_name\": \"$server_name\",
            \"hostname\": \"$HOSTNAME\",
            \"connections\": $connections_json
        }" \
        "$API_URL/connections/report" 2>/dev/null)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ]; then
        echo "$body"
        return 0
    else
        echo "HTTP $http_code: $body" >&2
        return 1
    fi
}

resolve_hostname() {
    local ip="$1"
    local hostname

    # Try to resolve hostname using host command (fast)
    if command -v host &> /dev/null; then
        hostname=$(host -W 1 "$ip" 2>/dev/null | grep 'domain name pointer' | awk '{print $NF}' | sed 's/\.$//')
    fi

    # Fallback to nslookup if host didn't work
    if [ -z "$hostname" ] && command -v nslookup &> /dev/null; then
        hostname=$(nslookup "$ip" 2>/dev/null | grep 'name = ' | awk '{print $NF}' | sed 's/\.$//')
    fi

    # If still no hostname, try getent
    if [ -z "$hostname" ] && command -v getent &> /dev/null; then
        hostname=$(getent hosts "$ip" 2>/dev/null | awk '{print $2}')
    fi

    # Return hostname or IP if resolution failed
    if [ -z "$hostname" ]; then
        echo "$ip"
    else
        echo "$hostname"
    fi
}

get_smb_connections() {
    local connections="[]"

    if ! command -v smbstatus &> /dev/null; then
        echo "[]"
        return
    fi

    # First pass: collect IPs and usernames
    local temp_data=$(smbstatus 2>/dev/null | awk '
    BEGIN {
        in_connections_section = 0
    }

    # Detect the connections section (starts after "Samba version" line)
    /^Samba version/ {
        in_connections_section = 1
        next
    }

    # Skip the header line with dashes
    /^---/ {
        next
    }

    # End connections section when we hit "Service" line (start of services section)
    /^Service[[:space:]]+pid/ {
        in_connections_section = 0
        exit
    }

    # Parse connection lines in the connections section
    in_connections_section && NF >= 5 {
        # Skip header lines more aggressively
        if ($1 == "PID" || $1 == "pid" || $2 == "Username" || $1 == "Uid" || $2 == "Access" || $2 == "Connected") {
            next
        }

        # Skip lines that contain day names (header row artifacts)
        if ($2 == "Mon" || $2 == "Tue" || $2 == "Wed" || $2 == "Thu" || $2 == "Fri" || $2 == "Sat" || $2 == "Sun") {
            next
        }

        # PID must be numeric
        if ($1 !~ /^[0-9]+$/) {
            next
        }

        # Format: PID Username Group Machine Protocol_Version Encryption Signing
        # Example: 69812 acruz users 192.168.3.111 (ipv4:192.168.3.111:52509) SMB3_11 - AES-128-CMAC

        pid = $1
        username = $2
        machine = $4

        # Extract IP from machine field (format: IP or IP (ipv4:IP:port))
        ip = machine
        # Handle format like: 192.168.3.111 (ipv4:192.168.3.111:52509)
        if (match(machine, /ipv4:/)) {
            sub(/.*ipv4:/, "", ip)
            sub(/:.*/, "", ip)
        } else {
            # Extract simple IP format
            sub(/\(.*/, "", ip)
            gsub(/[[:space:]]/, "", ip)
        }

        # IP address must look like an IP (contains dots and numbers)
        if (ip !~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/) {
            next
        }

        # Skip localhost connections
        if (ip ~ /^127\./ || ip == "localhost") {
            next
        }

        # Store unique connections by username and IP
        key = username "|" ip
        if (!(key in seen)) {
            seen[key] = 1
            users[key] = username
            ips[key] = ip
        }
    }

    END {
        for (key in users) {
            print users[key] "|" ips[key]
        }
    }
    ')

    # Second pass: resolve hostnames and build JSON
    connections="["
    first=true
    while IFS='|' read -r username ip; do
        [ -z "$ip" ] && continue

        # Resolve hostname
        hostname=$(resolve_hostname "$ip")

        # Build JSON
        if [ "$first" = true ]; then
            first=false
        else
            connections+=","
        fi

        connections+="{\"username\":\"$username\",\"ip_address\":\"$ip\",\"hostname\":\"$hostname\",\"protocol\":\"SMB\"}"
    done <<< "$temp_data"
    connections+="]"

    echo "$connections"
}


collect_all_connections() {
    get_smb_connections
}

check_for_update() {
    if [ "$AUTO_UPDATE" != "true" ]; then
        return 0
    fi

    local current_time=$(date +%s)
    local last_check=0

    if [ -f "$LAST_UPDATE_CHECK_FILE" ]; then
        last_check=$(cat "$LAST_UPDATE_CHECK_FILE" 2>/dev/null || echo "0")
    fi

    local time_since_check=$((current_time - last_check))

    if [ $time_since_check -lt $UPDATE_CHECK_INTERVAL ]; then
        return 0
    fi

    echo "$current_time" > "$LAST_UPDATE_CHECK_FILE"

    log "Checking for agent updates..."
    local version_info=$(curl -s "${API_URL}/agent-version" 2>/dev/null)

    if [ -z "$version_info" ]; then
        log "Failed to check for updates"
        return 1
    fi

    local latest_version=$(echo "$version_info" | grep -o '"monitor-agent-omv-connections.sh":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$latest_version" ]; then
        log "Failed to parse version information"
        return 1
    fi

    if [ "$latest_version" != "$AGENT_VERSION" ]; then
        log "New version available: $latest_version (current: $AGENT_VERSION)"
        perform_update
        return $?
    else
        log "Agent is up to date (version $AGENT_VERSION)"
        return 0
    fi
}

perform_update() {
    log "Downloading new agent version..."

    local script_path=$(readlink -f "$0")
    local backup_path="${script_path}.backup"
    local temp_path="${script_path}.new"

    if ! curl -f -s -o "$temp_path" "${BASE_URL}/monitor-agent-omv-connections.sh"; then
        log "Failed to download new version"
        rm -f "$temp_path"
        return 1
    fi

    if [ ! -s "$temp_path" ]; then
        log "Downloaded file is empty"
        rm -f "$temp_path"
        return 1
    fi

    if ! bash -n "$temp_path" 2>/dev/null; then
        log "Downloaded file has syntax errors"
        rm -f "$temp_path"
        return 1
    fi

    cp "$script_path" "$backup_path"

    if mv "$temp_path" "$script_path"; then
        chmod +x "$script_path"
        log "Agent updated successfully. Restarting..."
        exec "$script_path" "$@"
    else
        log "Failed to update agent"
        mv "$backup_path" "$script_path" 2>/dev/null
        rm -f "$temp_path"
        return 1
    fi
}

main() {
    log "OpenMediaVault SMB Connection Monitor Agent v${AGENT_VERSION}"
    log "Monitoring SMB/Windows connections via smbstatus for server: $SERVER_NAME"
    log "Reporting to: $API_URL"
    log "Check interval: ${CHECK_INTERVAL}s"

    if ! command -v jq &> /dev/null; then
        log "ERROR: jq is required but not installed. Please install: apt-get install jq"
        exit 1
    fi

    if ! command -v curl &> /dev/null; then
        log "ERROR: curl is required but not installed. Please install: apt-get install curl"
        exit 1
    fi

    if ! command -v smbstatus &> /dev/null; then
        log "ERROR: smbstatus command not found. Please install: apt-get install samba"
        exit 1
    fi

    check_for_update

    while true; do
        log "Collecting connection information..."

        connections=$(collect_all_connections)

        if ! echo "$connections" | jq empty 2>/dev/null; then
            log "ERROR: Invalid JSON returned from connection collector"
            connections="[]"
        fi

        connection_count=$(echo "$connections" | jq 'length' 2>/dev/null || echo "0")

        log "Found $connection_count active connection(s)"

        log "Reporting connections to API..."
        if response=$(report_connections "$SERVER_NAME" "$connections" 2>&1); then
            log "Successfully reported connections"
        else
            log "ERROR: Failed to report connections - $response"
        fi

        log "Sleeping for ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"

        check_for_update
    done
}

if [ "$1" = "test" ]; then
    log "Running in test mode - collecting connections once..."
    echo ""
    echo "=== Testing smbstatus Connection Detection ==="
    echo ""

    if ! command -v smbstatus &> /dev/null; then
        echo "✗ ERROR: smbstatus command not found"
        echo "  Please install Samba: apt-get install samba"
        exit 1
    fi

    echo "✓ smbstatus command available"
    echo ""

    echo "=== Raw smbstatus Output (first 30 lines) ==="
    echo "---"
    smbstatus 2>/dev/null | head -30
    echo "---"
    echo ""

    echo "=== Parsed Connection Data ==="
    connections=$(collect_all_connections)
    echo "$connections" | jq '.' 2>/dev/null || echo "$connections"
    echo ""

    if echo "$connections" | jq empty 2>/dev/null; then
        connection_count=$(echo "$connections" | jq 'length')
        echo "✓ JSON validation: OK"
        echo "✓ Found $connection_count unique connection(s)"
    else
        echo "✗ JSON validation: FAILED"
    fi
    echo ""

    echo "=== API Configuration ==="
    echo "API URL: $API_URL/connections/report"
    echo "Server ID: $SERVER_ID"
    echo "Server Name: $SERVER_NAME"
    echo "Hostname: $HOSTNAME"
    echo "Check Interval: ${CHECK_INTERVAL}s"
    exit 0
fi

if [ "$1" = "debug" ]; then
    log "Debug mode - showing exact API payload..."
    echo ""

    connections=$(get_smb_connections)

    echo "=== Parsed Connections JSON ==="
    echo "$connections" | jq '.' 2>/dev/null || echo "$connections"
    echo ""

    echo "=== Full API Payload ==="
    payload=$(cat <<EOF
{
    "server_id": "$SERVER_ID",
    "server_name": "$SERVER_NAME",
    "hostname": "$HOSTNAME",
    "connections": $connections
}
EOF
)
    echo "$payload" | jq '.' 2>/dev/null || echo "$payload"
    echo ""

    echo "=== Testing API Call ==="
    response=$(curl -v -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$API_URL/connections/report" 2>&1)

    echo "$response"
    exit 0
fi

main
