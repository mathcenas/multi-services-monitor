#!/bin/bash

# Use same environment variables as monitor-agent.sh for consistency
API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
SERVER_NAME=$(hostname)
SERVER_ID="${SERVER_ID:-1}"
HOSTNAME=$(hostname)
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"

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
