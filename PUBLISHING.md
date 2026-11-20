# Publishing checklist / 发布检查

Personal repository: Will4096/ircc-response-inspector. Do not use the separate work-account connector. Work on the preview branch until merge/release is explicitly authorized.

## Source and package

Node.js 22+. Run every Node/Python suite in .github/workflows/release.yml and the loopback browser suite with synthetic records only. Run node scripts/build-privacy.mjs --check to prevent policy drift. After helper changes run node scripts/build-installer.mjs, which pins the bundled installer hash. Use node scripts/build-release.mjs --runtime-only for a local runtime package; omit the flag for explicit public-source staging. Never upload the containing Family directory.

Runtime ZIP includes application assets, LICENSE, bilingual help/privacy and the explicitly downloadable helper installer. Tests, private audits, promotional sources, browser profiles and user data are excluded. Text entries use LF and deterministic ZIP metadata. Copy the reviewed ZIP and checksum to downloads, then run node scripts/build-release.mjs --verify. CI checks the checksum and independently rebuilds and byte-compares the archive from checked-out source. A checksum alone is not source verification. Do not rewrite published releases.

## Release gates / 发布门槛

- Tag, manifest and release notes must agree. Review all runtime entries and helper payloads. Verify installer-ui.js matches the bundled installer hash. Helper 1.6 is required for header filtering and legacy credential cleanup; older helpers show an update state.
- Review Chinese/English normal, empty, error, cancelled, expired and partial-result states with synthetic data. Offline tests do not establish real-provider compatibility.
- Keep PRIVACY.md and generated privacy.html consistent. Disclose actual local persistence, candidate-body access, provider-wide OAuth permission, diagnostics and deletion boundaries.
- Verify an available private vulnerability/contact route before inviting sensitive reports. Source changes cannot configure GitHub repository settings. If unavailable, request a private contact method without posting details.
- Document Google OAuth project/audience, production OAuth security design, applicable verification or exception, and real authorization/revocation tests. GitHub publication is not Google approval. Gmail remains developer-configured pending this evidence.
- Record review of actual Tracker, authentication-service and mailbox terms for intended automated use. General website terms alone do not establish permission. Do not claim official authorization.
- Determine operating entity, jurisdictions, monetization/support model and applicable privacy, consumer and immigration-advice obligations with qualified counsel when needed. MIT does not waive non-excludable rights or license government marks.
- Use synthetic/redacted promotional screenshots with metadata removed; disclose illustrative edits. Do not promise real-time/full access, guaranteed retrieval, approval prediction or Security-code interpretation. Label existing 4.3.1 illustrations as older illustrative UI.

External reviews/settings are not established by source changes or passing tests. Record their actual status before release, rather than silently marking them complete.

## Permissions and store submission

Mandatory: official Tracker host, debugger, scripting, activeTab, storage and sidePanel. Debugger is restricted to the selected Tracker operation and detached at its end. Optional: identity/Gmail host, Windows nativeMessaging, and two official authentication hosts for metadata/h1 session checks. Request optional access only for the corresponding action. No all-sites permission or login-form reading.

Chrome Web Store submission requires publisher registration, runtime ZIP, accessible privacy policy and accurate dashboard declarations. Supply synthetic instructions, never real credentials. Review https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements/ . GitHub distribution is not store approval.

## GitHub release

A reviewed vX.Y.Z tag must match manifest.json and release-notes/vX.Y.Z.md. The tag-only pinned workflow runs its listed tests, validates policy generation, checks the ZIP checksum and compares a source rebuild before creating and publishing a draft release. Existing releases remain unchanged. It uses only the job-scoped GITHUB_TOKEN. Full logged-in/provider validation remains separate.

## License

Keep the complete MIT LICENSE and notices in source and runtime distributions. Review rights to external marks, screenshots and dependencies separately.

## Separate publication review from user data

Inspect public source, examples and media for personal data, credentials and machine-specific paths. The runtime build rejects local home paths, development endpoints, credential signatures and development/private artifact paths. Keep user captures, exports, browser profiles, local configuration and private history out of Git and releases; never collect them for release checks. This publication check must not redact or rewrite the extension’s captured business responses or local raw exports. Raw plain/encrypted exports preserve captured data.
