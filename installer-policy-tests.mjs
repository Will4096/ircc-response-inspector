import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const c={};vm.createContext(c);vm.runInContext(await fs.readFile(new URL('installer-command.js',import.meta.url),'utf8'),c);
const hash='a'.repeat(64),id='a'.repeat(32),command=c.HelperInstaller.command(hash,id);
assert.throws(()=>c.HelperInstaller.command('bad',id));
assert.ok(command.indexOf('Get-FileHash')<command.indexOf('Unblock-File'));
assert.ok(command.includes("@('AllSigned', 'Restricted')"));
assert.ok(command.includes('Unblock-File -LiteralPath $irccSetup -Confirm'));
assert.ok(!/Set-ExecutionPolicy|ExecutionPolicy\s+Bypass|Invoke-Expression|ScriptBlock/i.test(command));
await fs.mkdir(new URL('dist/',import.meta.url),{recursive:true});await fs.writeFile(new URL('dist/installer-command-preview.ps1',import.meta.url),command);
if(process.platform==='win32'){
 const cases=[['RemoteSigned',true,true,hash,1,1],['RemoteSigned',false,true,hash,1,0],['RemoteSigned',true,false,hash,0,1],['AllSigned',true,true,hash,0,0],['Restricted',false,true,hash,0,0],['Unrestricted',true,true,hash,1,0],['Bypass',false,true,hash,1,0],['RemoteSigned',true,true,'b'.repeat(64),0,0],['ReadFailure',true,true,hash,0,0]];
 for(const [policy,blocked,consent,actual,installs,unblocks]of cases){
  // All filesystem, policy and installation commands are mocks. No registry,
  // real file unblocking, installer, native host or credentials are accessed.
  const harness=`$script:fakePolicy='${policy}';$script:blocked=$${blocked};$script:consent=$${consent};$script:installed=0;$script:unblocked=0;$script:confirmed=$false;$script:message=''
function Add-Type { param($AssemblyName) }
function New-Object { param($TypeName) $p=[pscustomobject]@{FileName='Invoke-SyntheticInstaller';Title='';Filter=''}; $p|Add-Member ScriptMethod ShowDialog {'OK'}; return $p }
function Get-FileHash { param($LiteralPath,$Algorithm) return [pscustomobject]@{Hash='${actual}'} }
function Get-ExecutionPolicy { param($ErrorAction) if($script:fakePolicy -eq 'ReadFailure'){throw 'synthetic denial'}; return $script:fakePolicy }
function Get-Item { param($LiteralPath,$Stream,$ErrorAction) if($script:blocked){return [pscustomobject]@{Stream='Zone.Identifier'}} }
function Unblock-File { param($LiteralPath,[switch]$Confirm,$ErrorAction) $script:unblocked++;$script:confirmed=$Confirm.IsPresent;if($script:consent){$script:blocked=$false} }
function Invoke-SyntheticInstaller { param($ExtensionId) if($ExtensionId -ne '${id}'){throw 'binding mismatch'};$script:installed++ }
function Set-ExecutionPolicy { throw 'must never change policy' }
function Write-Host { param([Parameter(ValueFromRemainingArguments=$true)]$Text) }
try {
${command}
} catch {$script:message=$_.Exception.Message}
[pscustomobject]@{installed=$script:installed;unblocked=$script:unblocked;confirmed=$script:confirmed;message=$script:message}|ConvertTo-Json -Compress`;
  const result=spawnSync(path.join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(harness,'utf16le').toString('base64')],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.equal(result.status,0,result.stderr);const out=JSON.parse(result.stdout.trim());assert.equal(out.installed,installs,policy);assert.equal(out.unblocked,unblocks,policy);if(unblocks)assert.equal(out.confirmed,true);
 }
 console.log('PASS: synthetic PowerShell flows enforce hash-first verification, explicit single-file consent, cancellation, AllSigned/Restricted stop, unreadable policy stop and no policy changes.');
}else console.log('PASS: installer command validation; Windows mock-flow execution requires Windows.');
