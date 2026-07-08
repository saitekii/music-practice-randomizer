# Fix chord-progression curriculum bug + add key ramp

## Problem

An audit of the 107-stage Learning Path surfaced a real bug in the Functional Harmony phase's chord-progression curriculum, plus a missing ramp on the key axis.

**The bug:** `applyStage()` treats a stage with no `progressions` field as "all progressions enabled" (a backward-compatibility default written for the 6 pre-existing Functional Harmony stages that predate the progressions feature entirely). The very first Functional Harmony stage, `'Functional Harmony — C'`, has no `progressions` field — so it silently unlocks all 26 progressions the moment a learner reaches it, before any of them have been introduced. The very next stage, `'Progression: I–IV–V'`, then walks that back down to just 1 progression and builds back up to 26 over the following 11 stages. The net effect: progression difficulty goes 26 → 1 → 2 → 3 → … → 26, a regression followed by a slow rebuild, instead of a clean ramp from zero.

**The missing ramp:** once a learner finishes that 12-stage progression buildup (all 26 progressions, key of C only), the very next stage (`'Functional, Nat. Keys'`) jumps straight to all 7 natural keys, and the stage after that jumps to all 12 keys. There's no intermediate step — unlike every other phase in the path (chords, scales), which ramp key diversity gradually rather than jumping straight from one key to seven.

## Scope

Two data-only changes to `LEARNING_PATH` in `script.js`. No changes to `applyStage()`, `getStageMastery()`, or any other logic — both fields are already handled generically.

### 1. Fix the early-unlock bug

Add `progressions: []` to `'Functional Harmony — C'`, so that stage tests only the 7 single roman-numeral chords (I, ii, iii, IV, V, vi, vii°) — no progressions reachable yet. Update its hint from *"I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C"* to *"I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C"* (drops the now-unreachable progression example).

### 2. Add a 5-stage key ramp

Insert 5 new stages between `'More Minor Progressions'` (the last progression-content stage — C only, all 26 progressions) and the existing `'Functional, Nat. Keys'` stage. Each keeps all 26 progressions enabled (the same array already used by `'More Minor Progressions'`), `cats: ['catFunctional']`, `chords: []`, `scales: []`, `timer: 'off'` — matching the style of the stages around them. Only `notes` changes per stage, mirroring the exact ramp shape the chord phase already uses (C → C,G → C,F,G → +D → +A → +E → all 7 naturals):

1. **Progressions, Two Keys** — `notes: ['C','G']`
2. **Progressions, Three Keys** — `notes: ['C','F','G']`
3. **Progressions, Add D** — `notes: ['C','D','F','G']`
4. **Progressions, Add A** — `notes: ['C','D','F','G','A']`
5. **Progressions, Add E** — `notes: ['C','D','E','F','G','A']`

The existing `'Functional, Nat. Keys'` (all 7 naturals) and `'Functional, All 12'` stages are unchanged, and now serve as the natural conclusion of this ramp rather than an abrupt jump.

## Side effect (not addressed by this pass)

`mpr_learning_stage` in localStorage stores the learner's position as a raw array index, not a stage name. Inserting 5 stages mid-array shifts the index of every stage from `'Functional, Nat. Keys'` onward by 5. Anyone currently sitting at or past that point will see a different stage than the one they left off at. This is a pre-existing fragility (every prior progression-related stage insertion this session has had the same effect) and is out of scope for this fix — the user can re-pick their spot from the All Paths popup.

## Out of scope

- Any other stages in the 107-stage path (covered by the separate broader-audit pass agreed to be done afterward).
- Redesigning the All Paths popup (separate, agreed-to-be-done-next piece of work).
- Any change to which 26 progressions exist or their content.
