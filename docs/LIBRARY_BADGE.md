# Library groups — 5 November 2026

Supersedes the per-item badge shipped in 300edf3. YOUR COMPETENCIES groups navigation by the existing assessment.items[].competencyGroup metadata. Each Library appears once as a collapsible native disclosure with an item count. The first item's group starts open; other groups start closed and can be expanded independently. Missing metadata uses a neutral Other competencies group. SharePoint-style {Value} fields remain supported. No title mapping or hardcoded Library names.

Navigation retains original item indexes and completion markers. Grouping does not reorder assessment cards, alter ratings/targets, change API contracts or write Master Data. Next competency opens its destination's group and marks the corresponding sidebar item current. Large groups scroll inside the sidebar viewport; compact layouts use vertical groups.

Checks: JavaScript syntax; metadata grouping with noncontiguous Libraries, missing metadata, escaping, unchanged input and stable item indexes; local browser preview with 25 items, five Libraries and 13 SSHE items. Verified expansion/collapse, selection, cross-group Next navigation and no repeated per-item badges. The preview uses blank API configuration. Existing lifecycle suites/imports were not repeated.

The prior badge and controlled pilot selector were deployed in 300edf3 / c60366d. This group change requires its own reviewed main deployment. No security, backend, role, history or Master Data change is included in this commit.
