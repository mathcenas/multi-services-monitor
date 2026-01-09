#!/bin/bash

AGENT_VERSION="1.2.0"
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

get_smb_connections() {
    local connections="[]"
    local temp_file=$(mktemp)

    # Try multiple log sources in order of preference
    if command -v journalctl &> /dev/null; then
        # Try journalctl with smbd service
        journalctl -u smbd -n 1000 --no-pager --since "5 minutes ago" 2>/dev/null | \
            grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | \
            grep -v "NT_STATUS_ACCESS_DENIED" > "$temp_file"
    fi

    # If no results, try syslog
    if [ ! -s "$temp_file" ] && [ -f /var/log/syslog ]; then
        tail -n 1000 /var/log/syslog 2>/dev/null | \
            grep -E "smbd.*audit" | \
            grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | \
            grep -v "NT_STATUS_ACCESS_DENIED" > "$temp_file"
    fi

    # Try Samba-specific audit log locations
    if [ ! -s "$temp_file" ]; then
        for log_path in /var/log/samba/audit.log /var/log/samba-audit.log /var/log/samba/log.smbd; do
            if [ -f "$log_path" ]; then
                tail -n 1000 "$log_path" 2>/dev/null | \
                    grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | \
                    grep -v "NT_STATUS_ACCESS_DENIED" >> "$temp_file"
            fi
        done
    fi

    if [ -s "$temp_file" ]; then
        connections=$(awk '
        {
            # Try to extract user, IP, share from various log formats
            # Format 1: Standard audit format with pipe delimiters
            # Format 2: OMV format with structured fields

            username = ""
            ip = ""
            share = ""
            hostname_val = ""

            # Look for pipe-delimited format: user|ip|hostname|status|share|operation
            if ($0 ~ /\|/) {
                split($0, parts, "|")
                for (i = 1; i <= length(parts); i++) {
                    if (parts[i] ~ /[a-zA-Z0-9_.-]+@/) {
                        # Skip email-like formats
                        continue
                    }
                    # Try to identify username (first text field)
                    if (username == "" && parts[i] ~ /^[a-zA-Z][a-zA-Z0-9_.-]*$/) {
                        username = parts[i]
                        gsub(/^[ \t]+|[ \t]+$/, "", username)
                    }
                    # Try to identify IP address
                    if (ip == "" && parts[i] ~ /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/) {
                        ip = parts[i]
                        gsub(/^[ \t]+|[ \t]+$/, "", ip)
                    }
                    # Share name often comes after OK status
                    if (parts[i] ~ /(ok|OK)/ && i+1 <= length(parts)) {
                        share = parts[i+1]
                        gsub(/^[ \t]+|[ \t]+$/, "", share)
                    }
                }
            }

            # Alternative: Look for key patterns in the log line
            if (username == "") {
                # Extract username from audit log
                if (match($0, /[^|]*smbd_audit[^:]*:[[:space:]]*([a-zA-Z][a-zA-Z0-9_.-]+)\|/, arr)) {
                    username = arr[1]
                } else if (match($0, /user=([a-zA-Z][a-zA-Z0-9_.-]+)/, arr)) {
                    username = arr[1]
                }
            }

            if (ip == "") {
                # Extract IP address
                if (match($0, /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/, arr)) {
                    ip = arr[1]
                    # Exclude localhost
                    if (ip == "127.0.0.1" || ip ~ /^127\./) {
                        ip = ""
                    }
                }
            }

            if (share == "") {
                # Extract share name - look for common patterns
                if (match($0, /share=([^|[:space:]]+)/, arr)) {
                    share = arr[1]
                } else if (match($0, /\|[^|]*\|([A-Z0-9_-]+)\|/, arr)) {
                    share = arr[1]
                }
            }

            # Store unique connections
            if (username != "" && ip != "" && share != "") {
                key = username "|" ip "|" share
                users[key] = username
                ips[key] = ip
                shares[key] = share
            }
        }
        END {
            printf "["
            first = 1
            for (key in users) {
                if (!first) printf ","
                first = 0
                # Escape quotes in values
                gsub(/"/, "\\\"", users[key])
                gsub(/"/, "\\\"", ips[key])
                gsub(/"/, "\\\"", shares[key])
                printf "{\"username\":\"%s\",\"ip_address\":\"%s\",\"hostname\":\"%s\",\"protocol\":\"SMB\",\"share_name\":\"%s\"}", \
                    users[key], ips[key], ips[key], shares[key]
            }
            printf "]"
        }
        ' "$temp_file" 2>/dev/null || echo "[]")
    fi

    rm -f "$temp_file"
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
    log "Monitoring SMB/Windows connections via audit logs for server: $SERVER_NAME"
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

    if ! command -v journalctl &> /dev/null && [ ! -f /var/log/syslog ]; then
        log "WARNING: Neither journalctl nor /var/log/syslog found. Cannot monitor connections."
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
    echo "=== Testing SMB Audit Log Parsing ==="
    echo ""

    echo "Checking available log sources..."
    if command -v journalctl &> /dev/null; then
        echo "✓ journalctl available"
        log_count=$(journalctl -u smbd -n 100 --no-pager --since "10 minutes ago" 2>/dev/null | grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | wc -l)
        echo "  Found $log_count SMB audit entries in journalctl (last 10 minutes)"
    fi

    if [ -f /var/log/syslog ]; then
        echo "✓ /var/log/syslog available"
        log_count=$(tail -n 500 /var/log/syslog 2>/dev/null | grep -E "smbd.*audit" | grep -E "(pwrite|pread|connect)" | wc -l)
        echo "  Found $log_count SMB audit entries in syslog"
    fi

    for log_path in /var/log/samba/audit.log /var/log/samba-audit.log /var/log/samba/log.smbd; do
        if [ -f "$log_path" ]; then
            echo "✓ $log_path available"
            log_count=$(tail -n 100 "$log_path" 2>/dev/null | grep -E "(pwrite|pread|connect)" | wc -l)
            echo "  Found $log_count SMB audit entries"
        fi
    done

    echo ""
    echo "=== Recent SMB Operations (last 10) ==="
    echo "---"

    if command -v journalctl &> /dev/null; then
        journalctl -u smbd -n 200 --no-pager --since "10 minutes ago" 2>/dev/null | \
            grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            tail -10
    elif [ -f /var/log/syslog ]; then
        tail -n 500 /var/log/syslog 2>/dev/null | \
            grep -E "smbd.*audit" | \
            grep -E "(pwrite|pread|connect|mkdir|rmdir|unlink|rename)" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            tail -10
    fi

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

main
