---
name: codex-workloop
description: Small-commit workflow for this repo: plan, edit, lint/build, fix, commit, update NOTES.
---

# codex-workloop

## When to use
- Any multi-step change or refactor.

## Workflow
1) Outline a small step and expected files.
2) Edit with minimal diffs.
3) Run `npm run lint` then `npm run build`.
4) Fix failures immediately.
5) Update `NOTES.md` (what/why/next).
6) Commit with a clear message.
7) If work extends, run `/compact` to reduce context.
