# IRCC Response Inspector

[English](README.en.md) · [简体中文](README.md)

![Extension icon](icons/icon-128.png)

**Unofficial Chrome extension · Local processing · MIT licensed**

View IRCC Tracker progress, per-applicant History, raw Security status codes and changes since your last successful check in one interface. You do not need to inspect network requests or search through JSON yourself. You still sign in, review application details and enter the email verification code manually.

This independent tool is not affiliated with IRCC or the Government of Canada. It does not predict decisions or interpret undocumented status codes.

## Features

- Store separate application profiles and assist with filling the official form.
- View each applicant's biometrics, medical exam, eligibility, background check, pending actions and complete History.
- Preserve History entries and display Security status codes as returned.
- Compare complete successful checks within the same profile. Failed checks do not replace the baseline.
- Chinese by default, with English support. The Chinese UI retains official field names such as Surname / Last name and Given name.
- Export local JSON when needed, delete an individual profile or clear all local extension data.

## Install

1. Download the named installation ZIP from [Releases](https://github.com/Will4096/ircc-response-inspector/releases). Do not choose GitHub's automatic Source code archive.
2. Extract it and open **chrome://extensions** in Chrome.
3. Enable **Developer mode**, then choose **Load unpacked**.
4. Select the extracted folder containing **manifest.json**. Optionally pin the extension.

This is a GitHub-distributed unpacked extension, not Chrome Web Store approval. When updating, reload the extension and refresh Tracker. The [downloads](downloads) directory provides a package mirror.

## Use

1. Open Tracker and sign in yourself.
2. Save information through **Manage applications**, verify the selected profile and fill the form.
3. Review and submit the official form. Paste the email verification code manually and choose **Verify and check**. The extension does not read your mailbox.
4. View progress, expand each applicant's History and export a local record only when needed.

Switch language in the popup header or **Extension options → Settings**. The local preference synchronizes across open extension pages.

## Privacy and permissions

No developer-operated backend, advertising, telemetry or external AI. Profiles, preferences and comparison baselines use local Chrome storage; query caches use session storage. Chrome Sync is not used. Required query information is still submitted through the official IRCC page.

The debugger permission supports reliable form input and response inspection in the selected Tracker tab. Chrome may show a debugging banner. The extension detaches on completion, failure, timeout or navigation away. Do not open DevTools on that tab during a check.

Profiles, History and exports may contain sensitive personal information. Local storage is not encrypted storage. Deleting a profile removes its caches and baseline; **Clear local data** removes all extension data. Downloaded exports must be deleted separately.

Read the [privacy policy](PRIVACY.md), [security notes](SECURITY.md) and [publishing guide](PUBLISHING.md).

## Development and verification

Current version: 3.4.1. No third-party runtime dependencies. Use Node.js 22 or later:

~~~sh
node tests.mjs
node comparison-tests.mjs
node i18n-tests.mjs
node privacy-tests.mjs
node scripts/build-release.mjs
~~~

The build uses an explicit runtime-file allowlist and produces a ZIP with a SHA-256 checksum. Automated tests use synthetic data and contain no real account or verification code. The official site may change; the authenticated flow still needs live testing by the user.

## Feedback

Use [Issues](https://github.com/Will4096/ircc-response-inspector/issues) and include extension/browser versions and reproduction steps. Do not post names, UCI or application numbers, birth dates, verification codes, cookies, tokens, real screenshots or unredacted exports.

## License

[MIT License](LICENSE). Copyright (c) 2026 Will4096. Use, modification and redistribution are permitted under the license terms; retain the copyright and license notices.
