param(
  [Parameter(Mandatory=$true)]
  [string]$RepositoryUrl
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
if (-not (Test-Path .git)) { git init }
git branch -M main
$existing = git remote 2>$null
if ($existing -contains "origin") { git remote set-url origin $RepositoryUrl } else { git remote add origin $RepositoryUrl }
git push -u origin main
Write-Host "MindCarry pushed to $RepositoryUrl" -ForegroundColor Green
