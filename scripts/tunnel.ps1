# Expose Docker frontend (with /api proxy) via ngrok and point Nest FRONTEND_URL at it.
$ErrorActionPreference = "Stop"

function Get-NgrokHttpsUrl {
  try {
    $tunnels = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2
    $https = $tunnels.tunnels |
      Where-Object { $_.public_url -like "https://*" } |
      Select-Object -First 1
    return $https.public_url
  } catch {
    return $null
  }
}

Write-Host "Checking Docker stack…"
docker compose ps --format json | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Run from repo root with Docker Compose available."
}

$frontend = docker compose ps frontend --format "{{.Status}}"
if ($frontend -notmatch "running|Up") {
  Write-Host "Starting stack…"
  docker compose up -d
}

# Stop previous ngrok on this host if we started one
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "ngrok http" } |
  ForEach-Object {
    Write-Host "Stopping previous ngrok PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }

Start-Sleep -Seconds 1

Write-Host "Starting ngrok http 3000…"
Start-Process -FilePath "ngrok" -ArgumentList @("http", "3000", "--log=stdout") -WindowStyle Minimized

$url = $null
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $url = Get-NgrokHttpsUrl
  if ($url) { break }
}

if (-not $url) {
  throw "Could not read ngrok public URL from http://127.0.0.1:4040"
}

Write-Host "Public URL: $url"
Write-Host "Updating backend FRONTEND_URL + COOKIE_SECURE=true…"

$env:FRONTEND_URL = $url
$env:COOKIE_SECURE = "true"
$env:NEXT_PUBLIC_SITE_URL = $url

docker compose up -d --no-deps --force-recreate backend

Write-Host ""
Write-Host "Ready:"
Write-Host "  Site:  $url"
Write-Host "  API:   $url/api"
Write-Host "  Docs:  $url/docs"
Write-Host "  Ngrok: http://127.0.0.1:4040"
Write-Host ""
Write-Host "Open the site via the https URL (not localhost) so cookies work."
