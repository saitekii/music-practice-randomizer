# Borrowed and chromatic-mediant chord progressions

## Problem

Two prior passes ([[more-progressions]], see `2026-07-08-more-progressions.md`) added 26 of the ~90 progressions in `progressions.md`, covering everything that was already compatible with the existing purely-diatonic roman-numeral mechanism. The rest need capabilities the app doesn't have: borrowed/modal-interchange chords, secondary dominants (`V/vi` notation), inline chord-quality overrides (`maj7`, `m9`, `13`, etc. on a numeral), slash-chord/pedal-point notation, and quartal/parallel voicing types. Each is a separate feature. This pass tackles the first and largest: **borrowed and chromatic-mediant triads** — chords built on scale degrees but with a quality that doesn't match the diatonic default (e.g. `♭VII` — a major triad on the flatted 7th, versus the diatonic `vii°`).

The prior session's chord-by-chord cross-reference of `progressions.md` for this tier was never persisted and had to be redone from scratch.

## Scope

Redoing the cross-reference against the current `progressions.md` (the plain-triad sections only — anything using 7ths/9ths/13ths/sus/slash-chords/`V/x` notation is out of scope for this pass) produces:

- **9 new standalone single-chord entries**: major gets `iv`, `♭II`, `♭III`, `♭VI`, `♭VII`, `II`, `III`, `VI`; minor gets `♭II`.
- **46 new progressions**: 45 major, 1 minor.

Two entries were excluded as ambiguous/near-duplicate accidental-less variants, consistent with how one ambiguous entry (`I → vii → vi → V`) was already dropped in the prior pass: `I → VII → VI → V` and `i → VII → VI → VII` (the latter is one chord off from the already-shipped `i–VII–VI–V` and reads as a typo).

Two purely-diatonic patterns were found to have been missed by the earlier passes and are picked up here too, since they need no new capability: `vi–IV–I` and `V–ii`.

### Why bare `II`/`III`/`VI` (no flat) are treated as different chords from `♭III`/`♭VI`

Several source entries mix both spellings in the same progression — `III → ♭VI`, `I → III → ♭II → vi` — which only makes sense if the author meant two distinct chords (a "raised" mediant vs. one borrowed from the parallel minor). They're modeled as genuinely different pitches, not normalized to one spelling.

## Design

### Numeral resolution

`getExpectedPCs()`'s `func` branch currently resolves a roman numeral via `DIATONIC[modeKey].numerals.indexOf(numeral)`, with one hardcoded special case: `if (numeral === 'V' && modeKey === 'minor')`. This can't represent a numeral that isn't one of the 7 diatonic degrees per mode.

Replace it with a new table:

```js
const FUNCTIONAL_NUMERALS = {
  major: {
    'I': [0, 'Major'], 'ii': [2, 'Minor'], 'iii': [4, 'Minor'], 'IV': [5, 'Major'],
    'V': [7, 'Major'], 'vi': [9, 'Minor'], 'vii°': [11, 'Diminished'],
    'iv': [5, 'Minor'], '♭II': [1, 'Major'], '♭III': [3, 'Major'],
    '♭VI': [8, 'Major'], '♭VII': [10, 'Major'],
    'II': [2, 'Major'], 'III': [4, 'Major'], 'VI': [9, 'Major'],
  },
  minor: {
    'i': [0, 'Minor'], 'ii°': [2, 'Diminished'], 'III': [3, 'Major'], 'iv': [5, 'Minor'],
    'v': [7, 'Minor'], 'V': [7, 'Major'], 'VI': [8, 'Major'], 'VII': [10, 'Major'],
    '♭II': [1, 'Major'],
  },
};
```

