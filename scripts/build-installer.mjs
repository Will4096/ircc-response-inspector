// A single downloadable script, with reviewable sources bundled byte-for-byte.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
let entries=[];
for(const name of ['install.ps1','mail_host.py','uninstall.ps1']){
  const bytes=await fs.readFile(new URL('windows/'+name,root));
  entries.push(`    '${name}' = @{ Hash = '${createHash('sha256').update(bytes).digest('hex')}'; Data = '${bytes.toString('base64')}' }`);
}
const script=`param(
    [ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'This installer supports Windows only.' }
$payloads = @{
${entries.join('\n')}
}
foreach ($entry in $payloads.GetEnumerator()) {
    $bytes = [Convert]::FromBase64String($entry.Value.Data)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { $actual = ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant() } finally { $sha.Dispose() }
    if ($actual -ne $entry.Value.Hash) { throw 'Package integrity check failed.' }
}
if ($CheckOnly) { Write-Output 'PASS: embedded installer, helper and uninstaller verified; no installation performed.'; return }
if (-not $ExtensionId) { throw 'Copy the complete installation command from extension Settings.' }
$staging = Join-Path ([IO.Path]::GetTempPath()) ('IRCCMailSetup-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
try {
    foreach ($entry in $payloads.GetEnumerator()) { [IO.File]::WriteAllBytes((Join-Path $staging $entry.Key), [Convert]::FromBase64String($entry.Value.Data)) }
    Write-Output '[1/3] Preparing Python and installing the local helper. Please wait...'
    & (Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe') -NoProfile -File (Join-Path $staging 'install.ps1') -ExtensionId $ExtensionId -InstallPython
    if ($LASTEXITCODE -ne 0) { throw 'Installation failed. Keep the error above and retry. No mailbox credentials are needed for installation.' }
    $homePath = Join-Path $env:USERPROFILE '.ircc-mail-helper'
    Copy-Item -LiteralPath (Join-Path $staging 'uninstall.ps1') -Destination (Join-Path $homePath 'uninstall.ps1') -Force
    Write-Output '[2/3] Checking the extension binding...'
    $manifest = Get-Content -LiteralPath (Join-Path $homePath 'com.will4096.ircc_mail.json') -Raw | ConvertFrom-Json
    if ($manifest.allowed_origins -notcontains ('chrome-extension://' + $ExtensionId + '/')) { throw 'Extension binding check failed.' }
    if (-not (Test-Path -LiteralPath $manifest.path)) { throw 'Helper executable was not created.' }
    Write-Output '[3/3] Installation complete. Return to extension Settings and click Check local helper.'
    Write-Output 'Then enable IMAP in 163 and connect using its app password. Do not enter your email password here.'
} finally {
    # Delete only these known files in the unique staging folder; no recursive deletion.
    foreach ($name in @('install.ps1','mail_host.py','uninstall.ps1')) { $target=Join-Path $staging $name; if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force } }
    Remove-Item -LiteralPath $staging -Force
}
`;
await fs.writeFile(new URL('windows/install-one-click.ps1',root),script);
console.log('Built standalone installer from three local source files.');
