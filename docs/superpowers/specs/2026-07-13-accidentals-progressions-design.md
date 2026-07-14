# Progressions in New Keys

**Goal:** First application of design rule 6 (a phase introducing a new skill should be followed by a small progression-practice phase exercising it) — right after "Accidentals one at a time" (Phase 6), give the learner practice playing `I–IV–V` in keys with real accidentals in their key signature, ramping up gradually by accidental count.

## Background

Every existing progression phase (First Progressions, Progressions Inverted, Two-Handed Progressions) is C-only. This is the first progression content in the app that isn't rooted at C.

Clarified during brainstorming: "keys with accidentals" means real musical key signatures (e.g. G major, 1 sharp), not literally rooting the progression on an accidental note. Even a natural-tonic key already exercises accidentals through ordinary diatonic harmony — e.g. `V` of D major is A major (A–C♯–E), so the sharp shows up as the V chord's third without needing any exotic numeral. This means the existing `I–IV–V` content, unmodified, already does the job once the root note ramps through keys with increasing accidental counts — no new progression content or numerals needed, just new root-note pools per stage.

## Design

5 new stages, C-only `I–IV–V` content held **fixed** throughout (the one axis being ramped here is keys, per rule 1 — progression variety is already taught elsewhere) — only the `notes` field changes per stage, ordered by accidental count in the key signature:

| Stage | Roots (cumulative) | Accidental count |
|---|---|---|
| `First Song, New Keys` | C, G, F | 0–1 |
| `First Song, More Keys` | + D, B♭ | 2 |
| `First Song, Even More Keys` | + A, E♭ | 3 |
| `First Song, Almost All Keys` | + E, A♭ | 4 |
| `First Song, All 12 Keys` | + remaining roots (completes all 12) | 5+ |

New phase name: `'Progressions in New Keys'`.

All 5 stages: `cats: ['catFunctional']`, `chords: []`, `scales: []`, `progressions: ['I–IV–V']`, `timer: 'off'`. No inversions, no left-hand mode — those are separate, already-built or separately-planned skill layers (rule 5: don't combine multiple new axes in one stage).

Placement: new phase `'Progressions in New Keys'`, inserted immediately after `'Speed Up'` (last stage of Phase 6) and before `'Left Hand Shape'` (first stage of Phase 7) — confirmed adjacent in the live 136-stage array.

Zero new code needed: `genFunctional()` already picks its root from whatever `notes` are enabled and resolves the entire progression relative to that root (verified during the Progressions-with-Inversions and Two-Handed-Progressions rounds via direct D-major transposition tests) — this is a pure content/stage-data addition.

Verified against the live array: none of the 5 stage names or the phase name collide with any existing entry.

## Testing

- The 5 new stages exist, in order, immediately between `'Speed Up'` and `'Left Hand Shape'`.
- `applyStage()` on each stage checks exactly its cumulative root-note set and nothing else; `progressions` stays `['I–IV–V']` on all 5; timer off throughout.
- Live-generation sanity check on at least one stage: with a non-C-only root pool active, `genFunctional()` can actually produce a non-C-rooted `I–IV–V` prompt (not just that the checkbox data looks right).
- `LEARNING_PATH_PHASES` gains one new entry (`{ name: 'Progressions in New Keys', count: 5 }`); total stage count and phase count both update correctly; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep.
