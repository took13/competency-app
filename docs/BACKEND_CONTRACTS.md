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

## Assignment v2 — guard implemented, live mapping blocked (2026-10-26)

The requested incremental Manager Workspace UI is implemented for MANAGER/ADMIN. The user and retrieved planning chat confirm `preview_assignment`, `create_pilot_assignment`, deterministic PILOT assignments, duplicate 409, and backend PREPARING → ASSIGNED only after item-count integrity. The accessible chat preview contains no complete successful request/response JSON; repo config still has no verified assignment mapping. These lifecycle statements are owner-provided evidence, not a new backend test.

**Live assignment remains disabled.** No remote request field or readiness response path has been inferred. Provide sanitized passing requests/responses (including employee scope/profile reference resolution and 409) before populating `assignmentContract`. The existing `assignmentCreate` generic mapping can no longer bypass preview via Administration.

`assignment.js` uses a separate explicit adapter: `assignmentContract = {verified, fields, preview, created}`. `fields` maps local input names employeeEmail/cycleKey/profileKey to verified request fields. `preview` maps local display/guard names employee, profile, expectedCount, blockingCount, missingCUVersion, targetRubricIssues, pilotCanAssign to dotted response paths. `created` maps local assessmentKey/status/createdItemCount to dotted response paths. **These are local adapter names, not claims about backend field names.** Tests use conspicuous fixture-prefixed server fields; never copy them to config. If actual scope/profile resolution needs other inputs or readiness returns issue arrays instead of counts, update and test the explicit adapter against that evidence before enablement.

The adapter sends only mapped inputs plus shared action/sessionToken. Actions are fixed to the two owner-confirmed names. A fresh preview runs both on Preview and again on Create with frozen identical inputs. Create requires literal boolean true, positive integer expected count, all three blocker counts explicitly zero, and employee/profile identity present. Missing, malformed or stale preview data fails closed. Editing input invalidates readiness; pending operations prevent repeated writes and role changes.

409, 403, expired sessions, failures and uncertain timeouts are surfaced without automatic retry. Creation displays the returned key/status/count; only ASSIGNED plus expected count equality is reported as successful integrity. Browser does not generate deterministic keys, write header states, or repair partial PREPARING headers. Those remain backend responsibilities. The signed-in user’s assignment list and mapped manager queue are refreshed separately; refresh failure does not erase a successful creation result. The target employee must reload their own authenticated My Assessment; no cross-user session or push refresh is invented.

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

Normalized values supplied: assessmentKey; manager save additionally itemKey, managerLevel, managerComment; development save actionKey, planKey, actionType, developmentAction, successMeasure, ownerEmail, targetDate; assignment creation employeeEmail, cycleKey, profileKey. Unknown fields or lifecycle actions must be established from the backend, not inferred from these UI names.

Next integration input: sanitized successful requests/responses, all supported states, reviewer permission semantics, approved actionType values, and error responses. Do not put signed endpoint URLs or session tokens in contract examples.