`getExpectedPCs()`'s `func` branch looks up `FUNCTIONAL_NUMERALS[modeKey][numeral]` directly instead of the `indexOf` + special-case dance. This is a drop-in replacement — the 7 diatonic entries per mode keep the exact same offsets/qualities as `DIATONIC` already has, and the `V`-in-minor hack becomes a normal table entry instead of an `if`. `DIATONIC` itself is untouched (it's also used by `genDiatonic()` for the unrelated Diatonic Chords feature).

### Filter-logic fix (required before adding the new standalone chords)

`enabledProgressions()` currently treats any pattern *without* a `–` as never filtered:

```js
if (!pattern.includes('–')) return true; // single-chord numerals are never filtered
```

This was written when the only single-chord entries were the 14 canonical diatonic numerals (7 per mode), which are meant to always be available. If the 9 new borrowed/mediant standalone chords are added as plain entries, they'd inherit that same "always enabled" behavior — silently making brand-new borrowed chords playable from the very first `'Functional Harmony — C'` stage, meant for absolute beginners. This is the same class of bug the prior Learning Path audit found and fixed for the progressions themselves ([[learning-path-audit]]).

Fix: narrow the check from "no dash" to "is one of the 7 canonical diatonic numerals for this mode":

```js
if (DIATONIC[mode].numerals.includes(pattern)) return true; // canonical diatonic numerals are never filtered
```

The existing 14 keep their exact current behavior. The 9 new standalone borrowed/mediant chords fall through to checkbox filtering like any other content, and default unchecked.

### Data and checkboxes

