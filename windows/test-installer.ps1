$ErrorActionPreference = 'Stop'
# Compile the exact installer launcher into the workspace, without installing,
# touching registry, fetching packages or opening an actual mailbox.
$pythonExe = Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'Python 3.13 is required for offline tests.' }
$testRoot = Join-Path (Split-Path $PSScriptRoot -Parent) '.tmp-mail-helper'
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$pythonLiteral = $pythonExe.Replace('"','""')
$scriptLiteral = (Join-Path $PSScriptRoot 'mail_host.py').Replace('"','""')
$installer = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'install.ps1') -Raw
$sourceMatch = [regex]::Match($installer, '(?s)\$source = @"\r?\n(.*?)\r?\n"@')
if (-not $sourceMatch.Success) { throw 'Launcher source not found.' }
$source = $ExecutionContext.InvokeCommand.ExpandString($sourceMatch.Groups[1].Value)
$launcher = Join-Path $testRoot ('IRCCMailHost-' + [guid]::NewGuid().ToString('N') + '.exe')
Add-Type -TypeDefinition $source -OutputAssembly $launcher -OutputType ConsoleApplication
$env:IRCC_TEST_LAUNCHER = $launcher
try {
    & $pythonExe (Join-Path $PSScriptRoot 'test_mail_host.py')
    if ($LASTEXITCODE -ne 0) { throw 'Launcher test failed.' }
} finally { Remove-Item Env:\IRCC_TEST_LAUNCHER }
