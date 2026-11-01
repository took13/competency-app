# Gate 3 — Return / Reopen: inspection and first safeguard increment

1 November 2026, Asia/Bangkok. **Core live lifecycle/safeguard acceptance PASS. All three post-import definitions compared. Ready for code review; hosted frontend unchanged.**

The current acceptance table and latest continuation below supersede dated preparation/import checkpoints. Raw exported packages stay private. No merge or hosting deployment is implied by this report.

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

## Current acceptance matrix — 1 November 2026

| Test | Evidence and result |
|---|---|
| Assessment Return/edit/resubmit | PASS: actual Return HTTP 200; SharePoint RETURNED Revision 2; 12 prior snapshots including saved review; employee corrected evidence and resubmitted; three durable events. |
| Fresh manager review/confirm | PASS: old review counted 0/12; new round required 12/12; final SharePoint CONFIRMED Revision 2, empty lock. |
| Plan Return | PASS: IN_PROGRESS to DRAFT; completed action and completion timestamp preserved; only incomplete action editable; reason/actor/time/action snapshots read back. |
| Action Reopen/recomplete | PASS: COMPLETED to PLANNED, completed parent to IN_PROGRESS; actual Reopen HTTP 200; durable intent before action write; old action/parent completion retained; recompletion coherent. Final plan COMPLETED Revision 6, empty lock. |
| Real concurrent requests | PASS: two simultaneous Return calls produced one HTTP 200 and one HTTP 409 claim failure; Revision 5 to 6, exactly one history event; identical action hashes before/after. |
| Employee mutation denials | PASS: actual HTTP 403 for assessment Return, plan Return and action Reopen; full read-response hashes unchanged. |
| Reasons/state/stale/duplicate | PASS: eight Manager actual HTTP 400/409 cases; full read-response hashes unchanged. Duplicate-completion live case was rejected at the completed-parent boundary; same-parent duplicate guard also tested offline. |
| Reviewer scope | Actual out-of-scope read denied; same unchanged shared scope guard structurally verified. Out-of-scope transition denial itself tested in generated-graph fixtures, not separately induced against an old live record. |
| UI failure/fix/retest | Reproduced false failure when backend content-ready count included preserved completed action. Corrected UI count only; generated-graph test failed before/passed after; live fresh-page save and restart with mixed states passed. |
| Confirmed-plan reentry | PASS: fresh page opens existing authorized assessment via original read contract, then resumes existing plan. Denied scope clears selection; no added API or role. |
| Notification regression | PASS reservation/log evidence: Gate 3 9 distinct SENT keys with no repeat-event duplicates; Gate 2 original 9 keys/source run IDs/SENT states unchanged. Independent mailbox delivery not rechecked. |
| Partial connector failure/recovery | Generated-graph failure fixture retains durable intent and lock; recovery SOP documented. No destructive live connector-failure injection or automatic lock clearing. |
| Post-import full definition | PASS all three. Employee and Manager differ only at 2 export timestamps each. Development has 188 narrowly reviewed representation changes, no executable drift. Original IDs/connections retained; checker 0/0 and On. |

Only synthetic Gate 3 assignment ID 8 / plan ID 5 were mutated. Gate 1 and Gate 2 historical PASS and Gate 2 H's configuration-only limitation are retained. Gate 1/2 business records were read only.

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

## Previous deployment checkpoint — before Import recovered

**Metadata added; candidate flows and frontend NOT deployed. Gate 3 remains OPEN.**

The supported My flows → Import → Import Package (Legacy) route remained Loading. The existing v3=false presentation route and reload also remained Loading. The owner tried opening Legacy Import manually and reported the same result. No Upload control became available; no candidate package was uploaded or imported, and no original flow was stopped, replaced, enabled/disabled or saved. Browser security/privacy settings, owners, connections and permissions were not altered. The additive empty metadata columns are the only live change in this continuation.

Private import packages are prepared from the supplied originals with only definition.json replaced. Original manifests still specify Update and existing connections. When Legacy Import works, import Employee, Manager and Development as **Update to their existing original IDs**, retain the existing service-account SharePoint/Outlook connections, run Flow checker and inspect actual deployed definitions before use. Do not choose Create new. Keep the original supplied exports as rollback packages; leave additive columns/history in place on rollback rather than deleting evidence. No push to main or hosting deployment has been performed.

Next required external change: the Legacy Import page must reach its Upload form. After import/checker verification, prepare a fresh isolated synthetic Gate 3 cycle, obtain fresh user-operated Employee/Reviewer sign-ins, and collect actual HTTP plus business-state and unchanged/intentional notification evidence. Do not use Gate 2 assessment 7 / plan 4 for mutation. The live acceptance matrix above remains pending in full.

## Current deployment checkpoint — Employee imported

