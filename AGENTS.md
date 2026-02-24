# AGENTS.md — Artiani

## Setup
- Install: `npm install`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`

## Code Style
- TypeScript + Next.js App Router.
- i18n only: all user-facing strings must live in `src/i18n/en.json` and `src/i18n/ka.json`.
- Keep current UI direction: museum-minimal.
- No new libraries unless explicitly requested.

## Routing & i18n
- Locales: `ka` (default) and `en`.
- App Router locale segment: `app/[lang]/...`.
- Middleware handles locale redirects + `NEXT_LOCALE` cookie.
- Internal links must preserve the current `lang` segment.
- Keep cart persistence key unchanged (localStorage).

## How We Work
1) Plan small, reviewable steps.
2) Edit with minimal diffs.
3) Run tools (lint/build) and fix issues.
4) Commit with a clear message.
5) Update `NOTES.md` with: what changed, why, what’s next.
