# NOTES

- 2026-02-24: Initialized Phase 0. Updated AGENTS.md and created repo skills + audit checklist in progress.
- 2026-02-24: Added repo skills under .agents/skills and refreshed AGENTS.md per new workflow.
- 2026-02-25: Removed OTP/Twilio verification artifacts (deleted OTP/lookup/bid API routes, removed track page/component/lib, removed OTP auction + track i18n keys, and removed Twilio env notes from AGENTS.md), and fixed codex-workloop SKILL frontmatter YAML quoting. Why: roll back SMS verification and restore pre-OTP behavior. Next: if tracking/bid verification is needed later, reintroduce with a non-Twilio flow behind a dedicated feature branch.

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
- 2026-02-24: Item #5 nextjs-sanity: fixed type cast in ShopCatalog filter labels (kind vs type). Verify: `npm run lint`; `npm run build` fails offline Google Fonts.
- 2026-02-24: Disabled Google Fonts fetch by removing next/font usage and setting serif font stack in globals. Verify: `npm run lint`; `npm run build` fails in sandbox (Turbopack PostCSS process permission).
- 2026-02-24: Fixed build type error by widening layout params to string and normalizing via isLocale/defaultLocale. Verify: `npm run lint`, `npm run build`.
- 2026-02-24: Fixed cart count hydration by loading localStorage on mount (CartProvider) and keeping save guard. Verify: `npm run lint`, `npm run build`.
- 2026-02-24: Adjusted cart hydration to use useLayoutEffect so header count updates before paint. Verify: `npm run lint`, `npm run build`.
- 2026-02-24: Updated header layout (nav links next to brand + active state) and enlarged PDP back button. Verify: `npm run lint`, `npm run build`.
- 2026-02-24: Added underline active state for header nav links. Verify: `npm run lint`, `npm run build`.
- 2026-02-24: Centered brand and stacked nav under it on mobile in SiteNav. Verify: `npm run lint`, `npm run build`.
- 2026-02-25: Removed the per-item "each" suffix from cart line-item prices so rows show only the price value. Verify: `npm run lint`, `npm run build`.
- 2026-02-25: Fixed cart reset on language switch by skipping the first post-hydration cart persistence write in CartProvider. Verify: `npm run lint`, `npm run build`.
- 2026-02-25: Added checkout-style phone country picker to painting auction bid form (country code + local number input). Verify: `npm run lint`, `npm run build`.
- 2026-02-25: Added minimal server-only infra for Supabase + Resend (`env.server.ts` validation and memoized `getSupabaseAdmin`) with required env checks including `ORDERS_ADMIN_EMAIL`. Verify: `npm run lint`, `npm run build`.
