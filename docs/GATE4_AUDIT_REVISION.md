# Gate 4 — Audit / Revision

Updated 02/11/2026, 00:01:42 Asia/Bangkok. **Functional backend and controlled live UAT PASS; overall Gate 4 BLOCKED pending hosted UI release approval and verification.**

## Baseline evidence

Authoritative inputs: Master Context, supplied Gate 2 evidence and latest Gate 3 Work report attached to ChatGPT conversation `6ae5b45e-f738-83ec-b698-1010310b7388`. Read the attachments themselves, not only the assistant's summary. Gate 3 production merge is `a768f94396c6f6376e9e52a3447c1adc1294127e`; independently fetched main still points there. Gate 3 rollout documentation exists separately at `ed3faae` / draft PR 2.

Fresh supported portal exports of Employee, Manager and Development on 1 November compare structurally identical to the Gate 3 deployed exports, including triggers, connections, actions and metadata. SHA-256 canonical definition hashes:

| Flow | Hash |
|---|---|
| Employee | `9ff5ed540b12d01e729ea352e8c014ec5517d586af1b6802e4945c85cdfa3e29` |
| Manager | `4f6f2028f2399d57253b27fc398b6599ac60b6c3ebc8a1b68384f52bb90f88a3` |
| Development | `a1bf4d8085ab47b17447787edb3ee12b4ce0433639dc694e4c77a0d114e5c7a8` |

Portal shows the four current Assessment v2 / Employee / Manager / Development flows Enabled. Development details show On and modified 31 October 2026 23:45; Manager modified 23:36, as displayed by the portal. These observations do not prove new candidate deployment. Existing hosted Employee and Manager sessions were verified visually; Employee readback of the isolated Gate 3 fixture remains CONFIRMED with 12/12 items. No Gate 1–3 business data was mutated during inspection.

Inspected live Assessment Assignment, Development Plan and Development Action settings: native version history enabled, 50 versions retained. Headers already contain WorkflowLock and TransitionHistory. Native Modified By identifies the SharePoint connection identity for backend writes; the business actor must come from the authenticated app session. Power Automate's portal exposes 28-day run history. Neither native version retention nor run history alone establishes a permanent application audit ledger or immutable retention.

## Why an additional event store is necessary

The first candidate reused TransitionHistory and created no schema. A realistic offline 12-item save/submit/review/confirm run with 200-character synthetic evidence produced **45,571 characters** against the existing 50,000-character history guard. It leaves insufficient headroom for subsequent Return/edit/review cycles. Capacity denial preserves evidence but would impede Gate 3. The cumulative builder is now an internal instrumentation helper and experiment; its command-line path explicitly refuses to prepare deployment candidates.

The final candidate therefore uses **one separate append-only application event list**, preserving existing business columns and Gate 3 transition metadata. This is a targeted schema addition justified by measured capacity, not a replacement of SharePoint or Power Automate.

## Provisioned resource and required schema verification

An empty list `Competency_Audit_Event` was created on the same site, without adding it to site navigation. Observed list GUID: `5fe74808-a5b7-4d05-9d6e-fa225bdfd562`. It now stores the verified synthetic lifecycle events described below.

| Internal field | Required design |
|---|---|
| Title | Single-line event key, required, unique/indexed; server run + operation + phase |
| ParentKey | Single-line text, required, indexed; server-derived ASSESSMENT or PLAN scope |
| EventPayload | Required multiple-lines plain text; append-changes disabled; not in default view |
| Created / Modified / Author / Editor | Native SharePoint metadata |

All three fields were read back from their saved column settings: Title required/unique, ParentKey required, EventPayload required/Note/plain text/append changes disabled. Title and ParentKey indexes were independently created and read back on Indexed Columns (2 indexes). An initial JavaScript index-confirmation browser failure was resolved through explicit index creation; user assistance is no longer needed for that earlier confirmation. Evidence includes gate4-title-schema.png and the recorded schema inputs.

**ACL prerequisite resolved by user-assisted confirmation and server readback.** The initially inherited Members = Edit / Visitors = Read were removed from this new list after breaking inheritance. Current permissions show only PI Resources Owners = Full Control. The existing SharePoint service identity was verified to have Full Control through Owners; no new identity or grant was introduced and no Gates 1–3 list permissions were changed. Native Audit list versioning is enabled with 50 versions retained. User assistance was needed because browser automation could not reliably confirm native JavaScript dialogs. Keep privileged-owner rights distinct from ordinary app RBAC; no immutable-store claim is made. Import and live results are recorded in the final acceptance section below.

