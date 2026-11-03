# SVP assigned reviewer — prepared, not deployed

Latest checkpoint: see [SVP_REVIEWER_RELEASE.md](SVP_REVIEWER_RELEASE.md). Fresh production export matches baseline; standalone identity corrected, NEW import package prepared and backend fixtures extended to 48. Live acceptance remains pending. The trigger is HTTP All with application-session authentication, not independently verified Entra caller authentication.

3 November 2026, Asia/Bangkok. Owner selected preparation and synthetic tests first. No new HR access, role changes, assessment writes, UAT changes or deployment occurred.

`tools/build-svp-reviewer.cjs` derives a NEW standalone SVP endpoint candidate from the private Manager export used by the last dashboard run. It requires existing Gate 3 locks/revisions and preserves Gate 4 audit and notification behavior. Existing Manager, Development, Assignment and Official Creation flow definitions are not changed. No live package has been imported.

Only server-authenticated ACTIVE/IsActive `AppRole=SVP` may enter this endpoint. Session and profile must each be unique. It exposes `get_my_reviews`, `get_review_assessment`, `save_manager_review`, `confirm_assessment`, `return_assessment`. Queue entries and every assessment operation require the assignment's nonblank ReviewerEmail to equal Authenticated_Email after trim/lowercase. Direct access also requires IsActive=true. It grants no general manager, assignment, admin or development capability. The baseline Manager/ADMIN scopes remain on their existing endpoint. No Surajit email or identity is manufactured by the browser.

OData keys are quoted safely; body-supplied role/scope/identity fields are rejected. A queue with 501 entries or a continuation link fails closed with 503. The inherited queue reads headers before applying its server-side reviewer filter, and returns only assigned submitted headers. These reads remain in the existing tenant/owner connection; there is no new destination.

Frontend uses optional `reviewerApiUrl` in config. It is absent from live config and blank in config.example.js. Without it, SVP remains dashboard-only. When enabled after approval, Assigned reviews uses the separate endpoint. `isManager()` remains MANAGER/ADMIN only; assignment, development and administration retain their existing guards. Role-play behavior is unchanged.

Validation: 36 backend graph fixtures (including assigned read/save/confirm/return, nonreviewer 403 without mutations, role denials, invalid/expired/duplicate sessions, inactive/duplicate profiles, spoofing, key quoting, truncation). Separate local UI test covers routing, save/confirm, nonreviewer 403 and hidden manager capabilities. Manager, Development, Assignment, Session and Executive UI regression suites pass. These are synthetic tests, not Microsoft Flow checker or authenticated live acceptance.

Private candidate and test results: ignored `test-results/executive-private/SVP-Reviewer-candidate.json` and `svp-reviewer-tests.json`. The latter records exact baseline/candidate hashes. Rebuild with:

```
node verify-svp-reviewer.cjs <private Manager.json> <private results.json>
node tools/build-svp-reviewer.cjs <private Manager.json> <private candidate.json>
node verify-svp-reviewer-ui.cjs
```

Next deployment requires a fresh Manager export comparison, NEW flow import package, action-time approval for Surajit's assigned-assessment HR access, Microsoft Flow checker/export verification and normal authenticated assigned/nonreviewer tests. Do not update an existing business flow. Do not open Official Creation, change ReviewerEmail, create test assignments or manufacture sessions for acceptance.

Dashboard: current portal shows flow `8e9473c4-21e1-4c90-8547-740c9a234426` On, modified 21:12, latest 21:20 run Succeeded. A successful run status alone is not authorization proof; the last run's recorded result is the negative HTTP 401 check. Browser currently displays explicitly labeled role-play data. Last deployment evidence remains commit `9196cea23eddbfcb8d23ffb5f39bca09addbed3d`, workflow `41652383459`; this turn's direct hosted hash recheck was blocked by network EACCES. Real SVP/DM dashboard acceptance remains pending owner login; no actual auth/deployment defect has been established.
