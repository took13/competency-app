# Gate 3 — Return / Reopen: inspection and first safeguard increment

31 October 2026, Asia/Bangkok. **IN PROGRESS — implementation prepared and offline-tested; NOT LIVE-UAT PASS.**

The original inspection below is retained as dated findings. The continuation described at the end supersedes its export blocker and proposed-contract status.

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

## Original export blocker — resolved by owner-supplied packages

On this inspection, Manager Export → Package (.zip) remained Loading, with no export form or downloadable package after repeated state checks. The designer can be read, but no fresh full definition was obtained. Do not overwrite a live flow with a dated package while current triggers/connections/business graph cannot be compared. No browser security/privacy settings were changed to work around export.

Next concrete step: obtain fresh supported exports for Employee, Manager and Development (same original flow IDs), compare with the archived Gate 2 baselines using the guard, then implement minimal metadata and one state transition at a time. The absence of metadata is an implementation prerequisite, not a request to redesign architecture or grant permissions. Gate 3 remains open; no Return/Reopen endpoint or UI control is advertised as available.

This was the status at the first inspection; the owner subsequently supplied all three exports and removed this prerequisite.

Live notification list readback on 31 October 2026: 9 displayed rows, all SENT, 9 distinct row representations. No Gate 3 writes were made. This count does not assert a fresh unique-column-settings verification.

## Continuation from supplied 31 October exports

Employee `competency-employee_20261031094437.zip`, Manager `competency-manager_20261031094538.zip` and Development `competency-development_20261031094639.zip` were extracted into private working storage. All three differ from Gate 2 prepared definitions only at `metadata.clientLastModifiedTime` and `metadata.connectionKeySavedTimeKey`. Executable actions, triggers and connections match. This also closes the previous Development whole-definition-comparison limitation for that dated baseline. It does not change H's configuration-only limitation.

Implemented source: `tools/build-gate3.cjs` builds candidates from those exports; `app.js` provides backend-advertised controls. No signed URLs are added to source, tests or docs. Private JSON and packages stay outside Git.

### Minimal metadata and mutual exclusion

Added to the existing Assessment Assignment and Development Plan lists through supported List Settings UI, retaining existing inherited permissions:

| Internal name | Type | Settings |
|---|---|---|
| WorkflowLock | Single line of text, 255 | Optional, not unique, empty default, not added to default view |
| TransitionHistory | Multiple lines of text | Optional, plain text, append changes disabled, not added to default view; JSON array |

List Settings read back both columns on both lists. No existing item data or status choice was edited. No Action-list schema is changed.

All assessment and existing-plan mutations acquire an ETag-conditional lock on their parent through the **existing SharePoint connection**, after original session/profile/role/scope checks. GET supplies the actual server ETag; MERGE uses that exact If-Match, never `*`, and disables connector retry. Conflicts/ambiguous claims return a sanitized 409. The lock guard checks latest status and Revision against the authorized header read. A held lock rejects another mutation; there is no automatic expiry/unlock. This uses SharePoint's documented [ETag / If-Match behavior](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/working-with-lists-and-list-items-with-rest) and the existing [SharePoint HTTP request operation](https://learn.microsoft.com/en-gb/connectors/sharepointonline/). No new connection, identity, permission or resource is introduced. Trigger concurrency settings remain unchanged.

Expected business validation failures release their owned lock before responding. Successful business paths release before the original success response; notification groups remain after that response. An unexpected connector failure may intentionally leave a lock for support reconciliation. This is recoverable mutual exclusion, not a multi-record SharePoint transaction. Read responses can be transient during a mutation; mutation readback and the server lock remain authoritative.

### New contracts and preserved history

| API/action | Request beyond sessionToken | Success |
|---|---|---|
| Manager / return_assessment | assessmentKey, reason, expectedRevision | 200, same key, RETURNED, revision + 1 |
| Development / return_development_plan | planKey, reason, expectedRevision | 200, same key, DRAFT, revision + 1 |
| Development / reopen_development_action | planKey, actionKey, reason, expectedRevision | 200, same keys, PLANNED action, parent status, revision + 1 |

Reason is trimmed and required, 1–2000 characters (400 on missing/blank/too long). Current revision and allowed source state are required (409). Original server authorization denies employee writes and out-of-scope managers. The new actions do not accept caller identity, recipient or authorization scope from the client.

Assessment Return accepts SUBMITTED only. It preserves a snapshot of self evidence/levels and manager decisions/comments in TransitionHistory and updates the same header to RETURNED. Employee save and submit accept RETURNED, retain existing completeness guards, and resubmit records a transition. Manager item saves stamp the current header Revision. At Revision > 1, only items reviewed in that round count toward confirmation; old numeric decisions remain stored and in the Return snapshot. The frontend preserves their previous value internally and requires a fresh review. CONFIRMED assessment reopening is excluded because dependent development snapshots require a separate contract.

