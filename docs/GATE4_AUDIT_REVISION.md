# Gate 4 — Audit / Revision

1 November 2026, Asia/Bangkok. **Implementation candidate / offline tests PASS; deployment and live acceptance NOT YET PASS.**

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

An empty list `Competency_Audit_Event` was created on the same site, without adding it to site navigation. Observed list GUID: `5fe74808-a5b7-4d05-9d6e-fa225bdfd562`. It is not yet an activated audit service.

| Internal field | Required design |
|---|---|
| Title | Single-line event key, required, unique/indexed; server run + operation + phase |
| ParentKey | Single-line text, required, indexed; server-derived ASSESSMENT or PLAN scope |
| EventPayload | Required multiple-lines plain text; append-changes disabled; not in default view |
| Created / Modified / Author / Editor | Native SharePoint metadata |

All three fields were read back from their saved column settings: Title required/unique, ParentKey required, EventPayload required/Note/plain text/append changes disabled. Title and ParentKey indexes were independently created and read back on Indexed Columns (2 indexes). An initial JavaScript index-confirmation browser failure was resolved through explicit index creation; user assistance is no longer needed for that earlier confirmation. Evidence includes gate4-title-schema.png and the recorded schema inputs.

**ACL prerequisite resolved by user-assisted confirmation and server readback.** The initially inherited Members = Edit / Visitors = Read were removed from this new list after breaking inheritance. Current permissions show only PI Resources Owners = Full Control. The existing SharePoint service identity was verified to have Full Control through Owners; no new identity or grant was introduced and no Gates 1–3 list permissions were changed. Native Audit list versioning is enabled with 50 versions retained. User assistance was needed because browser automation could not reliably confirm native JavaScript dialogs. Keep privileged-owner rights distinct from ordinary app RBAC; no immutable-store claim is made. No candidate flow has been imported at this checkpoint.

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

## Deployment / live acceptance still required

1. Verify the provisioned schema, Title uniqueness, ParentKey index, versioning, ACLs and service-connection access.
2. Candidate definitions and three private packages are already prepared. Package comparison verified identical original entry sets/manifests/maps and exactly one replaced definition.json per archive. Refresh candidates/packages if implementation changes; preserve Update/original flow IDs and connections. Exact fingerprint manifests are generated integrity checks, not independent approvals.
3. Import incrementally, run Flow checker, export/read back complete deployed definitions and compare all executable properties.
4. Use a new isolated synthetic Gate 4 fixture and the user-operated Employee/Manager sessions. Preserve Gate 1–3 records and original notification reservations. Record waiting-client HTTP status/body, actual business state, actor/time, before/after pairs, correlation, denied writes, concurrent outcomes and history read scopes.
5. Validate notification reservations independently of mailbox delivery; do not equate Flow Succeeded, HTTP success, SENT or mailbox receipt. Gate 2 H remains configuration-only. No live Outlook failure injection has occurred.
6. Publish the tested UI only after backend read/write contracts and live safeguards pass. Verify hosted asset hashes and actual deployment workflow, then rerun hosted regression with its transport mode clearly identified.

Until those steps complete, **Gate 4 overall = BLOCKED / NOT LIVE-ACCEPTED**. No PASS is claimed for deployment, real concurrency, real negative UAT, mailbox delivery, failure injection, immutable retention or direct SharePoint isolation.

## Live rollout checkpoint — 2026-11-01 19:19 Asia/Bangkok

The user completed the SharePoint confirmation dialogs. Independent readback verified unique permissions on Competency_Audit_Event with only PI Resources Owners / Full Control. The service connection account remains an Owner. Required/unique/indexed Title, indexed ParentKey, plain-text EventPayload and native versioning retaining 50 versions are verified. Existing business-list schemas/ACLs were not changed. This is not immutable retention or proof that privileged owners cannot alter records.

All three final candidates are imported as updates to the original flows, restored to On after import, and independently read back as enabled. Each Flow checker shows 0 errors and 0 warnings. Full fresh exported definitions compare exactly to v3 candidates except clientLastModifiedTime and connectionKeySavedTimeKey, the two individually reviewed metadata timestamps. Triggers, executable actions and connection references match. Employee v2 and v3 packages are byte-identical; Manager/Development use v3 actual committed parent readbacks and server timestamps.

A real waiting HTTP Employee read with an intentionally invalid synthetic session returned HTTP 401 / success false / Invalid session. This establishes only invalid-session denial, not authenticated role/scope or concurrent-write acceptance.

Created isolated synthetic cycle UAT_GATE4_20261101_01 through SharePoint and read the saved row back. Local live-UAT UI restricts writes to the new cycle/employee/assessment/plan; stub-transport verification blocked 12 historical/other-target write cases. No Gate 4 business lifecycle writes or live audit event pairs have been accepted yet. Fresh user-operated Employee and Manager sign-ins are requested because prior sessions expired.

The branch is published through 96845c3291d8a0e6c5248f36e06dd6b7cd7e5c82 under the user's branch-only authorization. Main remains Gate 3; no merge or hosted UI deployment was performed. Prior ACL/import blockers are resolved. Overall acceptance is still pending authenticated live lifecycle, negative/concurrency checks and independent audit/business readback. No new mailbox delivery or Outlook failure-injection proof is claimed.
