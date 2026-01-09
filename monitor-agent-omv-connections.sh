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
            \"server_id\": $SERVER_ID,
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

    if command -v smbstatus &> /dev/null; then
        connections=$(smbstatus -j 2>/dev/null | jq -c '[
            .sessions[] |
            {
                username: .username,
                ip_address: .remote_machine,
                hostname: .remote_machine,
                protocol: "SMB",
                share_name: (.tcons[0].service // ""),
                connected_at: (.session_start // now | todate)
            }
        ]' 2>/dev/null || echo "[]")
    fi

    echo "$connections"
}


collect_all_connections() {
    get_smb_connections
}

main() {
    log "OpenMediaVault SMB Connection Monitor Agent v1.0.0"
    log "Monitoring SMB/Windows connections for server: $SERVER_NAME"
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
        log "WARNING: smbstatus not found. Make sure Samba is installed and running."
    fi

    while true; do
        log "Collecting connection information..."

        connections=$(collect_all_connections)
        connection_count=$(echo "$connections" | jq 'length' 2>/dev/null || echo "0")

        log "Found $connection_count active connection(s)"

        if [ "$connection_count" -gt 0 ]; then
            log "Reporting connections to API..."
            if response=$(report_connections "$SERVER_NAME" "$connections" 2>&1); then
                log "Successfully reported connections"
            else
                log "ERROR: Failed to report connections - $response"
            fi
        else
            log "No active connections to report"
            if ! report_connections "$SERVER_NAME" "[]" 2>&1 | grep -q "200"; then
                log "WARNING: Failed to report empty connection list"
            fi
        fi

        log "Sleeping for ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

if [ "$1" = "test" ]; then
    log "Running in test mode - collecting connections once..."
    connections=$(collect_all_connections)
    echo "$connections" | jq '.'
    exit 0
fi

main
