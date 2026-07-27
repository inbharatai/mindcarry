$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogPath = Join-Path $ProjectRoot "MindCarry_Local_Setup.log"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-NodeVersion {
  $raw = (& node --version).Trim().TrimStart('v')
  return [Version]$raw
}

Set-Location $ProjectRoot
Start-Transcript -Path $LogPath -Append | Out-Null
try {
  Write-Step "Checking local requirements"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 22.12 or newer is required. Run INSTALL_TO_DESKTOP.ps1 to install prerequisites automatically."
  }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found beside Node.js. Reinstall Node.js LTS."
  }
  if ((Get-NodeVersion) -lt [Version]"22.12.0") {
    throw "MindCarry requires Node.js 22.12 or newer. Installed version: $(& node --version)"
  }
  if (-not (Test-Path (Join-Path $ProjectRoot "package-lock.json"))) {
    throw "package-lock.json is missing. Update the main branch before running setup."
  }

  Write-Host "Node $(& node --version)"
  Write-Host "npm $(& npm.cmd --version)"

  Write-Step "Installing the locked project dependencies"
  & npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed. The repository lockfile and package manifest may be inconsistent." }

  Write-Step "Running lint, security smoke checks, integration tests and production build"
  & npm.cmd run check
  if ($LASTEXITCODE -ne 0) { throw "MindCarry verification failed. Review $LogPath." }

  Write-Step "Starting MindCarry"
  Write-Host "The encrypted MindCarryVault and every learner subfolder will be created automatically when the app opens." -ForegroundColor Green
  Write-Host "Add the Gemini API key only inside MindCarry Settings after the app starts." -ForegroundColor Yellow
  & npm.cmd run dev
  if ($LASTEXITCODE -ne 0) { throw "MindCarry did not start correctly." }
}
finally {
  Stop-Transcript | Out-Null
}