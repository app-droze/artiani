---
name: route-hygiene
description: Ensure only app/[lang] routes are active, remove legacy routes, and verify middleware redirects.
---

# route-hygiene

## When to use
- Locale routing or middleware changes are requested.
- Legacy non-i18n routes might still exist.

## Workflow
1) Inspect `app/` for non-`[lang]` routes.
2) Verify `middleware.ts` locale redirects and matchers.
3) Remove legacy routes only after confirming redirects.
4) Ensure internal links always include current `lang` segment.

## Checks
- `/` and bare paths redirect to `/<locale>/...`.
- No duplicate pages outside `app/[lang]`.
