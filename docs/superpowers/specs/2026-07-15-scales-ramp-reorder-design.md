# Major & Minor Scales Ramp — Reorder + Relative-Pair Redesign

**Goal:** Replace the existing "Major scales" phase (currently very late in the Learning Path, major-only, thinly ramped) with a new "Major & Minor Scales" phase inserted much earlier, teaching Major and Natural Minor scales together as relative-key pairs, ramped by key-signature accidental count.

## Background

A fresh audit of the Learning Path (independent of curriculum-content review, prompted by direct user observation) found three real problems with how scales are currently taught:

1. **The Major scales ramp jumps straight from 1 key to 7** (`First Scale`: C only → `All Natural Scales`: all 7 naturals in one step), unlike the Major *chords* ramp, which builds up one key at a time (`First Chord` → `Two Chords` → `Three Chords` → `Add D Major` → `Add A Major` → `Add E Major` → `All Natural Majors`).
2. **There is no dedicated Natural Minor scale phase at all.** Natural minor scale is first introduced at the `Add Minor Scale` stage — buried inside the later `Combine chords + scales` phase, combined with chords, at full 12-key complexity, with a 10-second timer, all in one step. This is the worst version of the "too many new things in one stage" problem this project has fixed elsewhere in the path.
3. **The whole scales phase sits far too late.** It's currently positioned after Accidentals, both Progressions-in-New-Keys phases, Left-Hand Voicing, Left-Hand Progressions, Triad Inversions, Progressions-Inverted, and Two-Handed Progressions — 8 whole phases of pure chord/progression content before a scale ever appears, disconnected from everything the learner has already built up.

**The relative-pair insight**: this project's own `Minor Progressions in New Keys` phase already ramps through minor keys in an order that is, verified directly against `Progressions in New Keys`' major-key groupings, exactly the relative minor of each major bucket:

| Bucket | Major roots (existing) | Minor roots (existing) | Relative-pair check |
|---|---|---|---|
| 0–1 accidentals | C, F, G | A, D, E | A is relative of C, D of F, E of G ✓ |
| +2 accidentals | + D, B♭ | + G, B | G is relative of B♭, B of D ✓ |
| +3 accidentals | + A, E♭ | + C, F♯ | C is relative of E♭, F♯ of A ✓ |
| +4 accidentals | + E, A♭ | + F, C♯ | F is relative of A♭, C♯ of E ✓ |

This wasn't designed as a relative-pair system when built (it was built independently for progressions), but it already *is* one. The new scales phase reuses these exact same key groupings rather than inventing new ones — keeping the whole path's notion of "which keys are available at this accidental count" consistent everywhere it appears.

## Design

**New phase: "Major & Minor Scales"**, 6 stages, inserted immediately after `Accidentals one at a time` (right after its last stage, `Speed Up`) and immediately before `Progressions in New Keys` (currently the next phase in that slot).

| # | Stage name | Notes (cumulative union of that bucket's major ∪ minor roots) | Scales | Timer |
|---|---|---|---|---|
| 1 | Meet the Scales | C, A | scaleMajor, scaleNatMinor | off |
| 2 | Scales, 0–1 Accidentals | C, D, E, F, G, A | scaleMajor, scaleNatMinor | off |
| 3 | Scales, 2 Accidentals | C, D, E, F, G, A, Bb, B | scaleMajor, scaleNatMinor | off |
| 4 | Scales, 3 Accidentals | C, D, Eb, E, F, F#, G, A, Bb, B | scaleMajor, scaleNatMinor | off |
| 5 | Scales, All 12 Keys | C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B | scaleMajor, scaleNatMinor | off |
| 6 | Scale Timer | C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B | scaleMajor, scaleNatMinor | 15 |

