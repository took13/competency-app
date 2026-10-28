# Backend contract evidence and enablement

## Auth and Employee — implemented

Source: prior UI v2 contract notes and read-only Workspace v0.3 reference. These are implementation evidence, not a new live API test.

POST JSON; protected actions include `sessionToken` in the body. Response success must be true or `"True"`. Shared transport has a 25-second timeout, no implicit retry and no cross-API endpoint fallback. SharePoint `{Value: ...}` choices are unwrapped for display.

| API | action | Additional request fields | Response |
|---|---|---|---|
| Competency_API | request_otp | email | success, requestId |
| Competency_API | verify_otp | requestId, otp | success, sessionToken, sessionExpiresAt, user |
| Competency_API | get_user_profile | — | success, registered, profile |
| Competency_Employee_API_v1 | get_my_assignments | — | success, assignments[] |
| Competency_Employee_API_v1 | get_my_assessment | assessmentKey | success, assessment {items[]} |
| Competency_Employee_API_v1 | save_self_assessment | assessmentKey, itemKey, selfLevel, selfEvidence | success, itemStatus |
| Competency_Employee_API_v1 | submit_assessment | assessmentKey | success, status |

Editable assessment states: ASSIGNED, IN_PROGRESS. Saved item state: COMPLETED. Submission requires nonzero items, every item saved, no pending writes and no dirty drafts. The backend must independently validate these rules.

### Client session lifecycle (2026-10-28)

Owner-selected idle timeout: 30 minutes. Effective client deadline is the earlier of server `sessionExpiresAt` and the last trusted user input plus 30 minutes. The activity timestamp is stored per tab beside the token and is cleared on sign-out, timeout, demo entry or endpoint change. Refresh/restore, background requests and focus do not renew it. Missing/invalid timestamps fail closed; old caches require fresh OTP once.

An expiry timer clears displayed identity, role navigation, assessment/development context and drafts even if the user is inactive. Focus/visibility/pageshow check elapsed time after suspended timers. Protected requests check the deadline before dispatch and after response, and pending requests are aborted when the session ends. Session generation/token checks prevent late profile, assignment or read responses from restoring identity. A write dispatched before timeout may still finish on the server; no automatic retries are made. Reauthenticate and read back before retrying an ambiguous write.

Valid cached sessions use a distinct Checking your session screen during server validation; OTP sign-in is not used as a temporary loading screen. Server session expiry, permissions and ownership remain authoritative. This adds no backend fields, revocation endpoint or server-side idle policy; a client timeout clears this app's cached token rather than revoking it on the server.

## Assignment v2 — live mapping enabled (2026-10-26)

Evidence supplied by the owner from Power Automate run history, extracted 2026-10-26. This is verified backend contract evidence; browser checks reproduce these shapes but are not a new authenticated backend acceptance run.

| Action | Request fields (besides action) | HTTP response |
|---|---|---|
| preview_assignment | sessionToken, employeeEmail, cycleKey | 200, success boolean, preview object |
| create_pilot_assignment | sessionToken, employeeEmail, cycleKey | 201, success boolean, mode, assessmentKey, status, employeeEmail, profileVersionKey, expectedItemCount, createdItemCount |

employeeEmail is the TARGET employee. Caller identity comes from sessionToken. Server resolves target eligibility, cycle and exactly one profile. Client sends NO profile ID/reference. ProfileVersionKey is returned for traceability. Target scope remains server-authoritative; the request has no caller-email or scope override.

Preview paths: preview.employeeName, employeeEmail, disciplineCode, trackKey, jobGradeCode, cycleKey, cycleStatus, frameworkCode, profileVersionKey, profileStatus, isComplete, expectedCUCount, requirementCount, blockingCount, canAssign, productionCanAssign, pilotCanAssign, blockers; preview.contentReadiness.missingCUVersionCount, targetRubricIssueCount, issues. These names are preserved in the explicit config adapter. Counts arrive as strings; pilot boolean arrives as capitalized True/False strings. Normalize only boolean true or string True to true, then guard on normalized pilotCanAssign === true. canAssign/productionCanAssign/isComplete may be False for a valid DRAFT pilot and MUST NOT replace the pilot guard.

Create requires positive integer expectedCUCount matching requirementCount, explicit zero blocking/missing-version/rubric counts, empty blockers/issues arrays, resolved employee/profile, matching returned target and cycle. Input changes invalidate preview. Each Create click runs a fresh preview using identical frozen inputs before the create POST. Pending writes cannot be repeated. No automatic retries.

Observed success: run 08584087765658552885849991093CU30 (24 Oct 15:25) returned preview True, ETM_PI/JR_7_8, profile ETM_2026_V1_ETM_PI_JR_7_8_DRAFT1, expected/requirement counts 12, all blocker/readiness counts zero. Cycle/profile were DRAFT and productionCanAssign False. Run 08584087765369258228120737702CU25 returned HTTP 201, mode PILOT, status ASSIGNED, expectedItemCount/createdItemCount strings 12, assessmentKey PILOT|ETM_UI_DEMO_2026|gpscrpauser@gpscgroup.com|R1.

