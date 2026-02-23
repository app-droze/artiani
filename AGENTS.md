# AGENTS.md — Artiani campaign micro-shop

## Goal
Build a minimal mobile-first campaign shop (catalog -> product detail options -> cart -> checkout form).
No payment gateway yet: checkout shows bank transfer instructions + order code.

## Guardrails
- Keep it minimal: no heavy UI libraries unless explicitly asked.
- Prefer plain CSS modules or Tailwind only if already enabled.
- No database for MVP. Use localStorage for cart. Orders can be email-only later.
- Small diffs: propose changes in chunks, ask before large refactors.

## Commands
- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint` (if configured)
- Typecheck/build: `npm run build`

## Project structure
- `src/data/products.ts` for the catalog
- `src/lib/cart/*` for cart + pricing logic
- `app/shop`, `app/product/[slug]`, `app/cart`, `app/checkout`
