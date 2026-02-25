---
name: route-hygiene
description: Ensure only app/[lang] routes are active, remove legacy routes, and verify middleware redirects.
---

# route-hygiene

## When to use
- Locale routing or middleware changes are requested.
- Legacy non-i18n routes might still exist.

## Workflow
1) Inspect `web/app/` for user-facing routes outside `web/app/[lang]`.
2) Verify `web/middleware.ts` locale redirects and matchers.
3) Remove legacy routes only after confirming redirects.
4) Keep non-page app entries intact (`web/app/api`, root `layout.tsx`, icons, `globals.css`).
5) Ensure internal links always include current `lang` segment.

## Checks
- `/` and bare paths redirect to `/<locale>/...`.
- No duplicate user-facing pages outside `web/app/[lang]`.
- `/api/*` remains accessible.
