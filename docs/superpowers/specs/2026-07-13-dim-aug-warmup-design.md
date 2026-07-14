# Meet Diminished / Meet Augmented Warmup

**Goal:** Fix the critique's "worst spike in the doc" — `Add Dim & Aug` (Phase 8) currently introduces two brand-new chord qualities the learner has never seen, simultaneously, at all 12 keys, with inversions on, with a 10-second timer. Give each quality its own single-key, untimed, root-position-only intro first.

## Background

Checked directly against the live `LEARNING_PATH` array: `Add Dim & Aug` (script.js:254) sits immediately after `All 12, Inverted` (all 12 keys, Major/Minor, inversions on, 10s timer) and adds `chordDiminished`+`chordAugmented` with no change to keys, inversions, or timer — a learner's first-ever exposure to a diminished or augmented triad happens at full complexity in every other dimension simultaneously.

A near-identical problem (two new chord qualities debuting together) was already fixed once this session for Half-Diminished/Diminished-7 (Phase 18) — but that fix kept inversions on and combined both qualities into one intro stage, only reducing keys and removing the timer. Diminished/Augmented is a different case: these two triads are the pair a genuine beginner is most likely to confuse with each other (both are the "symmetric, neither-major-nor-minor" sound), unlike Half-Dim/Dim7 which are already more clearly distinct in character. Decided during brainstorming: introduce them **separately**, one fully absorbed before the next, rather than matching the Half-Dim/Dim7 shape — a deliberate pedagogical choice for this specific pair, not an inconsistency with the earlier fix.

## Design

Two new stages inserted between `All 12, Inverted` and the existing `Add Dim & Aug` (which itself is unchanged — it becomes the "combine what you just learned with inversions + all keys" step rather than a first exposure):

1. `'Meet Diminished'` — C-only, `chords: ['chordMajor','chordMinor','chordDiminished']` (no `inversions`), untimed.
2. `'Meet Augmented'` — C-only, `chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented']` (no `inversions`, cumulative — keeps Diminished), untimed.

Resulting ramp: `All 12, Inverted` → `Meet Diminished` → `Meet Augmented` → `Add Dim & Aug` → `Triad Mastery`.

No changes to `Add Dim & Aug` or `Triad Mastery` — this is a pure insertion. `LEARNING_PATH_PHASES`'s `'Triad inversions'` entry count goes from 8 to 10 (no new phase — both stages land inside the existing Phase 8).

Verified against the live 134-stage array: neither `'Meet Diminished'` nor `'Meet Augmented'` collides with any existing stage name; `All 12, Inverted` and `Add Dim & Aug` are confirmed adjacent (indices 40/41).

## Testing

- Both new stages exist, in order, immediately between `All 12, Inverted` and `Add Dim & Aug`.
- `applyStage()` on `'Meet Diminished'`: checks C only, checks `chordMajor`/`chordMinor`/`chordDiminished`, leaves `chordAugmented` and `inversions` unchecked, timer off.
- `applyStage()` on `'Meet Augmented'`: same, plus `chordAugmented` also checked.
- `Add Dim & Aug` and `Triad Mastery` are unchanged (existing content, byte-identical to before this plan).
- `LEARNING_PATH_PHASES`'s `'Triad inversions'` count is 10; total stage count is 136 (134 + 2); phase count stays 21 (no new phase).
- Regression: full existing Learning Path test sweep, including the stale-count assertions that will need mechanical updates in whichever files hardcode the total (expected fallout, not a defect).
