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

## Skills
### Available skills
- i18n-sweep: Find and eliminate hardcoded UI strings by moving them into EN/KA dictionaries with parity. (file: /Users/giorgimargiani/Projects/artiani/.agents/skills/i18n-sweep/SKILL.md)
- nextjs-sanity: Check App Router pitfalls (async params, metadata, Link scroll, Image usage) and propose safe fixes. (file: /Users/giorgimargiani/Projects/artiani/.agents/skills/nextjs-sanity/SKILL.md)
- route-hygiene: Ensure only app/[lang] routes are active, remove legacy routes, and verify middleware redirects. (file: /Users/giorgimargiani/Projects/artiani/.agents/skills/route-hygiene/SKILL.md)
- ui-components: Extract repeated UI patterns into reusable components without changing behavior or layout. (file: /Users/giorgimargiani/Projects/artiani/.agents/skills/ui-components/SKILL.md)
- codex-workloop: Small-commit workflow for this repo: plan, edit, lint/build, fix, commit, update NOTES. (file: /Users/giorgimargiani/Projects/artiani/.agents/skills/codex-workloop/SKILL.md)
