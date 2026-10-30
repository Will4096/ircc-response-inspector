# Product and implementation rules

- Treat Query, Manage applications and Settings as one product with shared navigation, typography, spacing, controls and status language. Do not solve structural problems by appending isolated controls or CSS overrides.
- Establish the user task, information hierarchy and complete state transitions before changing UI. Each stage has one clear primary action; advanced diagnostics and developer setup stay out of the normal path.
- Keep application profiles in Manage applications; general preferences, optional mailbox connections, privacy/data controls and About belong in the independent Settings page. Header navigation must work across all three pages.
- Mail assistance is opt-in and off by default. A checked setup switch is not a verified connection. Distinguish disabled, setup required, connected, authorization expired and unavailable states. Retain manual code entry. Submission requires explicit confirmation.
- Preserve query completion, per-person History, Security raw codes, comparisons and profile isolation. Never interpret missing Security records as absence of security screening.
- Default Chinese, complete English support, retain official field terms where useful. Language changes must preserve unsaved input. Show specific action feedback, not a generic Done message.
- Handle empty, loading, success, failure, cancellation, disabled, expired and unsaved-edit states. Destructive actions are visually separated and describe their effect.
- Review both language layouts and representative user flows with synthetic data before delivery; tests passing alone do not establish usability. Do not read browser storage, emails or other personal data to create previews.
- Work on the preview branch until explicitly ready and authorized to merge. Development source lives in Family/ircc-response-inspector-development/public-upload/. The installed unpacked extension remains Family/ircc-response-inspector/. Use scripts/deploy-local.mjs to deploy the explicit runtime allowlist, preserving its path/ID and storage; never place source, Git, test browser profiles, media or build output inside the installed extension directory.
- No credentials, email bodies, OTPs or private application records in source, fixtures, logs or exports. No bypass of browser/tool access denials.
- Keep README languages in separate linked files. Record remaining integration limitations honestly, and persist agreed product decisions in PRODUCT.md.

- Use the loopback Tracker simulator and offline regression tests first. Access real IRCC only for targeted compatibility checks that the simulator cannot establish. Keep simulation assets and localhost permissions out of the extension runtime.

- User-facing data exports are password-encrypted backups only. Use authenticated encryption, preview imports before explicit replacement, retain manual fallback, and exclude mailbox credentials/tokens/codes. Never export plaintext profile/query backups.

- Use a single persistent workspace for query, profiles and settings. Internal navigation must not create browser tabs or discard unsaved inputs. Only explicit external actions such as opening Tracker may open a website.
- Show a persistent masked saved-state marker for stored app passwords; never read the actual secret back into the UI. Separate saved connection state from request binding, polling and candidate confirmation.

- A trusted submit is pending until Tracker reaches verification: polling must not cancel its binding on the search page or during persistence. Use the observed submit time, protect newer requests from stale cancellation, and check the page observer version after extension updates. Submission stays on the official page; locating Submit must never click it.

- Route all Tracker open/resume/relogin actions through the same current-window resolver. Preserve established tab identity across GCKey redirects, reuse that tab for restart, never persist authentication URLs/parameters, and never replace a visibly unrelated page or another window's tab.
