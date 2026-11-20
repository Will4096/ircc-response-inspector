// Generate reviewable PowerShell; never change an execution policy or execute inline file contents.
var HelperInstaller={
  command(hash,id){
    if(!/^[a-f0-9]{64}$/.test(hash)||!/^[a-p]{32}$/.test(id))throw Error('Invalid installer binding');
    return `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$irccPicker = New-Object System.Windows.Forms.OpenFileDialog
$irccPicker.Title = 'Select IRCCMailSetup-1.6.ps1'
$irccPicker.Filter = 'IRCC helper installer (*.ps1)|*.ps1'
if ($irccPicker.ShowDialog() -eq 'OK') {
    $irccSetup = $irccPicker.FileName
    if ((Get-FileHash -LiteralPath $irccSetup -Algorithm SHA256).Hash -ne '${hash}') {
        throw 'Installer hash verification failed. Nothing was installed.'
    }
    try { $irccPolicy = Get-ExecutionPolicy -ErrorAction Stop }
    catch { throw 'Cannot read PowerShell execution policy. Nothing was changed. Contact your administrator.' }
    if ($irccPolicy -in @('AllSigned', 'Restricted')) {
        throw ('Execution policy is ' + $irccPolicy + '. This unsigned script package cannot run under that policy. Use a trusted signed installer or contact your administrator. The policy was not changed.')
    }
    if ($irccPolicy -notin @('RemoteSigned', 'Unrestricted', 'Bypass')) {
        throw 'Unsupported execution policy. Nothing was changed. Contact your administrator.'
    }
    if ($irccPolicy -eq 'RemoteSigned') {
        $irccDownloaded = Get-Item -LiteralPath $irccSetup -Stream Zone.Identifier -ErrorAction SilentlyContinue
        if ($irccDownloaded) {
            Write-Host 'The selected file matches this extension version. Confirm only if you trust this source. This removes the download block on this file only; no execution policy is changed.'
            Unblock-File -LiteralPath $irccSetup -Confirm -ErrorAction Stop
            if (Get-Item -LiteralPath $irccSetup -Stream Zone.Identifier -ErrorAction SilentlyContinue) {
                throw 'The selected file remains blocked. Installation cancelled; no policy was changed.'
            }
        }
    }
    & $irccSetup -ExtensionId '${id}'
}`;
  }
};