Plan Return accepts IN_PROGRESS only and changes the same plan to DRAFT. Completed actions remain completed and cannot be edited through ordinary save. Starting a corrected plan accepts valid completed actions alongside planned ones. Reopen accepts a COMPLETED action in its authorized plan: persist ACTION_REOPEN_REQUESTED with old action content/completion and old parent completion, change the action to PLANNED, then commit ACTION_REOPENED and parent Revision. A COMPLETED parent returns to IN_PROGRESS; DRAFT/IN_PROGRESS parents retain that state. Previous CompletedAt is retained while reopened, and history preserves it when recompletion writes a new timestamp. Repeated completion of an already-completed action returns 409.

Reads advertise `gate3Ready: true`, numeric `revision` and parsed `transitionHistory`. Older revision-1 clients can retain existing payloads. After Return/Reopen, writes require expectedRevision; a stale old client fails closed. New UI sends expectedRevision only after the server advertises the new contract. New controls are absent in Demo and in Employee development views. Ordinary existing API names and response semantics remain intact with additive read fields.

History capacity is bounded at 50,000 characters before appending; capacity exhaustion returns 409 for support review, without dropping prior history. No tokens, OTPs or signed endpoints are recorded. This is Gate 3 transition metadata, not Gate 4's generic audit ledger.

### Notification decision

Gate 2 notification actions, subjects, recipients, claim/send dependencies, retry policies and EventKeys are structurally unchanged. Return/Reopen sends no new mail. Resubmit/restart/recomplete reuse prior reservations and therefore do **not** promise another message for an already-reserved event. This is deliberate scope preservation; repeated-event notifications need a separately agreed revision-aware event policy. Ordinary save/read/409 paths do not add mail events.

### New tests and their limits

`verify-gate3-flows.cjs <private-export-directory>` builds and executes actual generated candidate graphs in the small fixture interpreter `tools/flow-fixture-runtime.cjs`. It checks graph references, sibling dependencies, maximum nesting, unchanged authorization/connections/notification groups, missing reason, role/scope denials, stale/duplicate transitions, Return/edit/resubmit/fresh-review/confirm, concurrent ETag claims, plan Return, completed-action preservation, Reopen/recomplete, existing reservation suppression and a failed final parent update that retains a durable intent and lock. Passed.

`verify-gate3-ui.cjs <private-export-directory>` runs Chrome against the same generated graphs with in-memory connectors. It tests reason entry and escaping, employee returned editing/resubmit, revision payloads, required fresh manager review, Return/Reopen controls, protected completed actions, employee read-only development and 320/390/768/1440 widths. Passed.

The fixture interpreter is not Microsoft's engine and does not prove connector-schema acceptance, real ETag headers, import success, delivered HTTP, real SharePoint outcomes or mailbox/log behavior. Those remain live acceptance items. All seven existing browser suites passed after the UI change; demo remains isolated.

### Support recovery procedure

If WorkflowLock is nonempty after an ambiguous timeout/error: stop mutations for that record, inspect the named producer run and actual HTTP response separately, and establish that the run is no longer active. Read the header, related items/actions and TransitionHistory before clearing anything. For ACTION_REOPEN_REQUESTED without ACTION_REOPENED, compare the persisted previous action/parent state with the actual action write and failed parent step. Finish/reconcile the intended parent state and history deliberately, or restore from the preserved before state according to the support decision. Only then clear the exact affected lock. Never clear a running operation, bulk-clear locks, blindly retry a write, delete history or resend mail without checking the existing EventKey and mailbox. Retain recovery evidence. No automated privileged recovery endpoint is added.

## Current deployment checkpoint

**Metadata added; candidate flows and frontend NOT deployed. Gate 3 remains OPEN.**

The supported My flows → Import → Import Package (Legacy) route remained Loading. The existing v3=false presentation route and reload also remained Loading. The owner tried opening Legacy Import manually and reported the same result. No Upload control became available; no candidate package was uploaded or imported, and no original flow was stopped, replaced, enabled/disabled or saved. Browser security/privacy settings, owners, connections and permissions were not altered. The additive empty metadata columns are the only live change in this continuation.

Private import packages are prepared from the supplied originals with only definition.json replaced. Original manifests still specify Update and existing connections. When Legacy Import works, import Employee, Manager and Development as **Update to their existing original IDs**, retain the existing service-account SharePoint/Outlook connections, run Flow checker and inspect actual deployed definitions before use. Do not choose Create new. Keep the original supplied exports as rollback packages; leave additive columns/history in place on rollback rather than deleting evidence. No push to main or hosting deployment has been performed.

Next required external change: the Legacy Import page must reach its Upload form. After import/checker verification, prepare a fresh isolated synthetic Gate 3 cycle, obtain fresh user-operated Employee/Reviewer sign-ins, and collect actual HTTP plus business-state and unchanged/intentional notification evidence. Do not use Gate 2 assessment 7 / plan 4 for mutation. The live acceptance matrix above remains pending in full.

