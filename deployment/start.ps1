# HALLWAKE one-command booth start (Windows / PowerShell 5.1+).
# Boots backend uvicorn (loopback 127.0.0.1) + `vite preview` of the built
# dist/ (also pinned to 127.0.0.1 so BOTH servers are IPv4 loopback - see the
# localhost-vs-::1 note in deployment/README.md), waits for /health, prints URLs.
# ASCII-only source: Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI.
#
#   .\deployment\start.ps1                     # build + start on 8401/8402
#   .\deployment\start.ps1 -NoBuild            # skip npm run build (dist/ current)
#   .\deployment\start.ps1 -BackendPort 8411 -FrontendPort 8412   # alt ports
#   .\deployment\start.ps1 -Stop               # stop what this script started
#
# Loopback-only by design (qa/security.md s7). LAN serving = deployment/booth.md.

param(
    [int]$BackendPort = 8401,
    [int]$FrontendPort = 8402,
    [switch]$NoBuild,
    [switch]$Stop
)
$ErrorActionPreference = "Stop"

$root     = Split-Path -Parent $PSScriptRoot
$backend  = Join-Path $root "app\backend"
$frontend = Join-Path $root "app\frontend"
$pidFile  = Join-Path $PSScriptRoot ".hallwake.pids"

function Stop-Servers {
    if (-not (Test-Path $pidFile)) { Write-Host "no pid file at $pidFile - nothing to stop"; return }
    foreach ($line in Get-Content $pidFile) {
        if ($line -notmatch '^(\d+):(\d+)$') { continue }
        $procId = [int]$Matches[1]; $port = [int]$Matches[2]
        # kill the recorded process AND any listener left on our port (cmd/node wrappers)
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
            ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "stopped pid $procId (port $port)"
    }
    Remove-Item $pidFile -Force
}

if ($Stop) { Stop-Servers; return }

# ---- preflight -------------------------------------------------------------
$py = Join-Path $backend ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) {
    throw "venv python missing at $py - create it: cd app/backend; python -m venv .venv; .venv\Scripts\pip install -r requirements.txt"
}
foreach ($p in @($BackendPort, $FrontendPort)) {
    if (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) {
        throw "port $p is already in use - pass -BackendPort/-FrontendPort (e.g. 8411/8412) or run -Stop first"
    }
}

# ---- build -----------------------------------------------------------------
if (-not $NoBuild) {
    Write-Host "building frontend (npm run build)..."
    Push-Location $frontend
    try { npm run build; if ($LASTEXITCODE -ne 0) { throw "npm run build failed" } }
    finally { Pop-Location }
}

# ---- start backend ---------------------------------------------------------
$be = Start-Process -FilePath $py `
    -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$BackendPort") `
    -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $PSScriptRoot "backend.out.log") `
    -RedirectStandardError  (Join-Path $PSScriptRoot "backend.err.log")

# ---- start frontend (vite preview of dist/, proxying /api to OUR backend) --
$env:VITE_API_TARGET = "http://127.0.0.1:$BackendPort"   # vite.config.ts reads this
$viteBin = Join-Path $frontend "node_modules\vite\bin\vite.js"
if (-not (Test-Path $viteBin)) { throw "run 'npm ci' in app/frontend first (vite bin missing)" }
$fe = Start-Process -FilePath "node" `
    -ArgumentList @("`"$viteBin`"", "preview", "--host", "127.0.0.1", "--port", "$FrontendPort") `
    -WorkingDirectory $frontend -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $PSScriptRoot "frontend.out.log") `
    -RedirectStandardError  (Join-Path $PSScriptRoot "frontend.err.log")

"$($be.Id):$BackendPort" | Set-Content $pidFile
"$($fe.Id):$FrontendPort" | Add-Content $pidFile

# ---- wait for health -------------------------------------------------------
$healthy = $false
$deadline = (Get-Date).AddSeconds(25)
while ((Get-Date) -lt $deadline) {
    try {
        $h = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$BackendPort/health" -TimeoutSec 2
        if ($h.StatusCode -eq 200) { $healthy = $true; Write-Host "/health -> $($h.Content)"; break }
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $healthy) { Write-Warning "backend did not answer /health in 25 s - see deployment/backend.err.log" }

$feUp = $false
try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$FrontendPort/" -TimeoutSec 5 | Out-Null; $feUp = $true } catch {}

Write-Host ""
Write-Host "HALLWAKE running:"
Write-Host "  game (browser):  http://localhost:$FrontendPort"
Write-Host "  game (IPv4):     http://127.0.0.1:$FrontendPort"
Write-Host "  api (curl):      http://127.0.0.1:$BackendPort/health   (use 127.0.0.1, NOT localhost)"
Write-Host "  demo autopilot:  http://localhost:$FrontendPort/?auto=1&fps=1"
Write-Host "  frontend up: $feUp   pids: backend=$($be.Id) frontend=$($fe.Id)"
Write-Host "stop with:  .\deployment\start.ps1 -Stop"
