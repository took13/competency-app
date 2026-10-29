
## 2026-10-29 — Executive JLR requirement alignment

Aligned to SVP Surajit Bourtherng's screenshot feedback: 1 Basic Knowledge, 2 Working Knowledge, 3 Skilled Application, 4 Mastery, 5 Expert. Thai items 1.1–5.4 and keywords are transcribed from the supplied reference image. JLR_LEVELS in app.js is the shared frontend reference for Employee, Manager, Development, dashboard detail and both demo/live modes. No backend list is introduced; migrate this reference to governed master data in a later release.

Historical numeric levels 1–5, assessment models, target/self/validated/gap calculations, backend contracts, workflow permissions, dashboard hierarchy and Azure GitHub Actions remain unchanged. Demo remains in-memory mock data with zero external requests.

Demo: Explore role-play demo → Start assessment → JLR Level Guide beside the level selector. Expand What does each level mean? for the separate Competency-specific rubric. Switch to the manager role → Manager Workspace → open a review → the same JLR Level Guide. Dashboard cards stay compact; level metrics show the shared approved label.

Validation: node verify.cjs, verify-ux.cjs, verify-manager.cjs, verify-development.cjs, verify-dashboard.cjs, verify-assignment.cjs and verify-session.cjs. The main regression suite also checks all five JLR names, 20 Thai definition items, keywords, matching Employee/Manager guidance, preserved rubric, open-guide responsive widths and zero external demo requests.
