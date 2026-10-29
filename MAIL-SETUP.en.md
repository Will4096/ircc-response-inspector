# Email code assistance · development preview

[简体中文](MAIL-SETUP.md) · [English](MAIL-SETUP.en.md)

Branch: `feature/mail-verification-windows`. Not merged into main or released. Assistance is off by default. Manual entry is always available. A code is submitted only after the user confirms the target profile, candidate, purpose and message time.

## Enable

Load this branch as an unpacked development extension. Open extension options → Settings → Email code assistance. Choose a provider and enter the verification mailbox. Only one outstanding request per configured mailbox is retained. The extension must observe a matching Tracker application form submission; it does not guess a request timestamp from an already-open verification page. Submit the form again after enabling assistance.

## Gmail

Create a Google Cloud OAuth client with Gmail API enabled. This preview uses the browser token flow and a Web application client configured for the HTTPS redirect URI shown in extension options (`https://<extension-id>.chromiumapp.org/gmail`). Enter the Client ID, never a client secret. Click Authorize Gmail and choose the matching account.

`gmail.readonly` grants mailbox-wide read access, not access limited to IRCC mail. Filtering is an application behavior. Tokens stay in worker memory; worker restart or expiry may require reauthorization. No refresh token is saved. A real OAuth project, provider configuration review, applicable Google verification and live authorization tests remain required before public release. No production credentials are included.

## 163 on Windows

Chrome cannot silently execute an installer. Run this once from the branch source directory in Windows PowerShell 5.1, using the extension ID shown in options:

```powershell
powershell.exe -NoProfile -File .\windows\install.ps1 -ExtensionId <extension-id> -InstallPython
```

The script automatically installs and registers the per-user helper. It reuses Python 3.13/3.14 or installs Python 3.13 from the official winget package if necessary. No administrator rights, services, scheduled tasks or listening ports. It does not change execution policy. Follow applicable organizational policy if scripts are blocked.

Files: `%LOCALAPPDATA%\IRCCMailHelper`. Registration: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.will4096.ircc_mail`. Only the specified extension ID may call it. Reinstall registration if the extension ID changes.

Enable IMAP in 163 and generate a client app password. Enter it in extension options (not the web sign-in password), then click Connect 163 and enable. After a successful connection, the helper encrypts the app password with current-user Windows DPAPI. It uses verified TLS, read-only INBOX selection and BODY.PEEK; it does not send/delete mail or mark it as read.

Disconnect in options clears the helper's stored authorization if available. To remove the independent helper and credential file:

```powershell
powershell.exe -NoProfile -File .\windows\uninstall.ps1
```

Uninstalling the Chrome extension alone does not remove this component. Revoke the 163 app password at the provider when no longer needed.

## Matching and limitations

The current request, profile, Tracker verification page, recipient, sender domain, purpose and server arrival time must match. A sender address is not proof of authenticity. Portal registration messages are rejected. Multiple six-digit numbers in one message are not guessed; multiple distinct candidate messages require a deliberate choice. HTML-only messages and unsupported language/templates fall back to manual entry.

Polling occurs about every ten seconds for at most three minutes. This is an observation timeout, not an assertion about IRCC code validity. Leaving Tracker, switching profile or disabling assistance invalidates candidates. Consumed and ignored codes are not offered again for the current request, including after worker restart. A new code can be confirmed after an unsuccessful verification.

Bodies, tokens, app passwords and codes are not written to extension logs, configuration or exports. Requests and request-salted code digests are retained only in browser session storage for binding/deduplication. Do not use this feature to bypass any access denial by a browser tool or mail service.

## Merge requirements

Complete real Gmail authorization/revocation, 163 IMAP/template integration, and Windows installer/uninstaller tests. Verify old mail, wrong purpose, ambiguous numbers, duplicate codes, retry with a new code, profile switching, expired Tracker sessions, ignore and disabled/manual behavior. Offline tests alone do not make this ready for main.
