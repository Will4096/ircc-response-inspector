# Optional email verification assistance

[简体中文](MAIL-SETUP.md) · [English](MAIL-SETUP.en.md)

Email assistance and automatic code verification are separate, default-off options. Manual entry remains available. A unique matching candidate can start a visible five-second countdown after opt-in; verify immediately or pause. Resume starts a full countdown. Failed or ambiguous codes are not automatically retried.

## Requests and continuation

The extension preserves the observed submission time, rather than resubmitting or inventing a new time when reopened. The same associated tab in the same browser session may resume; another tab/session requires an explicit check and association. Limited metadata expires 24 hours after the original submission and is cleaned on the next worker start or mailbox operation. No bodies or codes are retained. The observation window is ten minutes, with checks about ten seconds apart; these are not official code-validity limits. Profile changes, leaving verification or disabling assistance stop new checks; in-flight work may finish before exiting.

## Gmail

Configure an OAuth client with Gmail API enabled and the HTTPS redirect URI shown in settings. Do not enter a client secret. The current browser token flow keeps access tokens in worker memory and may require authorization after restart. gmail.readonly grants mailbox-wide read access. Up to ten recent candidate headers are filtered before body reads; bodies may still fail final matching. The privacy policy includes the Google Limited Use statement.

Gmail remains a developer-configured feature. The publisher must document the production OAuth project, suitability of the OAuth design, applicable verification or exception, and real-provider integration tests. GitHub publication is not Google approval.

## 163 on Windows

Requires helper 1.6 or a newer compatible version, Windows Chrome and Windows PowerShell 5.1. Use Install / update helper (Update helper when incompatible) directly in the Windows helper card. This opens instructions only. Click Download installer script explicitly, then copy the command into PowerShell and select the saved file. Its hash is checked before installation. Initial setup may download Python 3.13 through winget and accept its installation agreements. No administrator rights or policy bypass is required.

Source installation: powershell.exe -NoProfile -File .\windows\install.ps1 -ExtensionId <extensionID> -InstallPython . The helper installs under %USERPROFILE%\.ircc-mail-helper for the current Windows user and specified extension only. It has no service or listening port and exits after each requested operation. Enabled 163 assistance with existing native permission may launch a status-only probe when a visible workspace opens (five-minute healthy cache, one-minute failure cache). It does not decrypt credentials or contact email. Header warnings link directly to helper settings.

Enable IMAP in 163 and use an app password, not your web-login password. Current-user DPAPI protects the saved credential. INBOX is read-only with BODY.PEEK; no sending, deletion or marking messages read. Bounded headers are checked for time, sender, recipient and recognizable subject before candidate body access. The recognized shared IRCC Portal / New version account / Confirm your account template is accepted for Tracker; its account wording alone does not exclude it. Other purposes, old messages and ambiguous codes are rejected. Unsupported subjects may require manual entry. Sender matching does not authenticate the sender.

## Removal and support

Disconnect removes current and known legacy credentials when the helper is available. Otherwise run its bundled uninstall.ps1. Removing the extension does not uninstall the helper. Diagnostics contain fixed stages, UTC timestamps and counts in two rotating files of about 64 KiB each; browser-data clearing keeps them, helper uninstall removes them. Delete downloaded exports and revoke provider authorization separately.

Offline tests do not replace real-provider checks or platform review. Never post bodies, codes, credentials or raw personal records publicly. See [Privacy](PRIVACY.md), [Security](SECURITY.md) and [Publishing](PUBLISHING.md).

The command verifies the file hash and checks execution policy. Under RemoteSigned, only the selected file is unblocked after explicit confirmation. AllSigned, Restricted or unreadable policy stops installation and directs the user to a trusted signed package or administrator. No policy lowering or Bypass is performed. This unsigned script package cannot support devices requiring signed scripts.
