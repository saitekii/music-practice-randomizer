# First Progressions (Early Functional Harmony Teaser)

**Goal:** Give students an early "I can actually play something" moment. Currently `Functional Harmony` (the roman-numeral progression practice) doesn't unlock until stage 88 of 125 (~70% through the curriculum), even though the simplest progressions only need chords already taught by stage 10. Insert a small early slice of progression practice right after minor is introduced.

## Background

Verified via `critique.txt` review (see [[learning-path-audit]]-adjacent memory): `I–IV–V`, `IV–V–I`, and `I–V–vi–IV` need only Major/Minor triads — content already taught in Phase 2–3 — yet don't appear anywhere before Phase 16. The critique originally proposed dropping roman numerals for this early slice ("framed as songs, not roman numerals"), but on discussion, roman-numeral recall (e.g. "what's IV in D major") is core, valuable, transposable knowledge — not incidental complexity to strip away. Decision: **keep roman numerals**. The real fix is moving a small taste of progression practice much earlier, not removing its notation.

## Design

**New phase**: `"First Progressions"`, inserted between the existing `"Introduce minor"` phase (ends at `"All Natural Minor"`) and `"Add timer pressure"` (starts at `"Add a Timer"`). Placed here specifically because `I–V–vi–IV` needs the `vi` (minor) chord, which only exists once `"Introduce minor"` has run.

Reuses the **existing, unmodified** Functional Harmony practice mechanism verbatim — the same `catFunctional` category, the same `FUNCTIONAL.major` progression-checkbox system, the same `applyStage()`/`getStageMastery()` handling every other `catFunctional` stage already gets. No new capability, no new display mode, no new data structure. All three progressions (`I–IV–V`, `IV–V–I`, `I–V–vi–IV`) are part of the "original 8" progressions and are therefore already checked-by-default — nothing about their checkbox-gating needs to change.

Three new stages, cumulative (matching the exact ramp shape the late Functional Harmony phase already uses for these same three progressions), all C-only and untimed:

1. **"Play Your First Song"** — `progressions: ['I–IV–V']`. Hint: "Your first real chord progression — three chords, one classic sound."
2. **"Add a Turnaround"** — `progressions: ['I–IV–V','IV–V–I']`. Hint: "Same three chords, different order — a classic turnaround."
3. **"Four Chord Song"** — `progressions: ['I–IV–V','IV–V–I','I–V–vi–IV']`. Hint: "The real 'four chord pop song' progression."

**Name-collision constraint** (found during design, must hold): the late Functional Harmony phase already has stages named `'Progression: I–IV–V'`, `'Add IV–V–I'`, `'Add I–V–vi–IV'` with this exact same progression content. Several places in the codebase (`applyStage()` navigation, adjacency tests) look up stages via `LEARNING_PATH.findIndex(s => s.name === ...)`, which only ever resolves the *first* match — so the three new early stages MUST have names distinct from their late-phase counterparts. This is why the three names above were chosen instead of reusing the existing late-phase names verbatim.

**The late Functional Harmony phase is completely untouched** — no stages removed, renamed, or reordered there. The overlap in content (both the early teaser and the late phase's first few stages cover `I–IV–V`/`IV–V–I`/`I–V–vi–IV`) is intentional spaced repetition: an early taste, then the same numerals revisited in the context of full generalization (all keys, timer, eventually every progression) later.

**Phase/path counts**: a new `LEARNING_PATH_PHASES` entry `{ name: 'First Progressions', count: 3 }` is inserted at the correct position (no existing phase's count changes). `LEARNING_PATH` grows from 125 to 128 stages.

## Testing

- Confirm the three new stages sit between `"All Natural Minor"` and `"Add a Timer"`, in the stated order.
- Confirm each stage's `progressions` field matches exactly (cumulative: 1, then 2, then 3 entries) and that `notes`/`chords`/`scales`/`timer` match every other early-curriculum `catFunctional`-adjacent stage shape (`notes: ['C']`, `timer: 'off'`).
- Confirm no two stages in the whole `LEARNING_PATH` share the same `name` (a direct regression test for the collision risk identified above) — a simple "all names unique" sweep over the full array.
- Confirm `applyStage()` on each of the three new stages correctly checks exactly the intended progression checkboxes and unchecks everything else `catFunctional`-related.
- Confirm the existing late-phase stages (`'Progression: I–IV–V'` etc.) are byte-identical to their pre-change state — this is a pure insertion, nothing else in the array changes.
- Confirm `LEARNING_PATH_PHASES` counts still sum to `LEARNING_PATH.length`, and the new phase entry is positioned correctly between "Introduce minor" and "Add timer pressure" in the phase list.
