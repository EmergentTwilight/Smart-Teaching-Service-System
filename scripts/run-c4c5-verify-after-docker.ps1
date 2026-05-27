# C4/C5 一键验收：等待 Docker → compose up → seed:c4c5 → verify-c4-c5.ps1
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root
Write-Host "Project: $root" -ForegroundColor Cyan

& (Join-Path $PSScriptRoot 'docker-wait-ready.ps1')
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "`nStarting services (first run may take several minutes)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Waiting for API on :3000 ..."
$ready = $false
for ($i = 1; $i -le 60; $i++) {
  try {
    $body = '{"username":"student","password":"student123"}'
    Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/login' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 5 | Out-Null
    $ready = $true
    break
  } catch {
    Start-Sleep -Seconds 10
  }
}
if (-not $ready) {
  Write-Host "API not ready. Check: docker compose logs server --tail 80" -ForegroundColor Red
  exit 1
}

Write-Host "Seeding C4/C5 verify data..." -ForegroundColor Cyan
docker compose exec -T server sh -c 'cd /app/backend && pnpm db:seed:c4c5'
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "API ready. Running C4/C5 verify..." -ForegroundColor Green
& (Join-Path $PSScriptRoot 'verify-c4-c5.ps1')
