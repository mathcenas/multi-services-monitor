#!/bin/bash

AGENT_VERSION="1.1.0"
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

    if command -v journalctl &> /dev/null; then
        journalctl -u smbd -n 500 --no-pager --since "5 minutes ago" 2>/dev/null | \
            grep "smbd_audit\[" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            grep -v "guest user" | \
            grep -v "gensec_spnego" | \
            grep -E '\|(ok|OK)\|' > "$temp_file"
    elif [ -f /var/log/syslog ]; then
        tail -n 500 /var/log/syslog 2>/dev/null | \
            grep "smbd_audit\[" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            grep -v "guest user" | \
            grep -v "gensec_spnego" | \
            grep -E '\|(ok|OK)\|' > "$temp_file"
    fi

    if [ -s "$temp_file" ]; then
        connections=$(awk -F'|' '
        {
            for (i = 1; i <= NF; i++) {
                if ($i ~ /smbd_audit\[/) {
                    split($i, parts, ":")
                    line = parts[2]
                    for (j = 3; j <= length(parts); j++) {
                        line = line ":" parts[j]
                    }

                    split(line, fields, "|")
                    if (length(fields) >= 5) {
                        username = fields[1]
                        gsub(/^[ \t]+|[ \t]+$/, "", username)

                        ip = fields[2]
                        gsub(/^[ \t]+|[ \t]+$/, "", ip)

                        hostname = fields[3]
                        gsub(/^[ \t]+|[ \t]+$/, "", hostname)

                        share = fields[5]
                        gsub(/^[ \t]+|[ \t]+$/, "", share)

                        if (username != "" && ip != "" && share != "") {
                            key = username "|" ip
                            users[key] = username
                            ips[key] = ip
                            hostnames[key] = hostname
                            shares[key] = share
                        }
                    }
                    break
                }
            }
        }
        END {
            printf "["
            first = 1
            for (key in users) {
                if (!first) printf ","
                first = 0
                printf "{\"username\":\"%s\",\"ip_address\":\"%s\",\"hostname\":\"%s\",\"protocol\":\"SMB\",\"share_name\":\"%s\"}", \
                    users[key], ips[key], hostnames[key], shares[key]
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
    log "OpenMediaVault SMB Connection Monitor Agent v1.1.0"
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
    echo "Testing SMB audit log parsing..."
    echo "---"
    if command -v journalctl &> /dev/null; then
        echo "Recent smbd_audit entries (last 10 successful operations):"
        journalctl -u smbd -n 100 --no-pager --since "5 minutes ago" 2>/dev/null | \
            grep "smbd_audit\[" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            grep -v "guest user" | \
            grep -v "gensec_spnego" | \
            grep -E '\|(ok|OK)\|' | \
            tail -10
    else
        echo "Recent smbd_audit entries from syslog (last 10 successful operations):"
        tail -n 200 /var/log/syslog 2>/dev/null | \
            grep "smbd_audit\[" | \
            grep -v "NT_STATUS_ACCESS_DENIED" | \
            grep -v "guest user" | \
            grep -v "gensec_spnego" | \
            grep -E '\|(ok|OK)\|' | \
            tail -10
    fi
    echo "---"
    echo ""

    connections=$(collect_all_connections)
    echo "Formatted connections JSON:"
    echo "$connections" | jq '.'
    echo ""

    if echo "$connections" | jq empty 2>/dev/null; then
        echo "JSON validation: OK"
    else
        echo "JSON validation: FAILED"
    fi
    echo ""

    echo "Would send to API: $API_URL/connections/report"
    echo "Server ID: $SERVER_ID"
    echo "Server Name: $SERVER_NAME"
    echo "Hostname: $HOSTNAME"
    exit 0
fi

main
