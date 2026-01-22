#!/bin/bash

AGENT_VERSION="1.2.0"
API_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}/api"
BASE_URL="${MONITOR_API_URL:-https://stats.cenas-support.com}"
SERVER_NAME=$(hostname)
SERVER_ID="${SERVER_ID:-1}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"
AUTO_UPDATE="${AUTO_UPDATE:-true}"
UPDATE_CHECK_INTERVAL="${UPDATE_CHECK_INTERVAL:-86400}"
LAST_UPDATE_CHECK_FILE="/tmp/monitor-agent-last-update-check"

OS_INFO=$(get_os_info() {
    if [ -f "/etc/os-release" ]; then
        . /etc/os-release
        echo "${ID}|${VERSION_ID}|${NAME} ${VERSION_ID}"
    elif [ -f "/etc/redhat-release" ]; then
        content=$(cat /etc/redhat-release)
        version=$(echo "$content" | sed -E 's/.*release ([0-9.]+).*/\1/')
        echo "rhel|${version}|${content}"
    else
        echo "unknown|unknown|Unknown OS"
    fi
}; get_os_info)
OS_ID=$(echo "$OS_INFO" | cut -d'|' -f1)
OS_VERSION=$(echo "$OS_INFO" | cut -d'|' -f2)

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

    local latest_version=$(echo "$version_info" | grep -o '"monitor-agent.sh":"[^"]*"' | cut -d'"' -f4)

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

    if ! curl -f -s -o "$temp_path" "${BASE_URL}/monitor-agent.sh"; then
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

check_tcp_port() {
    local host=$1
    local port=$2
    local timeout=${3:-5}

    if command -v nc >/dev/null 2>&1; then
        if nc -z -w "$timeout" "$host" "$port" >/dev/null 2>&1; then
            echo "active"
        else
            echo "inactive"
        fi
    elif command -v timeout >/dev/null 2>&1 && command -v bash >/dev/null 2>&1; then
        if timeout "$timeout" bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            echo "active"
        else
            echo "inactive"
        fi
    else
        echo "error"
    fi
}

check_service() {
    local check_command=$1

    # Check if it's a TCP port check command (format: nc -z host port or similar)
    if echo "$check_command" | grep -q "nc -z"; then
        # Extract host and port from command like "nc -z 192.168.1.1 80" or "nc -z example.com 443"
        local host=$(echo "$check_command" | awk '{print $3}')
        local port=$(echo "$check_command" | awk '{print $4}')
        if [ -n "$host" ] && [ -n "$port" ]; then
            check_tcp_port "$host" "$port" 5
            return
        fi
    fi

    # Check if it's a direct host:port format
    if echo "$check_command" | grep -qE '^[a-zA-Z0-9.-]+:[0-9]+$'; then
        local host=$(echo "$check_command" | cut -d':' -f1)
        local port=$(echo "$check_command" | cut -d':' -f2)
        check_tcp_port "$host" "$port" 5
        return
    fi

    # Default behavior: evaluate the command as-is
    if eval "$check_command" >/dev/null 2>&1; then
        echo "active"
    else
        echo "inactive"
    fi
}

get_os_info() {
    if [ -f "/etc/os-release" ]; then
        . /etc/os-release
        echo "${ID}|${VERSION_ID}|${NAME} ${VERSION_ID}"
    elif [ -f "/etc/redhat-release" ]; then
        content=$(cat /etc/redhat-release)
        version=$(echo "$content" | sed -E 's/.*release ([0-9.]+).*/\1/')
        echo "rhel|${version}|${content}"
    else
        echo "unknown|unknown|Unknown OS"
    fi
}

check_os_updates() {
    local updates_available=0

    if [ -f "/etc/os-release" ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian)
                if command -v apt-get >/dev/null 2>&1; then
                    apt-get update -qq 2>/dev/null
                    updates_available=$(apt-get -s upgrade 2>/dev/null | grep -P '^\d+ upgraded' | cut -d" " -f1)
                fi
                ;;
            rhel|centos|rocky|almalinux|fedora)
                if command -v dnf >/dev/null 2>&1; then
                    updates_available=$(dnf check-update -q 2>/dev/null | grep -v "^$" | grep -v "Last metadata" | wc -l)
                elif command -v yum >/dev/null 2>&1; then
                    updates_available=$(yum check-update -q 2>/dev/null | grep -v "^$" | wc -l)
                fi
                ;;
            alpine)
                if command -v apk >/dev/null 2>&1; then
                    apk update -q 2>/dev/null
                    updates_available=$(apk list -u 2>/dev/null | wc -l)
                fi
                ;;
            arch)
                if command -v pacman >/dev/null 2>&1; then
                    updates_available=$(pacman -Qu 2>/dev/null | wc -l)
                fi
                ;;
        esac
    fi

    echo "$updates_available"
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