Publication: the user explicitly authorized the isolated Gate 4 branch after the initial automatic-review rejection. Commit f037a87999d2a25ea4b720da34fe01822b38648a was pushed and independently read back from GitHub. Main was not merged and hosting was not triggered by this branch push. Subsequent related safeguards stay on that same branch.

## Implementation

`tools/build-gate4-event-store.cjs` takes private complete Gate 3 exports and the actual verified audit-list GUID. It produces private complete candidate definitions; it does not provision resources or deploy. Raw exports, packages, connection details, endpoints and auth material remain outside tracked/public artifacts.

Covered operations:

- Employee self save and submit/resubmit.
- Manager review save, confirmation and enriched existing Assessment Return metadata.
- Development plan creation, action edit, plan start, action completion, parent completion readback; enriched existing plan Return and action Reopen metadata.

Each ordinary mutation acquires the existing parent lock after existing session/profile/role/scope checks. The candidate preserves exact-ETag conditional claims, existing expectedRevision semantics and service connections. Review Revision still means review round; it is not repurposed as a per-save counter. Parent TransitionHistory equality additionally protects a stale authorized header when a legacy transition happens before lock acquisition. Simultaneous claims are serialized; this does **not** establish rejection of every sequential stale-browser edit within the same review round.

Before the business write, append a REQUESTED row containing server actor/time, entity key/type, before projection, proposed changed fields, review revision, correlation ID and event ID. Append a separate COMMITTED row after business writes and fresh parent readback, referencing the same event ID and containing actual projected after values. Never update or delete earlier audit rows. Row Title includes phase so uniqueness distinguishes the two records. Connector retries are disabled for audit writes.

Plan creation records intent before creating the header and records COMMITTED after its DRAFT finalization. Existing-plan 409 recovery creates no audit duplicate. Return and Reopen now also append protected REQUESTED/COMMITTED rows to the restricted event store while retaining the existing durable parent metadata and original intent-before-action-write ordering. One event ID links each pair. The history UI deduplicates legacy/central completion copies and does not let a legacy completion hide a missing central committed append. Legacy records are not retroactively fabricated.

Projected data excludes request sessions, OTPs, signed endpoints and connector envelopes. Assessment evidence and manager/development notes are business data and remain subject to the same data-access controls. Free text is escaped in the history UI.

## Read RBAC and history UI

Existing authorized `get_my_assessment`, `get_review_assessment` and `get_development_plan` responses gain auditHistory, gate4Ready and auditHistoryMayBeTruncated. Audit queries execute after the original owner/reviewer/ADMIN scope guards, deriving ParentKey from the authorized server record and escaping OData apostrophes. No generic audit reader or writer endpoint is introduced.

Reads request the latest 500 event rows ordered by ID descending; the UI combines them with legacy transition metadata and sorts displayed events by timestamp. Exactly 500 rows sets a visible recent-history warning; it never claims that this is the complete archive. A pending REQUESTED entry indicates reconciliation is required unless a matching COMMITTED entry is present in the loaded history. Missing older rows outside the read window must be checked by support.

Backend endpoint RBAC does not by itself prove direct SharePoint access restrictions. Native list ACLs, privileged owner/service-account edit rights, retention and deletion policies must be inspected and recorded. The design is append-only through application operations, **not a tamper-proof or WORM store**.

## Failure/recovery

If intent append fails, the business write is not attempted and the parent lock remains for reconciliation. If business mutation or final audit append fails, never synthesize a successful audit event, auto-unlock, or blindly retry. A business write may have completed with only a durable pending intent. Inspect the producer run, parent, item/action, audit rows and notification reservations; establish the run has stopped, reconcile actual state and record the repair before clearing the exact affected lock. An audit failure is not an Outlook failure-isolation test.

Intent payloads over 20,000 characters fail closed before business writes. Final payloads over 50,000 characters retain the lock and return a reconciliation-required response. Per-event bounds replace the cumulative per-record bottleneck. Support archival/retention and list-threshold behavior still require operational validation.

## Offline validation

`verify-gate4-event-store.cjs` executes generated action graphs using the repository's in-memory WDL subset and connector fixtures; it is not Microsoft's engine or SharePoint UAT. It checks exact preserved triggers/connections, unchanged notification actions and authorization guards, action references/dependencies and nesting ≤ 8.

Verified fixture cases include two rounds of 12 self saves and 12 manager reviews, protected Return/edit/resubmit/fresh review/confirmation (104 independent audit rows), role/scope denials with no data/event changes, simultaneous review claims (one 200 / one 409 / one audit pair), protected Development Return/Reopen/edit/start/recomplete, plan creation and duplicate recovery, failed business write, failed final audit append, unrelated-parent exclusion and explicit 500-row truncation indication.

