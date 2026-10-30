# Product and implementation rules

- Treat Query, Manage applications and Settings as one product with shared navigation, typography, spacing, controls and status language. Do not solve structural problems by appending isolated controls or CSS overrides.
- Establish the user task, information hierarchy and complete state transitions before changing UI. Each stage has one clear primary action; advanced diagnostics and developer setup stay out of the normal path.
- Keep application profiles in Manage applications; general preferences, optional mailbox connections, privacy/data controls and About belong in the independent Settings page. Header navigation must work across all three pages.
- Mail assistance is opt-in and off by default. A checked setup switch is not a verified connection. Distinguish disabled, setup required, connected, authorization expired and unavailable states. Retain manual code entry. Submission requires explicit confirmation.
- Preserve query completion, per-person History, Security raw codes, comparisons and profile isolation. Never interpret missing Security records as absence of security screening.
- Default Chinese, complete English support, retain official field terms where useful. Language changes must preserve unsaved input. Show specific action feedback, not a generic Done message.
- Handle empty, loading, success, failure, cancellation, disabled, expired and unsaved-edit states. Destructive actions are visually separated and describe their effect.
- Review both language layouts and representative user flows with synthetic data before delivery; tests passing alone do not establish usability. Do not read browser storage, emails or other personal data to create previews.
- Work on the preview branch until explicitly ready and authorized to merge. Development source lives in public-upload/. The parent directory is the user's installed unpacked extension: deploy only an explicit runtime allowlist there, preserving its path/ID and storage.
- No credentials, email bodies, OTPs or private application records in source, fixtures, logs or exports. No bypass of browser/tool access denials.
- Keep README languages in separate linked files. Record remaining integration limitations honestly, and persist agreed product decisions in PRODUCT.md.

- Use the loopback Tracker simulator and offline regression tests first. Access real IRCC only for targeted compatibility checks that the simulator cannot establish. Keep simulation assets and localhost permissions out of the extension runtime.
