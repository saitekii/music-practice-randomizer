# Learning Path broader audit: ramp fixes

## Problem

Part 3 of the ongoing Learning Path audit (see [[learning-path-audit]] in memory) is a lighter-weight pass over the ~90 non-progression `LEARNING_PATH` stages, looking for the same *class* of issue Part 1 found and fixed for chord progressions: missing intermediate ramps, and new content introduced simultaneously with a jump in key range.

The audit (read every stage in all 17 phases, cross-checked `applyStage()` for other "missing field = enable everything" fallbacks) found:

- The only other fail-open fallback in `applyStage()` besides the already-fixed `progressions` one is `stage.intervals ?? (all intervals)` / `stage.intDirs ?? (['up'])`. Every one of the 7 interval-phase stages explicitly sets both fields today, so this path is currently dormant — not an active bug, just worth a guarding comment.
- 6 concrete ramp gaps, all in two phases: **Scales beyond natural minor** and **Extended chords**. Every other phase was checked and found clean.

## Scope

Fix all 6 findings by inserting missing ramp stages, using the same technique as Part 1: pure data additions to `LEARNING_PATH`, plus updating the corresponding `LEARNING_PATH_PHASES` counts. No changes to `applyStage()`, `getStageMastery()`, `renderStageList()`, or any other logic.

### Scales beyond natural minor (+4 stages, phase count 11 → 15)

1. **Melodic Minor has no all-12-keys stage of its own.** `'Melodic Minor, Nat. Keys'` (7 naturals) is immediately followed by `'Three Minors'`, which jumps to all 12 keys *and* combines three scale types in one step. Harmonic Minor's parallel track has its own dedicated all-12 stage before the equivalent combining step; Melodic Minor doesn't. **Fix:** insert `'Melodic Minor, All 12'` (all 12 keys, melodic minor only, `timer: '10'`) between `'Melodic Minor, Nat. Keys'` and `'Three Minors'`, mirroring `'Harmonic Minor, All 12'` exactly.

2. **Modes has no key ramp at all.** `'Meet the Modes'` is C-only, then jumps straight to `'All Scales, All Keys'` (all 12 keys, all 7 scale types combined) — no natural-keys stage, no modes-only-at-12-keys stage. The starkest gap found. **Fix:** insert `'Modes, Nat. Keys'` (7 naturals, modes only, `timer: 'off'`) and `'Modes, All 12'` (all 12 keys, modes only, `timer: '10'`) between `'Meet the Modes'` and `'All Scales, All Keys'`.

3. **Major Pentatonic never gets its own natural-keys stage.** `'Major Pentatonic — C'` (C-only) is immediately followed by `'Both Pentatonics, Nat.'`, which adds Minor Pentatonic *and* ramps to 7 natural keys in one step. **Fix:** insert `'Major Pentatonic, Nat. Keys'` (7 naturals, major pentatonic only, `timer: 'off'`) between them.

### Extended chords (+3 stages, phase count 9 → 12)

4. **Sus chords: 7sus4 and the 12-key jump happen together.** `'Meet Sus Chords'` (7 naturals) is followed directly by `'Sus + 7sus4, All Keys'`, which both introduces `7sus4` and jumps to 12 keys. **Fix:** insert `'Add 7sus4, Nat. Keys'` (7 naturals, adds `7sus4`, `timer: 'off'`) between them — `'Sus + 7sus4, All Keys'` then becomes a pure key-ramp (its content is unchanged, since `7sus4` is already active by the time it's reached).

5. **9th chords: inversions and the 12-key jump happen together.** `'Add Major 9 & Minor 9'` (7 naturals, no inversions) is followed directly by `'9th Chords, All Keys'`, which both turns on inversions and jumps to 12 keys. **Fix:** insert `'9th Chords, Inversions'` (7 naturals, adds `inversions`, `timer: 'off'`) between them — `'9th Chords, All Keys'` then becomes a pure key-ramp.

6. **Half-Diminished & Diminished 7 debut directly at full complexity.** `'Add Half-Dim & Dim7'` introduces two brand-new chord qualities directly at all 12 keys, alongside 5 other chord qualities and 2 scale types already active — no C-only or natural-keys warm-up, unlike every other new chord/scale type in the path. **Fix:** split the single stage into `'Meet Half-Dim & Dim7'` (7 naturals, `timer: 'off'`) followed by `'Half-Dim & Dim7, All Keys'` (all 12 keys, `timer: '10'`) — same chord/scale content as the original stage, just split across a natural-keys debut and a key-ramp.

### `LEARNING_PATH_PHASES` updates

Both affected phases' `count` fields increase by the number of stages inserted into them (11→15, 9→12). Total `LEARNING_PATH.length` grows from 112 to 119; the sum of all `LEARNING_PATH_PHASES` counts must still equal `LEARNING_PATH.length` exactly.

### Guarding comment for the dormant `intervals`/`intDirs` fallback

Add a one-line comment next to `applyStage()`'s `stage.intervals ?? ...` / `stage.intDirs ?? ...` lines noting that, like the now-fixed `progressions` fallback, a stage with `catIntervals` enabled and no explicit `intervals`/`intDirs` field will silently enable everything — so any future interval-phase stage must set both fields explicitly.

## Out of scope

- The separate `EAR_TRAINING_PATH` (32 stages, Ear Training mode) — not covered by this audit, matching how Parts 1 and 2 were scoped to the Practice-mode `LEARNING_PATH` only.
- Any phase not listed above — all 15 other phases were checked and found to have clean, monotonic ramps.
- `mpr_learning_stage`'s index-based persistence (flagged in Parts 1 and 2, still unaddressed) — this fix will shift stage indices again, same as every prior insertion this session, but re-keying that storage to stage names is separate work.
