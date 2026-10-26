// TEMPORARY DEMO / PILOT ONLY. Signed URLs are visible to site visitors.
// Rotate/revoke after the pilot. Production requires authenticated server APIs.
window.COMPETENCY_CONFIG = {
  "assessmentCycles": [{"label": "รอบทดลองประเมิน ETM 2026 — PILOT", "cycleKey": "ETM_UI_DEMO_2026", "type": "PILOT", "active": true}],
  "authApiUrl": "https://defaultc6445630e6024993a6057e41f70338.e8.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/02/workflows/79d8013dc6b6409c8fd4abc825d09290/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=O57vgFdV2iOnlCgPuyCPa8Ywe_YXaCpagcSm4D3osMk",
  "employeeApiUrl": "https://defaultc6445630e6024993a6057e41f70338.e8.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/03/workflows/72723747a0eb456cb067e06dddc92e4f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jaWMIHLwrmn0ib5UAEGJ_OGHHs9wMa4o-_ejhdphoNY",
  "managerApiUrl": "https://defaultc6445630e6024993a6057e41f70338.e8.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/01/workflows/c025bbe4ca9942f581adac24c594a74e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=S7u47SP-rvT6Gju3HlZNpRRyPAfwXSCJZMMEPE5j-5g",
  "assessmentApiUrl": "https://defaultc6445630e6024993a6057e41f70338.e8.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/30/workflows/1547c226e95e4d228f13a384e21dc69b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=M4eJDvtrIPpGmc3xW3AkMoyFnonQB1D6kvw_MgRHRNE",
  "developmentApiUrl": "https://defaultc6445630e6024993a6057e41f70338.e8.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/24/workflows/b3b21cf4ebf14f3e8953ebed7981a9d1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=TOyR2GIGpABrqapYwv8FnuZ6HsNnxUWpdJq7fKf5dbg",
  "temporaryDemoOnly": true,
  "contracts": {
  "managerQueue": {
    "api": "manager",
    "action": "get_my_reviews",
    "fields": {},
    "response": "reviews"
  },
  "managerAssessment": {
    "api": "manager",
    "action": "get_review_assessment",
    "fields": {
      "assessmentKey": "assessmentKey"
    },
    "response": "assessment"
  },
  "managerSave": {
    "api": "manager",
    "action": "save_manager_review",
    "fields": {
      "assessmentKey": "assessmentKey",
      "itemKey": "itemKey",
      "managerLevel": "validatedLevel",
      "managerComment": "managerComment"
    }
  },
  "managerConfirm": {
    "api": "manager",
    "action": "confirm_assessment",
    "fields": {
      "assessmentKey": "assessmentKey"
    }
  }
},
  "assignmentContract": {
  "verified": true,
  "fields": {
    "employeeEmail": "employeeEmail",
    "cycleKey": "cycleKey"
  },
  "preview": {
    "employee": "preview.employeeEmail",
    "employeeName": "preview.employeeName",
    "profile": "preview.profileVersionKey",
    "expectedCount": "preview.expectedCUCount",
    "requirementCount": "preview.requirementCount",
    "blockingCount": "preview.blockingCount",
    "missingCUVersion": "preview.contentReadiness.missingCUVersionCount",
    "targetRubricIssues": "preview.contentReadiness.targetRubricIssueCount",
    "pilotCanAssign": "preview.pilotCanAssign",
    "blockers": "preview.blockers",
    "issues": "preview.contentReadiness.issues",
    "cycleKey": "preview.cycleKey",
    "trackKey": "preview.trackKey",
    "jobGradeCode": "preview.jobGradeCode",
    "cycleStatus": "preview.cycleStatus",
    "profileStatus": "preview.profileStatus"
  },
  "created": {
    "assessmentKey": "assessmentKey",
    "status": "status",
    "createdItemCount": "createdItemCount",
    "expectedItemCount": "expectedItemCount",
    "employeeEmail": "employeeEmail",
    "profileVersionKey": "profileVersionKey",
    "mode": "mode"
  }
}
};
