$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path ${env:ProgramFiles} 'nodejs\node.exe'
$backendEntry = Join-Path $projectRoot 'server\index.js'
$viteEntry = Join-Path $projectRoot 'node_modules\vite\bin\vite.js'

if (-not (Test-Path -LiteralPath $nodePath)) {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCommand) {
    $nodePath = $nodeCommand.Source
  }
}

if (-not (Test-Path -LiteralPath $nodePath)) {
  throw 'Node.js not found. Please install Node.js first.'
}

if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules'))) {
  throw 'node_modules is missing. Run npm install first.'
}

$backend = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @($backendEntry) `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -PassThru

$frontend = Start-Process `
  -FilePath $nodePath `
  -ArgumentList @($viteEntry, '--host', '127.0.0.1') `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -PassThru

Write-Host "VocabUp started."
Write-Host "Frontend: http://localhost:5173"
Write-Host "Backend:  http://localhost:4000"
Write-Host "Backend PID: $($backend.Id)"
Write-Host "Frontend PID: $($frontend.Id)"