Each row's note list is the union of that accidental-count bucket's major roots (from `Progressions in New Keys`) and minor roots (from `Minor Progressions in New Keys`), computed exactly and sorted in `NOTES[]` chromatic order (`C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B`) — not approximated. **This computation surfaced a real structural finding during spec self-review**: because each bucket's major roots and minor roots are deliberately complementary (verified above — each alone is "almost all keys," missing exactly the 3 notes the other bucket supplies), the *combined* union already reaches all 12 notes at the "3 Accidentals + new" bucket (row 5) — one full ramp step earlier than either scale type reaches 12 keys on its own in the existing progression phases. A separate "collect the last few notes" stage after row 5 would be identical in content to row 5 itself, so the ramp is 6 stages, not 7 — no redundant final key-count step. The note-count progression across rows 1–5 is 2 → 6 → 8 → 10 → 12, each step adding 2–4 new notes, which is itself a reasonably smooth ramp with no gap needing a 7th stage.

There is no separate major-only vs. minor-only root selector in this app — `notes` is a single shared root-enable list, and `getExpectedPCs()`/`genScale()` already resolve scale type and root independently from that one pool (confirmed by inspection, no code change needed for this).

Each stage's `cats: ['catScales']`, `chords: []`. Stage 1 ("Meet the Scales") mirrors the wording pattern of the existing chords phase's own first relative-pair stage (`First Minor`: "C + A — a relative pair (Major and Minor)").

**The old "Major scales" phase is deleted, not duplicated.** Its 4 stages (`First Scale`, `All Natural Scales`, `Scale Timer`, `All 12 Scales`) and its `LEARNING_PATH_PHASES` entry are removed entirely — fully absorbed into the new phase above. `LEARNING_PATH_PHASES.length` stays 25 (one phase removed, one added), but the new phase's position in the array moves from index 14 (0-indexed, currently between `Two-Handed Progressions` and `Combine chords + scales` — verified directly against the live array) to index 7 (0-indexed, between `Accidentals one at a time` at index 6 and `Progressions in New Keys`, which shifts from index 7 to index 8 — also verified directly against the live array).

**`Add Minor Scale`** (in the later, unchanged-in-position `Combine chords + scales` phase) is NOT deleted — it remains a legitimate stage, since it's the first time minor *scale* gets combined with *chords* specifically, a genuinely new combination even once minor scale itself is already familiar from the new earlier phase. Only its `hint` text changes, from the current "Natural Minor scale added to the mix" (which implies minor scale itself is new — no longer true) to text reflecting that minor scale is already known and is now being folded into combined chord+scale practice. Its `notes`/`chords`/`scales`/`timer` fields are unchanged.

**`Scales beyond natural minor`** (the later phase covering Harmonic Minor, Melodic Minor, Pentatonics, Modes) needs no changes — its name and content already correctly assume Major and Natural Minor scales are known by that point, which remains true (now true much earlier in the path than before, but still true at that phase's position).

**Net stage count**: 152 → 154 (+6 new, −4 deleted). `LEARNING_PATH_PHASES.length` stays 25.

## Testing

- The new "Major & Minor Scales" phase exists, positioned immediately after `Accidentals one at a time`'s last stage and immediately before `Progressions in New Keys`'s first stage.
- Each of the 6 new stages' `notes`/`scales`/`timer` fields exactly match the table above (deduplicated root lists computed precisely, not approximated).
- The old `Major scales` phase and its 4 stages no longer exist anywhere in `LEARNING_PATH`.
- `LEARNING_PATH_PHASES.length` stays 25; total stage count is 154.
- `Add Minor Scale`'s `notes`/`chords`/`scales`/`timer` fields are unchanged from today — only its `hint` text differs.
- `getExpectedPCs()`/`genScale()` require zero code changes — both already resolve scale type and root independently from whatever `notes`/`scales` a stage specifies, verified by inspection (no root-note-per-scale-type coupling exists in the current implementation).
- Regression: full pre-flight grep (this project's established discipline) for both simple stage-adjacency assertions AND `slice()`-based "count stages between X and Y" range checks referencing any of: `Speed Up`, `First Song, New Keys` (the insertion boundary), `First Scale`, `All Natural Scales`, `Scale Timer`, `All 12 Scales`, `Two-Handed Progressions`, `Mix Chords + Scales` (the deletion boundary — both the phase immediately before and after the deleted stages need checking), and `Add Minor Scale`. Given this is the first round in this project's history that both inserts AND deletes/moves an entire phase in the same change, the pre-flight grep needs to check deletion-boundary adjacency (stages that referenced `Major scales`'s old neighbors) in addition to the usual insertion-boundary checks.
