param(
    [string]$RepoName = "Finance-Tracker",
    [ValidateSet("public", "private")]
    [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI is not installed. Install it with: winget install --id GitHub.cli"
    exit 1
}

gh auth status | Out-Null

if (-not (Test-Path .git)) {
    git init -b main
}

if (-not (git remote get-url origin 2>$null)) {
    gh repo create $RepoName --$Visibility --source . --remote origin --push
} else {
    git push -u origin (git branch --show-current)
}

Write-Host "Published to GitHub."
