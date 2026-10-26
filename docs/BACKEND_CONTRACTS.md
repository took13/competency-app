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

config.js now contains the verified assignmentContract mapping. Local adapter names are not extra request fields. The legacy assignmentCreate entry point cannot bypass preview. Success refreshes the signed-in user's assignment list and manager queue if its separate mapping is available. Manager queue mapping is still pending; target employees reload their own authenticated My Assessment. No cross-user session or push refresh is assumed.

## Other contracts — exact fields still required

User identifies these existing APIs: Competency_Assessment_API_v2, Competency_Manager_API_v1, Competency_Development_API_v1. Their endpoints were found configured locally. Full verified Manager/assignment payloads and response examples were not available in the cached conversation or reference files inspected during this task.

The related chat “สรุปการทดสอบโฟลว์” supplies partial Development implementation evidence:

- Shared plan lookup and access guard before get/save.
- `get_development_plan` returns a plan and ordered actions.
- `save_development_action` requires ADMIN or Reviewer and plan state DRAFT; updates action status to PLANNED.
- Trigger fields include actionKey, actionType, developmentAction, successMeasure, ownerEmail, targetDate.
- actionType must be one of seven approved values; those values were not provided in the retrieved evidence.
- Response counts plannedActionCount and totalActionCount can be strings.
- `get_assessment_result` precedes `create_development_plan`.
- That evidence says these Development actions had not yet been run at that time. No later live acceptance evidence was retrieved.

Live buttons remain disabled until verified mappings are configured. Role-play uses the confirmed/DRAFT/PLANNED lifecycle and never posts sample keys to an API.

## Mapping format

`config.js` has `contracts: {}`. Add only mappings supported by actual request/response examples. Each operation maps normalized UI values to server fields:

```js
contracts: {
  // Template only. Replace action/fields/response with verified values.
  managerQueue: {
    api: "manager",
    action: "<verified action>",
    fields: {},
    response: "<array response field>"
  }
}
```

Operations: managerQueue, managerAssessment, managerSave, managerConfirm, assessmentResult, developmentPlan, developmentCreate, developmentSave. Assignment uses the separately guarded adapter above; assignmentCreate is no longer a write entry point. `api` is manager, assessment or development. `fields` maps normalized input names to backend payload names; only mapped fields are sent. `response` selects a top-level response field, or omit it to return the full response.

This adapter currently expects normalized shapes (including assessment items and plan/action shapes); if actual responses differ, implement an explicit normalization adapter and test it before enabling. A mapping alone is not evidence of compatibility.

Normalized values supplied for other operations: assessmentKey; manager save additionally itemKey, managerLevel, managerComment; development save actionKey, planKey, actionType, developmentAction, successMeasure, ownerEmail, targetDate. Unknown fields or lifecycle actions must be established from the backend, not inferred from these UI names.

Next integration input: sanitized successful requests/responses, all supported states, reviewer permission semantics, approved actionType values, and error responses. Do not put signed endpoint URLs or session tokens in contract examples.
