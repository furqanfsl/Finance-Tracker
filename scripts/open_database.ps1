param(
    [switch]$Reset
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if ($Reset) {
    .\scripts\init_database.ps1 -Reset
} else {
    .\scripts\init_database.ps1
}

$databasePath = uv run flask --app run.py db-path

$candidates = @(
    "C:\Program Files\DB Browser for SQLite\DB Browser for SQLite.exe",
    "C:\Program Files (x86)\DB Browser for SQLite\DB Browser for SQLite.exe"
)

$dbBrowser = Get-Command "DB Browser for SQLite.exe" -ErrorAction SilentlyContinue
$sqliteBrowser = Get-Command "sqlitebrowser.exe" -ErrorAction SilentlyContinue

if ($dbBrowser) {
    Start-Process -FilePath $dbBrowser.Source -ArgumentList @($databasePath)
} elseif ($sqliteBrowser) {
    Start-Process -FilePath $sqliteBrowser.Source -ArgumentList @($databasePath)
} else {
    $installedPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($installedPath) {
        Start-Process -FilePath $installedPath -ArgumentList @($databasePath)
    } else {
        Write-Host "DB Browser for SQLite was not found automatically."
        Write-Host "Open this file manually in DB Browser:"
        Write-Host $databasePath
    }
}
