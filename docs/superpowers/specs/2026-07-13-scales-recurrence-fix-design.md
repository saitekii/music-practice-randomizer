# Scales Recurrence Fix

**Goal:** Fix the biggest finding from the second Learning Path critique round (`morecritique.txt`, see `docs/learning-path-design.md`'s open issues): harmonic minor, melodic minor, both pentatonics, and modes (taught in Phase 14, 15 stages) are never referenced by any stage after Phase 14, including the path's two later "everything" checkpoint stages.

## Background

Verified directly against the live `LEARNING_PATH` array: `All Extensions, All Keys` (end of Phase 16) and `Full Theory Workout` (end of Phase 19) both set `scales: ['scaleMajor', 'scaleNatMinor']` — capping scale content at exactly what Phase 9 already taught, ignoring everything Phase 14 added. A learner who finishes Phase 14 never sees these 5 scale types again for the rest of the 128-stage curriculum.

Intervals (Phase 18) have the identical problem but are explicitly out of scope for this build — deferred as a separate follow-up, since folding intervals into the existing 4-category capstones (`catDiatonic`+`catFunctional`+`catChords`+`catScales`) raises its own design question about whether a 5-category mega-stage is still coherent.

## Design

Widen the `scales` field on both existing capstone stages to include all 7 scale types, rather than adding new stages:

- `All Extensions, All Keys` (script.js:310): `scales: ['scaleMajor','scaleNatMinor']` → `['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes']`
- `Full Theory Workout` (script.js:351): same widening.

This is a pure data change — no new `LEARNING_PATH` entries, no `LEARNING_PATH_PHASES` count changes, no stage reordering. It doesn't introduce a new difficulty axis (scales is already an enabled category in both stages) — it widens an existing one, consistent with what these two stages are already meant to be: cumulative "everything so far" checkpoints.

Hint text on both stages stays unchanged: `All Extensions, All Keys`'s hint already only describes chord content (never mentioned scales even before this change), and `Full Theory Workout`'s hint ("...and scales — everything together") is generic enough to become *more* accurate once these scale types are actually included, not less.

Two other approaches were considered and rejected in favor of this one: widening only one of the two capstones (rejected — both stages are meant to be comprehensive reviews, no reason to leave one incomplete), and inserting a new dedicated mid-path "scales refresher" stage for genuine spaced repetition (rejected for this round as larger scope than needed — the two existing checkpoints already exist specifically to serve this "don't lose old content" purpose; a new stage can be revisited later if this fix isn't judged sufficient).

## Testing

No existing test references either stage's `scales` field (confirmed via repo-wide grep) — this needs new coverage:

1. `applyStage()` on each of the two stages checks all 7 scale-type checkboxes (`scaleMajor` through `scaleModes`), confirmed via the checkbox DOM state after applying.
2. A live-generation sanity check: with one of these stages applied and the pool restricted to scales only (or via direct `genScale()` calls), confirm harmonic minor / melodic minor / both pentatonics / modes can actually be produced — not just that the checkbox array contains the right strings, but that the generator actually honors them.
3. Regression: existing tests for these two stages (there are none referencing them specifically) and the broader Learning Path stage-count/phase-count assertions are unaffected, since stage count doesn't change.

## Documentation

Update `docs/learning-path-design.md`: refresh the `Content` column for both stages' table rows (Phase 16 and Phase 19 tables), and move this item from the "second critique round" open-issues bullet list to resolved (matching the pattern already used for the `getExpectedPCs()`/chords-checkbox item, which was documented as "Resolved" in Phase 17's prose rather than deleted outright — this one should note it as fixed with a date, not deleted, so the historical reasoning stays visible). Update the `learning-path-audit.md` memory entry with a short note once shipped.
