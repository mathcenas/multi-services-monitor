#!/bin/bash

API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
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

get_service_version() {
    local service_name=$1
    local version=""

    case "$service_name" in
        apache2|httpd)
            version=$(httpd -v 2>/dev/null | grep "Server version" | sed -E 's/.*Apache\/([0-9.]+).*/\1/' 2>/dev/null || apache2 -v 2>/dev/null | grep "Server version" | sed -E 's/.*Apache\/([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        nginx)
            version=$(nginx -v 2>&1 | sed -E 's/.*nginx\/([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        docker)
            version=$(docker --version 2>/dev/null | sed -E 's/.*version ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        mysql|mariadb)
            version=$(mysql --version 2>/dev/null | sed -E 's/.*Distrib ([0-9.]+).*/\1/' 2>/dev/null || mysqld --version 2>/dev/null | sed -E 's/.*Ver ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        postgresql|postgres)
            version=$(psql --version 2>/dev/null | sed -E 's/.*PostgreSQL ([0-9.]+).*/\1/' 2>/dev/null || postgres --version 2>/dev/null | sed -E 's/.*PostgreSQL ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        redis|redis-server)
            version=$(redis-server --version 2>/dev/null | sed -E 's/.*v=([0-9.]+).*/\1/' 2>/dev/null || redis-cli --version 2>/dev/null | sed -E 's/.*redis-cli ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        mongodb|mongod)
            version=$(mongod --version 2>/dev/null | grep "db version" | sed -E 's/.*v([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        php|php-fpm)
            version=$(php -v 2>/dev/null | head -n 1 | sed -E 's/PHP ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        node|nodejs)
            version=$(node --version 2>/dev/null | sed 's/v//' 2>/dev/null || echo "")
            ;;
        python|python3)
            version=$(python3 --version 2>/dev/null | sed -E 's/Python ([0-9.]+).*/\1/' 2>/dev/null || python --version 2>/dev/null | sed -E 's/Python ([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        sshd|ssh)
            version=$(ssh -V 2>&1 | head -n 1 | sed -E 's/.*OpenSSH_([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        *)
            version=""
            ;;
    esac

    echo "$version"
}

send_status() {
    local server_name=$1
    local service_name=$2
    local status=$3
    local message=$4
    local version=$5

    local json_data="{
        \"server_name\": \"${server_name}\",
        \"service_name\": \"${service_name}\",
        \"status\": \"${status}\",
        \"message\": \"${message}\""

    if [ -n "$version" ]; then
        json_data="${json_data},
        \"version\": \"${version}\""
    fi

    json_data="${json_data}
    }"

    curl -s -X POST "${API_URL}/status" \
        -H "Content-Type: application/json" \
        -d "$json_data"
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
        version=$(get_service_version "$service_name")

        message="Checked at $(date)"
        send_status "$SERVER_NAME" "$service_name" "$status" "$message" "$version"

        echo "  Status: ${status}"
        if [ -n "$version" ]; then
            echo "  Version: ${version}"
        fi
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
