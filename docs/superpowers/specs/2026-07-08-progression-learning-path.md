# Chord progressions: Learning Path integration

## Problem

Chord progressions are now genuinely playable (see the previous "Chord progressions" spec/plan), but there's no way to curate *which* progressions get practiced — `genFunctional()` always picks from the entire `FUNCTIONAL[mode]` list, mixing all 7 single-chord numerals and all 8 progressions together with no filtering. To let a Learning Path stage say "practice just I–IV–V until it's comfortable, then add IV–V–I," a filtering mechanism needs to exist first — nothing like it exists today for Functional Harmony (unlike Chords, which has one checkbox per chord type).

## Scope

Add per-progression checkboxes (filtering only applies to the 8 progressions — single-chord numerals stay an undifferentiated, always-on pool, matching today's behavior), wire that filtering into the existing settings save/load and Learning Path stage-application machinery, extend stage mastery tracking to cover progressions, and add 8 new curated Learning Path stages that build up the progressions one at a time. More progressions can be added later (by the user) as a small, additive change on top of this — no further design needed for that.

## Design

### Filtering mechanism

Each of the 8 progressions gets a checkbox identified by a `data-pattern` attribute holding its exact pattern string (e.g. `data-pattern="I–IV–V"`) rather than a conventional `id` — mirroring exactly how root notes already work in this codebase (`data-note` attributes + `enabledNotes()`), since progression names like "ii°–V–i" don't translate cleanly into valid camelCase identifiers. These live in a new `functionalOptions` panel under the Functional Harmony category (currently the only top-level category with no expandable options panel at all), following the same expandable-panel convention Chords/Scales/Intervals/Diatonic already use. All 8 are checked by default, so nothing changes for existing users until something explicitly unchecks one.

A new `enabledProgressions(mode)` function filters `FUNCTIONAL[mode]`: single-chord numerals (patterns without "–") always pass through unfiltered; progressions are included only if their checkbox is checked. `genFunctional()` picks from `enabledProgressions(modeKey)` instead of the raw `FUNCTIONAL[mode]` array.

`saveSettings()`/`loadSettings()` get a new `progressions` field in the saved JSON blob, structured and handled exactly like the existing `notes` field (an object mapping each pattern string to its checked state, restored via the same `data-pattern` query-and-set pattern).

### Stage mastery

`getStageMastery()` already generically builds a list of `{dim, key}` pairs from a stage's `chords`/`scales`/`notes` fields and checks each against `adaptWeights[dim][key]` for a count/speed threshold. This gets one more line: a stage's new `progressions` field (an array of pattern strings) maps to `{dim: 'variations', key: pattern}` — reusing the `adaptWeights.variations` bucket already populated by the progression-practice mechanism, so a progression-focused stage gets the exact same mastery percentage/"ready" badge every other stage already shows, with no new tracking logic.

### `applyStage()` and Learning Path stage data

`applyStage()` gains handling for a stage's `progressions` field, following the same pattern as `chords`/`scales`: check exactly the patterns listed, uncheck the rest. Critically, when a stage has no `progressions` field at all (every existing Functional-Harmony-related stage today), it must default to **all 8 progressions enabled** — not zero — so the 6 existing stages that reference `catFunctional` keep behaving exactly as they do today.

8 new stages are added, all fixed to the key of C major / A minor throughout (isolating "learn this new progression" from "play across different keys," which the existing Functional Harmony stages already handle on their own), inserted right after `'Functional Harmony — C'` and before `'Functional, Nat. Keys'`. Cumulative, one progression added per stage, matching the existing Learning Path's established style (e.g. "First Chord" → "Two Chords" → "Three Chords"):

1. I–IV–V
2. + IV–V–I
3. + I–V–vi–IV
4. + vi–IV–I–V
5. + ii–V–I
6. + i–iv–V
7. + ii°–V–i
8. + i–VI–III–VII

## Out of scope for this pass

- Genre-based grouping/tagging of progressions — the design uses curated stage order instead (matching how every other part of the Learning Path already implies difficulty through ordering, not per-item metadata).
- Adding any progressions beyond the current 8 — deliberately deferred; the mechanism built here already supports adding more later as a small, additive change (a new `FUNCTIONAL` entry, a new checkbox, optionally a new stage).
- Any change to how progressions are actually played/checked (the step-by-step mechanism from the prior pass is unchanged).
- Ear Training — unaffected, as before.
