# Competency Hub · UI v2

Static, root-hosted application for the existing `took13/competency-app` Azure Static Web App. No framework, build step, CDN, external fonts or additional Azure resource is required. The existing GitHub Actions workflow remains unchanged (`app_location: "/"`, `output_location: ""`).

## Available now

- Task-oriented employee Home, My Assessment and My Development.
- OTP/profile/assignment/self-assessment integration using the evidenced Auth and Employee contracts.
- Four explicit role-play users: Pratheep MANAGER (`took13@hotmail.com`), Watchara EMPLOYEE SR_9_10 (`watchara.p@gpscgroup.com`), Kannattha EMPLOYEE JR_7_8 (`tooksignin@gmail.com`), Thawatchai EMPLOYEE JR_7_8 (`gpscrpauser@gpscgroup.com`).
- Live and role-play manager queue, Agree & Save, Adjust Level with reason, confirmation, reviewer-created DRAFT development plans and PLANNED actions. Employees view plans without editing them.
- Administration shell with assignment form and governance boundaries. Preview never changes a user's actual role.
- Floating bottom toast, stable employee scroll after save, retained evidence after level changes, expandable definitions, saved-progress gating and confirmation dialogs.
- Manager overview metrics derived from loaded/sample assessments; no fabricated live executive KPIs.

## Current integration boundary — read before live pilot

All five endpoint URLs are configured. **Auth and Employee are implemented against locally available request/response evidence. Manager review is live-enabled against owner-supplied run-history evidence; Development live operations remain disabled until their exact payload/response mappings are supplied and verified. Assignment v2 is enabled using owner-supplied run-history evidence.** The referenced conversation preview does not contain those complete contracts. Endpoint availability alone is not a verified contract.

The complete role-play experience works without live API calls. It uses a draft ETM catalog shared across sample profiles solely to demonstrate UX. Watchara's real SR targets must come from the backend; sample targets are not an approved SR requirement mapping. Sample ratings and team counts are clearly labeled. Role-play changes stay in memory and reset when the page reloads.

`docs/BACKEND_CONTRACTS.md` records the evidence, missing mappings and integration format. Do not enable live writes by guessing action names or fields. Development evidence specifically restricts edits to ADMIN/reviewer and DRAFT plans; saving sets an action to PLANNED. No unsupported employee self-service write or action-completion API is assumed.

## Temporary demo configuration

`config.js` is the **single published endpoint configuration** for this temporary demo/pilot. The owner explicitly accepted exposure of Power Automate signed URLs to let testers open one URL without entering API URLs. These URLs are visible both in the public repository and in the browser; separation from app logic does not conceal them. Do not copy them into documentation, screenshots, tests, logs or issue descriptions. Rotate/revoke the signatures after the pilot, and replace this arrangement with authenticated server APIs before production.

`config.example.js` contains blank endpoint values and the contract-map slot. `config.local.js`, `.env*`, dependencies and test artifacts are ignored. A local ignored file is not deployed by the existing workflow, so it cannot configure the hosted website on its own. To change the pilot endpoints, update `config.js` once, then deploy. Config values override session endpoint values and invalidate an existing login when endpoints change.

Session tokens are held only in `sessionStorage`. Sign out clears tokens and reloads endpoint configuration. Server-side role, ownership, workflow, expiry and completeness enforcement remains authoritative. Hidden menus and role-play identities do not authenticate users. No credentials are added to the page URL.

## Run and verify

Serve this directory with any static HTTP server, for example `python -m http.server 8080`, then open `http://localhost:8080`. The configured site starts at OTP sign-in. Choose **Explore role-play demo** for an offline sample. CORS must allow the hosted origin for live requests.

Browser regression tests: install Playwright in your development environment, then run `node verify.cjs`. The test uses installed Chrome at its standard Windows path; adjust `executablePath` for another environment. Tests intercept endpoints at reserved `.test` domains, never read real config values, send no OTP mail and make no corporate API calls. Screenshots and results are written under ignored `test-results/`.

Drafts remain in tab memory. Reloading or closing the tab loses unsaved drafts; the browser warns on leaving. Failed writes retain drafts. Input entered during a save remains dirty after the earlier response succeeds. Writes are not automatically retried because a timeout may occur after the backend commits a change.

## Deploy

Commit the root files to `main`; the existing Azure workflow publishes them. Verify the exact commit's workflow conclusion, then open `https://orange-forest-067e00310.1.azurestaticapps.net` and confirm the new UI and all three assets load. Follow `docs/TEST_CHECKLIST.md` for live UAT. A successful hosting deployment is not proof of live API lifecycle acceptance.

## Assign Assessment increment

Manager Workspace enables live Assign Assessment for authenticated MANAGER/ADMIN. Select **รอบประเมิน**, enter the employee email, click **ตรวจความพร้อม**, then **สร้างแบบประเมิน** when ready. The server resolves the profile. Create always re-previews and is guarded by normalized pilotCanAssign plus zero blockers. DRAFT pilot profiles are permitted when the backend says pilot-ready. Both not-ready and duplicate 409 responses are distinguished. See docs/BACKEND_CONTRACTS.md for evidence and remaining live UAT limits. Run node verify-assignment.cjs for browser checks against mocked, verified response shapes. No OTP or live assignments are created by those tests.

`assessmentCycles` in `config.js` and `config.example.js` holds confirmed `{label, cycleKey, type: 'PILOT', active: true}` entries. The confirmed round is **รอบทดลองประเมิน ETM 2026 — PILOT**, internally `ETM_UI_DEMO_2026`. One active supported round is automatically selected; multiple rounds require selection; no rounds disables readiness and creation. Raw keys appear only as option values and existing backend detail/error identifiers. Changing either input invalidates readiness. `assignmentCycles()` is the source adapter: replace its config source after a backend list-cycles contract and authorization rules are verified, keeping the normalized entries and UI. No list-cycles API is invented or called. Existing request fields and response mapping are unchanged.


Manager Development Plan uses a separate employee-scoped page with assessment/profile context. My Development remains self-only/read-only. Run node verify-development.cjs for routing and synthetic adapter regression tests. Production Development operations remain gated pending exact backend contract evidence; see docs/BACKEND_CONTRACTS.md.
