$ErrorActionPreference = "Stop"
Write-Host "MindCarry local setup" -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 22 or newer is required." }
node --version
npm --version
npm install
npm run test:core
Write-Host "Setup complete. Starting MindCarry..." -ForegroundColor Green
npm run dev
