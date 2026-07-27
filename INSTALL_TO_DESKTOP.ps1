$ErrorActionPreference = "Stop"
$RepositoryUrl = "https://github.com/inbharatai/mindcarry.git"
$Desktop = [Environment]::GetFolderPath("Desktop")
$Destination = Join-Path $Desktop "MindCarry"
$BootstrapLog = Join-Path $Desktop "MindCarry_Install.log"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Install-WithWinget([string]$Id, [string]$Name) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "$Name is missing and Windows Package Manager (winget) is unavailable. Install $Name, then rerun this script."
  }
  Write-Step "Installing $Name"
  & winget install --id $Id --exact --accept-package-agreements --accept-source-agreements --silent
  if ($LASTEXITCODE -ne 0) { throw "$Name installation failed." }
  Refresh-Path
}

if (-not $Desktop) { throw "Windows Desktop location could not be resolved." }
Start-Transcript -Path $BootstrapLog -Append | Out-Null
try {
  Write-Step "Preparing MindCarry on the Desktop"
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Install-WithWinget "Git.Git" "Git"
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Install-WithWinget "OpenJS.NodeJS.LTS" "Node.js LTS"
  }

  if (Test-Path (Join-Path $Destination ".git")) {
    Write-Step "Updating the existing MindCarry repository"
    & git -C $Destination remote get-url origin
    if ($LASTEXITCODE -ne 0) { throw "The existing MindCarry folder has no usable origin remote." }
    $originUrl = (& git -C $Destination remote get-url origin).Trim()
    if ($originUrl -notin @($RepositoryUrl, "git@github.com:inbharatai/mindcarry.git")) {
      throw "The existing folder points to a different Git repository: $originUrl"
    }
    & git -C $Destination status --porcelain
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect the existing MindCarry repository." }
    $changes = @(& git -C $Destination status --porcelain)
    if ($changes.Count -gt 0) {
      throw "The existing MindCarry folder contains local changes. Commit, move or discard them before updating."
    }
    & git -C $Destination fetch --prune origin
    if ($LASTEXITCODE -ne 0) { throw "Could not fetch MindCarry from GitHub." }
    & git -C $Destination checkout main
    if ($LASTEXITCODE -ne 0) { throw "Could not switch the existing repository to main." }
    & git -C $Destination pull --ff-only origin main
    if ($LASTEXITCODE -ne 0) { throw "Could not update the existing MindCarry folder safely." }
  }
  elseif (Test-Path $Destination) {
    $items = @(Get-ChildItem -Force $Destination)
    if ($items.Count -gt 0) {
      throw "$Destination already exists and is not a Git repository. Rename or remove it, then rerun this script."
    }
    Write-Step "Cloning the main branch of MindCarry"
    & git clone --branch main --single-branch $RepositoryUrl $Destination
    if ($LASTEXITCODE -ne 0) { throw "Could not clone MindCarry from GitHub." }
  }
  else {
    Write-Step "Creating the Desktop folder and cloning the main branch"
    & git clone --branch main --single-branch $RepositoryUrl $Destination
    if ($LASTEXITCODE -ne 0) { throw "Could not clone MindCarry from GitHub." }
  }

  Write-Step "Running the verified local setup"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Destination "setup-windows.ps1")
  if ($LASTEXITCODE -ne 0) { throw "MindCarry setup failed. Review $BootstrapLog and the project setup log." }
}
finally {
  Stop-Transcript | Out-Null
}