---
name: nextjs-sanity
description: Check App Router pitfalls (async params, metadata, Link scroll, Image usage) and propose safe fixes.
---

# nextjs-sanity

## When to use
- Routing, metadata, or Image rendering issues appear.
- Next.js version updates or errors mention async params.

## Workflow
1) Verify server components unwrap `params` with `await` in Next.js 15.
2) Check `generateMetadata` for async params usage.
3) Review `<Link>` usage (correct href, scroll behavior).
4) Review `<Image>` usage with `fill` and parent positioning.

## Checks
- No 404s due to async params.
- Metadata titles render per locale.
- Images render without layout shift.
