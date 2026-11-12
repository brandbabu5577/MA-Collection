$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrationDir = Join-Path $here '../../migrations'
$psql = (Get-Command psql.exe -ErrorAction Stop).Source
$db = 'ma_phase1_check_' + [guid]::NewGuid().ToString('N').Substring(0,12)
function Invoke-Psql([string]$database, [string[]]$arguments) {
  & $psql -X -v ON_ERROR_STOP=1 -q -w -d $database @arguments
  if ($LASTEXITCODE -ne 0) { throw "psql failed against $database (exit $LASTEXITCODE)" }
}
try {
  Invoke-Psql 'postgres' @('-c', "CREATE DATABASE $db")
  Invoke-Psql $db @('-f', (Join-Path $here '00_local_stubs.sql'))
  Get-ChildItem $migrationDir -Filter '*.sql' | Sort-Object Name | ForEach-Object {
    Write-Host "APPLY $($_.Name)"
    Invoke-Psql $db @('-f', $_.FullName)
  }
  foreach ($file in @('phase1_checks.sql','matrix_01_setup.sql','matrix_02_cashier.sql','matrix_03_manager.sql','checkout_checks.sql','business_rpc_checks.sql','auth_rls_checks.sql')) {
    Write-Host "RUN $file"
    Invoke-Psql $db @('-f', (Join-Path $here $file))
  }
  Write-Host 'ALL LOCAL DATABASE CHECKS PASSED'
} finally {
  # Only drop the uniquely named throw-away database created by this runner.
  if ($db -match '^ma_phase1_check_[0-9a-f]{12}$') {
    & $psql -X -v ON_ERROR_STOP=1 -q -w -d postgres -c "DROP DATABASE IF EXISTS $db WITH (FORCE)"
  }
}
