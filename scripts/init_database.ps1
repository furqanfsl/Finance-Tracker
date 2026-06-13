param(
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Error "uv is required. Install uv, then run this script again."
    exit 1
}

uv sync

if ($Reset) {
    uv run flask --app run.py reset-db
} else {
    uv run flask --app run.py init-db
    uv run flask --app run.py seed-db
}

Write-Host "Active database:"
uv run flask --app run.py db-path
