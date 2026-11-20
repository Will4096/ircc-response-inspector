# Official link sources / 常用链接依据

Reviewed 2026-11-18. Static public destinations only; no profile identifiers or sign-in session URLs. This records official link provenance, not an availability guarantee or authenticated integration test.

- Official account finder: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/ircc-accounts.html . Distinguishes secure account, Portal, New version and PR Portal.
- PR Portal source: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/pr-portal.html links to https://prson-srpel.apps.cic.gc.ca/en/login . Login is client-rendered; no account was accessed.
- IRCC Portal source: https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/portal-application-process.html links to https://portal-portail.apps.cic.gc.ca/signin?lang=en . Public sign-in entry only.
- New version: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/online-account.html . Use the public sign-in/information page; the linked CXP application denied automated access (403). No alternative access attempted and no authentication redirect retained.
- Secure account: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html . Public entry for GCKey / Sign-In Partner.
- IRCC ATIP source: https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=463&top=1 points to the IRCC tool at https://atip-aiprp.apps.gc.ca/atip/welcome.do . A direct fetch returned 502; the page offers the official request instructions as a secondary link. Do not substitute a generic government-records platform for IRCC immigration records. Eligibility, fees and consent requirements remain on the official site.
- Status guide: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-status.html . Route depends on application type; this is not an alternative Tracker automation resolver.
- Processing times: https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html . Estimates are not individual deadlines.
- Web form: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/contact-ircc/web-form.html . Follow official instructions; no automatic submissions or messages.

All external anchors use target=_blank, noopener/noreferrer and no-referrer. Opening the tab never fetches any external page, modifies an application, starts a query or prefills form data.

## CBSA and CSIS (2026-11-18)

- CBSA official ATIP overview: https://www.cbsa-asfc.gc.ca/agency-agence/reports-rapports/pia-efvp/atip-aiprp/menu-eng.html . The Access to Information request instructions at https://www.cbsa-asfc.gc.ca/agency-agence/reports-rapports/pia-efvp/atip-aiprp/req-dem-info-eng.html point to https://atip-aiprp.tbs-sct.gc.ca/ for online requests. The overview also links to the Privacy Act instructions.
- CSIS official ATIP page: https://www.canada.ca/en/security-intelligence-service/corporate/transparency/access-to-information-and-privacy.html . Its Make a request link points to https://www.canada.ca/en/treasury-board-secretariat/services/access-information-privacy/access-information/request-information.html, which links to ATIP Online.
- Cards open agency guidance; the separate shared online link requires the user to select the intended institution. No agency selection, request filing, fee payment or authentication is automated. No statement that requesting from all institutions is mandatory or guarantees disclosure.

CBSA shortcut refinement (2026-11-18): the primary card now opens the official Apply online today destination, https://atip-aiprp.tbs-sct.gc.ca/ . CBSA guidance remains secondary. The automated fetch was rejected by that service; no alternative access or authenticated submission was attempted. This is the publicly linked entry, not a claim of availability or a preselected CBSA form.

Tracker shortcut (2026-11-18): reuses the extension’s existing official entry https://ircc-services.canada.ca/2/ast through the current-window resolver, not an independent raw tab opener. Existing pages are activated without resetting them; withheld-URL cases use the Query association flow. The general status-guide link remains available for application-type guidance.
