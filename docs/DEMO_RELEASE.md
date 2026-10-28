# Presentation demo · 29 October 2026

Open the existing site and choose **Explore role-play demo**. All role-play data is sample/mock data in memory. Refresh or exit resets it. No live API requests or backend writes are made.

1. Select **Sample SVP**: show Engineering overview, completion, review status, plan coverage, all three employee grades (including JR_4_6), top gaps and discipline breakdown. Choose EEM, then View levels. Return to All disciplines.
2. Select **Pratheep · MANAGER · DM**: open Management Dashboard. Only ETM employees appear; there is no discipline selector. Open Manager Workspace and Assign sample JR_4_6, then switch to Sample Junior to see the assigned assessment.
3. Select **Thawatchai · EMPLOYEE**: My Assessment → select levels and evidence → Save progress → Submit → confirm. Management Dashboard is unavailable to employees.
4. Select **Pratheep**: Manager Workspace → Thawatchai → Agree & Save or Adjust Level for each competency → Confirm assessment → Manage development plan → Create plan → Plan action for each gap → Start plan → Complete actions.
5. Select **Thawatchai**: My Development shows the confirmed results and shared plan. Select Pratheep and revisit Management Dashboard to show updated review/plan metrics.

The Sample ECM employee provides a seeded confirmed/completed-plan example. Ratings/targets are illustrative draft reference content, not approved requirements for other disciplines or grades. Completion counts submitted, under-review or confirmed assessments. Gaps use validated levels when present, otherwise self levels; unrated competencies are excluded. Plan coverage counts confirmed employees with a plan.

Authorization and organizational position are separate: AppRole SVP / MANAGER / EMPLOYEE (ADMIN retained); jobGrade SVP / DM / JR_4_6 / JR_7_8 / SR_9_10. Existing jobLevel wire fields remain compatible. Demo MANAGER scope is an explicit discipline; missing discipline fails closed. Live authorization remains the server's responsibility.

Connected management analytics are clearly unavailable until a verified dashboard API exists. No queue-derived live headcounts or fabricated analytics. OTP, assignment, employee, manager and development API contracts and deployment workflow are unchanged.

Regression commands: node verify-dashboard.cjs, node verify.cjs, node verify-ux.cjs, node verify-assignment.cjs, node verify-manager.cjs, node verify-development.cjs, node verify-session.cjs. Requires Playwright and Chrome; all backend requests are mocked.
