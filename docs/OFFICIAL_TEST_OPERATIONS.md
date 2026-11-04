# Isolated Official TEST operations

Scope: `ETM_OFFICIAL_TEST_20261103_01`. This is technical UAT, not an HR rating or real training completion. The owner approved Watchara as employee and Competency Hub Admin as reviewer, and incomplete Level 5 rubric in five competencies for TEST only. Official master publication remains on HOLD.

The dedicated flow is `Competency_Official_TEST_Assignment_API_v1`, ID `d829f46f-7419-4639-b365-061551c26435`. It uses the existing Test263 SharePoint connection; no mail connector. The original Assignment flow is unchanged. The TEST cycle uses ADHOC deliberately: the original generic PILOT path rejects it. Its framework and CU versions remain DRAFT; the framework is inactive. The exact TEST profile is complete with 12 pinned requirements.

The endpoint verifies a real unexpired session, an active ADMIN profile, the exact cycle, employee, actual ManagerEmail reviewer, all reference identities, all rubric content, targets and order. Browser overrides are rejected. Preview performs the same reference reads without writes. Production create returns 501. An existing deterministic assessment key returns 409 and never triggers repair or duplicate creation.

## Failure and recovery

Before creating, keep exports of the framework, profile, cycle, versions and requirements. Local private evidence is under `test-results/executive-private`; signed URLs and session data must never enter reports or git. The owner signs in normally and enters OTP personally. The local control page binds only 127.0.0.1 and keeps tokens in browser memory.

Creation first writes an inactive PREPARING header with blank employee and reviewer emails, then 12 unique item keys. Only an exact readback of every identity and snapshot allows activation and ASSIGNED. Writes have no automatic retries. A timeout can mean a committed write; inspect the producer run, exact header key and item keys before deciding any recovery. Do not create another key, delete partial items, or automatically resume a partial producer. Existing Employee API cannot read a PREPARING header because its employee email is blank. Preserve evidence for owner-led recovery.

For an employee/reviewer save timeout, stop additional mutations and read the same assessment back through the normal authenticated UI or SharePoint. Compare revision, status and stored values before retrying. Do not infer failure from a browser timeout.

## Backout

Turn off only the dedicated TEST flow to stop new requests. Existing TEST assessments remain available to the approved employee/reviewer through the existing lifecycle APIs; endpoint shutdown alone does not hide them. If isolation must be withdrawn, close/deactivate only the exact TEST cycle and assessment after saving recovery evidence, under a concrete owner decision. Never alter older UAT cycles or HR records. Retain partial records rather than claiming an automatic rollback.

Reviewer frontend release is commit `8207d2f`, Azure run `41661353854`. Its rollback reference is `9196cea`; use a reviewed revert and deployment if required. Turning off the new SVP reviewer flow withdraws that endpoint without replacing original Manager/Employee flows.

## Evidence and release gate

The final deployed TEST export matched reviewed actions, triggers and parameters. Power Automate designer reported zero errors and zero warnings. Six invalid-session/override requests against the live endpoint returned expected 401/400/501. Forty-three synthetic cases cover guards, snapshot tampering, concurrency and partial-write recovery; synthetic tests are not live UAT.

Real ADMIN diagnostics returned TEST preview 200, original Assignment preview 200 with pilotCanAssign=False and productionCanAssign=False, SVP Dashboard and Reviewer 403, and existing Manager queue 200. Exact preview returned 12 items with dataset digest `018c035b4305810760a00dedf4968bd85fa97f2fcf5732ba99faa897b4a54bdd`. Create returned 201/ASSIGNED; repeating preview returned 409. A fresh Employee API/UI read confirmed 12 saved synthetic responses, followed by SUBMITTED and read-only controls.

The approved reviewer read and saved all 12 synthetic responses through the hosted Manager workspace, then confirmed the TEST assessment. A fresh employee read returned CONFIRMED. Creating the development plan produced the deterministic `DEV|<assessmentKey>|R1` plan with 12 gap actions in DRAFT; the employee read the same plan with no editing controls. This validates the approved ADMIN reviewer pair, not the SVP-specific endpoint's positive path.

Real SVP assigned-reviewer positive UAT and SVP/DM Dashboard scope UAT remain separate release gates. The owner stated that those account owners cannot sign in; do not repeat that request or substitute a borrowed session. An ADMIN 403 does not establish those positive paths. Do not request executive impersonation or treat a demo as acceptance. Master data stage 462 remains HOLD: 276 ETM candidates reconcile to live references, EEM 102 and ECM 84 lack verified live mappings, one staging target is missing and the owner override file has no decisions. TEST approval does not release those master rows. The missing target is `ECM-STG-011`, Fundamental of Power Plant, proposed profile `ECM_2026_ECM_GENERAL_SR_9_10_R1`.

Power Automate shows a 28-day run-history retention notice. Preserve redacted outcomes, timestamps and run IDs before expiry; keep raw HR exports and signed endpoints private. Production readiness remains blocked until real-role UAT and owner master decisions are complete.
