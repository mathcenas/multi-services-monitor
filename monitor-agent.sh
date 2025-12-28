#!/bin/bash

API_URL="${MONITOR_API_URL:-http://localhost:3001}/api"
SERVER_NAME=$(hostname)
SERVER_ID="${SERVER_ID:-1}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"

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

check_all_services() {
    echo "Fetching configuration for server ID: ${SERVER_ID}"
    config=$(fetch_config "$SERVER_ID")

    if [ -z "$config" ]; then
        echo "Failed to fetch configuration"
        return 1
    fi

    if ! echo "$config" | jq -e . >/dev/null 2>&1; then
        echo "ERROR: Invalid JSON response from server"
        echo "Response received:"
        echo "$config"
        return 1
    fi

    if echo "$config" | jq -e '.error' >/dev/null 2>&1; then
        echo "ERROR: $(echo "$config" | jq -r '.error')"
        return 1
    fi

    service_count=$(echo "$config" | jq '.services | length')
    if [ "$service_count" -eq 0 ]; then
        echo "No services configured for this server yet"
        echo "Please add services through the web interface"
        return 0
    fi

    echo "Configuration received, checking ${service_count} service(s)..."

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

main() {
    echo "Starting monitoring agent..."
    echo "API URL: ${API_URL}"
    echo "Server ID: ${SERVER_ID}"
    echo "Server Name: ${SERVER_NAME}"
    echo "Check Interval: ${CHECK_INTERVAL} seconds"
    echo ""

    while true; do
        check_all_services
        echo ""
        echo "Waiting ${CHECK_INTERVAL} seconds before next check..."
        sleep "$CHECK_INTERVAL"
    done
}

main
