# Wait until Docker Engine responds, then print status.
param([int]$MaxAttempts = 30, [int]$SleepSeconds = 10)

for ($i = 1; $i -le $MaxAttempts; $i++) {
  Write-Host "[$i/$MaxAttempts] checking docker engine..."
  $info = docker info 2>&1
  if ($LASTEXITCODE -eq 0 -and ($info -match 'Server Version')) {
    Write-Host "Docker engine is ready." -ForegroundColor Green
    docker info 2>&1 | Select-String 'Server Version','Operating System','Total Memory'
    exit 0
  }
  Write-Host "not ready yet (exit $LASTEXITCODE)" -ForegroundColor Yellow
  Start-Sleep -Seconds $SleepSeconds
}

Write-Host "Docker engine still not ready. Try:" -ForegroundColor Red
Write-Host "  1. Open Docker Desktop and wait until shows Running"
Write-Host "  2. Settings -> General -> Use WSL 2 based engine (enable)"
Write-Host "  3. Troubleshoot -> Restart Docker Desktop"
Write-Host "  4. wsl --update && wsl --shutdown, then reopen Docker Desktop"
exit 1
