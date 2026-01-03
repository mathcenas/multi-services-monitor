# Windows Monitoring Agent for Service Status Dashboard
# PowerShell 5.1+ required

param(
    [string]$ApiUrl = $env:MONITOR_API_URL,
    [string]$ServerId = $env:SERVER_ID,
    [int]$CheckInterval = 60
)

if ([string]::IsNullOrEmpty($ApiUrl)) {
    $ApiUrl = "https://stats.cenas-support.com"
}

if ([string]::IsNullOrEmpty($ServerId)) {
    $ServerId = "1"
}

if ($CheckInterval -le 0) {
    $CheckInterval = 60
}

$ServerName = $env:COMPUTERNAME

function Fetch-Config {
    param([string]$ServerId)

    try {
        $url = "$ApiUrl/api/servers/$ServerId/services.json"
        $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
        return $response
    }
    catch {
        Write-Host "Failed to fetch configuration: $_" -ForegroundColor Red
        return $null
    }
}

function Check-Service {
    param([string]$CheckCommand)

    try {
        $result = Invoke-Expression $CheckCommand 2>&1
        if ($LASTEXITCODE -eq 0 -or $?) {
            return "active"
        }
        else {
            return "inactive"
        }
    }
    catch {
        return "inactive"
    }
}

function Get-OSInfo {
    try {
        $os = Get-CimInstance -ClassName Win32_OperatingSystem
        $osName = $os.Caption
        $osVersion = $os.Version
        $buildNumber = $os.BuildNumber

        return @{
            id = "windows"
            version = "$osVersion (Build $buildNumber)"
            name = $osName
        }
    }
    catch {
        return @{
            id = "windows"
            version = "unknown"
            name = "Windows"
        }
    }
}

function Check-WindowsUpdates {
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
        return $searchResult.Updates.Count
    }
    catch {
        return 0
    }
}

function Check-DiskSpace {
    param([string]$DiskPath)

    if ([string]::IsNullOrEmpty($DiskPath)) {
        return $null
    }

    try {
        # Handle drive letter (C:, D:, etc.)
        if ($DiskPath -match '^[A-Za-z]:?\\?$') {
            $driveLetter = $DiskPath.Substring(0, 1)
            $volume = Get-Volume -DriveLetter $driveLetter -ErrorAction Stop

            $totalGB = [math]::Round($volume.Size / 1GB, 2)
            $usedGB = [math]::Round(($volume.Size - $volume.SizeRemaining) / 1GB, 2)
            $freeGB = [math]::Round($volume.SizeRemaining / 1GB, 2)
            $usagePercent = [math]::Round((($volume.Size - $volume.SizeRemaining) / $volume.Size) * 100, 0)

            return @{
                usage = $usagePercent
                total = "$totalGB GB"
                used = "$usedGB GB"
                available = "$freeGB GB"
            }
        }
        # Handle UNC path or folder path
        elseif (Test-Path $DiskPath) {
            $drive = [System.IO.DriveInfo]::GetDrives() | Where-Object { $DiskPath.StartsWith($_.Name) } | Select-Object -First 1

            if ($drive) {
                $totalGB = [math]::Round($drive.TotalSize / 1GB, 2)
                $freeGB = [math]::Round($drive.AvailableFreeSpace / 1GB, 2)
                $usedGB = [math]::Round(($drive.TotalSize - $drive.AvailableFreeSpace) / 1GB, 2)
                $usagePercent = [math]::Round((($drive.TotalSize - $drive.AvailableFreeSpace) / $drive.TotalSize) * 100, 0)

                return @{
                    usage = $usagePercent
                    total = "$totalGB GB"
                    used = "$usedGB GB"
                    available = "$freeGB GB"
                }
            }
            else {
                return "error"
            }
        }
        else {
            return "path_not_found"
        }
    }
    catch {
        Write-Host "Error checking disk space for ${DiskPath}: $_" -ForegroundColor Yellow
        return "error"
    }
}

