# Minor Progressions in New Keys

**Goal:** Third piece of the minor-progression initiative (after "First Minor Progression" and "Left-Hand Progressions"). Mirror the existing "Progressions in New Keys" phase — which ramps `I–IV–V` through major keys ordered by key-signature accidental count — but for the minor progression `i–iv–V` through minor keys instead.

## Background

Minor keys don't share their same-letter-named major key's accidental count — they're determined by the *relative major* a minor third above the tonic. A minor is the relative minor of C major (0 accidentals), while C minor is the relative minor of E♭ major (3 flats). This means the major-key ramp's ordering (`C, G, F → +D, B♭ → ...`) can't be reused verbatim; a fresh ordering had to be worked out for minor keys specifically.

Minor-key accidental counts, using the app's existing `NOTES` array spellings (`['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']` — mixing sharps and flats, per the codebase's established convention):

| Root | Accidentals |
|---|---|
| A | 0 |
| D | 1♭ |
| E | 1♯ |
| G | 2♭ |
| B | 2♯ |
| C | 3♭ |
| F♯ | 3♯ |
| F | 4♭ |
| C♯ | 4♯ |
| B♭ | 5♭ |
| E♭ | 6♭ |
| A♭ | 7♭ |

`i–iv–V` already exists in `FUNCTIONAL.minor` (introduced by "First Minor Progression"). Verified live: with all 12 root-note checkboxes and only the `i–iv–V` pattern checkbox on, `genFunctional()` produces valid `minor`-mode prompts rooted on all 12 pitch classes across 400 generations — no new generator code needed, exactly the same mechanism "Progressions in New Keys" already proved for major keys.

## Design

5 new stages, `i–iv–V` held fixed throughout (keys are the one axis being ramped, per rule 1 — mirrors "Progressions in New Keys" exactly), ordered by the minor-key accidental count above:

| Stage | Roots (cumulative) | Accidental count |
|---|---|---|
| `First Minor Progression, New Keys` | D, E, A | 0–1 |
| `First Minor Progression, More Keys` | + G, B | 2 |
| `First Minor Progression, Even More Keys` | + C, F♯ | 3 |
| `First Minor Progression, Almost All Keys` | + F, C♯ | 4 |
| `First Minor Progression, All 12 Keys` | + B♭, E♭, A♭ (completes all 12) | 5–7 |

New phase name: `'Minor Progressions in New Keys'`.

All 5 stages: `cats: ['catFunctional']`, `chords: []`, `scales: []`, `progressions: ['i–iv–V']`, `timer: 'off'`. No inversions, no left-hand mode (rule 5: don't combine multiple new axes in one stage — both of those combinations are separately planned/already built elsewhere).

Placement: new phase `'Minor Progressions in New Keys'`, inserted immediately after `'First Song, All 12 Keys'` (last stage of "Progressions in New Keys") and before `'Left Hand Shape'` (first stage of "Left-Hand Voicing") — confirmed adjacent in the live 145-stage array.

`notes` arrays are listed in `NOTES` array positional order per the existing convention, not accidental-discovery order (e.g. stage 1's cumulative set `{D, E, A}` is written as `['D','E','A']` since that's already `NOTES` order for these three).

Zero new code needed: `genFunctional()` already picks its root from whatever `notes` are enabled and resolves the progression relative to that root regardless of mode — verified live above.

Verified against the live array: none of the 5 stage names or the phase name collide with any existing entry.

## Testing

- The 5 new stages exist, in order, immediately between `'First Song, All 12 Keys'` and `'Left Hand Shape'`.
- `applyStage()` on each stage checks exactly its cumulative root-note set and nothing else; `progressions` stays `['i–iv–V']` on all 5; timer off throughout.
- Live-generation sanity check on at least one non-first stage: with a multi-root pool active, `genFunctional()` produces prompts rooted on more than one key, all in minor mode, all `i–iv–V`.
- `LEARNING_PATH_PHASES` gains one new entry (`{ name: 'Minor Progressions in New Keys', count: 5 }`); total stage count and phase count both update correctly; existing hardcoded-count tests get their expected mechanical updates.
- Regression: full existing Learning Path / Functional Harmony test sweep, including a pre-flight grep for any adjacency assertions on the insertion boundary's stage AND phase names (both categories, per the lesson from the immediately preceding "Left-Hand Progressions" round).
