# Left-Hand Progressions

**Goal:** Second application of design rule 6 (a phase introducing a new skill should be followed by a small progression-practice phase exercising it) — right after "Left-Hand Voicing," give the learner practice playing progressions (both the existing 3 major progressions and the minor `i–iv–V`) with two-handed voicing (root+5th in the left hand, full chord in the right), ramping through keys. Deliberately WITHOUT requiring specific inversions in the right hand — that combination (left-hand mode + required inversions together) already exists later as the "Two-Handed Progressions" phase, so this round stays simpler and earlier.

## Background

Every prerequisite for this phase already exists: `chords: ['leftHandMode']` on a `catFunctional` stage already makes `getExpectedPCs()`'s `func` branch fall back to plain root+5th in the left hand whenever `functionalRequireInversions` is off (proven during the Two-Handed Progressions round's own fix cycle). `i–iv–V` (introduced in the "First Minor Progression" phase, much earlier in the path) and the 3 major progressions (`I–IV–V`, `IV–V–I`, `I–V–vi–IV`) are all plain Major/Minor-triad progressions, so `progressionAllowsLeftHand()` accepts all 4 — confirmed live for `i–iv–V` specifically (`E` resolves to a Major triad, the raised-7th functional dominant, not a diminished/altered quality that would be rejected).

The root-note pool is shared between major and minor mode in `genFunctional()` — enabling both mode's progressions on the same `notes` list means a stage's key ramp automatically covers both major and minor keys together (e.g. at a stage with `D` enabled, roughly half of generated prompts are `D major: I–IV–V`-family, half are `D minor: i–iv–V`), confirmed live across 300 generations at the `C`-only stage: both `Major`/`minor` modes and all 4 patterns appeared, `handMode` was `LH` throughout.

## Design

3 new stages, sharing one key ramp (mirrors the pacing of the existing "Left-Hand Voicing" phase's own C → naturals → 12-keys rhythm, and reuses the exact 4-progression content set unchanged across all 3 — progression variety is not the axis being ramped here, keys are):

| Stage | Roots |
|---|---|
| `Meet Left-Hand Progressions` | C only |
| `Left-Hand Progressions, Nat. Keys` | 7 naturals |
| `Left-Hand Progressions, All 12` | all 12 keys |

All 3 stages: `cats: ['catFunctional']`, `chords: ['leftHandMode']`, `scales: []`, `progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']` (unchanged across all 3 — the 3 existing major progressions plus the minor one, all present from stage 1), no `requireProgressionInversions` field (stays simple root+5th, not a specific inversion), `timer: 'off'` throughout (matches the more directly-analogous "Two-Handed Progressions" sibling, which also keeps timer off across all its stages, rather than the single-chord Left-Hand Voicing phase's own end-with-a-timer pattern — multi-chord sequencing with a new voicing skill is harder than a single chord).

New phase name: `'Left-Hand Progressions'`.

Placement: inserted immediately after `'Left Hand, All 12'` (last stage of "Left-Hand Voicing") and before `'Meet Inversions'` (first stage of "Triad inversions") — confirmed adjacent in the live 142-stage array.

Zero new code needed: `genFunctional()`'s existing mode-eligibility logic, `progressionAllowsLeftHand()`, and the `func` branch's left-hand fallback are all already generic across mixed major/minor progression lists — verified live, not just by code inspection.

Verified against the live array: none of the 3 stage names or the phase name collide with any existing entry.

## Testing

- The 3 new stages exist, in order, immediately between `'Left Hand, All 12'` and `'Meet Inversions'`.
- `applyStage()` on each stage checks exactly its cumulative root-note set and exactly the 4 specified progression-pattern checkboxes (3 major + `i–iv–V`), and nothing else; `chords` is `['leftHandMode']` and `requireProgressionInversions`/`functionalRequireInversions` stays off on all 3.
- Live-generation sanity check at the `C`-only stage: across many generations, `genFunctional()` produces prompts in both `Major` and `minor` mode, all 4 progression patterns appear, and every prompt's hand-mode segment is `LH`.
- Live-generation check at a later, multi-root stage: confirm minor-mode prompts appear rooted on more than just `C`/`A` (proving the shared root pool genuinely extends minor coverage across the ramp, not just the original `A`-minor content from "First Minor Progression").
- `LEARNING_PATH_PHASES` gains one new entry (`{ name: 'Left-Hand Progressions', count: 3 }`); total stage count and phase count both update correctly; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep.