function Get-ServiceVersion {
    param([string]$ServiceName)

    $serviceLower = $ServiceName.ToLower()
    $version = ""

    switch -Regex ($serviceLower) {
        "^(os|operating-system|system|.*patch.*|windows)$" {
            $osInfo = Get-OSInfo
            $version = $osInfo.version
            $updates = Check-WindowsUpdates
            if ($updates -gt 0) {
                $version = "$version ($updates updates available)"
            }
        }
        "^(iis|w3svc|http)$" {
            try {
                $iisVersion = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\InetStp" -ErrorAction SilentlyContinue
                if ($iisVersion) {
                    $version = "$($iisVersion.MajorVersion).$($iisVersion.MinorVersion)"
                }
            }
            catch {
                $version = ""
            }
        }
        "^(sql.*server|mssql)$" {
            try {
                $sqlVersion = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL" -ErrorAction SilentlyContinue
                if ($sqlVersion) {
                    $instanceName = $sqlVersion.MSSQLSERVER
                    $versionInfo = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instanceName\MSSQLServer\CurrentVersion" -ErrorAction SilentlyContinue
                    if ($versionInfo) {
                        $version = $versionInfo.CurrentVersion
                    }
                }
            }
            catch {
                $version = ""
            }
        }
        "^(docker)$" {
            try {
                $dockerVersion = docker --version 2>$null
                if ($dockerVersion -match "(\d+\.\d+\.\d+)") {
                    $version = $matches[1]
                }
            }
            catch {
                $version = ""
            }
        }
        "^(mysql|mariadb)$" {
            try {
                $mysqlVersion = mysql --version 2>$null
                if ($mysqlVersion -match "(\d+\.\d+\.\d+)") {
                    $version = $matches[1]
                }
            }
            catch {
                $version = ""
            }
        }
        "^(nginx)$" {
            try {
                $nginxVersion = nginx -v 2>&1
                if ($nginxVersion -match "nginx/(\d+\.\d+\.\d+)") {
                    $version = $matches[1]
                }
            }
            catch {
                $version = ""
            }
        }
        "^(apache|httpd)$" {
            try {
                $apacheVersion = httpd -v 2>$null
                if ($apacheVersion -match "Apache/(\d+\.\d+\.\d+)") {
                    $version = $matches[1]
                }
            }
            catch {
                $version = ""
            }
        }
        "^(node|nodejs)$" {
            try {
                $nodeVersion = node --version 2>$null
                $version = $nodeVersion -replace "v", ""
            }
            catch {
                $version = ""
            }
        }
        "^(python)$" {
            try {
                $pythonVersion = python --version 2>$null
                if ($pythonVersion -match "(\d+\.\d+\.\d+)") {
                    $version = $matches[1]
                }
            }
            catch {
                $version = ""
            }
        }
        default {
            try {
                $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
                if ($service) {
                    $exePath = (Get-WmiObject -Class Win32_Service -Filter "Name='$ServiceName'" -ErrorAction SilentlyContinue).PathName
                    if ($exePath -and (Test-Path $exePath)) {
                        $fileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($exePath)
                        $version = $fileVersion.FileVersion
                    }
                }
            }
            catch {
                $version = ""
            }
        }
    }

    return $version
}

function Send-Status {
    param(
        [string]$ServerName,
        [string]$ServiceName,
        [string]$Status,
        [string]$Message,
        [string]$Version,
        $DiskInfo
    )

    $payload = @{
        server_name = $ServerName
        service_name = $ServiceName
        status = $Status
        message = $Message
    }

    if (-not [string]::IsNullOrEmpty($Version)) {
        $payload.version = $Version
    }

    if ($DiskInfo -and $DiskInfo -is [hashtable]) {
        $payload.disk_usage = $DiskInfo.usage
        $payload.disk_total = $DiskInfo.total
        $payload.disk_used = $DiskInfo.used
        $payload.disk_available = $DiskInfo.available
    }

    try {
        $jsonBody = $payload | ConvertTo-Json -Compress
        $null = Invoke-RestMethod -Uri "$ApiUrl/api/status" -Method Post -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
    }
    catch {
        Write-Host "Failed to send status: $_" -ForegroundColor Red
    }
}

function Check-AllServices {
    Write-Host "Fetching configuration for server ID: $ServerId"
    $config = Fetch-Config -ServerId $ServerId

    if (-not $config) {
        Write-Host "Failed to fetch configuration" -ForegroundColor Red
        return
    }

    if ($config.error) {
        Write-Host "ERROR: $($config.error)" -ForegroundColor Red
        return
    }

    if (-not $config.services -or $config.services.Count -eq 0) {
        Write-Host "No services configured for this server yet" -ForegroundColor Yellow
        Write-Host "Please add services through the web interface" -ForegroundColor Yellow
        return
    }

    $serviceCount = $config.services.Count
    Write-Host "Configuration received, checking $serviceCount service(s)..." -ForegroundColor Green

    foreach ($service in $config.services) {
        $serviceName = $service.name
        $checkCommand = $service.check_command
        $diskPath = $service.disk_path

        Write-Host "Checking ${serviceName}..." -ForegroundColor Cyan

        $status = Check-Service -CheckCommand $checkCommand
        $version = Get-ServiceVersion -ServiceName $serviceName
        $diskInfo = $null

        if (-not [string]::IsNullOrEmpty($diskPath)) {
            $diskInfo = Check-DiskSpace -DiskPath $diskPath
            if ($diskInfo -and $diskInfo -is [hashtable]) {
                Write-Host "  Disk: $($diskInfo.usage)% used at $diskPath" -ForegroundColor Gray
            }
        }

        $message = "Checked at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        Send-Status -ServerName $ServerName -ServiceName $serviceName -Status $status -Message $message -Version $version -DiskInfo $diskInfo

        Write-Host "  Status: $status" -ForegroundColor $(if ($status -eq "active") { "Green" } else { "Red" })
        if (-not [string]::IsNullOrEmpty($version)) {
            Write-Host "  Version: $version" -ForegroundColor Gray
        }
    }

    Write-Host "All services checked and reported" -ForegroundColor Green
}

function Main {
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Windows Monitoring Agent Starting..." -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "API URL: $ApiUrl"
    Write-Host "Server ID: $ServerId"
    Write-Host "Server Name: $ServerName"
    Write-Host "Check Interval: $CheckInterval seconds"
    Write-Host ""

    while ($true) {
        try {
            Check-AllServices
            Write-Host ""
            Write-Host "Waiting $CheckInterval seconds before next check..." -ForegroundColor Yellow
            Start-Sleep -Seconds $CheckInterval
        }
        catch {
            Write-Host "Error in monitoring loop: $_" -ForegroundColor Red
            Start-Sleep -Seconds 10
        }
    }
}

Main
