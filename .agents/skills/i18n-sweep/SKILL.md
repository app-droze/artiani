---
name: i18n-sweep
description: Find and eliminate hardcoded UI strings by moving them into EN/KA dictionaries with parity.
---

# i18n-sweep

## When to use
- You see hardcoded UI copy in components/pages.
- New UI text must be added or existing text normalized.

## Workflow
1) Search for hardcoded strings in JSX/TSX (use `rg` for quotes and JSX text nodes).
2) Add new keys to `src/i18n/en.json` and `src/i18n/ka.json` with matching structure.
3) Replace strings with `t('key.path')` or dictionary lookup used in the file.
4) Ensure both locales render correctly.
5) Avoid touching product content localization (handled in `src/data/products.ts`).

## Checks
- No user-facing strings remain hardcoded.
- EN/KA dictionaries stay in sync.