Observed blocked preview: run 08584087781185494656381055617CU05 (24 Oct 14:59) returned blockingCount 2, pilotCanAssign False, missingCUVersionCount 2. Basic Computer Network System and Equipment (order 5, target 3) and Software Skills - General (order 8, target 4) had NEEDS_NAME_CONFIRMATION / REQUIRED_CANDIDATE blockers and CU_VERSION_NOT_FOUND issues. UI displays the actual blocker and content issue details.

409 branches are distinct:
- Observed run 08584087780747640536726205007CU19 (24 Oct 15:00): success false, message "Pilot assignment is not ready for creation". Resolve readiness and preview again.
- **Definition-only evidence, no observed run:** Response 13 returns success false, message "Pilot assessment already exists", assessmentKey. UI displays the existing key and does not retry or replace it.

Backend key is concat(PILOT|, cycleKey, |, lowercase employeeEmail, |R1). R1 is hard-coded. Duplicate lookup uses AssessmentKey with no status filter; any existing header prevents another create for that cycle/email regardless of state. Readiness is checked BEFORE duplicate detection. Backend creates header PREPARING and switches to ASSIGNED only after item-count integrity. UI never writes header states or repairs partial headers. Success validation compares mode, returned target/profile/key and both item counts to the preview; incomplete results instruct checking backend before retry.

All Terminate actions use Succeeded, including HTTP 409 branches. Workflow-run success is not API success. Use actual HTTP status/body. Responses 0–10 and 14 exist but their exact bodies were not extracted (session, permission, target/cycle/profile and snapshot errors); UI handles HTTP errors without inventing those response contracts.

config.js now contains the verified assignmentContract mapping. Local adapter names are not extra request fields. The legacy assignmentCreate entry point cannot bypass preview. Success refreshes the signed-in user's assignment list and manager queue if its separate mapping is available. Manager queue mapping is live-enabled; target employees reload their own authenticated My Assessment. No cross-user session or push refresh is assumed.

## Manager v1 — live-enabled (2026-10-26)

Evidence: owner-supplied sanitized Power Automate run-history samples from 22–23 October, extracted 26 October 2026. The observed 12-item lifecycle completed all four actions. This evidence is distinct from this release's mocked browser checks; no real review data is written during deployment validation.

All requests POST JSON with action and sessionToken using the existing manager endpoint. No flow or backend contract changes.

| action | Additional request fields | Verified response |
|---|---|---|
| get_my_reviews | none | success, count (string), reviews[] |
| get_review_assessment | assessmentKey | success, assessment including items[] |
| save_manager_review | assessmentKey, itemKey, validatedLevel (JSON number 1–5), managerComment | success, message, assessmentKey, itemKey, validatedLevel (string), validatedItemCount (string), totalItemCount (string) |
| confirm_assessment | assessmentKey | success, message, assessmentKey, status CONFIRMED, validatedItemCount (string), expectedItemCount (string), confirmedAt |

Queue rows: assessmentKey, employeeName, employeeEmail, cycleKey, profileVersionKey, reviewerEmail, status, submittedAt, expectedItemCount (number). Queue is active SUBMITTED only, authorized by backend reviewer email (case-insensitive) or ADMIN. UI does not filter by caller email or infer scope from sample identities. Confirmed assessments disappear from queue. Assessments loaded/Awaiting review show the current queue; Confirmed this session counts only successful confirmations observed in this tab, resets on sign-out/reload, and is not a historical total.

Assessment fields: assessmentKey, employeeName, employeeEmail, profileVersionKey, status, submittedAt, expectedItemCount/actualItemCount (strings), items. Item fields: itemKey, cuKey, competencyName, competencyGroup, generalStatement, level1–level5, targetLevel, displayOrder, selfLevel, selfEvidence, validatedLevel, managerComment, itemStatus. Unset values are null. Numeric response strings are normalized for validation. The explicit adapter aliases validatedLevel to the existing UI managerLevel; only validatedLevel is sent on the wire. ItemStatus COMPLETED describes employee completion and does not establish manager validation.

MANAGER/ADMIN profile entry automatically loads get_my_reviews. Refresh team re-fetches. Opening a row fetches get_review_assessment. Agree & Save sends the employee self level as a number and an empty managerComment; Adjust Level requires a reason. Each successful save checks returned keys/level/counts and reads back the assessment. No UNDER_REVIEW status is synthesized: live editing is SUBMITTED only. Confirm requires nonzero expectedItemCount == actualItemCount == loaded item length and every item validated at integer 1–5. Save counts must match the authoritative readback. After confirm, re-fetch the queue. No implicit retries for writes.

