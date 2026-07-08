# Adding 18 more chord progressions

## Problem

The user supplied a much larger list of chord progressions (`progressions.md`, ~90 entries across ~30 genre categories) than the 8 currently in the app. Most of that list uses harmonic concepts the app has no support for at all — borrowed/modal-interchange chords, secondary dominants, inline chord-quality overrides (maj7/9/13/sus/etc.), slash-chord/pedal-point notation, and non-key voicing types (quartal/parallel) — each a genuinely separate future capability, not something to guess at under one banner. This pass adds only the subset that's already fully compatible with the existing diatonic-roman-numeral mechanism: 18 new progressions, cross-referenced against the existing 8 to exclude duplicates.

## Scope

Add 18 new progressions as data entries (14 major, 4 minor), each with its own checkbox (unchecked by default, unlike the original 8), and extend the Learning Path with 4 new cumulative stages that introduce them in groups after the existing 8-stage progression curriculum. One ambiguous entry from the user's list ("I → vii → vi → V", unclear whether "vii" meant the diminished "vii°") was dropped at the user's request rather than guessed at.

**The 18 new progressions:**

Major (14): `I–IV–V–I`, `I–vi–IV–V`, `I–iii–IV–V`, `I–V–IV–I`, `I–iii–vi–ii–V`, `vi–ii–V–I`, `iii–vi–ii–V–I`, `IV–V–iii–vi`, `IV–V–I–vi`, `I–ii–IV–V`, `I–IV–ii–V`, `I–V–ii–IV`, `I–IV–vi–V`, `vi–V–I–IV`

Minor (4): `i–VII–VI–V`, `i–iv–VI–V`, `i–VI–iv–V`, `i–III–VII–VI`

## Design

### Data and checkboxes

18 new entries added to `FUNCTIONAL.major`/`FUNCTIONAL.minor` (14 major, 4 minor), each getting its own `data-pattern` checkbox in the existing `functionalOptions` panel, using the exact same mechanism built for the original 8 (`enabledProgressions()`, `saveSettings()`/`loadSettings()`'s `progressions` field) — no new plumbing, just more entries and more checkboxes.

Unlike the original 8 (checked by default, since they predate the filtering mechanism and needed to stay behaviorally unchanged), these 18 are **unchecked by default** — new content shouldn't suddenly dilute the existing random-practice pool for anyone not using the Learning Path. They become available either by manually checking them, or by working through the new Learning Path stages below, which explicitly enable them as the curriculum progresses.

### Learning Path stages

4 new cumulative stages, inserted right after the existing "Add i–VI–III–VII (minor)" stage (the end of the original 8-progression curriculum), following the same `progressions` field mechanism `applyStage()`/`getStageMastery()` already support:

- **Stage 9**: adds 5 major progressions using only chords already introduced in stages 1-8 (`I–IV–V–I`, `I–vi–IV–V`, `I–V–IV–I`, `vi–ii–V–I`, `IV–V–I–vi`) — new arrangements, no new harmonic concept.
- **Stage 10**: adds 5 more major progressions, same character (`I–ii–IV–V`, `I–IV–ii–V`, `I–V–ii–IV`, `I–IV–vi–V`, `vi–V–I–IV`).
- **Stage 11**: adds the 4 progressions that introduce the **iii** chord — never used in any of the original 8 or in stages 9-10 (`I–iii–IV–V`, `I–iii–vi–ii–V`, `iii–vi–ii–V–I`, `IV–V–iii–vi`).
- **Stage 12**: adds the remaining 4 minor progressions, familiar chords, no new concept (`i–VII–VI–V`, `i–iv–VI–V`, `i–VI–iv–V`, `i–III–VII–VI`).

Each stage's `progressions` array is cumulative (stage 12's array is all 26 progressions — the original 8 plus all 18 new ones). All 4 stages fixed to `notes: ['C']`, `timer: 'off'`, matching the style of the original 8-stage progression curriculum they extend.

## Out of scope for this pass

- Everything else in `progressions.md` that isn't a plain diatonic roman-numeral progression — borrowed/modal-interchange chords, secondary dominants, inline chord-quality overrides, slash-chord/pedal-point notation, quartal/parallel voicing types. Each is a separate future capability needing its own design.
- The ambiguous "I → vii → vi → V" entry — dropped rather than guessed at.
- Any change to the existing 8 progressions, their checkboxes, or the original 8-stage curriculum.
