# Gate 3 — Return / Reopen: inspection and first safeguard increment

31 October 2026, Asia/Bangkok. **IN PROGRESS — NOT IMPLEMENTED / NOT LIVE-UAT PASS.**

## Authoritative inputs and inspected baseline

Read the complete supplied Master Context (`Pasted text(3).txt`) and the relevant Gate 2 evidence in `result_00402.txt`. Retrieved the final repository Gate 2 report independently. Gate 1 and Gate 2 remain historical PASS; Gate 2 H remains configuration-only, not induced connector failure evidence.

Repository `took13/competency-app`: fetched main and `codex/management-demo-release`. The latter is `abf93a5`, one documentation commit ahead of main `52dc4c5`. Original `competency-ui-v2` checkout was located and its status was clean. Work is prepared in a separate local checkout on `codex/gate3-return-reopen`, based on `abf93a5`; nothing is pushed or deployed.

Live portal inspection: Assessment v2, Employee v1, Manager v1 and Development v1 were Enabled. Manager details showed owner gpscrpauser-GPSC, On, modified 30 October 2026 13:21. Manager designer `Action Valid` still accepts only get_my_reviews, get_review_assessment, save_manager_review and confirm_assessment. Designer was exited without Save. These observations do not establish whole-definition equality.

Archived Gate 2 notification v2 packages were read offline. Assignment/Employee/Manager deployed exports from 30 October exist in the previous workspace. Development still has the report's full-export verification limitation. These are dated evidence, not fresh exports.

## Findings that determine the implementation

| Area | Evidence | Required treatment |
|---|---|---|
| Employee save | `Is_Save_Self_Assessment/Assessment_Editable`: ASSIGNED or IN_PROGRESS | Add RETURNED only after backend transition and metadata readback exist. Frontend alone cannot enable this. |
| Employee submit | `Is_Submit_Assessment/Assessment_Submittable`: IN_PROGRESS only | Explicitly permit resubmit from RETURNED, retain completeness checks. Save currently changes header only from ASSIGNED. |
| Manager authorization | `Caller_Authorized`, `Review_Access_Allowed`: role plus reviewer/ADMIN | Reuse exactly; never accept caller email or scope from request. |
| Manager save/confirm | `Review_Editable`, `Review_Confirmable`: SUBMITTED only | Keep these state boundaries. Previous ValidatedLevel values must not silently count as reviewed after employee changes. |
| Assessment Revision | Save/submit/confirm copy existing Revision | It is not currently an optimistic concurrency mechanism. A check followed by unconstrained PatchItem cannot prove stale-write rejection. |
| Assignment schema | Live List Settings: Revision exists; no return reason or transition history column | Add minimal, explicit metadata after fresh baseline inspection; do not repurpose SelfEvidence/ManagerComment. RETURNED is already an allowed Status choice. |
| Development save/start | `Development_Plan_Editable`, `Development_Plan_Startable`: DRAFT only | Return plan for correction must retain reviewer/ADMIN ownership; employees stay read-only. |
| Development completion | Complete action and plan write CompletedAt using utcNow | Reopen/recomplete must preserve prior completion before any overwrite; current timestamp alone is insufficient history. |
| Development schemas | Live plan has Revision, StartedAt, CompletedAt; action also has ManagerNote/EmployeeNote | No dedicated transition-history field observed. Notes must not be silently converted into an opaque ledger. |
| Notification identity | Gate 2 EventKey = event + numeric record ID + recipient | Resubmit/recomplete will reuse existing reservations. Preserve Gate 2 keys until a deliberate repeat-event policy is implemented and tested. No Return email is introduced in this increment. |
| Development nesting | Gate 2 reports depth 8 | Avoid appending extra nested conditions to the deepest branch. Preserve business responses and isolated notification dependencies. |

## Proposed incremental execution contract — not deployed

1. Assessment: SUBMITTED → RETURNED → employee save/resubmit → SUBMITTED → fresh manager review → CONFIRMED. Return requires nonblank reason, authenticated reviewer/ADMIN, current expected state/version, and a durable transition record containing server actor/time, old/new state and reason. Preserve SelfLevel, SelfEvidence, snapshots and previous manager decisions. Reject duplicate/stale Return predictably. Do not reopen CONFIRMED assessments in the first increment; this would require handling dependent development snapshots.
2. Development plan: controlled IN_PROGRESS → DRAFT for reviewer correction with reason; retain completed actions and completion events. Do not grant employees mutation rights. A completed plan is not silently returned to DRAFT.
3. Development action: COMPLETED → PLANNED with reason, prior completion preserved, and a consistent parent plan transition if it was COMPLETED. Parent/action writes are separate SharePoint operations: define recoverable intermediate handling before activation, not an unsupported claim of transactionality.
4. Decide explicitly whether repeat SUBMITTED/STARTED/COMPLETED events should notify. Default for this first safeguard increment is unchanged Gate 2 behavior and no new sends. Do not claim a repeat notification was delivered under an existing reserved EventKey.

