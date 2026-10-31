$ErrorActionPreference = 'Stop'
$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.will4096.ircc_mail'
if (Test-Path -LiteralPath $registryPath) { Remove-Item -LiteralPath $registryPath }
$helperHome = Join-Path $env:USERPROFILE '.ircc-mail-helper'
# Fixed per-user directory, delete only the explicit files installed by this package.
foreach ($name in @('mail_host.py','IRCCMailHost.exe','com.will4096.ircc_mail.json','mailbox.dpapi','mailbox.tmp','diagnostic.log','diagnostic.previous.log')) {
    $target = Join-Path $helperHome $name
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
}
Write-Output 'Local helper and its stored authorization removed. Revoke the app password in 163 settings if no longer needed.'
