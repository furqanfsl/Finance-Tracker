param(
    [int]$Port = 5000,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv is required to run this project. Install uv, then run this script again."
    exit 1
}

$url = "http://127.0.0.1:$Port"
$healthUrl = "$url/api/health"

function Test-FinanceTracker {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        return $response.status -eq "ok"
    } catch {
        return $false
    }
}

if (Test-FinanceTracker) {
    Write-Host "Personal Finance Tracker is already running at $url"
    if (-not $NoBrowser) {
        Start-Process $url
    }
    exit 0
}

$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Error "Port $Port is already in use by another app. Try: .\scripts\start.ps1 -Port 5001"
    exit 1
}

Write-Host "Installing locked dependencies with uv..."
uv sync

Write-Host "Starting Personal Finance Tracker at $url"
Write-Host "Press Ctrl+C in this window to stop the local server."

if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
        param($LaunchUrl)
        Start-Sleep -Seconds 3
        Start-Process $LaunchUrl
    } -ArgumentList $url | Out-Null
}

uv run flask --app run.py run --host 127.0.0.1 --port $Port --debug
