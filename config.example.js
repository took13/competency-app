window.COMPETENCY_CONFIG = {
  "assessmentCycles": [
    {
      "label": "รอบทดลองประเมิน ETM 2026 — PILOT",
      "cycleKey": "ETM_UI_DEMO_2026",
      "type": "PILOT",
      "active": true
    }
  ],
  "authApiUrl": "",
  "employeeApiUrl": "",
  "managerApiUrl": "",
  "assessmentApiUrl": "",
  "developmentApiUrl": "",
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
    },
    "assessmentResult": {
      "api": "development",
      "action": "get_assessment_result",
      "fields": {
        "assessmentKey": "assessmentKey"
      },
      "response": "result"
    },
    "developmentCreate": {
      "api": "development",
      "action": "create_development_plan",
      "fields": {
        "assessmentKey": "assessmentKey"
      }
    },
    "developmentPlan": {
      "api": "development",
      "action": "get_development_plan",
      "fields": {
        "planKey": "planKey"
      },
      "response": "plan"
    },
    "developmentSave": {
      "api": "development",
      "action": "save_development_action",
      "fields": {
        "planKey": "planKey",
        "actionKey": "actionKey",
        "actionType": "actionType",
        "developmentAction": "developmentAction",
        "successMeasure": "successMeasure",
        "ownerEmail": "ownerEmail",
        "targetDate": "targetDate"
      }
    },
    "developmentStart": {
      "api": "development",
      "action": "start_development_plan",
      "fields": {
        "planKey": "planKey"
      }
    },
    "developmentComplete": {
      "api": "development",
      "action": "complete_development_action",
      "fields": {
        "planKey": "planKey",
        "actionKey": "actionKey"
      }
    }
  }
};
