# Publishing checklist / 发布说明

Target account: **Will4096**. Repository: **ircc-response-inspector**. Visibility: **Public**. Do not use the separate work-account GitHub connection.

## Reproducible package

Run `node scripts/build-release.mjs` with Node.js 22 or later. The script writes a ZIP and SHA-256 file under `dist/` using an explicit runtime-file allowlist. It excludes tests, documentation, renderer scripts, local data, exports and browser profiles. The script also stages a reviewed public-source bundle under `public-upload/` for browser upload. Inspect the generated file list before committing it. Do not upload the containing Family directory.

Tests: `node tests.mjs`, `node comparison-tests.mjs`, `node i18n-tests.mjs`, `node privacy-tests.mjs`.

## Permission justification

- `debugger`: temporarily attach to the selected official Tracker tab for reliable form input and JSON-response inspection. Detach on completion, failure, stop, timeout or navigation away. No arbitrary-site collection, cookie API, remote control backend or remote executable code.
- `scripting`: locate and fill the official Tracker form, confirm verification state and read the current application/History view.
- `storage`: store profiles and preferences locally, comparison baselines locally and query results in session storage; support deletion controls.
- `activeTab`: identify the tab explicitly opened by the user without requesting full browsing-history or `tabs` permission, including during the official sign-in transition.
- `https://ircc-services.canada.ca/*`: only this Tracker host is granted persistent access. Mailbox hosts are not requested.

## Before a Chrome Web Store submission

1. Complete developer registration and account verification yourself. No store submission has been made.
2. Upload the runtime ZIP, not the full repository.
3. Provide accurate bilingual listing copy, icon and screenshots captured with fictitious data; do not imply government endorsement or guaranteed processing outcomes.
4. Publish PRIVACY.md at an accessible HTTPS URL and add the URL to the privacy field. The eventual public GitHub policy URL can be used after the repository actually exists.
5. Explain local processing of identity details, an ephemeral verification code, medical-exam milestone status and website content. Dashboard declarations must match the current form definitions, this policy and the actual implementation; local processing must not be described as “no data is handled”.
6. Supply reviewer instructions for the official login and manually supplied OTP. Do not include your real account or private application data. The full logged-in journey still needs testing in the publisher's own environment. Automated tests use synthetic data and do not replace live verification.
7. Choose Unlisted or Public and submit only after reviewing the final listing. Approval is not guaranteed.

Official references (checked 2026-10-28):
- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/privacy
- https://developer.chrome.com/docs/webstore/review-process

## License

No open-source license has been selected by the owner. Public repository visibility is not a grant of an MIT or other open-source license. Do not add one without the owner's choice.