55 new entries added to `FUNCTIONAL.major` (53: 8 standalone + 45 progressions) and `FUNCTIONAL.minor` (2: 1 standalone + 1 progression), each getting a `data-pattern` checkbox in the existing `functionalOptions` panel, **unchecked by default** (same convention as the last two batches — new content shouldn't dilute the existing random-practice pool).

**Standalone chords** — major: `iv`, `♭II`, `♭III`, `♭VI`, `♭VII`, `II`, `III`, `VI`. Minor: `♭II`.

**New major progressions (45):**

`I–VI–ii–V`, `I–III–vi–II–ii–V–I`, `iii–VI–ii–V–I`, `vi–II–ii–V–I`, `I–iv–I`, `I–♭VII–IV`, `I–♭III–IV`, `I–♭VI–♭VII–I`, `I–♭VI–IV`, `I–♭III–♭VI`, `I–iv–♭VII–I`, `I–III`, `I–♭III`, `I–♭VI`, `I–VI`, `III–♭VI`, `♭III–I`, `♭VI–I`, `I–III–vi–IV`, `I–♭II–vi`, `I–♭III–IV–iv`, `I–III–♭II–vi`, `I–♭II–IV–III`, `I–♭III–♭VI–IV`, `I–vi–ii–♭II`, `I–♭III–IV–V`, `I–III–♭VI–IV`, `I–♭VII–♭VI–V`, `I–iii–IV–iv`, `I–ii–♭III–IV`, `I–♭VI–I`, `I–♭III–I`, `IV–♭VII–I`, `ii–♭VII–I`, `iv–♭VII–I`, `vi–IV–I`, `I–IV–♭VII`, `V–♭VI`, `V–♭III`, `V–ii`, `♭VII–I`, `♭II–I`, `I–♭II`, `I–iv`, `I–♭VII`

**New minor progressions (1):** `i–♭II–VII–i`

### Learning Path

6 new cumulative stages, inserted after the existing `'Progressions, Add E'` stage and before `'Functional, Nat. Keys'`. All `notes: ['C']` except the last, `timer: 'off'`, matching the style of the existing progression curriculum. Each stage's `progressions` array is cumulative and includes all 26 existing progressions plus everything introduced so far in this new sequence.

1. **Borrowed Chords — Intro** — the 8 new major standalone tokens (`iv`, `♭II`, `♭III`, `♭VI`, `♭VII`, `II`, `III`, `VI`), no new progressions yet.
2. **Single Borrowed Chord Progressions** (+23) — patterns using exactly one borrowed chord: `I–iv–I`, `I–♭VII–IV`, `I–♭III–IV`, `I–♭VI–IV`, `I–♭III`, `I–♭VI`, `I–♭VII`, `I–♭II`, `I–iv`, `♭III–I`, `♭VI–I`, `♭VII–I`, `♭II–I`, `I–♭III–I`, `I–♭VI–I`, `IV–♭VII–I`, `ii–♭VII–I`, `iv–♭VII–I`, `I–IV–♭VII`, `V–♭VI`, `V–♭III`, `vi–IV–I`, `V–ii`.
3. **Combining Borrowed Chords** (+13) — patterns using two borrowed chords together: `I–♭VI–♭VII–I`, `I–♭III–♭VI`, `I–iv–♭VII–I`, `I–♭III–♭VI–IV`, `I–♭VII–♭VI–V`, `I–ii–♭III–IV`, `I–iii–IV–iv`, `I–♭III–IV–iv`, `I–♭III–IV–V`, `I–vi–ii–♭II`, `I–♭II–vi`, `I–III–♭II–vi`, `I–♭II–IV–III`.
4. **Raised Mediants** (+9) — the non-flat `II`/`III`/`VI` set: `I–VI–ii–V`, `I–III–vi–II–ii–V–I`, `iii–VI–ii–V–I`, `vi–II–ii–V–I`, `I–III`, `I–VI`, `III–♭VI`, `I–III–vi–IV`, `I–III–♭VI–IV`.
5. **Minor Borrowed — ♭II** — the minor standalone `♭II`, plus `i–♭II–VII–i`.
6. **Borrowed Content, Two Keys** — everything from stages 1-5, now in `notes: ['C', 'G']`.

After stage 6, the existing `'Functional, Nat. Keys'` and `'Functional, All 12'` stages (which already have no `progressions` field and so default to enabling everything) automatically pick up all the new content across 7 and 12 keys respectively — no additional ramp stages needed for that part, since those two stages already exist and already serve that role for the base 26 progressions.

This is a deliberately shorter ramp than the 5-stage granular ramp (`C → C,G → C,F,G → +D → +A → +E`) built for the base 26 progressions. That ramp mainly guarded against stacking "new progressions to learn" and "generalize across keys" simultaneously. By this point in the Learning Path (functional harmony is Phase 14 of 16; keys have already been drilled extensively in chords, scales, extensions, and intervals in Phases 2-13), key-generalization itself needs less scaffolding — so only one incremental step (C → C+G) is used before falling into the existing all-keys stages, rather than repeating the full granular ramp.

### Testing

Extend the existing Playwright regression coverage:
- `getExpectedPCs()` resolves a sample of new borrowed/mediant numerals (in both major and minor mode) to the correct pitch classes.
- The filter-logic change doesn't alter behavior for the original 14 always-enabled diatonic numerals (still bypass checkboxes) while the 9 new standalone chords correctly respect their checkboxes.
- `applyStage()`/`getStageMastery()` backward-compat: stages predating this feature (no `progressions` field) still default to "everything enabled," now including the new content — verified as intentional for the "everything" stages (`'Functional, Nat. Keys'` onward), and confirmed the one stage that must NOT auto-enable new content (`'Functional Harmony — C'`, which explicitly sets `progressions: []`) still doesn't.

## Out of scope for this pass

- Secondary dominants with `V/x` slash notation (the `Descending Bass` and `Secondary Dominants` sections of `progressions.md`).
- Inline chord-quality overrides (`maj7`, `m9`, `13`, `sus2/4`, `♯11` written directly on a numeral) — the entire "Diatonic / Jazz" section onward in `progressions.md`.
- Slash-chord/pedal-point notation (`I/C`, `♭VII/C`).
- Quartal/parallel voicing types.
- Any change to the existing 26 progressions, their checkboxes, or the 12-stage curriculum that teaches them.