get_service_version() {
    local service_name=$1
    local service_name_lower=$(echo "$service_name" | tr '[:upper:]' '[:lower:]')
    local version=""

    case "$service_name_lower" in
        os|operating-system|system|*patch*)
            os_info=$(get_os_info)
            version=$(echo "$os_info" | cut -d'|' -f2)
            updates=$(check_os_updates)
            if [ "$updates" -gt 0 ]; then
                version="${version} (${updates} updates available)"
            fi
            ;;
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
        jboss|wildfly|jboss-eap)
            if command -v /opt/jboss/wildfly/bin/standalone.sh >/dev/null 2>&1; then
                version=$(/opt/jboss/wildfly/bin/standalone.sh --version 2>/dev/null | grep -oP 'WildFly Full \K[0-9.]+' || echo "")
            elif command -v /opt/jboss-eap/bin/standalone.sh >/dev/null 2>&1; then
                version=$(/opt/jboss-eap/bin/standalone.sh --version 2>/dev/null | grep -oP 'JBoss EAP \K[0-9.]+' || echo "")
            elif [ -f "/opt/jboss/wildfly/version.txt" ]; then
                version=$(cat /opt/jboss/wildfly/version.txt 2>/dev/null | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/' || echo "")
            elif [ -f "/opt/jboss-eap/version.txt" ]; then
                version=$(cat /opt/jboss-eap/version.txt 2>/dev/null | sed -E 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/' || echo "")
            else
                version=""
            fi
            ;;
        postgres|postgresql)
            version=$(psql --version 2>/dev/null | sed -E 's/.*PostgreSQL[[:space:]]+([0-9.]+).*/\1/' 2>/dev/null || postgres --version 2>/dev/null | sed -E 's/.*PostgreSQL[[:space:]]+([0-9.]+).*/\1/' 2>/dev/null || pg_config --version 2>/dev/null | sed -E 's/.*PostgreSQL[[:space:]]+([0-9.]+).*/\1/' 2>/dev/null || echo "")
            ;;
        *)
            version=""
            ;;
    esac

    echo "$version"
}

send_status() {
    local service_name=$1
    local status=$2
    local message=$3
    local version=$4
    local disk_info=$5

    local json_data="{
        \"server_id\": \"${SERVER_ID}\",
        \"service_name\": \"${service_name}\",
        \"status\": \"${status}\",
        \"message\": \"${message}\",
        \"agent_version\": \"${AGENT_VERSION}\",
        \"agent_type\": \"monitor-agent.sh\",
        \"os\": \"${OS_ID}\",
        \"os_version\": \"${OS_VERSION}\""

    if [ -n "$version" ]; then
        json_data="${json_data},
        \"version\": \"${version}\""
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
        echo "No services configured for this server yet"
        echo "Please add services through the web interface"
        return 0
    fi

    echo "Configuration received, checking ${service_count} service(s)..."

    echo "$config" | jq -r '.services[] | @json' | while read -r service; do
        service_name=$(echo "$service" | jq -r '.name')
        check_command=$(echo "$service" | jq -r '.check_command')
        disk_path=$(echo "$service" | jq -r '.disk_path // empty')

        echo "Checking ${service_name}..."
        status=$(check_service "$check_command")
        version=$(get_service_version "$service_name")
        disk_info=""

        if [ -n "$disk_path" ]; then
            disk_info=$(check_disk_space "$disk_path")
            if [ -n "$disk_info" ] && [ "$disk_info" != "path_not_found" ] && [ "$disk_info" != "error" ]; then
                disk_usage=$(echo "$disk_info" | cut -d'|' -f1)
                echo "  Disk: ${disk_usage}% used at ${disk_path}"
            fi
        fi

        message="Checked at $(date)"
        send_status "$service_name" "$status" "$message" "$version" "$disk_info"

        echo "  Status: ${status}"
        if [ -n "$version" ]; then
            echo "  Version: ${version}"
        fi
    done

    echo "All services checked and reported"
}

main() {
    echo "Starting monitoring agent..."
    echo "Agent Version: ${AGENT_VERSION}"
    echo "API URL: ${API_URL}"
    echo "Server ID: ${SERVER_ID}"
    echo "Server Name: ${SERVER_NAME}"
    echo "Check Interval: ${CHECK_INTERVAL} seconds"
    echo "Auto-Update: ${AUTO_UPDATE}"
    echo ""

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
