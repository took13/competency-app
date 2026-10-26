# UI v2 manager feedback — implementation and UX backlog

Delivered 2026-10-26 as an incremental presentation change.

## Status semantics

| Source state | Presentation | Visible meaning |
| --- | --- | --- |
| NOT_STARTED, DRAFT, ASSIGNED, unknown | Neutral gray | Not started / not saved / original state |
| IN_PROGRESS, PLANNED | Blue | Work underway / action planned |
| SUBMITTED, WAITING_REVIEW, UNDER_REVIEW | Amber | Awaiting manager review |
| CONFIRMED, COMPLETED, DONE | Green | Confirmed / saved / complete |
| BLOCKED, ERROR | Red | Blocked / error |

`statusTone` and `statusBadge` centralize display aliases without changing server values. PLANNED means scheduled work, not completed development. Unknown statuses retain their source label and use neutral styling. Unsaved edits use blue and the explicit “Unsaved changes” label even when an older saved version exists. Competency borders and navigation update after edits/saves without replacing inputs or moving scroll. The assessment remains amber after submission even though individual saved competencies are green. Manager item review completion is distinct from whole-assessment confirmation.

Assignment badges, assessment progress, competency cards/save badges/navigation, manager queue/header/item states, summary chips, development plan and action states share tokens. Error feedback retains visible messages. Status labels, reviewed/saved text, and selected `aria-pressed` accompany color; zero/missing levels remain distinguishable.

## Level emphasis

Employee cards show Target Level and Self Level, updated immediately with the selection. Level controls use 34px numerals (30px on mobile), at least 82px height, a filled selected state and stronger border. Existing keyboard button behavior, focus indicators and evidence remain intact. Manager cards show Target / Employee Self / Manager Validated side by side, including an explicit dash for an unreviewed level; the adjustment selector is also enlarged. Confirmed development results show Validated / Target / Gap; zero gaps display 0. Metric numerals use 38px desktop / 34px mobile against 12px labels. Reviewed feedback uses the same level metric.

## Validation

Run `node verify.cjs` and `node verify-ux.cjs` with Playwright available. Tests mock API endpoints and never send real OTPs or corporate writes. Added checks cover all status aliases, pending → dirty → saved → submitted presentation, selected state, immediate Self Level updates, manager/development metric count and font ratio, DRAFT → PLANNED action semantics, and page overflow at 320/390/768px across Employee, Manager and Development. Existing workflow, draft, save concurrency, payload and session regressions remain in place. Browser screenshots are generated under ignored `test-results/`.

No backend contracts, endpoint configuration or GitHub Actions changes. Existing unverified live Manager/Development integrations remain gated as documented in BACKEND_CONTRACTS.md.

## UX backlog

- Manager-led UAT at normal browser zoom and 200% zoom, including keyboard navigation and screen reader review of status announcements.
- Validate vocabulary with Thai-speaking pilot users before adding a full localization layer.
- Consider a shared large-button level picker in the Manager adjustment panel after UAT; this delivery preserves its established select-and-reason workflow.
- SVP dashboard remains a separate scope requiring approved measures, permissions and data contracts; no fabricated executive metrics are added.
