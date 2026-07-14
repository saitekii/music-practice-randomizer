# First Minor Progression

**Goal:** Introduce the learner's first minor-key chord progression (`i–iv–V` in A minor) much earlier in the Learning Path than today — currently the earliest minor progression content is deep in the late "Functional harmony" phase, alongside dozens of other progressions. This is the prerequisite step for a larger minor-progression initiative (a minor-key ramp mirroring "Progressions in New Keys", and adding minor content to "Progressions with Inversions" and "Left-Hand Progressions") — none of those can reference "the minor progression" as taught content until it exists somewhere early.

## Background

`i–iv–V` already exists in `FUNCTIONAL.minor` (script.js:121) and is already checkbox-gated like every other progression — the earliest existing stage that enables it is `'Add i–iv–V (minor)'`, deep in the "Functional harmony" phase. This spec doesn't add new progression content; it re-surfaces existing content at an earlier curriculum position, the same pattern already used repeatedly this session for major progressions (`I–IV–V` alone has now been introduced/re-ramped across five separate phases: First Progressions, Progressions in New Keys, Progressions with Inversions, Two-Handed Progressions, and the in-progress Left-Hand Progressions).

Verified live: setting only the `A` root-note checkbox and only the `i–iv–V` pattern checkbox reliably produces `func|A|minor|i–iv–V|0|` from `genFunctional()` across 100 generations — no major content leaks in, confirming a stage can be minor-only simply by restricting `progressions` to a single minor pattern (with no major pattern in the list, `enabledProgressions('major')` returns empty, so `genFunctional()`'s `eligibleModes` only ever contains minor).

## Design

One new stage, `'First Minor Progression'`, in its own new phase (same reasoning as "Progressions in New Keys" getting its own phase after the similarly non-progression "Accidentals" phase — this is a different content type, `catFunctional`, than its neighbor "Add timer pressure," which is pure `catChords` timer drilling):

```
{ name: 'First Minor Progression', cats: ['catFunctional'], notes: ['A'], chords: [], scales: [], progressions: ['i–iv–V'], timer: 'off' }
```

New phase name: `'First Minor Progression'` (matches the single-stage phase's own name, since it's a 1-stage phase — no broader phase-name needed).

Placement: inserted immediately after `'Faster Still'` (last stage of "Add timer pressure") and before `'Add F♯'` (first stage of "Accidentals one at a time") — confirmed adjacent in the live 141-stage array.

Zero new code needed: `genFunctional()` already resolves minor-mode numerals correctly for any root (verified live above) — this is a pure content/stage-data addition, identical in kind to every prior progression-phase round this session.

Verified against the live array: neither the stage name nor the phase name collides with any existing entry.

## Testing

- The 1 new stage exists, immediately between `'Faster Still'` and `'Add F♯'`.
- `applyStage()` on the new stage checks exactly the `A` root-note checkbox and exactly the `i–iv–V` pattern checkbox, and nothing else (no other root notes, no other progression patterns, no chords/scales categories).
- Live-generation sanity check: with the stage applied, `genFunctional()` produces only `func|A|minor|i–iv–V|0|` across many generations — never a major-mode prompt, never a different minor numeral.
- `LEARNING_PATH_PHASES` gains one new entry (`{ name: 'First Minor Progression', count: 1 }`); total stage count (141→142) and phase count (22→23) both update correctly; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep.
