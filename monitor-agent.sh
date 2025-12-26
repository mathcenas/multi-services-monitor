#!/bin/bash

API_URL="http://your-monitor-server:3001/api"
SERVER_NAME=$(hostname)

fetch_config() {
    local server_id=$1
    curl -s "${API_URL}/servers/${server_id}/services.json"
}

check_service() {
    local check_command=$1
    if eval "$check_command" >/dev/null 2>&1; then
        echo "active"
    else
        echo "inactive"
    fi
}

send_status() {
    local server_name=$1
    local service_name=$2
    local status=$3
    local message=$4

    curl -s -X POST "${API_URL}/status" \
        -H "Content-Type: application/json" \
        -d "{
            \"server_name\": \"${server_name}\",
            \"service_name\": \"${service_name}\",
            \"status\": \"${status}\",
            \"message\": \"${message}\"
        }"
}

main() {
    if [ -z "$1" ]; then
        echo "Usage: $0 <server_id>"
        echo "Example: $0 1"
        exit 1
    fi

    local server_id=$1

    echo "Fetching configuration for server ID: ${server_id}"
    config=$(fetch_config "$server_id")

    if [ -z "$config" ]; then
        echo "Failed to fetch configuration"
        exit 1
    fi

    echo "Configuration received, checking services..."

    echo "$config" | jq -r '.services[] | @json' | while read -r service; do
        service_name=$(echo "$service" | jq -r '.name')
        check_command=$(echo "$service" | jq -r '.check_command')

        echo "Checking ${service_name}..."
        status=$(check_service "$check_command")

        message="Checked at $(date)"
        send_status "$SERVER_NAME" "$service_name" "$status" "$message"

        echo "  Status: ${status}"
    done

    echo "All services checked and reported"
}

main "$@"
