$ErrorActionPreference = "Stop"

function Test-CommandExists {
  param([string]$CommandName)

  return $null -ne (Get-Command $CommandName -ErrorAction SilentlyContinue)
}

# Check for python -m uv instead of standalone uv
$uvCheck = python -m uv --version 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "Missing required command: python -m uv (uv was installed using pip)"
}

if (-not (Test-CommandExists "pnpm")) {
  Write-Error "Missing required command: pnpm"
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start each service in its own PowerShell window so logs remain visible.
if (Test-CommandExists "livekit-server") {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot'; livekit-server --dev"
} else {
  Write-Warning "livekit-server was not found. Skipping local LiveKit startup and using your configured LIVEKIT_URL instead."
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot\backend'; python -m uv run python src/agent.py dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot\frontend'; pnpm dev"

Write-Host "Started backend and frontend in separate PowerShell windows."
