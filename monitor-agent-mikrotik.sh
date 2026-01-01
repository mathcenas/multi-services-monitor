#!/bin/bash

# MikroTik Monitoring Agent
# Monitors MikroTik RouterOS devices via SSH

API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
SERVER_NAME="${SERVER_NAME:-mikrotik}"
SERVER_ID="${SERVER_ID:-1}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"

# MikroTik SSH connection details
MIKROTIK_HOST="${MIKROTIK_HOST:-192.168.88.1}"
MIKROTIK_PORT="${MIKROTIK_PORT:-22}"
MIKROTIK_USER="${MIKROTIK_USER:-admin}"
MIKROTIK_KEY="${MIKROTIK_KEY:-}"

# Thresholds
CPU_WARNING="${CPU_WARNING:-70}"
CPU_CRITICAL="${CPU_CRITICAL:-90}"
RAM_WARNING="${RAM_WARNING:-70}"
RAM_CRITICAL="${RAM_CRITICAL:-90}"

ssh_command() {
    local command=$1
    if [ -n "$MIKROTIK_KEY" ]; then
        ssh -i "$MIKROTIK_KEY" -p "$MIKROTIK_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${MIKROTIK_USER}@${MIKROTIK_HOST}" "$command" 2>/dev/null
    else
        ssh -p "$MIKROTIK_PORT" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${MIKROTIK_USER}@${MIKROTIK_HOST}" "$command" 2>/dev/null
    fi
}

get_system_resources() {
    local output=$(ssh_command "/system resource print without-paging")

    if [ -z "$output" ]; then
        echo "error|Unable to connect to MikroTik"
        return 1
    fi

    local cpu_load=$(echo "$output" | grep "cpu-load:" | awk '{print $2}' | sed 's/%//')
    local free_memory=$(echo "$output" | grep "free-memory:" | awk '{print $2}' | sed 's/[^0-9]//g')
    local total_memory=$(echo "$output" | grep "total-memory:" | awk '{print $2}' | sed 's/[^0-9]//g')
    local uptime=$(echo "$output" | grep "uptime:" | awk '{print $2}')
    local version=$(echo "$output" | grep "version:" | awk '{print $2}')
    local board_name=$(echo "$output" | grep "board-name:" | cut -d':' -f2- | xargs)

    if [ -n "$total_memory" ] && [ "$total_memory" -gt 0 ]; then
        local used_memory=$((total_memory - free_memory))
        local ram_percent=$((used_memory * 100 / total_memory))
    else
        local ram_percent=0
    fi

    echo "${cpu_load}|${ram_percent}|${uptime}|${version}|${board_name}|${total_memory}|${free_memory}"
}

get_system_health() {
    local output=$(ssh_command "/system health print without-paging")

    if [ -z "$output" ]; then
        echo ""
        return
    fi

    local temperature=$(echo "$output" | grep "temperature:" | awk '{print $2}' | sed 's/C//')
    local voltage=$(echo "$output" | grep "voltage:" | awk '{print $2}' | sed 's/V//')

    echo "${temperature}|${voltage}"
}

check_interface_status() {
    local interface_name=$1
    local output=$(ssh_command "/interface print stats where name=\"${interface_name}\" without-paging")

    if echo "$output" | grep -q "R"; then
        echo "active"
    else
        echo "inactive"
    fi
}

check_service_status() {
    local service_name=$1
    local output=$(ssh_command "/ip service print where name=\"${service_name}\" without-paging")

    if echo "$output" | grep -q "disabled=no"; then
        echo "active"
    else
        echo "inactive"
    fi
}

check_custom_command() {
    local command=$1
    local output=$(ssh_command "$command")

    if [ $? -eq 0 ] && [ -n "$output" ]; then
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
    local version=$5
    local cpu_usage=$6
    local ram_usage=$7
    local temperature=$8

    local json_data="{
        \"server_name\": \"${server_name}\",
        \"service_name\": \"${service_name}\",
        \"status\": \"${status}\",
        \"message\": \"${message}\""

    if [ -n "$version" ]; then
        json_data="${json_data},
        \"version\": \"${version}\""
    fi

    if [ -n "$cpu_usage" ]; then
        json_data="${json_data},
        \"cpu_usage\": ${cpu_usage}"
    fi

    if [ -n "$ram_usage" ]; then
        json_data="${json_data},
        \"ram_usage\": ${ram_usage}"
    fi

    if [ -n "$temperature" ]; then
        json_data="${json_data},
        \"temperature\": ${temperature}"
    fi

    json_data="${json_data}
    }"

    curl -s -X POST "${API_URL}/status" \
        -H "Content-Type: application/json" \
        -d "$json_data"
}