31 October 2026 continuation: Legacy Import recovered. Employee-Gate3.zip was uploaded, matched as **Update to original Employee flow 004f1bb4-7c5e-49ec-9571-23f7495779c9**, and imported successfully. Existing gpscrpauser service-account SharePoint and Outlook connections were selected; no new connection or permission was created. Portal success linked the original flow ID. Designer Flow checker displayed **Errors (0), Warnings (0), No errors found**. Import left the flow Off; it was enabled and Details read back **On**. No additional designer Save was used.

Actual waiting HTTP client test after enabling Employee: `get_my_assignments` with an intentionally invalid synthetic session returned **401**, `success: false`, and the expected Invalid session message, observed 2026-10-31T10:28:00.785Z (17:28 Asia/Bangkok). This tests the live session-denial/read route only, not successful authenticated reads, writes, locks or Return/resubmit. Evidence: gate3-employee-invalid-session-http.json, gate3-employee-import-success.png and gate3-employee-flow-checker.png in the chat output directory. No business record or notification was mutated by that request.

**Manager and Development remain NOT imported; frontend remains NOT deployed; Gate 3 remains OPEN.** The latest continuation opened the Manager upload file chooser in `work/candidate-packages`, where Manager-Gate3.zip is present. Browser file-chooser control did not supply a usable chooser handle. Native Windows selection worked for Employee earlier, but the current Open dialog became unresponsive to automation: accessibility set-value timed out, and refreshed window binding still reported Accessibility state unavailable. Manager upload has not been observed to start, and Import has not been clicked for it. A manual file selection is required to reach the review page; stop before Import so Update target and original connections can be checked by the agent.

Remaining sequence: select Manager-Gate3.zip → verify original Manager Update target/connections → import/checker/On; then the same for Development. Verify deployed definitions as available, then create an isolated synthetic Gate 3 cycle and collect authenticated HTTP/state/notification acceptance. Do not mutate the completed Gate 2 records. No push or hosting deployment has occurred.


## Latest deployment checkpoint — all three imported

31 October 2026: Manager and Development were subsequently imported successfully as Update to original IDs dabcc3a1-c892-4a60-b368-3b72f57dfc3e and 107de60a-71a1-4392-801c-5fe3066f8441. Existing service-account SharePoint/Outlook connections were retained. Both designer Flow checkers displayed Errors (0), Warnings (0). All three updated flows read back On. Prior checkpoint blockers above are historical. No new connection, owner or permission was created. Hosted frontend is unchanged.

Actual HTTP negative probes of Manager return_assessment and Development reopen_development_action each returned 401, success false, Invalid session at 2026-10-31T16:46:39.998Z using an intentionally invalid synthetic session. These prove live action routing/session rejection only, not successful transitions or lock behavior. No business mutation occurred.

Fresh cycle UAT_GATE3_20261031_01 was created and read back as PILOT, DRAFT and active, with explicit synthetic-only notes. The local preview exposes only this cycle for assignment; repository configuration and hosting were not changed. Manager sign-in is awaiting user-operated OTP. Employee sign-in, authenticated lifecycle/negative/concurrency checks, actual SharePoint readback, notifications and deployed-definition export comparison remain pending. Gate 3 remains OPEN. Gate 2 assessment 7 / plan 4 were not mutated.

## Authenticated assessment acceptance — continuation into 1 November

The owner completed separate Manager and Employee OTP sign-ins. Fresh Gate 3 assignment was created successfully with 12 items, Assessment ID 8, key PILOT|UAT_GATE3_20261031_01|watchara.p@gpscgroup.com|R1. Employee saved all 12 synthetic ratings/evidence and submitted. Reviewer saved one synthetic round-1 decision. Empty Return reason was rejected by the UI before sending. Return with a synthetic reason succeeded; the actual G3 Return Response producer outputs show HTTP 200, success true, RETURNED, revision 2, and the connected client displayed success. SharePoint readback independently confirms RETURNED, Revision 2 and empty WorkflowLock. TransitionHistory contains the initial ASSESSMENT_SUBMITTED and ASSESSMENT_RETURNED with all 12 prior item snapshots, including item 1 self level 3, prior evidence, validated level 3 and item revision 1.

Employee refreshed, edited only item 1 evidence in RETURNED, saved and resubmitted successfully. SharePoint readback confirms SUBMITTED at Revision 2. Manager sees corrected evidence and 0/12 reviewed, with confirmation disabled: the old saved decision is retained but does not satisfy the new round. Fresh review is in progress. Notification Log visible rows for this assessment show exactly one ASSIGNED and one SUBMITTED reservation, both SENT; no Return/resubmit row is added. SENT is not independent mailbox-delivery proof. Gate 2 row remains CONFIRMED, Revision 1.

