---
name: learning-path-stages
description: Use when adding, removing, or reordering stages or phases in script.js's LEARNING_PATH or LEARNING_PATH_PHASES arrays — covers the column-alignment conventions and the pre-flight adjacency-grep discipline this project has learned the hard way, across many rounds, before this skill existed to write it down.
---

# Learning Path Stage Editing

`LEARNING_PATH` (script.js) is a large, still-growing array of stage objects. `LEARNING_PATH_PHASES` is a separate, parallel array of `{ name, count }` entries describing named groupings of consecutive stages — a `count`-based design (not a per-stage `phase` field) chosen specifically so a stage insertion only requires bumping one phase's `count` rather than touching every affected stage object.

## Column alignment

Stage lines are hand-formatted to align at fixed character columns, per field, so the array reads like a table. **The exact columns are NOT a single global constant — they differ by which optional fields a stage has, and they drift over time as longer `name`/`hint` strings get added.** Never reuse a column number from a prior round without re-measuring against live sibling lines first.

As of 2026-07-15, three families exist (verified live against `script.js` — re-verify before trusting these again):

| Family | Fields | `cats:` | `notes:` | `chords:` | `scales:` | `progressions:` | `requireProgressionInversions:` | `timer:` |
|---|---|---|---|---|---|---|---|---|
| Plain | cats/notes/chords/scales/timer | 146 | 179 | 252 | 341 | — | — | 381 |
| +progressions | adds `progressions` | 146 | 179 | 252 | 341 | 381 | — | 449 |
| +progressions+inversions | adds `progressions` and `requireProgressionInversions` | 147 | 180 | 253 | 342 | 382 | 450 | 486 |

**Before writing any new stage line:**
1. Identify which family it belongs to (which optional fields it has).
2. Find 2-3 existing sibling stage lines in that exact family.
3. Measure their actual column offsets with a short Node script, e.g.:
   ```js
   const fs = require('fs');
   const lines = fs.readFileSync('script.js', 'utf8').split('\n');
   const line = lines.find(l => l.includes("name: 'SOME_SIBLING_STAGE_NAME'"));
   ['cats:','notes:','chords:','scales:','progressions:','requireProgressionInversions:','timer:']
     .forEach(m => { const i = line.indexOf(m); if (i !== -1) console.log(m, i); });
   ```
4. Build new lines with a `padTo`-style helper targeting those exact measured columns — never eyeball spacing.
5. After writing, re-measure the new lines themselves and confirm they land on the same columns as the siblings.

## Pre-flight adjacency grep — required before dispatching any implementer

Before finalizing a plan that inserts, deletes, or reorders `LEARNING_PATH` content, grep the whole test suite for BOTH of these, on BOTH sides of every insertion/deletion point:

1. **Simple stage-name adjacency assertions** — `names.indexOf('X')`, `names[idx + 1]`, etc.
2. **`slice()`-based range checks** — `LEARNING_PATH.slice(idxA, idxB)`, "count stages between X and Y."

Check adjacency at **both** the `LEARNING_PATH` (stage) level and the `LEARNING_PATH_PHASES` (phase) level — these are two separate arrays, and a phase-array-level assertion (e.g. "which phase comes right before phase X") can break even when no stage-level assertion is affected. This exact gap was missed by a plan's own pre-flight grep on 2026-07-15 and only caught by an implementer mid-task.

If the round both inserts AND deletes content (rare, but has happened), grep both the insertion boundary and the deletion boundary — they are usually different locations in the file.

## Phase-count bookkeeping

`LEARNING_PATH_PHASES`'s `count` fields must sum to exactly `LEARNING_PATH.length`. Any insertion or deletion must update the relevant phase's `count`, or add/remove a whole phase entry if a whole phase is being added or removed. Verify with a quick live check before considering a round done:

```js
LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0) === LEARNING_PATH.length
```

## Ledger hygiene

`.superpowers/sdd/progress.md` (the plan-execution ledger) has no automated pruning. Periodically — every several rounds, not every round — archive sections for plans that are fully shipped (final review clean, pushed) into `.superpowers/sdd/progress-archive.md`, leaving only the current/most-recent plan's section in the live ledger. This isn't required before every round, but doing it occasionally keeps the ledger from growing forever.
