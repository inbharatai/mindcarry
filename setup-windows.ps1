$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogPath = Join-Path $ProjectRoot "MindCarry_Local_Setup.log"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Get-NodeMajorVersion {
  $raw = (& node --version).Trim().TrimStart('v')
  return [int]($raw.Split('.')[0])
}

Set-Location $ProjectRoot
Start-Transcript -Path $LogPath -Append | Out-Null
try {
  Write-Step "Checking local requirements"
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 22 LTS or newer is required. Run INSTALL_TO_DESKTOP.ps1 to install prerequisites automatically."
  }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found beside Node.js. Reinstall Node.js LTS."
  }
  if ((Get-NodeMajorVersion) -lt 22) {
    throw "MindCarry requires Node.js 22 LTS or newer. Installed version: $(& node --version)"
  }

  Write-Host "Node $(& node --version)"
  Write-Host "npm $(& npm.cmd --version)"

  Write-Step "Installing pinned project dependencies"
  & npm.cmd install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

  Write-Step "Running lint, encryption tests, integration tests and production build"
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
