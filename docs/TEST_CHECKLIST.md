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

## Hosting deployment acceptance

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
