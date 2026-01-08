#!/bin/bash

API_URL="${API_URL:-http://localhost:3000}"
SERVER_NAME="${SERVER_NAME:-$(hostname)}"
HOSTNAME="${HOSTNAME:-$(hostname)}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

report_connections() {
    local server_name="$1"
    local connections_json="$2"

    curl -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"server_name\": \"$server_name\",
            \"hostname\": \"$HOSTNAME\",
            \"connections\": $connections_json
        }" \
        "$API_URL/api/connections/report" 2>/dev/null
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

get_nfs_connections() {
    local connections="[]"

    if [ -f /proc/fs/nfsd/clients/*/info ]; then
        connections=$(for client in /proc/fs/nfsd/clients/*/info; do
            if [ -f "$client" ]; then
                ip=$(grep "^address:" "$client" | awk '{print $2}' | sed 's/:.*$//')
                echo "{\"ip_address\":\"$ip\",\"protocol\":\"NFS\",\"username\":null,\"hostname\":null,\"share_name\":null,\"connected_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}"
            fi
        done | jq -s '.' 2>/dev/null || echo "[]")
    elif command -v showmount &> /dev/null; then
        connections=$(showmount -a 2>/dev/null | tail -n +2 | awk '{
            split($1, arr, ":");
            host = arr[1];
            share = arr[2];
            if (host != "") {
                printf "{\"ip_address\":\"%s\",\"hostname\":\"%s\",\"protocol\":\"NFS\",\"username\":null,\"share_name\":\"%s\",\"connected_at\":\"%s\"}\n",
                    host, host, share, strftime("%Y-%m-%dT%H:%M:%SZ", systime())
            }
        }' | jq -s '.' 2>/dev/null || echo "[]")
    fi

    echo "$connections"
}

get_ssh_connections() {
    local connections="[]"

    if command -v who &> /dev/null; then
        connections=$(who -u | grep -v "^$" | awk '{
            user = $1;
            tty = $2;
            ip = "";
            for (i = 6; i <= NF; i++) {
                if ($i ~ /^\(/) {
                    gsub(/[()]/, "", $i);
                    ip = $i;
                    break;
                }
            }
            if (ip == "") ip = "local";
            if (ip != "local") {
                printf "{\"username\":\"%s\",\"ip_address\":\"%s\",\"hostname\":null,\"protocol\":\"SSH\",\"share_name\":null,\"connected_at\":\"%s\"}\n",
                    user, ip, strftime("%Y-%m-%dT%H:%M:%SZ", systime())
            }
        }' | jq -s '.' 2>/dev/null || echo "[]")
    fi

    echo "$connections"
}

get_ftp_connections() {
    local connections="[]"

    if command -v ftpwho &> /dev/null; then
        connections=$(ftpwho 2>/dev/null | grep -E "^[0-9]" | awk '{
            user = $7;
            ip = $9;
            gsub(/[()]/, "", ip);
            if (ip != "") {
                printf "{\"username\":\"%s\",\"ip_address\":\"%s\",\"hostname\":null,\"protocol\":\"FTP\",\"share_name\":null,\"connected_at\":\"%s\"}\n",
                    user, ip, strftime("%Y-%m-%dT%H:%M:%SZ", systime())
            }
        }' | jq -s '.' 2>/dev/null || echo "[]")
    fi

    echo "$connections"
}

collect_all_connections() {
    local smb_conn=$(get_smb_connections)
    local nfs_conn=$(get_nfs_connections)
    local ssh_conn=$(get_ssh_connections)
    local ftp_conn=$(get_ftp_connections)

    local all_connections=$(echo "$smb_conn $nfs_conn $ssh_conn $ftp_conn" | \
        jq -s 'add | unique_by(.ip_address + .protocol + (.username // ""))' 2>/dev/null || echo "[]")

    echo "$all_connections"
}

main() {
    log "OpenMediaVault Connection Monitor Agent v1.0.0"
    log "Monitoring connections for server: $SERVER_NAME"
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

    while true; do
        log "Collecting connection information..."

        connections=$(collect_all_connections)
        connection_count=$(echo "$connections" | jq 'length' 2>/dev/null || echo "0")

        log "Found $connection_count active connection(s)"

        if [ "$connection_count" -gt 0 ]; then
            log "Reporting connections to API..."
            response=$(report_connections "$SERVER_NAME" "$connections")

            if [ $? -eq 0 ]; then
                log "Successfully reported connections"
            else
                log "ERROR: Failed to report connections to API"
            fi
        else
            log "No active connections to report"
            report_connections "$SERVER_NAME" "[]"
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
