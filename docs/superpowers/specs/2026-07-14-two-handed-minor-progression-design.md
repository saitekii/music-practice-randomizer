# Two-Handed Minor Progression

**Goal:** Close the last remaining asymmetry flagged when the minor-progression initiative shipped — add `i–iv–V` to the "Two-Handed Progressions" phase, combining left-hand voicing (left hand plays the actual required bass note) with required right-hand inversions, matching what the phase's 3 existing stages already do for the major progressions.

## Background

This is the first time the left-hand-voicing mechanism and the required-inversions mechanism combine for the *minor* progression specifically — each has been separately proven for `i–iv–V` (left-hand voicing in "Left-Hand Progressions," required inversions in "Minor Progressions with Inversions"), but never together. Verified live rather than assumed: with `leftHandMode` + `functionalRequireInversions` both on and `progressions: ['i–iv–V']` enabled, `getExpectedPCs()`'s `func` branch produces the correct left-hand pitch classes at all 3 steps —

- `i` (root position, bass=root): left hand plays root+5th (A, E) — same as the "no inversion needed" case, since the required bass note already is the root.
- `iv` (2nd inversion, bass=A): left hand plays the *actual* required bass note (A) plus the chord root (D) — not a fixed root+5th.
- `V` (1st inversion, bass=G♯): left hand plays G♯ plus the chord root (E).

This is exactly the same code path already exercised by the 3 major stages — zero new code, confirmed by direct inspection and live testing, not just inferred from the two halves working separately.

## Design

One new stage, `'Two-Handed Minor Progression'`, appended as the phase's 4th stage (after `'Four Chords, Two Hands'`, before `'First Scale'` — no new phase, `LEARNING_PATH_PHASES`'s `'Two-Handed Progressions'` count goes from 3 to 4):

```js
{ name: 'Two-Handed Minor Progression', hint: 'Same two-handed voicing — now for i–iv–V in minor', cats: ['catFunctional'], notes: ['A'], chords: ['leftHandMode'], scales: [], progressions: ['i–iv–V'], requireProgressionInversions: true, timer: 'off' }
```

No new `PROGRESSION_INVERSIONS` entry needed — `'i–iv–V'` already has one (added in "Minor Progressions with Inversions"). No new left-hand-eligibility logic needed — `progressionAllowsLeftHand('minor', 'i–iv–V')` already returns `true` (verified in "Left-Hand Progressions"). No new code in `getExpectedPCs()`, `checkMidi()`, or `genFunctional()` — all already handle this exact combination generically, verified live above.

Verified against the live array: `'Two-Handed Minor Progression'` collides with no existing stage name; `'Four Chords, Two Hands'` and `'First Scale'` are confirmed adjacent in the live 151-stage array.

## Testing

- The new stage exists, immediately after `'Four Chords, Two Hands'` and before `'First Scale'`.
- `applyStage()` on the new stage checks exactly the `A` root-note checkbox, exactly the `i–iv–V` pattern checkbox, `leftHandMode` on, `functionalRequireInversions` on, and nothing else.
- For all 3 steps of the progression, `getExpectedPCs()` produces the correct `leftHandPcs`/`rightHandPcs` split matching the required inversion at that step — verified for A minor (already spot-checked during brainstorming) and at least one other minor root to confirm the pattern generalizes.
- Live playthrough: feeding the correct two-handed voicing (left hand on the required bass + root, right hand on the full triad) for all 3 steps into `checkMidi()` advances/completes the progression; a plausible-but-wrong left-hand voicing (e.g. root+5th when a specific inversion's bass is required) is rejected.
- `LEARNING_PATH_PHASES`'s `'Two-Handed Progressions'` entry updates from `count: 3` to `count: 4`; total stage count updates from 151 to 152; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep, including a pre-flight grep for both simple-adjacency AND `slice()`-based range-check assertions on the insertion's neighboring stages (per the discipline established across this session's later rounds) — since this insertion stays inside an existing phase, phase-level adjacency is not at risk, only stage-level.
