---
name: ui-components
description: Extract repeated UI patterns into reusable components without changing behavior or layout.
---

# ui-components

## When to use
- Repeated JSX blocks appear across pages/components.
- Refactor is needed without visual/behavior change.

## Workflow
1) Identify duplicated UI patterns (buttons, cards, option rows).
2) Create small components in `src/components/` (or `src/components/ui/` if it exists).
3) Keep props minimal and preserve className/layout.
4) Replace duplicates with the new component.

## Checks
- No behavior/layout changes.
- All strings still sourced from i18n.