Local UI correction: when a cycle has no cycleName, display its cycleKey instead of an indistinguishable generic title. This permits unambiguous selection of the isolated UAT cycle. All seven existing browser suites and the generated-graph Gate 3 browser suite passed after this one-line change. Hosted frontend remains unchanged. Evidence JSON and PNG files are in the chat outputs. Plan acceptance, remaining authenticated negatives/concurrency and deployed-definition comparison are still pending; Gate 3 remains OPEN.

## Latest continuation — completed core acceptance, 1 November 2026

Final API and SharePoint readback: assessment CONFIRMED Revision 2 (12 items); plan COMPLETED Revision 6 (2 completed actions), WorkflowLock empty, 7 plan transition-history entries. Original first action completion 2026-10-31T17:06:24Z remains in the first Reopen intent; final first-action completion is 2026-10-31T17:29:03Z. Both earlier parent completion values remain in Reopen intents. No history was deleted or rewritten to hide a test result.

The count mismatch was an application validation defect, not a failed backend save or a connector outage: producer save outputs were HTTP 200 with plannedActionCount 2 for one PLANNED plus one COMPLETED action; release succeeded and corrected content read back. UI now counts nonempty planning content for save/start and COMPLETED status for completion. Added tests reproduce the failure and cover both corrected save and restart. The fixed frontend was freshly loaded and live retested successfully before final acceptance. The earlier signed-in tab's cached pre-fix behavior was recorded separately; no blind write retry or lock reset was used.

Open existing assessment permits authorized confirmed-plan reentry using get_review_assessment, with response identity checks, shared server reviewer/ADMIN scope, session guards and no automatic create. The existing evidenced duplicate-plan response resumes the existing plan. This navigation addition changes no queue scope or permission.

The local, non-deployed acceptance harness ran 11 denial cases through actual waiting HTTP clients using user-operated existing sessions. It targets only the isolated Gate 3 keys, never displays/exports session tokens, has no automatic retries, and stops on unexpected outcomes. Read-response SHA-256 hashes were equal before and after each role's suite. A separate controlled concurrent Return test produced one winner/one 409, one revision/history increment and unchanged action hashes. Harness files remain outside the repository and hosting package.

Post-import Development export downloaded through the supported portal and was compared privately. The raw exact guard first flagged 188 differences. Each was reviewed as one of 48 added empty runAfter objects, 125 designer operationMetadataId identifiers, 13 removed empty else branches or 2 export timestamps; no executable/authorization/connection/trigger/notification difference remains. tools/check-deployed-flow.cjs checks those exact shapes and then passes their exact fingerprints to the original strict guard. Its mutation tests reject changed recipient/dependency/connection/trigger, unknown metadata and removed executable branches; the original strict guard is not weakened. Employee/Manager Export remains Loading across normal/legacy presentation and reload; the portal logged generic PromiseRejectionEvent errors. Their full post-import comparisons were kept explicit prerequisites until supported Export recovered, as recorded below; PASS was not inferred from import/checker/run success.

Validation: seven original browser suites passed after the cycle-name fallback; affected Manager/Development/session/general suites passed after subsequent changes; generated-graph Gate 3 UI suite (including reentry, denied scope, mixed-state save/restart) passed; deployed-comparison mutation suite, original flow guard, syntax and diff checks passed. Source packages, signed URLs, credentials and OTPs are excluded from the repository and public artifacts. Existing architecture, permissions, original connections, triggers and Gate 2 notification logic are retained.

## Final export verification — blocker resolved

The portal subsequently recovered for Manager and Employee without browser security, connection, owner or permission changes. Supported post-import packages Manager-Gate3-deployed-20261101 and Employee-Gate3-deployed-20261101 were downloaded and extracted privately. Both compare to their candidates with only clientLastModifiedTime and connectionKeySavedTimeKey timestamp changes. All three whole-definition comparisons now PASS, with no executable/authorization/trigger/connection/notification drift. Prior Loading screenshots and notes are historical. The checkpoint has no remaining technical blocker.

The local branch and review patch contain code, offline tests and documentation only. Raw source/deployed packages and sessions remain excluded. The existing hosting workflow deploys main pushes and main-targeted pull requests; review should use the original handover branch codex/management-demo-release as base to avoid an incidental hosting deployment. Merge/hosting rollout is a separate reviewed step. Older clients cannot mutate returned/reopened revisions without expectedRevision; deploy the tested frontend before normal users operate those records. Gate 1–2 revision-1 contracts remain compatible.

Run node verify-deployed-flow.cjs for comparator mutation checks and node tools/check-deployed-flow.cjs <candidate.json> <private-deployed.json> <safe-report.json> for the exact post-import review. The raw check-flow-change.cjs still rejects every unapproved difference.
