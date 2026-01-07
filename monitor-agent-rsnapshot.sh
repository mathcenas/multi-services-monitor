#!/bin/bash

# OpenMediaVault rsnapshot Monitor Agent
# This agent monitors rsnapshot backup jobs via log files

AGENT_VERSION="1.1.0"
API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
BASE_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}"
SERVER_NAME=$(hostname)
SERVER_ID="${SERVER_ID:-1}"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"
AUTO_UPDATE="${AUTO_UPDATE:-true}"
UPDATE_CHECK_INTERVAL="${UPDATE_CHECK_INTERVAL:-86400}"
LAST_UPDATE_CHECK_FILE="/tmp/monitor-agent-rsnapshot-last-update-check"
RSNAPSHOT_LOG="${RSNAPSHOT_LOG:-/var/log/rsnapshot.log}"

fetch_config() {
    local server_id=$1
    curl -s "${API_URL}/servers/${server_id}/services.json"
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

    echo "Checking for agent updates..."
    local version_info=$(curl -s "${API_URL}/agent-version" 2>/dev/null)

    if [ -z "$version_info" ]; then
        echo "Failed to check for updates"
        return 1
    fi

    local latest_version=$(echo "$version_info" | grep -o '"monitor-agent-rsnapshot.sh":"[^"]*"' | cut -d'"' -f4)

    if [ -z "$latest_version" ]; then
        echo "Failed to parse version information"
        return 1
    fi

    if [ "$latest_version" != "$AGENT_VERSION" ]; then
        echo "New version available: $latest_version (current: $AGENT_VERSION)"
        perform_update
        return $?
    else
        echo "Agent is up to date (version $AGENT_VERSION)"
        return 0
    fi
}

perform_update() {
    echo "Downloading new agent version..."

    local script_path=$(readlink -f "$0")
    local backup_path="${script_path}.backup"
    local temp_path="${script_path}.new"

    if ! curl -f -s -o "$temp_path" "${BASE_URL}/monitor-agent-rsnapshot.sh"; then
        echo "Failed to download new version"
        rm -f "$temp_path"
        return 1
    fi

    if [ ! -s "$temp_path" ]; then
        echo "Downloaded file is empty"
        rm -f "$temp_path"
        return 1
    fi

    if ! head -n 1 "$temp_path" | grep -q "^#!/bin/bash"; then
        echo "Downloaded file is not a valid bash script"
        rm -f "$temp_path"
        return 1
    fi

    cp "$script_path" "$backup_path"
    chmod +x "$temp_path"
    mv "$temp_path" "$script_path"

    echo "Update completed successfully!"
    echo "Restarting agent with new version..."

    exec "$script_path" "$@"
}

parse_rsnapshot_job() {
    local job_uuid=$1
    local job_type=$2
    local max_age_hours=$3
    local log_file=$4

    if [ ! -f "$log_file" ]; then
        echo "error|Log file not found: $log_file|0"
        return
    fi

    local last_entry=$(grep -E "rsnapshot-${job_uuid}\.conf ${job_type}:" "$log_file" | tail -1)

    if [ -z "$last_entry" ]; then
        echo "error|No log entries found for job $job_uuid ($job_type)|0"
        return
    fi

    local timestamp=$(echo "$last_entry" | grep -oP '\[\K[^\]]+' 2>/dev/null || echo "")
    local status_line="$last_entry"

    local status=""
    local message=""
    local backup_age_hours=0

    if [ -n "$timestamp" ]; then
        local backup_epoch=$(date -d "$timestamp" +%s 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        backup_age_hours=$(( (current_epoch - backup_epoch) / 3600 ))
    fi

    if echo "$status_line" | grep -q "completed successfully"; then
        if [ "$backup_age_hours" -gt "${max_age_hours:-25}" ]; then
            status="stale"
            message="Last successful backup was ${backup_age_hours}h ago"
        else
            status="active"
            message="Completed successfully ${backup_age_hours}h ago"
        fi
    elif echo "$status_line" | grep -q "completed, but with some warnings"; then
        status="warning"
        message="Completed with warnings ${backup_age_hours}h ago"
    elif echo "$status_line" | grep -q "ERROR"; then
        local error_msg=$(echo "$status_line" | grep -oP 'ERROR: \K.*' || echo "Unknown error")
        status="inactive"
        message="ERROR: $error_msg"
    elif echo "$status_line" | grep -q "started"; then
        status="running"
        message="Backup job currently running"
    else
        status="unknown"
        message="Unknown status"
    fi

    echo "${status}|${message}|${backup_age_hours}"
}

get_default_max_age() {
    local job_type=$1

    case "$job_type" in
        hourly)
            echo "2"
            ;;
        daily)
            echo "25"
            ;;
        weekly)
            echo "192"
            ;;
        monthly)
            echo "768"
            ;;
        yearly)
            echo "8784"
            ;;
        *)
            echo "25"
            ;;
    esac
}

