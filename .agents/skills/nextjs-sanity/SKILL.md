---
name: nextjs-sanity
description: Check App Router pitfalls (async params, metadata, Link scroll, Image usage) and propose safe fixes.
---

# nextjs-sanity

## When to use
- Routing, metadata, or Image rendering issues appear.
- Next.js version updates or errors mention async params.

## Workflow
1) Check `web/package.json` and use patterns compatible with the active Next.js version (currently 16.x).
2) Verify server components and `generateMetadata` handle `params`/`searchParams` correctly for that version (await when required).
3) Review `<Link>` usage (correct href, scroll behavior).
4) Review `<Image>` usage with `fill` and parent positioning.

## Checks
- No runtime warnings/errors from dynamic API misuse (`params`/`searchParams`).
- Metadata titles render per locale.
- Images render without layout shift.
