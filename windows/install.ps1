param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId,
    [switch]$InstallPython
)
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Windows only.' }
# Per-user installation. No administrator rights, service, scheduled task or listening port.
$helperHome = Join-Path $env:USERPROFILE '.ircc-mail-helper'
$pythonCandidates = @(
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python313\python.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python314\python.exe')
)
$pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
if ($pythonCommand -and $pythonCommand.Source -notlike '*\WindowsApps\*') { $pythonCandidates += $pythonCommand.Source }
$pythonExe = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $pythonExe -and $InstallPython) {
    & winget install --id Python.Python.3.13 --exact --source winget --scope user --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw 'Python installation failed.' }
    $pythonExe = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $pythonExe) { throw 'Python 3.13+ is required. Run with -InstallPython to install from the official winget package.' }
New-Item -ItemType Directory -Path $helperHome -Force | Out-Null
# Avoid MSIX AppData redirection: Chrome must see the same physical files.
# Migrate only the opaque, current-user DPAPI blob; never decrypt or print it.
$previousSecret = Join-Path (Join-Path $env:LOCALAPPDATA 'IRCCMailHelper') 'mailbox.dpapi'
$currentSecret = Join-Path $helperHome 'mailbox.dpapi'
if (!(Test-Path -LiteralPath $currentSecret) -and (Test-Path -LiteralPath $previousSecret)) {
    Copy-Item -LiteralPath $previousSecret -Destination $currentSecret
}
$hostScript = Join-Path $helperHome 'mail_host.py'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'mail_host.py') -Destination $hostScript -Force
$launcher = Join-Path $helperHome 'IRCCMailHost.exe'
# Chrome requires a runnable host; a tiny local launcher pipes the binary framing unchanged.
$pythonLiteral = $pythonExe.Replace('"','""')
$scriptLiteral = $hostScript.Replace('"','""')
$source = @"
using System;
using System.Diagnostics;
using System.Threading.Tasks;
public class IRCCMailHost {
  public static int Main() {
    try {
      var p = new Process();
      p.StartInfo.FileName = @"$pythonLiteral";
      p.StartInfo.Arguments = "-I " + "\"" + @"$scriptLiteral" + "\"";
      p.StartInfo.UseShellExecute = false;
      p.StartInfo.CreateNoWindow = true;
      p.StartInfo.RedirectStandardInput = true;
      p.StartInfo.RedirectStandardOutput = true;
      p.StartInfo.RedirectStandardError = true;
      p.Start();
      // Host accepts exactly one request; do not wait for browser stdin to close.
      var input = Console.OpenStandardInput();
      var header = new byte[4];
      if (!ReadExact(input, header)) return 1;
      int size = BitConverter.ToInt32(header, 0);
      if (size < 1 || size > 262144) return 1;
      var body = new byte[size];
      if (!ReadExact(input, body)) return 1;
      p.StandardInput.BaseStream.Write(header, 0, 4);
      p.StandardInput.BaseStream.Write(body, 0, body.Length);
      p.StandardInput.BaseStream.Flush();
      p.StandardInput.Close();
      p.StandardOutput.BaseStream.CopyTo(Console.OpenStandardOutput());
      p.WaitForExit(); return p.ExitCode;
    } catch { return 1; }
  }
  static bool ReadExact(System.IO.Stream s, byte[] b) {
    int offset = 0;
    while (offset < b.Length) { int n = s.Read(b, offset, b.Length-offset); if (n == 0) return false; offset += n; }
    return true;
  }
}
"@
# Windows PowerShell 5.1 provides the built-in .NET Framework C# compiler.
if (Test-Path -LiteralPath $launcher) { Remove-Item -LiteralPath $launcher }
Add-Type -TypeDefinition $source -OutputAssembly $launcher -OutputType ConsoleApplication
$manifestPath = Join-Path $helperHome 'com.will4096.ircc_mail.json'
@{ name='com.will4096.ircc_mail'; description='Local IRCC verification mail helper'; path=$launcher; type='stdio'; allowed_origins=@("chrome-extension://$ExtensionId/") } | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding ASCII
$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.will4096.ircc_mail'
New-Item -Path $registryPath -Force | Out-Null
Set-Item -LiteralPath $registryPath -Value $manifestPath
Write-Output 'Installed for this Windows user and the specified extension. Return to extension settings to connect 163.'