check_rsnapshot_job() {
    local check_command=$1

    local parts=(${check_command})
    local job_uuid="${parts[0]}"
    local job_type="${parts[1]:-daily}"
    local max_age_hours="${parts[2]}"

    if [ -z "$max_age_hours" ]; then
        max_age_hours=$(get_default_max_age "$job_type")
    fi

    parse_rsnapshot_job "$job_uuid" "$job_type" "$max_age_hours" "$RSNAPSHOT_LOG"
}

check_disk_space() {
    local disk_path=$1

    if [ -z "$disk_path" ]; then
        echo ""
        return
    fi

    if [ ! -e "$disk_path" ]; then
        echo "path_not_found"
        return
    fi

    local df_output=$(df -h "$disk_path" 2>/dev/null | tail -n 1)

    if [ -z "$df_output" ]; then
        echo "error"
        return
    fi

    local usage=$(echo "$df_output" | awk '{print $5}' | sed 's/%//')
    local total=$(echo "$df_output" | awk '{print $2}')
    local used=$(echo "$df_output" | awk '{print $3}')
    local available=$(echo "$df_output" | awk '{print $4}')

    echo "${usage}|${total}|${used}|${available}"
}

send_status() {
    local server_name=$1
    local service_name=$2
    local status=$3
    local message=$4
    local backup_age_hours=$5
    local disk_info=$6

    local json_data="{
        \"server_name\": \"${server_name}\",
        \"service_name\": \"${service_name}\",
        \"status\": \"${status}\",
        \"message\": \"${message}\""

    if [ -n "$backup_age_hours" ] && [ "$backup_age_hours" != "0" ]; then
        json_data="${json_data},
        \"version\": \"${backup_age_hours}h ago\""
    fi

    if [ -n "$disk_info" ]; then
        local disk_usage=$(echo "$disk_info" | cut -d'|' -f1)
        local disk_total=$(echo "$disk_info" | cut -d'|' -f2)
        local disk_used=$(echo "$disk_info" | cut -d'|' -f3)
        local disk_available=$(echo "$disk_info" | cut -d'|' -f4)

        json_data="${json_data},
        \"disk_usage\": ${disk_usage},
        \"disk_total\": \"${disk_total}\",
        \"disk_used\": \"${disk_used}\",
        \"disk_available\": \"${disk_available}\""
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
        echo "No rsnapshot services configured for this server yet"
        echo "Please add rsnapshot backup jobs through the web interface"
        return 0
    fi

    echo "Configuration received, checking ${service_count} rsnapshot job(s)..."

    echo "$config" | jq -r '.services[] | @json' | while read -r service; do
        service_name=$(echo "$service" | jq -r '.name')
        check_command=$(echo "$service" | jq -r '.check_command')
        disk_path=$(echo "$service" | jq -r '.disk_path // empty')

        echo "Checking rsnapshot job: ${service_name}..."

        result=$(check_rsnapshot_job "$check_command")
        status=$(echo "$result" | cut -d'|' -f1)
        message=$(echo "$result" | cut -d'|' -f2)
        backup_age=$(echo "$result" | cut -d'|' -f3)

        disk_info=""
        if [ -n "$disk_path" ]; then
            disk_info=$(check_disk_space "$disk_path")
            if [ -n "$disk_info" ] && [ "$disk_info" != "path_not_found" ] && [ "$disk_info" != "error" ]; then
                disk_usage=$(echo "$disk_info" | cut -d'|' -f1)
                echo "  Disk: ${disk_usage}% used at ${disk_path}"
            fi
        fi

        send_status "$SERVER_NAME" "$service_name" "$status" "$message" "$backup_age" "$disk_info"

        echo "  Status: ${status}"
        echo "  Message: ${message}"
        if [ -n "$backup_age" ] && [ "$backup_age" != "0" ]; then
            echo "  Backup Age: ${backup_age} hours"
        fi
    done

    echo "All rsnapshot jobs checked and reported"
}

main() {
    echo "Starting rsnapshot monitoring agent..."
    echo "Agent Version: ${AGENT_VERSION}"
    echo "API URL: ${API_URL}"
    echo "Server ID: ${SERVER_ID}"
    echo "Server Name: ${SERVER_NAME}"
    echo "Check Interval: ${CHECK_INTERVAL} seconds"
    echo "Auto-Update: ${AUTO_UPDATE}"
    echo "rsnapshot Log: ${RSNAPSHOT_LOG}"
    echo ""

    if [ ! -f "$RSNAPSHOT_LOG" ]; then
        echo "WARNING: rsnapshot log file not found at: ${RSNAPSHOT_LOG}"
        echo "Please ensure rsnapshot is installed and logging to this location"
        echo "You can set a custom path with: export RSNAPSHOT_LOG=/path/to/log"
        echo ""
    fi

    check_for_update

    while true; do
        check_all_services
        check_for_update
        echo ""
        echo "Waiting ${CHECK_INTERVAL} seconds before next check..."
        sleep "$CHECK_INTERVAL"
    done
}

main
