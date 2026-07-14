# Minor Progressions with Inversions

**Goal:** Final piece of the minor-progression initiative. Add the minor progression `i–iv–V` to the existing "Progressions, Inverted" phase, requiring its own voice-led inversion, matching how the phase's 3 existing stages already require inversions for the major progressions `I–IV–V`, `IV–V–I`, `I–V–vi–IV`.

## Background

`i–iv–V` (in `FUNCTIONAL.minor`) has never been combined with required inversions before. `PROGRESSION_INVERSIONS` (script.js:3446) needs a new entry, hand-derived the same way the 3 existing entries were — chosen for smooth bass motion, verified against the app's actual pitch-class engine rather than assumed.

Verified live in A minor (the same key "First Minor Progression" already established as the canonical minor-progression key): `i` (root position) puts A in the bass; `iv` (2nd inversion) also puts A in the bass — a common tone held, exactly like `I–IV–V`'s own `IV` (2nd inversion) holding the tonic; `V` (1st inversion) puts G♯ in the bass — the raised leading tone, a half-step below A, exactly like `I–IV–V`'s own `V` (1st inversion) landing a half-step below the tonic. The minor progression's voice-leading shape is structurally identical to the major one (same scale-degree relationships: tonic → subdominant → dominant), so it gets the identical inversion-label sequence.

The user chose to keep this minor-only and separate from the 3 existing major stages, rather than folding `i–iv–V` into a combined cumulative stage — keeping the new inversion-required minor content maximally isolated from what's already mastered.

## Design

One new stage, `'Invert the Minor Progression'`, appended as the phase's 4th stage (after `'Four Chords, Inverted'`, before the existing `// ── Phase 6c: Two-Handed Progressions ──` comment — no new phase, `LEARNING_PATH_PHASES`'s `'Progressions, Inverted'` count goes from 3 to 4):

```js
{ name: 'Invert the Minor Progression', hint: 'i–iv–V now requires its voice-led inversion too', cats: ['catFunctional'], notes: ['A'], chords: [], scales: [], progressions: ['i–iv–V'], requireProgressionInversions: true, timer: 'off' }
```

New `PROGRESSION_INVERSIONS` entry:

```js
'i–iv–V': ['Root position', '2nd inversion', '1st inversion'],
```

Zero other new code: `getRequiredBassPc()`, `checkMidi()`, `getExpectedPCs()`'s `func` branch, and `genFunctional()` all already handle any progression/inversion-label combination generically — the mechanism was fully proven by the 3 existing entries and by "Left-Hand Progressions" already combining `i–iv–V` with a different per-chord requirement (left-hand voicing) successfully.

Verified against the live array: `'Invert the Minor Progression'` collides with no existing stage name; `'Four Chords, Inverted'` and `'Two-Handed First Song'` are confirmed adjacent in the live 150-stage array, confirming the insertion point.

## Testing

- The new stage exists, immediately after `'Four Chords, Inverted'` and before `'Two-Handed First Song'`.
- `applyStage()` on the new stage checks exactly the `A` root-note checkbox, exactly the `i–iv–V` pattern checkbox, `functionalRequireInversions` on, and nothing else.
- `PROGRESSION_INVERSIONS['i–iv–V']` resolves to the correct required bass pitch class at each step, verified against `getRequiredBassPc()` directly: `i`/Root position → the tonic; `iv`/2nd inversion → the tonic (common tone); `V`/1st inversion → the raised leading tone, a half-step below the tonic — for A minor specifically (pcs 9, 9, 8) and at least one other minor root to confirm the pattern isn't A-specific.
- Live playthrough: feeding the correct sequence of MIDI pitch classes for all 3 steps (in the required inversions) into `checkMidi()`/`getExpectedPCs()` advances the progression correctly; an incorrect inversion (right pitch classes, wrong bass) is rejected at each step.
- `LEARNING_PATH_PHASES`'s `'Progressions, Inverted'` entry updates from `count: 3` to `count: 4`; total stage count updates from 150 to 151; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep, including a pre-flight grep for adjacency assertions on both sides of the insertion (stage AND phase level, per the discipline established in the immediately preceding round) — though since this insertion stays inside an existing phase rather than adding a new one, only stage-level adjacency is at risk here, not phase-level (the phase's own neighbors don't change).
