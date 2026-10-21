# Optional, explicitly invoked system setup. npm run setup NEVER runs this script.
$ErrorActionPreference = 'Stop'
$taskPrincipal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $taskPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Open PowerShell as Administrator, then run this script. No changes were made.'
}
$taskMkcert = Join-Path $PSScriptRoot '../.tools/mkcert.exe'
if (-not (Test-Path -LiteralPath $taskMkcert)) { $taskMkcert = (Get-Command mkcert -ErrorAction Stop).Source }
$taskHosts = Join-Path $env:WINDIR 'System32/drivers/etc/hosts'
$taskNames = @('app.security-lab.test', 'sibling.security-lab.test', 'attacker.csrf-lab.test')
$taskContents = Get-Content -LiteralPath $taskHosts -Raw
foreach ($taskName in $taskNames) {
  foreach ($taskLine in ($taskContents -split "`n")) {
    $taskParts = (($taskLine -split '#')[0].Trim() -split '\s+')
    if ($taskParts.Count -gt 1 -and $taskParts[1..($taskParts.Count - 1)] -contains $taskName -and $taskParts[0] -ne '127.0.0.1') {
      throw "Conflicting hosts entry for $taskName. Resolve it manually first."
    }
  }
}
Write-Host 'Trusting the local mkcert development CA. Keep its private key on this computer.'
& $taskMkcert -install
if ($LASTEXITCODE -ne 0) { throw 'mkcert trust installation failed' }
$taskMissing = @($taskNames | Where-Object { $taskContents -notmatch "(?m)^127\.0\.0\.1\s+[^\r\n]*\b$([regex]::Escape($_))\b" })
if ($taskMissing.Count -gt 0) {
  Add-Content -LiteralPath $taskHosts -Encoding ascii -Value ("`r`n# Web Security Laboratory (remove this block to undo)`r`n127.0.0.1 " + ($taskMissing -join ' '))
}
Write-Host 'System setup complete. Return to the repository and run npm run setup.'
