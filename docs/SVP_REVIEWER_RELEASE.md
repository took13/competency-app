# Reviewer release checkpoint — 3 November 2026, Asia/Bangkok

Update from the continuing Work run: owner approved the exact new Reviewer
access scope at action time. Imported as NEW flow
`43c50339-b39e-488f-9585-a1f9342b17f0`, now On. Microsoft designer checker:
0 errors / 0 warnings. Downloaded export structurally matches the reviewed
actions, triggers, parameters and connection references; only platform metadata
timestamps changed. The downloaded definition itself passes all 48 synthetic
security cases. Seven live negative probes pass (five invalid-session actions
401; client role spoof and forbidden Official action 400), returning no employee
data. Frontend publication/readback and valid-account UAT are tracked separately.

Owner states executive Surajit cannot participate in login UAT. Do not request
his OTP, impersonate him or count sample/fixture tests as executive acceptance.
Any substitute SVP test account requires explicit owner access approval.

The historical preparation checkpoint below records the baseline and controls.

Fresh production Manager export downloaded at 21:40: `Reviewer-ReadOnly-Manager-Baseline-20261103_20261103143959.zip`. Its definition and connection references exactly match the earlier private Manager baseline. Portal: Manager On, modified 2 November 11:32; Executive Dashboard On, modified 3 November 21:12. Dashboard successful run status is not proof of SVP/DM authorization acceptance.

Fixed a packaging defect: candidate previously retained the Manager identity. Candidate now has separate resource identity `6809b41c-b36b-4a54-b4f6-e97624798823`; package manifest requires New. This is an offline package identity; the imported flow may receive a different id. Existing Manager, Assignment, Development, Auth, Official Creation and old UAT are untouched.

Private ignored artifacts under `test-results/executive-private/`: `Manager-fresh.json`, `SVP-Reviewer-candidate.json`, `SVP-Reviewer-NEW-20261103.zip`, `reviewer-readiness.json`, `reviewer-release/` (frontend with blank endpoint template). Never publish raw exports or production config. The staged template is not a production config replacement: deployment must retain existing authorized settings and add only the approved reviewer endpoint. Do not publish the demo-only template to production.

## Security boundary

HTTP trigger inherits `triggerAuthenticationType=All`; this is NOT proof of Entra-authenticated HTTP caller. Application identity comes from the supplied sessionToken looked up server-side: exactly one VERIFIED unexpired session, then exactly one ACTIVE/IsActive profile with AppRole SVP. Email is taken from that session, never browser role/email claims. Live session issuance and authenticated account binding still require acceptance through normal login; no manufactured sessions or OTP bypass.

Every assessment read/write requires exactly one header, IsActive=true and a nonblank ReviewerEmail equal to authenticated session email after trim/lowercase. Nonreviewer/unassigned returns 403; missing/duplicate header returns 404 with no mutation or notification. Queue returns assigned submitted headers only. Missing assignment never grants fallback MANAGER/ADMIN scope. The new endpoint permits all active SVP accounts only within their exact assignments; it is not hardcoded to Surajit. Manager/ADMIN cannot enter this endpoint and retain their existing endpoint scopes.

Only five actions: get_my_reviews, get_review_assessment, save_manager_review, confirm_assessment, return_assessment. Confirm/return retain baseline locks, revisions, audit and notification behavior. No assignment creation, development-plan management, administration or Official import. Candidate credential-pattern check found no embedded bearer/password/signature pattern; connector references are identifiers, connections must be selected by the owner at import. Keep signed callback URLs and session tokens out of reports and source control.

Validation: 48 backend synthetic cases plus separate reviewer UI checks. Includes missing/duplicate/unassigned assessment on all four direct actions, nonreviewer 403 without writes/mail, existing spoofing/session/profile/role tests. Microsoft import validation, Flow checker and real-account tests are pending.

## Next controlled action and approval boundary

Before ANY import, enablement or publication, obtain action-time confirmation for NEW `Competency_SVP_Assigned_Reviewer_API_v1` in Glow Company Limited default environment, using existing Test263 SharePoint and Outlook connections. Explain that Surajit Bourtherng (AppRole SVP), authenticated by normal login, will gain access to employee evidence and assessment items ONLY when ReviewerEmail matches his verified session email; he can save validated levels/comments, confirm and return those assessments, producing existing audit/notifications. Other SVP accounts have the same assignment-bound rule. No blanket MANAGER/ADMIN grant. Verify Surajit's actual profile email without guessing. A signed endpoint URL does not exist yet; after approved creation, record its flow id privately and verify it before configuring reviewerApiUrl. Never include its signature in approval text.

After approval: use Create as new exclusively, select existing owner connections, check Microsoft import/Flow checker, export newly created flow and compare definition to candidate allowing only platform-generated metadata/connection binding differences. If any guard, trigger, action or scope differs, keep disabled and stop. Do not update an existing business flow. Publish reviewed frontend only with the approved separate endpoint and preserved current config; record deployed commit/asset hashes and read them back.

## UAT and backout

1. Owner selects a separately authorized disposable UAT assessment/cycle; never repurpose old UAT or official records. If none exists, UAT is blocked pending an explicit authorized test setup. Sign in normally with actual accounts.
2. Surajit assigned: queue/read show only assigned records. Unassigned SVP and direct nonreviewer requests: 403, no response data, no changes or mail. Missing/blank assignment fails closed. Expired/invalid session: 401. DM/ADMIN denied on reviewer endpoint; their existing allowed/denied Manager cases remain correct.
3. Only on the authorized disposable assessment: save/readback, stale revision, return/resubmit and confirm; verify lock release, revision/audit and expected notification deduplication. Do not send test evidence or actual employee content into external logs. Owner approves any new test data and notification recipients first.
4. Dashboard real SVP sees authorized ETM/EEM/ECM; real DM sees own discipline only. Compare read-only totals with owner-selected source counts. Role-play is not acceptance.
5. Backout on any scope leak, unexpected mutation/mail, checker failure or readback mismatch: turn OFF only the new Reviewer flow, remove reviewerApiUrl and restore the recorded previous frontend release; verify dashboard-only SVP and existing DM/ADMIN paths. Disabling frontend alone is insufficient because the endpoint remains callable. Preserve audit; do not delete/rewrite business rows. Backout cannot undo completed reviews or sent mail: reconcile affected records with owner authorization separately.

Gate5 remains HOLD: no official import, no old UAT changes. Offline live-key reconciliation is deferred until Microsoft validation and real-account binding blockers are resolved; do not label Reviewer fully ready while those remain.
