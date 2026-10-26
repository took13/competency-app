# Test checklist

## Automated browser checks

Run `node verify.cjs` with Playwright available. Tests use mocked transport; they send no live OTP and make no live writes.

- [x] Four role-play identities and employee menu boundaries.
- [x] Evidence survives level change; employee save keeps scroll.
- [x] Unsaved drafts survive navigation; dirty draft blocks submit/user switching.
- [x] Save-all/completeness gate, submit cancellation and read-only submission.
- [x] Employee layout fits 390px.
- [x] Manager Agree & Save, adjustment reason, complete-review confirmation and lock.
- [x] Reviewer DRAFT plan → PLANNED action; employee read-only plan.
- [x] Administration preview cannot create real assignments or change roles.
- [x] Role-play sends zero external requests.
- [x] Mock OTP/profile/assignment sign-in, including Enter key verification.
- [x] Failed save retains draft and saved-count accuracy.
- [x] Input typed while saving survives the earlier response.
- [x] Employee request fields match evidenced contract.
- [x] Sign out clears token and restores configured endpoints.
- [x] No uncaught browser JavaScript errors.

## UX-12–UX-15 incremental cleanup

Run `node verify-ux.cjs` with Playwright available. All authentication responses are mocked; no live OTP or backend writes are sent. Set `UX_SITE` to the Azure origin to repeat these checks against hosted UI assets with mocked APIs.

- [x] UX-12: clean real sign-in is the default; shell/navigation are hidden in static HTML and until session verification finishes.
- [x] UX-13: Connect button, endpoint dialog, inputs and connection handlers are removed; URLs load from config.
- [x] UX-14: profile, session tag, Sign out and server-role navigation appear only after successful profile verification.
- [x] UX-15: initial HTML has no seeded identity; sign-out, demo exit, rejected profile and expired sessions clear displayed identity and session data.
- [x] Cached sessions revalidate with the server before displaying identity; cached user/role never controls navigation.
- [x] Explicit demo entry retains four-user role-play; leaving demo removes its identity and toolbar.
- [x] Desktop and 390px login checked; original 15 browser regression groups still pass.
- [x] Manager/Assignment/Development live gates remain unchanged; config, backend contracts and Actions workflows are outside this change.

## Hosting deployment acceptance (verify for delivered commit)

- [ ] Workflow for the delivered commit concludes success.
- [ ] Hosted root shows UI v2 sign-in; app.js, styles.css and config.js return 200.
- [ ] Hosted role-play employee → submit → manager review/confirm → reviewer plan → employee read-only view works.
- [ ] Existing workflow file remains unchanged.

## Live pilot acceptance — requires actual backend and tester OTP

- [ ] Verify email delivery and login for all four registered role-play users; do not substitute sample roles for server roles.
- [ ] Check CORS from the actual Azure origin for all five endpoints.
- [ ] Load live assignments and confirm JR versus SR profiles, items and targets from backend.
- [ ] Save employee evidence, reload from backend, confirm persistence; submit and verify lock.
- [ ] Supply/verify Manager queue/detail/save/confirm request and response contracts; enable and test authorized reviewer access.
- [ ] Supply/verify assignment creation contract, then verify no duplicate assignments and correct item counts.
- [ ] Verify get_assessment_result, create_development_plan, get_development_plan and save_development_action in that order.
- [ ] Confirm seven approved actionType values; verify DRAFT plan guard, reviewer-only edits, PLANNED status and string count fields.
- [ ] Verify expired session, unauthorized employee, foreign item/assessment, 403, 409, timeout, duplicate click and refresh behavior.
- [ ] Confirm employee cannot edit a development plan; non-reviewers cannot save/confirm manager results.
- [ ] Rotate/revoke temporary signed URLs after the pilot and remove public endpoint configuration before production.

Unchecked live items are not represented as passed by browser mocks or hosting success.

## Manager feedback UI regression

- [x] Shared status aliases and explicit labels; pending, dirty, saved, submitted and planned states.
- [x] Large level controls and selected state; labeled Employee/Manager/Development metrics.
- [x] No page overflow at 320, 390 and 768px in all three workspaces.
- [x] Existing demo lifecycle, API payload, failure/concurrency and session checks.
- [ ] Pilot accessibility UAT at 200% zoom and with screen reader.

See UI_V2_MANAGER_FEEDBACK.md for implementation choices and backlog.

## Assign Assessment incremental UI (2026-10-26)

Run `node verify-assignment.cjs` with Playwright available. This uses a synthetic adapter, not a verified live backend contract.

- [x] Manager section; employee cannot invoke assignment; role-play and missing mapping disable live actions.
- [x] Strict boolean pilotCanAssign; positive expected count; explicit zero blockers, missing CUVersion and target rubric issue counts. Missing/malformed fields block creation.
- [x] Input changes invalidate preview; Create always re-previews identical frozen inputs; newly discovered blocker prevents POST create.
- [x] Duplicate 409 consumes preview and displays a clear message; repeated pending click cannot create twice.
- [x] Success key/status/item count display and signed-in employee list refresh; manager queue limitation is explicit.
- [x] Only configured fixture request fields sent; no guessed production mapping.
- [x] Manager assignment layout fits 320/390/768/1440px; existing status/level and sign-in suites pass.
- [ ] Obtain and map sanitized successful v2 request/response and scope/profile resolution evidence.
- [ ] Live authorized MANAGER/ADMIN preview, out-of-scope 403, blocked DM profile and successful JR/SR assignment.
- [ ] Live deterministic PILOT key, duplicate 409, PREPARING → ASSIGNED count integrity; employee sees assignment on reload.
- [ ] Live 401, timeout/ambiguous write and recovery from partial PREPARING header.

Published config intentionally remains unmapped; this release does not claim live assignment acceptance.