monitor_system_resources() {
    echo "Checking system resources..."

    local resources=$(get_system_resources)

    if [ "$(echo "$resources" | cut -d'|' -f1)" = "error" ]; then
        local error_msg=$(echo "$resources" | cut -d'|' -f2)
        echo "  ERROR: $error_msg"
        send_status "$SERVER_NAME" "System" "inactive" "$error_msg" "" "" "" ""
        return 1
    fi

    local cpu_load=$(echo "$resources" | cut -d'|' -f1)
    local ram_percent=$(echo "$resources" | cut -d'|' -f2)
    local uptime=$(echo "$resources" | cut -d'|' -f3)
    local version=$(echo "$resources" | cut -d'|' -f4)
    local board_name=$(echo "$resources" | cut -d'|' -f5)
    local total_memory=$(echo "$resources" | cut -d'|' -f6)
    local free_memory=$(echo "$resources" | cut -d'|' -f7)

    local health=$(get_system_health)
    local temperature=$(echo "$health" | cut -d'|' -f1)
    local voltage=$(echo "$health" | cut -d'|' -f2)

    local status="active"
    local status_msg="System healthy"

    if [ -n "$cpu_load" ] && [ "$cpu_load" -ge "$CPU_CRITICAL" ]; then
        status="critical"
        status_msg="CPU critical: ${cpu_load}%"
    elif [ -n "$cpu_load" ] && [ "$cpu_load" -ge "$CPU_WARNING" ]; then
        status="warning"
        status_msg="CPU warning: ${cpu_load}%"
    fi

    if [ -n "$ram_percent" ] && [ "$ram_percent" -ge "$RAM_CRITICAL" ]; then
        status="critical"
        status_msg="Memory critical: ${ram_percent}%"
    elif [ -n "$ram_percent" ] && [ "$ram_percent" -ge "$RAM_WARNING" ]; then
        if [ "$status" != "critical" ]; then
            status="warning"
            status_msg="Memory warning: ${ram_percent}%"
        fi
    fi

    local total_mb=$((total_memory / 1024 / 1024))
    local free_mb=$((free_memory / 1024 / 1024))
    local used_mb=$((total_mb - free_mb))

    echo "  CPU: ${cpu_load}%"
    echo "  RAM: ${ram_percent}% (${used_mb}MB / ${total_mb}MB)"
    echo "  Uptime: ${uptime}"
    echo "  Version: RouterOS ${version}"
    echo "  Board: ${board_name}"

    if [ -n "$temperature" ]; then
        echo "  Temperature: ${temperature}°C"
    fi

    if [ -n "$voltage" ]; then
        echo "  Voltage: ${voltage}V"
    fi

    local message="CPU: ${cpu_load}%, RAM: ${ram_percent}% (${used_mb}/${total_mb}MB), Uptime: ${uptime}"

    if [ -n "$temperature" ]; then
        message="${message}, Temp: ${temperature}°C"
    fi

    send_status "$SERVER_NAME" "System Resources" "$status" "$message" "RouterOS ${version}" "$cpu_load" "$ram_percent" "$temperature"

    echo "  Status: ${status}"
}

check_configured_services() {
    echo "Fetching service configuration for server ID: ${SERVER_ID}"
    local config=$(curl -s "${API_URL}/servers/${SERVER_ID}/services.json")

    if [ -z "$config" ]; then
        echo "Failed to fetch configuration"
        return 1
    fi

    if ! echo "$config" | jq -e . >/dev/null 2>&1; then
        echo "Invalid JSON response from server"
        return 1
    fi

    if echo "$config" | jq -e '.error' >/dev/null 2>&1; then
        echo "ERROR: $(echo "$config" | jq -r '.error')"
        return 1
    fi

    local service_count=$(echo "$config" | jq '.services | length')

    if [ "$service_count" -eq 0 ]; then
        echo "No additional services configured"
        return 0
    fi

    echo "Checking ${service_count} configured service(s)..."

    echo "$config" | jq -r '.services[] | @json' | while read -r service; do
        local service_name=$(echo "$service" | jq -r '.name')
        local check_command=$(echo "$service" | jq -r '.check_command')
        local service_type=$(echo "$service" | jq -r '.type // "custom"')

        echo "  Checking ${service_name}..."

        case "$service_type" in
            interface)
                local status=$(check_interface_status "$check_command")
                ;;
            service)
                local status=$(check_service_status "$check_command")
                ;;
            *)
                local status=$(check_custom_command "$check_command")
                ;;
        esac

        local message="Checked at $(date)"
        send_status "$SERVER_NAME" "$service_name" "$status" "$message" "" "" "" ""

        echo "    Status: ${status}"
    done
}

main() {
    echo "======================================"
    echo "MikroTik Monitoring Agent Starting..."
    echo "======================================"
    echo "API URL: ${API_URL}"
    echo "Server ID: ${SERVER_ID}"
    echo "Server Name: ${SERVER_NAME}"
    echo "MikroTik Host: ${MIKROTIK_HOST}:${MIKROTIK_PORT}"
    echo "MikroTik User: ${MIKROTIK_USER}"
    echo "Check Interval: ${CHECK_INTERVAL} seconds"
    echo "CPU Thresholds: Warning ${CPU_WARNING}%, Critical ${CPU_CRITICAL}%"
    echo "RAM Thresholds: Warning ${RAM_WARNING}%, Critical ${RAM_CRITICAL}%"
    echo ""

    while true; do
        monitor_system_resources
        echo ""
        check_configured_services
        echo ""
        echo "Waiting ${CHECK_INTERVAL} seconds before next check..."
        sleep "$CHECK_INTERVAL"
    done
}

main