API action names and new SharePoint internal field names are not established contracts yet. Final payloads and metadata mapping must be documented from implementation/readback, not guessed from this proposal. Minimal transition metadata belongs to Gate 3; a generic audit platform remains Gate 4.

## Implemented safeguard

`tools/check-flow-change.cjs` compares complete exported JSON structurally. It includes triggers, connections, authorization, response dependencies, notification claim/send/retry properties and metadata. By default any drift fails. A reviewed change manifest must contain every exact changed JSON pointer, operation and before/after SHA-256 fingerprint; wildcard paths, changed contents under an approved path, unused entries and duplicate entries do not pass. Output contains paths/hashes only, never field values or credentials. This is an offline review guard, not deployment approval or proof of business correctness. Review the manifest independently; generating a manifest from a candidate is not evidence that the candidate is safe.

Usage after extracting supported exports into private working storage:

```text
node tools/check-flow-change.cjs before-definition.json candidate-definition.json exact-reviewed-changes.json
node verify-flow-change.cjs
```

Keep raw packages and exports outside tracked/public artifacts. They contain internal configuration. This increment changes no frontend, API, permission, schema, business record, notification or hosting workflow.

## Validation completed

All existing suites passed against mocked APIs: verify.cjs, verify-ux.cjs, verify-manager.cjs, verify-development.cjs, verify-assignment.cjs, verify-dashboard.cjs and verify-session.cjs. These cover the prior UI lifecycle, role boundaries, employee self-only development, assignment guards, session expiry, sanitized failures, readback and demo isolation. No OTP was sent and no live assessment/development business mutation was made by these tests.

New verify-flow-change.cjs passed mutation tests for widened authorization, changed trigger, replaced connection, deleted notification group, client-controlled recipient, changed retry/claim dependency, changed HTTP response, exact change fingerprints and safe output. Baseline self-comparison passed; this only validates the comparison path, not fresh deployed equality. `git diff --check` passed.

## Live acceptance matrix — all pending

| Test | Expected evidence |
|---|---|
| Return valid submitted assessment | Actual client HTTP status/body, RETURNED header, preserved levels/evidence, reason/actor/time/history readback |
| Missing/whitespace reason | Rejected before writes; unchanged header/items/history/log |
| Employee or out-of-scope manager Return | Denied server-side; unchanged data/log |
| Duplicate Return and stale browser | Predictable conflict; one transition only; no duplicate mail |
| Employee edit/resubmit | Reason visible; own data only; saved evidence retained; completeness enforced; SUBMITTED readback |
| Manager re-review/confirm | Fresh review required after changed self data; no overwrite of SelfLevel; CONFIRMED readback |
| Return plan | Reviewer/ADMIN only; reason preserved; completed actions not erased; employee remains read-only |
| Reopen completed action | Prior completion retained; action/parent coherent; partial failure recoverable |
| Recomplete | Prior event retained; consistent counts/parent; deliberate notification policy |
| Regression | Fresh isolated synthetic cycle; previous Gate 1–2 records untouched; ordinary saves/reads/conflicts do not notify |

For each live test record caller identity, actual HTTP code/body semantics, authoritative backend state, notification/log outcome, failure/fix/retest separately. Flow Succeeded alone is insufficient. Do not use prior Gate 2 completed assessment ID 7 / plan ID 4 as mutable Gate 3 fixtures.

## Blocking prerequisite for backend changes

On this inspection, Manager Export → Package (.zip) remained Loading, with no export form or downloadable package after repeated state checks. The designer can be read, but no fresh full definition was obtained. Do not overwrite a live flow with a dated package while current triggers/connections/business graph cannot be compared. No browser security/privacy settings were changed to work around export.

Next concrete step: obtain fresh supported exports for Employee, Manager and Development (same original flow IDs), compare with the archived Gate 2 baselines using the guard, then implement minimal metadata and one state transition at a time. The absence of metadata is an implementation prerequisite, not a request to redesign architecture or grant permissions. Gate 3 remains open; no Return/Reopen endpoint or UI control is advertised as available.

Live notification list readback on 31 October 2026: 9 displayed rows, all SENT, 9 distinct row representations. No Gate 3 writes were made. This count does not assert a fresh unique-column-settings verification.

