# Stats foundation: tracking practice variations (starting with inversions)

## Problem

The adaptive stats system (`adaptWeights`) tracks performance by root note (`roots`) and chord/scale type (`types`), plus their cross-product (`combos`) — but it has no concept of a "variation" within a type. Concretely: `genChord()` already picks and displays a specific inversion label ("Root position", "1st inversion", etc.) whenever the `inversions` checkbox is on, and that label is already present in the prompt's key (`chord|C|Major|1st inversion`) — but `recordAdaptiveResult()` never reads it. Every inversion attempt for "C Major" gets lumped into the same "C Major" stat bucket, indistinguishable from a root-position attempt. There's currently no way to answer "am I actually good at 2nd inversions, or just root position?"

This also matters beyond inversions: any future practice variation (e.g. a hand-voicing mode) would hit the exact same blind spot if it reused today's data model as-is. This pass builds the tracking mechanism generically enough to be reused later, but only wires it up for inversions now — no other variation exists in the app today.

## Scope

Add a new `adaptWeights.variations` bucket, parallel to the existing `roots`/`types`/`combos`, tracking EMA-based speed/count exactly the way those three already do. Wire it up for chord inversions only. Display it as a new "Inversions" section on the stats page, reusing the existing generic section-rendering code.

## Design

### Data model

`adaptWeights` gains a fourth bucket, `variations: {}`, identical in shape to `roots`/`types`/`combos` — each entry is `{ ema, ema_slow, count }`, updated via the existing, already-generic `updateAdaptWeight(dim, key, ms)` function (no changes needed to that function itself).

`recordAdaptiveResult()`'s `chord` branch gains one line: when the prompt's inversion label (`parts[3]` of the split key) is non-empty, call `updateAdaptWeight('variations', parts[3], ms)`. The key is the inversion label alone ("Root position", "1st inversion", "2nd inversion", "3rd inversion"), aggregated across every chord type and root — mirroring how the existing `types` bucket aggregates a chord quality across every root. All four labels are tracked, including "Root position" — treating it as just another variation rather than a non-tracked default gives a complete picture (someone might genuinely be slower at root position than expected, which is a useful thing to surface, not an edge case to hide).

When the `inversions` checkbox is off, the prompt's inversion-label key segment is an empty string, so nothing is recorded to `variations` for that answer — no meaningless "no variation" entry. The existing `roots`/`types`/`combos` tracking for that same answer is completely unaffected either way.

### Backward compatibility

Two places currently construct or replace `adaptWeights` without a `variations` fallback, both needing the same `variations: p.variations || {}` (or equivalent) guard already used for the other three buckets:
- The initial load-from-`localStorage` code (`let adaptWeights = (() => { ... })()`).
- The "Restore backup" import handler, which currently does a bare `adaptWeights = data.adaptive_weights;` — importing a backup exported before this feature existed would leave `adaptWeights.variations` `undefined`, and the next inversion answer would throw when `updateAdaptWeight('variations', ...)` tries to index into it.

The "reset learning data" code path (which sets `adaptWeights = { roots: {}, types: {}, combos: {} }`) also needs `variations: {}` added so a manual reset doesn't reintroduce the same missing-key hazard.

### Display

A new "Inversions" section on the stats page, added via one more call to the existing `buildSection(entries, title)` helper (already used for the "Root Notes" and "Types" sections) — `buildSection(Object.entries(adaptWeights.variations), 'Inversions')`. This function is already fully generic (color-coded speed bars, mastery badges, trend arrows, a "building" state for entries under 3 samples) and requires no changes; the new section just needs to exist wherever `renderStats()` assembles the Root Notes/Types sections today.

## Out of scope for this pass

- Any change to `genChord()`'s inversion-picking logic or the `inversions` checkbox itself.
- Any new practice mode (left-hand/two-handed voicing) — this spec only builds the tracking foundation such a mode could plug into later; no such mode is designed or built here.
- Scales, intervals, or any other prompt type gaining a "variation" dimension — only chord inversions exist as a variation today.
- Changes to the weighted-random prompt-selection logic (`weightedPick`) to weight by variation — this pass is display/tracking only, not adaptive selection by inversion.