Observed/definition errors: save non-SUBMITTED 409 'Assessment is not editable for manager review'; confirm non-SUBMITTED 409 'Assessment is not ready for confirmation'; invalid level 400 'validatedLevel must be an integer from 1 to 5'. Exact bodies/status for Items Not Fully Validated, Review Not Found/Forbidden and Review Item Not Found remain unavailable; no invented error contracts. UI uses safe actionable messages for HTTP/transport errors, never raw server text, endpoint URLs or tokens. 401 ends session; 403/409 instruct refresh/reopen. Ambiguous writes require readback before retry. Backend authorization and completeness remain authoritative.

## Development v1 — live-enabled (2026-10-26)

Evidence: owner-supplied sanitized Power Automate run history, extracted 2026-10-26. One confirmed assessment had 12 items/3 gaps; create 201, duplicate create 409, three saves, start, three completions and final get COMPLETED were observed (23–24 October). This release uses those request/response shapes; browser tests mock them and do not perform a new authenticated live acceptance run.

All six operations POST to the existing Development API with action and sessionToken. Only these additional fields are sent:

| Action | Request fields | Verified success response |
|---|---|---|
| get_assessment_result | assessmentKey | result with assessmentKey, employeeName/email, status CONFIRMED, totalCompetencies/gapItemCount/priorityGapCount strings, items[] |
| create_development_plan | assessmentKey | 201: planKey, status DRAFT, gapItemCount, priorityGapCount, createdActionCount (string counts) |
| get_development_plan | planKey | plan with planKey, assessmentKey, employeeName/email, reviewerEmail, status, gapItemCount, priorityGapCount, actions[] |
| save_development_action | planKey, actionKey, actionType, developmentAction, successMeasure, ownerEmail, targetDate | planKey, actionKey, status PLANNED, plannedActionCount, totalActionCount |
| start_development_plan | planKey | planKey, status IN_PROGRESS, plannedActionCount, totalActionCount |
| complete_development_action | planKey, actionKey | planKey, actionKey, actionStatus COMPLETED, completedActionCount, totalActionCount, planStatus |

Results use validatedLevel, gapLevel, gapStatus (DEVELOPMENT_NEEDED / MEETS_OR_EXCEEDS). Plan actions use gapSeverity, plus completedAt, displayOrder and action content. The UI preserves these wire names; managerLevel/gap are presentation aliases. Plan response actions are nested inside plan, not a sibling array. Counts are normalized from strings and checked against loaded records. Result totals/gaps, plan identity/actions, mutation keys/status/counts and authoritative readback are validated.

Plan key format is DEV|<assessmentKey>|R1; action keys are <planKey>|<cuKey>. The employee self-only read path can derive the evidenced plan key from its own authenticated assignment. Manager opens confirmed results automatically with the selected assessment context. If planKey is already known it gets that plan; otherwise Create / open development plan explicitly creates or resumes it. Navigation never creates a plan automatically. The observed duplicate 409 message Development plan already exists plus planKey is the only create failure recovered as an existing plan. It does not create duplicate actions. No generic 409/404 is treated as permission to create or as duplicate evidence.

Allowed actionType values: TRAINING, OJT, COACHING_MENTORING, PROJECT_ASSIGNMENT, SELF_LEARNING, CERTIFICATION, OTHER. The editor uses a select and validates email and an actual YYYY-MM-DD calendar date because backend does not validate their formats. Save is DRAFT-only. Start requires nonzero total actions, actions count equals gapItemCount, all actions PLANNED and all five content fields filled. Empty plans cannot be started. Backend checks remain authoritative; the exact Not Startable branch condition was not extracted.

Save/start/complete require ADMIN or plan reviewerEmail (case-insensitive); employee ownership never grants mutation rights. Plan lifecycle: DRAFT → IN_PROGRESS → COMPLETED; final completion transitions plan on server. Actions become PLANNED on save and COMPLETED on completion. Readback follows every mutation; counts/status are not synthesized. Pending operations cannot double-submit. Failed/ambiguous writes require refresh before another mutation.

Observed/definition errors include duplicate create 409; invalid action type 400; unauthorized edits 403; non-DRAFT save 409; incomplete start 409; completion outside IN_PROGRESS 409. Bodies of unobserved Not Found/Forbidden/Not Startable/action-not-found and shared auth branches remain unavailable. Client displays sanitized actionable messages and does not depend on invented bodies. All backend Terminate actions report Succeeded, so API HTTP status/body determines success.

No backend contracts or GitHub Actions changed. No real API data is modified by automated checks. Authenticated live UAT from reviewer confirmation through completion remains an owner acceptance step.

## Manager development routing

Manage Development Plan opens managerDevelopment independently of self-only My Development. Selected assessment/employee/profile and known planKey are retained; mismatched response identity fails closed; sign-out clears both records. The previous routing-only release kept Development disabled pending evidence; the six verified mappings above supersede that limitation.
