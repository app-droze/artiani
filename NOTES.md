# NOTES

- 2026-02-24: Initialized Phase 0. Updated AGENTS.md and created repo skills + audit checklist in progress.
- 2026-02-24: Added repo skills under .agents/skills and refreshed AGENTS.md per new workflow.

## Phase 1 Audit (sequential — sub-agents not available)

### Prioritized checklist
1) i18n-sweep: move remaining user-facing literals into EN/KA dictionaries
- Why: Requirement: no hardcoded UI copy.
- Files: web/app/[lang]/layout.tsx, web/app/[lang]/product/[slug]/page.tsx, web/src/components/CheckoutForm.tsx, web/src/components/ProductDetails.tsx, web/src/components/CartView.tsx, web/src/i18n/en.json, web/src/i18n/ka.json.
- Risk: Low (string-only changes).
- Test/Verify steps: Run `npm run lint` and `npm run build`. Check `/ka/product/*` and `/en/product/*` titles, checkout confirmation text, cart summary lines.

2) Remove unused i18n keys + stale “campaign” copy where still referenced
- Why: Reduce leftovers / context bloat; align copy with current museum-minimal direction.
- Files: web/src/i18n/en.json, web/src/i18n/ka.json; confirm usage in web/src/components/ProductDetails.tsx and cart/checkout.
- Risk: Low (copy cleanup).
- Test/Verify steps: Lint/build; spot-check product details empty-options text and cart empty subtitle.

3) Cleanup unused imports / minor leftovers
- Why: Reduce noise and keep diffs clean.
- Files: web/src/components/ShopCatalog.tsx (unused import), any unused helpers found by lint.
- Risk: Low.
- Test/Verify steps: `npm run lint` clean.

4) UI component dedupe (optional, small)
- Why: Reduce repeated button/chip markup without changing layout.
- Files: web/src/components/*, possibly add `web/src/components/ui/*`.
- Risk: Medium (could shift layout if careless).
- Test/Verify steps: Lint/build; visually compare buttons/chips across Home, Product, Cart, Checkout.

5) Next.js sanity pass
- Why: Catch App Router pitfalls (metadata, async params, Link scroll).
- Files: web/app/[lang]/*, web/src/components/ProductDetails.tsx, web/src/components/ShopCatalog.tsx.
- Risk: Low to medium.
- Test/Verify steps: Run dev server, open `/ka/catalogue`, `/ka/product/[slug]`, `/en/product/[slug]` and verify scroll + titles.
- 2026-02-24: Item #1 i18n-sweep: moved remaining UI literals to EN/KA (site title, separators, qty labels, bank fields) and wired usages. Verify: `npm run lint`; `npm run build` (fails to fetch Google fonts offline).
- 2026-02-24: Item #2 cleanup: removed unused i18n keys (home.hero.kicker, shop.kicker/subtitle/card_view, product.personalization_subtitle/campaign_price) and cleaned “campaign” copy. Verify: `npm run lint`; `npm run build` fails offline Google Fonts.
- 2026-02-24: Item #3 cleanup: fixed ShopCatalog missing useState import (runtime error) and kept imports tidy. Verify: `npm run lint`; `npm run build` fails offline Google Fonts.
- 2026-02-24: Item #4 ui-components: added reusable Chip and applied to catalogue filters + cards toggles; suppressed cart count hydration mismatch. Verify: `npm run lint`; `npm run build` fails offline Google Fonts.
