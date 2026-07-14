# Progressions with Inversions

**Goal:** Add a new Learning Path phase, right after "Triad inversions" (Phase 8), that requires the 3 progressions already taught in "First Progressions" (Phase 4) to be played with specific, voice-led inversions instead of root position — combining two skills the learner already has (finding the right chords in a progression, playing a specific inversion) into one. This also gives progressions a mid-path touchpoint, partially addressing the already-tracked "progression silence" open issue (Phase 4 → Phase 17 is otherwise 71 stages of silence).

## Background

Two mechanisms already exist independently and have never been combined:

- **Progressions** (`genFunctional()`, `getExpectedPCs()`'s `func` branch): resolves a roman-numeral progression string one chord at a time, checking only pitch classes today — any voicing/inversion of the right notes counts as correct.
- **Inversions** (`genChord()`, `getRequiredBassPc()`): for a single chord, computes a required bass pitch class from an inversion label (`'Root position'`, `'1st inversion'`, `'2nd inversion'`) and the chord's own pitch-class array.

Checked directly in the code: `checkMidi()`'s bass-matching logic and `updateKeyboard()`'s "bass-target" visual marker both key off `expected.type === 'chord'` and `expected.requiredBassPc` generically — neither cares whether the prompt came from the single-chord path or the progression path. This means combining the two mechanisms needs no changes to either of those functions; only `getExpectedPCs()`'s `func` branch needs to start populating `requiredBassPc`, and it can reuse `getRequiredBassPc()` exactly as-is.

## Design

### Mechanism

- New plain toggle checkbox, `functionalRequireInversions`, added to the Functional Harmony settings panel (off by default, added to `saveSettings()`'s `ids` array — mirrors the `functionalRandomNumerals` toggle shipped in the canonical-numeral fix).
- New constant `PROGRESSION_INVERSIONS`, mapping a progression pattern string to an array of inversion labels, one per step (see Content below for the exact values).
- `getExpectedPCs()`'s `func` branch (script.js:3477+): when `functionalRequireInversions` is checked and the current pattern has an entry in `PROGRESSION_INVERSIONS`, compute `requiredBassPc` via `getRequiredBassPc(quality, PROGRESSION_INVERSIONS[fullPattern][stepIndex], pcs)` — the same helper Phase 8 already uses, called with the numeral's resolved chord quality and pitch classes. When the toggle is off, or the pattern has no registered entry, `requiredBassPc` stays `null` (today's lenient behavior) — so this never affects any existing stage that reuses these same progression strings without opting in.
- `genFunctional()` and `advanceProgressionStep()` (the two places that build the `line2` prompt text, for the first chord and every subsequent chord of a progression respectively) both append the inversion label to their displayed text when the toggle is on and a label exists, e.g. `"Play: IV (2nd inversion) (chord 2 of 3)"`.
- `applyStage()`: one new line reading a new stage field, e.g. `requireProgressionInversions`, explicitly setting the new checkbox's state — defaulting to unchecked like every other category-specific field, so no other stage is affected.

**Not touched:** `checkMidi()`, `updateKeyboard()`, `getRequiredBassPc()`, `FUNCTIONAL`/`FUNCTIONAL_NUMERALS` (the 3 progressions and their chord resolution are already correct and unchanged — this only adds a bass requirement on top).

### Content: the 3 voicings

Worked out via standard voice-leading practice (common-tone bass where one exists, otherwise nearest bass motion by step), reviewed and adjusted by the user before being finalized here:

| Progression | Step 1 | Step 2 | Step 3 | Step 4 | Bass line |
|---|---|---|---|---|---|
| `I–IV–V` | Root position (bass C) | 2nd inversion (bass C) | 1st inversion (bass B) | — | C→C→B |
| `IV–V–I` | Root position (bass F) | Root position (bass G) | 2nd inversion (bass G) | — | F→G→G |
| `I–V–vi–IV` | Root position (bass C) | 1st inversion (bass B) | Root position (bass A) | 1st inversion (bass A) | C→B→A→A |

`PROGRESSION_INVERSIONS` values (labels, not pitch classes — the pitch classes are derived at runtime from whichever key/mode the prompt actually generated):

```javascript
const PROGRESSION_INVERSIONS = {
  'I–IV–V':     ['Root position', '2nd inversion', '1st inversion'],
  'IV–V–I':     ['Root position', 'Root position', '2nd inversion'],
  'I–V–vi–IV':  ['Root position', '1st inversion', 'Root position', '1st inversion'],
};
```

### Curriculum placement

New phase `'Progressions, Inverted'`, inserted immediately after `'Triad Mastery'` (the last stage of Phase 8) and before `'First Scale'` (the first stage of Phase 9) — confirmed adjacent in the live array. 3 cumulative stages, mirroring "First Progressions" (Phase 4)'s exact shape:

1. `'Invert Your First Song'` — `I–IV–V` only, with inversions required.
2. `'Invert the Turnaround'` — `+ IV–V–I`.
3. `'Four Chords, Inverted'` — `+ I–V–vi–IV`.

All 3 stages: C-only, untimed (`timer: 'off'`) — introducing a new skill combination is itself the difficulty axis; per the design doc's recurring rules, it shouldn't also add a key ramp or timer in the same stage. `cats: ['catFunctional']`, `progressions` cumulative per the list above, `requireProgressionInversions: true`.

Verified directly against the live 128-stage array: none of `'Invert Your First Song'`, `'Invert the Turnaround'`, `'Four Chords, Inverted'`, or `'Progressions, Inverted'` collide with any existing stage or phase name.

Inserting a new phase shifts every later `LEARNING_PATH_PHASES` entry's position by one, the same mechanical consequence as when "First Progressions" was inserted — existing tests asserting absolute stage/phase counts will need updates, expected fallout, not a sign of a wrong change.

### Future extension (explicitly deferred, not built now)

The user's longer-term goal is combining this with Left-Hand mode (right hand plays the required inversion, left hand plays root+5th) and eventually more complex voicings. Nothing in this design blocks that: the existing `chord`-type prompt already has an established `leftHandPcs`/`rightHandPcs` pattern on `getExpectedPCs()`'s return value for Left-Hand mode; extending the `func` branch with the same pattern later would follow an already-proven shape, not require a rework of what's being built here. Not designed further now — YAGNI until it's actually the next thing being built.

## Testing

- `getExpectedPCs()` on each of the 3 progressions' every step, with the toggle on, returns the exact `requiredBassPc` matching the table above (computed for at least 2 different root keys, not just C, to confirm the bass pitch class transposes correctly rather than being hardcoded to C).
- With the toggle off, the same prompts return `requiredBassPc: null` (today's lenient behavior, unchanged).
- A stage using one of these 3 patterns WITHOUT `requireProgressionInversions` set (e.g. the existing Phase 4 stages) is unaffected — confirm `requiredBassPc` stays `null` for them regardless of the new toggle's global state, proving the stage-level opt-in actually gates this and doesn't leak.
- `checkMidi()` end-to-end: playing the correct pitch classes in the WRONG inversion does not register as correct while the toggle is on for an opted-in stage; playing the correct inversion does.
- `applyStage()` on each of the 3 new stages sets `functionalRequireInversions` checked, and unchecks it when applying any other stage (e.g. a Phase 4 stage) afterward.
- Display: `line1`/`line2` text includes the correct inversion label at each step, for both the initial prompt (`genFunctional()`) and step-advancement (`advanceProgressionStep()`).
- Regression: full existing Functional Harmony test sweep, plus stage-count/phase-count assertions updated for the new phase.
