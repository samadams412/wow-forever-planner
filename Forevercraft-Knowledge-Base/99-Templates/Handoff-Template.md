---
type: handoff
created: YYYY-MM-DD
tags: [forevercraft]
status: active
detail: full-log
---

# <Topic> handoff

Date: YYYY-MM-DD · Repo: `wow-forever-planner` · Branch: `<branch>` · Base commit: `<sha>`

One line up top stating the commit/deploy state in plain terms: e.g. "nothing
committed, four commits staged" or "committed and deployed, commit `<sha>`".
Don't make the reader infer this from the sections below.

## What exists now

Grouped by commit (even if not yet committed — group by what *would* be one
commit), each with the specific files touched and a sentence on what changed
and why. If nothing is committed yet, say so here too, not just at the top.

### 1. <commit/change group name>
- `path/to/file` (new|modified): what it does.
- ...

### 2. <next group>
- ...

## Decisions and caveats

Numbered list. Each item: the decision or behavior, why it's that way, and
what it trades off. Include things a future session would otherwise silently
violate (e.g. "aggregates live in Redis hashes, not a static file, because
Vercel functions can't write repo files").

## Verification done

What was actually run, against what (real service vs. a local stand-in —
say which), and the actual results/numbers, not just "tested, works". If
something was checked in a browser, say what was clicked and what was
observed. If a test file/script was used, say where it lives (scratchpad,
not the repo, unless it's meant to stay).

## Not verified / blocked

Explicit list of what was *not* checked and why (no credentials, no
dashboard access, destructive, out of scope this session). Don't let this
section go missing just because most things *were* verified — say what
wasn't, even if the list is short.

## Open items / next steps

Concrete, actionable, ordered if there's a natural order. Distinguish
"needs the owner's decision" from "needs someone to just do the work."

## Session notes

Anything that doesn't fit above: corrections to an earlier summary, things
that turned out to be red herrings, tooling quirks hit along the way,
pointers to related docs (`Architecture.md`, `docs/*.md`, other handoffs).

---

## Notes on using this template

- **Say the commit state in plain language, every time.** The most common
  mistake so far has been a prose summary claiming commits were "staged"
  when nothing was. If you're not sure, run `git status` and quote it.
- **"What exists now" is a changelog, not a tour.** List files, not
  paragraphs of narrative, in that section — narrative belongs in
  Decisions/Session notes.
- **Verification needs numbers and the target.** "Tested the rollup" is not
  verification; "ran it against the local stand-in, `read: 132, aggregated:
  130, expired: 1, malformed: 1`" is.
- **Small handoffs can drop empty sections**, but keep the heading order.
  A one-file bugfix doesn't need "Not verified" padded out — just omit it or
  write "n/a".
- **This template was written 2026-10-06** from the pattern already used in
  session handoffs (see
  `Forevercraft-Knowledge-Base/03-Handoffs/infrastructure/2026-10-06-build-tracking-infrastructure.md`
  for a full example across several sessions on one feature). It supersedes
  the shorter Current State / Active Context / Files Modified / Next Steps
  shape used in earlier handoffs (e.g.
  `03-Handoffs/infrastructure/2026-09-30-vercel-function-size.md`) — that
  shape is still fine to skim for an example of a single-session
  investigation write-up, but new handoffs should use the structure above.