`verify-gate4-event-store-ui.cjs` checks candidate UI against those generated graphs: existing Return reason handling and escaping, employee editing/resubmit, fresh-review gating, confirmation, plan Return/Reopen, completed-action protection, employee read-only controls and responsive layouts. API transport is mocked; no OTP/mail or live mutation is generated by these suites.

Existing verify, UX, manager, development, assignment, dashboard, session and flow-change suites passed. Re-run relevant suites after final changes; record actual live results independently.

## Verified deployment and controlled live acceptance — 02/11/2026, 00:01:42 Asia/Bangkok

Functional backend and controlled live UAT: **PASS**. Overall Gate 4: **BLOCKED pending hosted UI release approval and hosted verification**. User authorization currently covers the Gate 4 branch push, not main merge or hosting deployment. No PR targeting main was opened because the existing workflow also deploys PRs targeting main.

All three final candidates are imported into the original Employee, Manager and Development flows, restored to On and independently read back. Flow checker reports zero errors and warnings for each. Fresh complete exported definitions match every executable property, trigger and connection; only clientLastModifiedTime and connectionKeySavedTimeKey differ, individually reviewed as metadata timestamps. Employee v2 and v3 archives are byte-identical; Manager/Development use v3 actual committed parent snapshots and server commit times. Private exports/packages remain outside the repository.

The isolated synthetic Gate 4 cycle completed the actual lifecycle through the local candidate UI and deployed Power Automate/SharePoint, not mocked transport:

| Evidence | Verified result |
|---|---|
| Assessment | 12 initial self saves, submit, one review, Return with reason, first item revised 2 to 3, resubmit, fresh review 12/12, Confirm; final CONFIRMED, Revision 2 |
| Assessment audit | 60 central rows / 30 pairs / 0 pending; prior level/evidence retained; actors and ordered server times/correlation IDs verified |
| Development | Created 9 actions, planned all, Start, concurrent Return, edit/restart, complete 9/9, Reopen first action, recomplete; final COMPLETED, Revision 3 |
| Reopen | Completed parent to IN_PROGRESS; first action to PLANNED; previous action completion retained and previous parent completion recorded in audit; other eight actions exactly unchanged |
| Plan audit | 50 central rows / 25 pairs / 0 pending; native final parent COMPLETED, Revision 3, empty WorkflowLock |
| Employee RBAC | Three actual HTTP 403 denials for assessment Return, plan Return and action Reopen; complete before/after readback hashes unchanged |
| Manager negative UAT | Eight actual HTTP 400/409 denials for blank reasons, protected states, stale revision payloads and duplicate completion; complete readback hashes unchanged |
| Real concurrency | Two simultaneous plan Return requests: one 200 and one 409; one revision increment and one additional audit pair; action hash unchanged |
| Read scopes / UI | Employee and Manager final history and action data exactly match for the authorized subject; Employee UI read-only; first self save, Return and Confirm pairs independently read in native SharePoint details |
| Gate 3 regression | All recorded assessment/plan fields in the final API handover match exactly, including history, action titles and completion timestamps; no new central audit rows on old records |
| Notification regression | All 12 visible cells for each of the 18 Gate 2/3 baseline notification rows match the final Gate 3 handover exactly |

Local guard fixtures blocked 12 old/other-target mutation cases before transport. Sequential live helpers were fixture-checked to send no writes for Employee and stop after the first write if an audit pair was missing. Live batch helpers sent one request at a time, verified the resulting pair and stopped on ambiguity; no retries or lock clearing were performed. Existing duplicate create/open UI recovery opened the same plan without adding duplicate creation audit.

One Manager post-Start UI readback required refresh. An independent Employee read proved the Start committed with a complete audit pair; refresh restored Manager controls without resubmitting Start. The correlated producer run shows success and a 15.6-second session lookup. The existing UI request timeout is 25 seconds. These facts do not establish the exact cause; no timeout configuration change was made.

Notification action subgraphs, recipients, event keys, trigger definitions and connections remain structurally unchanged. Gate 4 notification reservations observed in SharePoint are send-status evidence only. No mailbox failure proof or live Outlook failure injection is claimed. Business/audit failure handling and 500-row read bounds are fixture evidence, not live fault injection. Native Owners retain privileged edit/delete rights; no WORM/immutable retention or actual direct non-owner SharePoint access-denial proof is claimed. Review Revision is a review round and does not guarantee rejection of every sequential stale-browser save in the same round.

Remaining release steps: approve a concrete Gate 4 branch merge into main, let the existing Azure workflow deploy, verify hosted asset hashes/workflow result, then run hosted/session regression with transport mode recorded. Do not infer production UI deployment from branch push or backend import. Main remains the Gate 3 merge at this checkpoint.
