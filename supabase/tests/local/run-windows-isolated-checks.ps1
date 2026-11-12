$ErrorActionPreference = 'Stop'

$psqlCommand = Get-Command psql.exe -ErrorAction Stop
$pgBin = Split-Path -Parent $psqlCommand.Source
$initdb = Join-Path $pgBin 'initdb.exe'
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $initdb) -or -not (Test-Path -LiteralPath $pgCtl)) {
  throw "initdb.exe and pg_ctl.exe must be installed beside $($psqlCommand.Source)."
}

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$clusterName = 'ma-phase1-localdb-' + [guid]::NewGuid().ToString('N')
$clusterPath = [System.IO.Path]::GetFullPath((Join-Path $tempRoot $clusterName))
if (-not $clusterPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Temporary PostgreSQL data path is outside the Windows temp directory.'
}
$logPath = Join-Path $clusterPath 'postgres.log'
$started = $false
$oldHost = $env:PGHOST
$oldPort = $env:PGPORT
$oldUser = $env:PGUSER
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)

try {
  $listener.Start()
  $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  $listener.Stop()

  Write-Host "Initializing isolated PostgreSQL cluster on loopback port $port"
  & $initdb -D $clusterPath -U postgres --auth=trust --encoding=UTF8 --no-locale
  if ($LASTEXITCODE -ne 0) { throw "initdb failed (exit $LASTEXITCODE)." }

  & $pgCtl -D $clusterPath -o "-p $port -h 127.0.0.1" -l $logPath start
  if ($LASTEXITCODE -ne 0) { throw "Temporary PostgreSQL failed to start (exit $LASTEXITCODE)." }
  $started = $true

  $env:PGHOST = '127.0.0.1'
  $env:PGPORT = [string]$port
  $env:PGUSER = 'postgres'
  $runner = Join-Path $PSScriptRoot 'run-local-checks.ps1'
  & (Get-Process -Id $PID).Path -NoProfile -ExecutionPolicy Bypass -File $runner
  if ($LASTEXITCODE -ne 0) { throw "Local migration/test runner failed (exit $LASTEXITCODE)." }
  Write-Host 'ALL ISOLATED WINDOWS DATABASE CHECKS PASSED'
}
finally {
  if ($listener) { $listener.Stop() }
  $env:PGHOST = $oldHost
  $env:PGPORT = $oldPort
  $env:PGUSER = $oldUser
  if ($started) {
    & $pgCtl -D $clusterPath stop -m fast
    if ($LASTEXITCODE -ne 0) { Write-Warning "Temporary PostgreSQL may still be running; inspect $logPath." }
  }
  # Remove only this script's uniquely named, temp-root-contained cluster.
  if ((Test-Path -LiteralPath $clusterPath) -and
      (Split-Path -Leaf $clusterPath) -match '^ma-phase1-localdb-[0-9a-f]{32}$' -and
      $clusterPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $clusterPath -Recurse -Force
  }
}
