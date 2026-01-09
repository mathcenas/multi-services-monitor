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

    if command -v smbstatus &> /dev/null; then
        local smb_output=$(smbstatus -j 2>/dev/null)

        if [ -n "$smb_output" ] && echo "$smb_output" | jq empty 2>/dev/null; then
            connections=$(echo "$smb_output" | jq -c '
                if .sessions then
                    [.sessions[] |
                    {
                        username: (.username // "unknown"),
                        ip_address: (.remote_machine // "unknown"),
                        hostname: (.remote_machine // "unknown"),
                        protocol: "SMB",
                        share_name: (if .tcons and (.tcons | length > 0) then .tcons[0].service else "" end),
                        connected_at: (if .session_start then (.session_start | todate) else (now | todate) end)
                    }]
                else
                    []
                end
            ' 2>/dev/null || echo "[]")
        fi
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
    echo "Testing smbstatus output..."
    echo "---"
    smbstatus -j 2>&1 | head -20
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
