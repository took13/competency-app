# Executive Dashboard — focused pilot increment

3 November 2026. Implementation and offline regression PASS. Live acceptance is tracked below; offline fixtures are not Power Automate engine or authenticated UAT evidence.

POST `{action:"get_executive_dashboard", sessionToken}` to a separate dashboard flow. The browser supplies no identity, role, discipline or cycle. A signed trigger URL alone does not authorize reads. Session lookup must return exactly one VERIFIED, unexpired session, followed by exactly one ACTIVE/IsActive caller profile. SVP receives the approved fixed EES scope ETM/EEM/ECM. MANAGER requires JobGradeCode=DM and one of those DisciplineCode values. ADMIN, HEAD, employee and other managers receive 403. No existing manager/reviewer capability is changed.

The smallest release uses only `ETM_UI_DEMO_2026`. It never enables or creates a cycle, assignment, audit event or notification. Headers are joined to current ACTIVE, IsActive=true, CanBeAssessed=true profiles by normalized email. Discipline comes from that server profile, never a prefix guessed from an assessment key. Ambiguous active profiles or multiple active headers per eligible employee/cycle fail closed. Each list read is capped at 501; reaching that cap or seeing a continuation link returns 503 rather than partial totals. SharePoint reads are sequential, not a transactionally consistent snapshot. Current profile scope means historical assessments for people who are now inactive/non-assessable are excluded.

Metrics are computed in the flow and returned as aggregates only, without names, emails, evidence or assessment keys:

- Assigned: active headers in the fixed pilot cycle joined to eligible profiles; one header per employee is required.
- Submitted: current status SUBMITTED, UNDER_REVIEW or CONFIRMED.
- Awaiting review: SUBMITTED or UNDER_REVIEW.
- Confirmed: CONFIRMED only.
- Submission completion: submitted / assigned, rounded for display; denominator zero displays unavailable (—).
- Returned/assigned/in-progress/preparing headers remain in the denominator but are not submitted. Unexpected statuses likewise remain unsubmitted; this is a status summary, not a readiness or quality certification.
- Gaps, development plan coverage, grade breakdown and individual drilldown are not implemented in this minimal live contract. Missing metrics display unavailable, never zero or mock data. Role-play preserves its independent labeled sample experience.

Inspection of native SharePoint on 3 November found the actual profile fields above, SVP Surajit and three DM discipline mappings. Assessment Assignment contained nine visible historical/pilot/UAT headers; two were in ETM_UI_DEMO_2026, both CONFIRMED. One of those belonged to the now non-assessable pilot Admin profile, so the expected result from that visible state is one eligible ETM assignment/confirmation and zero EEM/ECM assignments. This is a manual read expectation, not an endpoint acceptance result. Re-read at live verification; do not hard-code these counts.

## Build and verification

`node verify-executive-api.cjs <private-manager-definition.json>` runs 21 generated-graph fixtures and writes an ignored private candidate. It verifies deny cases, scope spoofing, injected quote handling, cross-discipline duplicate profiles, duplicate assignments, 501/continuation truncation, empty data and connector failures. Only GetItems connector operations exist. Its interpreter does not replace Microsoft validation.

`node verify-executive-ui.cjs` verifies live contract rendering, empty state, malformed totals, 401/403/503, session clearing/late response, responsive widths and role-play isolation using mocked transport. Existing verify, dashboard, session, manager, development and assignment suites also pass. No live OTP, assessment write or new assignment was used by these tests.

`tools/package-executive-dashboard.ps1` accepts BaselineZip, CandidateJson and a fresh OutputZip. It creates a NEW standalone import package, removes unused Outlook resources and preserves only the SharePoint connection mapping. Never select Update against an existing flow. Internal exports/packages remain under ignored test-results/executive-private; do not publish them.

Deployment requires Microsoft import/Flow checker, independent export comparison, new endpoint negative checks and authenticated SVP/DM readback. Only then set optional `dashboardApiUrl` in published config.js and deploy the frontend. Blank/missing configuration keeps the existing truthful unavailable screen. Existing five endpoint configuration and business workflow contracts are unchanged. User explicitly approved the scoped live API and website hookup in this chat; no repeat approval is needed for that scope.

## Live checkpoint

The owner approved opening this scoped API and connecting the live website. A NEW flow `8e9473c4-21e1-4c90-8547-740c9a234426` was imported and turned On. Microsoft Flow checker showed Errors (0), Warnings (0). Fresh deployed export exactly matches candidate actions, triggers and SharePoint connection references. Actual endpoint tests returned 401 for empty/invalid tokens and 400 for injected scope fields and mutation action, with no dashboard payload. These four checks were rerun after enabling the trigger; earlier disabled-trigger responses were not treated as authorization evidence.

Frontend configuration is enabled for owner-approved live testing after these checks. Positive authenticated SVP/DM acceptance remains pending: the open website was a role-play session, with no real SVP/DM session available. No session was manufactured or borrowed from another user's SharePoint record. Therefore overall live acceptance remains INCOMPLETE until actual SVP and DM login/readback, EEM/ECM empty-state verification and authenticated employee/Admin 403 checks. The 21 offline API fixtures establish candidate behavior, not these missing live results. The read-only dashboard timeout is 60 seconds; existing mutation timeouts are unchanged.
