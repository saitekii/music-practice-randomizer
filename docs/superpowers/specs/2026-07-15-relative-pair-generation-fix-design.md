# Relative-Pair Generation Fix

**Goal:** Fix a real bug affecting both chord and scale "relative pair" Learning Path stages: the prompt generators pick root note and major/minor quality completely independently, so stages that claim to teach relative pairs (e.g. "C + A — a relative pair") can and do generate the wrong combinations (C minor, A major) alongside the intended ones.

## Background

User-reported on `'Meet the Scales'` (the first stage of the just-shipped "Major & Minor Scales" phase), root-caused via `superpowers:systematic-debugging`. Confirmed live: `genScale()` and `genChord()` both pick a scale/chord type and a root note from their respective enabled pools completely independently, with no concept of "these two belong together." For any stage enabling both Major and (Natural) Minor across a small set of roots meant to be relative pairs, the generator produces the full Cartesian product of root × quality — not just the intended pairs.

**This predates today's scales work.** The identical bug already exists in two pre-existing chord stages that also claim relative-pair framing:
- `'First Minor'` (script.js:222) — hint: *"C + A — a relative pair (Major and Minor)"*
- `'More Minors'` (script.js:223) — hint: *"Six chords: C/G/F Major + A/E/D Minor"*

Per user decision during brainstorming, this fix covers both chords and scales — the underlying mechanism is shared, so fixing both is not meaningfully more work than fixing scales alone, and leaves no known-broken relative-pair content in the shipped app.

## Design

**A new opt-in checkbox per category** — `chordPairedRelativeKeys` (Chords panel) and `scalePairedRelativeKeys` (Scales panel), each independently gating its own generator's pairing behavior. Off by default everywhere except the specific stages that need it (see mapping below), matching the existing `functionalRequireInversions` pattern exactly: a real, user-toggleable checkbox for free-practice mode, plus a dedicated stage-data field (`stage.pairedChords`/`stage.pairedScales`, booleans) that `applyStage()` sets it from when a stage specifies it.

**The pairing computation is a pure music-theory formula, not a lookup table** — verified live against all 12 roots and against every affected stage's exact enabled-root set (including the trickier 6-root "More Minors" case, where the algorithm correctly reproduces the stage's own hint text — `{C,G,F}` as major candidates, `{D,E,A}` as minor candidates — matching "C/G/F Major + A/E/D Minor" exactly, and the cumulative accidental-ramp scale stages, where a root can correctly appear as a candidate for BOTH qualities once enough accidentals are enabled for both of its relative partners to also be present):

```js
function relativeMinorOf(majorRoot) {
  return NOTES[(NOTES.indexOf(majorRoot) + 9) % 12];
}
function relativeMajorOf(minorRoot) {
  return NOTES[(NOTES.indexOf(minorRoot) + 3) % 12];
}

// Picks { root, isMajor } such that root's relative partner (the other quality)
// is ALSO enabled -- so a paired-mode prompt can never mismatch a root with a
// quality it wasn't meant to appear with. Returns null if pairing isn't
// possible (e.g. no root currently has both sides of its pair enabled).
function pickPairedRoot(notes) {
  const majorCandidates = notes.filter(n => notes.includes(relativeMinorOf(n)));
  const minorCandidates = notes.filter(n => notes.includes(relativeMajorOf(n)));
  if (!majorCandidates.length && !minorCandidates.length) return null;
  const useMajor = minorCandidates.length === 0 || (majorCandidates.length > 0 && Math.random() < 0.5);
  return useMajor
    ? { root: weightedPick(majorCandidates, 'roots'), isMajor: true }
    : { root: weightedPick(minorCandidates, 'roots'), isMajor: false };
}
```

**`genChord()`/`genScale()`** each gain a short-circuit branch: if their category's pairing checkbox is checked AND both Major and the relevant Minor type are enabled, call `pickPairedRoot(notes)` and use its result directly for both root and quality — skipping the existing independent `weightedPick` selection entirely for that prompt. If `pickPairedRoot` returns `null` (a degenerate case — e.g. only one quality checked, so pairing has nothing to pair), fall back to the existing unconstrained behavior rather than returning no prompt at all.

**Stage mapping** — mirrors the existing chord phase's own shape exactly (`First Minor` → `More Minors` paired, `All Natural Minor` unpaired/full-fluency), applied to the equivalent scales stages:

| Stage | `pairedChords` | `pairedScales` |
|---|---|---|
| `First Minor` | `true` | — |
| `More Minors` | `true` | — |
| `All Natural Minor` | unchanged (absent/false) | — |
| `Meet the Scales` | — | `true` |
| `Scales, 0–1 Accidentals` | — | `true` |
| `Scales, 2 Accidentals` | — | `true` |
| `Scales, 3 Accidentals` | — | `true` |
| `Scales, All 12 Keys` | — | unchanged (absent/false) |
| `Scale Timer` | — | unchanged (absent/false) |

No other stage in the app enables both Major and Minor/Natural-Minor across a *restricted* (non-full-12) root set with relative-pair framing, so no other stage needs a field change.

## Testing

- `pickPairedRoot()` returns only pairs where both sides are genuinely enabled, verified against: `{C,A}` (2-root case), `{C,D,E,F,G,A}` (the 6-root "More Minors" case — must reproduce exactly `{C,F,G}`/`{D,E,A}`), and at least one of the scale accidental-ramp root sets (where a root can legitimately appear as a candidate for both qualities once enough of the pool is enabled).
- With the checkbox on and only a relative-pair root set enabled, generating many prompts (e.g. 200) never produces a mismatched combination (e.g. never "C Minor" when only C+A are enabled) — a live, repeated-generation check, not just a single sample.
- With the checkbox off, `genChord()`/`genScale()` behave exactly as before (unconstrained Cartesian product) — regression check on stages that were never meant to be paired (`All Natural Minor`, `Scales, All 12 Keys`, free-practice mode with the checkbox left unchecked).
- `applyStage()` correctly sets/clears both new checkboxes per the stage mapping table above, and free-practice manual toggling of either checkbox persists via the existing generic settings mechanism (added to `saveSettings()`'s `ids` array).
- Degenerate case: if only Major (or only Minor) is checked while the pairing checkbox is also on, `pickPairedRoot()` returns `null` and the generator falls back to normal unconstrained selection rather than silently producing no prompts.
- Regression: full test suite, particularly any existing test asserting on `First Minor`/`More Minors`/`Meet the Scales` stage content or `genChord()`/`genScale()` output shape.
