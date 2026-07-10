# Secondary Dominants Design

**Goal:** Support secondary-dominant (applied-chord) slash notation — `V/vi`, `V/V`, and any `V/<target-numeral>` — in Functional Harmony practice, and ship the one progression from `Modern Harmony Reference.md` that uses it: `I → V/vi → vi → V/V → ii → V`.

## Background

`Modern Harmony Reference.md` (the ongoing source-of-truth for Functional Harmony content additions) has exactly one progression using true secondary-dominant slash notation. Everything else labeled "Secondary Dominants" in that file (e.g. `I→VI7→ii→V`) turned out to be applied-dominant-as-plain-7th-chord notation, already covered by the Tonal.js jazz-extensions round (2026-07-10).

`V/vi` and `V/V` happen to be pitch-identical to the app's existing chromatic-mediant `III` and `II` entries — same notes, different roman-numeral label and pedagogical meaning (applied dominant vs. chromatic mediant). The resolver must key off the literal numeral text, not just resulting pitch classes, since both labels need to independently resolve correctly.

## Resolver Architecture

In `getExpectedPCs()`'s `func` branch (`script.js`), a new check is inserted after the direct `FUNCTIONAL_NUMERALS[modeKey][numeral]` lookup fails, and **before** the existing jazz-suffix regex fallback. Ordering matters: a slash-containing numeral like `V/vi` would otherwise be greedily (and wrongly) captured by the jazz regex's suffix group (`(.+)$`), silently resolving to an invalid Tonal quality string and returning `null` instead of the correct chord.

**The check:** if `numeral` matches `^V\/(.+)$`, capture the target numeral (everything after the slash). Look it up in `FUNCTIONAL_NUMERALS[modeKey]`. If found, compute the secondary root as `(targetOffset + 7) % 12` — the pitch a perfect 5th above the target degree's root — and build a plain Major triad there using the existing `CHORD_INTERVALS['Major']` table (no Tonal.js call; pure arithmetic reusing the same construction the top-level `'V'` entry already uses). If the target numeral isn't found in the mode's table, return `null` (same fail-safe pattern as every other branch in this resolver).

This is general on the target side: any numeral already in `FUNCTIONAL_NUMERALS[modeKey]` works as a target (`V/vi`, `V/V`, `V/ii`, `V/IV`, etc.), not hardcoded to the two tokens the shipped content uses. It is intentionally narrow on the applied side: only literal uppercase `V` is supported before the slash (no `V7/vi`, no `vii°7/V`) — nothing in the reference file needs that yet, and extending it later is a small, isolated addition to the same regex/lookup, not a rework.

**Sanity-checked identities** (confirms the arithmetic is right, not a red flag):
- `V/IV` resolves to the same pitch as plain `I` (the tonic doubles as IV's dominant) — correct classical theory.
- `V/V` resolves to the same pitches as the existing chromatic-mediant `II` entry; `V/vi` to the existing `III` entry — both correct and expected; the app will have two differently-labeled ways to reach the same pitch classes, which is normal (they mean different things musically).

## Content and Placement

- One new `FUNCTIONAL.major` entry: the literal pattern string `"I–V/vi–vi–V/V–ii–V"` (grows `FUNCTIONAL.major` from 110 to 111 entries).
- One new checkbox, `data-pattern="I–V/vi–vi–V/V–ii–V"`, appended to the **existing** "Circle of Fifths & Applied Chords" divider group in `index.html`. Unchecked by default, matching every prior content batch's convention.
- No new checkbox group, no new Learning Path stage or phase — this is a single additive progression, not a new curriculum unit.
- Learning Path: the new progression is appended to the existing **"Circle of Fifths & Applied Chords"** stage's `progressions` array (count 107 → 108), and — because "Cadences & Color Chords" is cumulative on top of it — also present there (count 112 → 113). `LEARNING_PATH_PHASES`'s "Functional harmony" count is unaffected (still 26; no stage added). Both `checkboxGatedPatterns()` and the `applyStage()`/`getStageMastery()` mechanisms need no changes — this progression is gated and tracked exactly like every other multi-chord `FUNCTIONAL` pattern already is.

## Testing

- Resolver correctness: verify `V/vi` and `V/V` resolve to the correct pitch classes in C major (and spot-check at least one other root to rule out an off-by-offset bug), and that the sanity-check identities above (`V/IV` ≡ `I`, `V/V` ≡ existing `II`, `V/vi` ≡ existing `III`) hold via direct comparison against `getExpectedPCs()` output for those existing entries.
- Regression: confirm the direct `FUNCTIONAL_NUMERALS` lookup path and the jazz-suffix fallback path are both unaffected — existing bare numerals and jazz-suffixed numerals (e.g. `V13`, `Imaj7`) still resolve exactly as before.
- Content/UI: the new entry exists, has exactly one checkbox, is unchecked by default, and `enabledProgressions()` correctly excludes/includes it based on that checkbox state.
- Learning Path: the two affected stages' `progressions` arrays and counts are correct, and no other stage's count changed.
