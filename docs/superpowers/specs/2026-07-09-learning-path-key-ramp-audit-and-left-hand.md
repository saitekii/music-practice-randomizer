# Learning Path key-ramp audit + Left-Hand Voicing integration

## Problem

Two related requests. First: a follow-up audit of the (now 125-stage) Learning Path, prompted by a direct question — do all phases still need the gradual, one-key-at-a-time ramp pattern established early in the path, or does that stop being necessary once key-fluency itself is well established? The three prior "Learning Path Audit" passes (see [[learning-path-audit]]) fixed *missing* ramps; this pass looks for the opposite problem — ramps that are now *more granular than needed*.

Second: Left-Hand Voicing mode (see [[left-hand-mode-deferred]]) shipped as a standalone checkbox but was never integrated into the Learning Path curriculum at all — no stage references it.

## Audit findings

Went through all 17 phases, specifically tracking each phase's **key-count sequence** (1→2→3...→7→12, vs. a single clean jump) — a phase having many stages isn't itself a problem if those stages ramp something else (timer, added chord/scale quality, added content) at a fixed key count. The redundant pattern is specifically a slow, note-by-note key-count crawl where nothing else changes between consecutive stages.

**Already correct (light-touch: new content starts at a natural-keys or C-only stage, one clean jump to 7 naturals, one clean jump to 12 — no intermediate key-count steps):** Phases 3, 4, 8, 9, 12, 13, 15. Phase 12 in particular is the direct product of the last audit and is treated here as the reference template.

**Phase 1 (Note Finder) and Phase 2 (Major chords):** granular by design and left alone — Phase 1 is literally the first exposure to the instrument; Phase 2 is the first exposure to chord recognition as a skill, distinct from the note-finding skill Phase 1 teaches even though the notes themselves are already known.

**Phase 5 (Accidentals):** granular by design and left alone — this is the one phase whose entire purpose is teaching the 5 non-natural keys, one at a time. Correctly the most granular key-focused phase in the path.

**Phase 10 (7th chord inversions):** has a C-only opening stage but is NOT a trim candidate — 7th chords introduce a genuinely new concept (a *3rd inversion*, which triads don't have), so isolating it once before adding key-variation is justified, not redundant.

**Trim candidates — Phases 6, 7, and 14:**

- **Phase 6 (Triad inversions):** `'Meet Inversions'` (C only) → `'Two Keys, Inverted'` (C,G) → `'Natural Majors Inv.'` (7 naturals) ... The 2-key stage is the one redundant step — inversions is a genuinely new concept (justifying the C-only intro), but the key axis itself needs no separate ramp since all 12 keys were already mastered in Phase 5.
- **Phase 7 (Major scales):** `'First Scale'` (C) → `'Add G Major Scale'` (C,G) → `'Add F Major Scale'` (C,F,G) → `'Common Majors'` (6 keys) → `'All Natural Scales'` (7 naturals) ... Three redundant intermediate key-count steps, inconsistent with how every *later* scale type in Phase 12 (Harmonic Minor, Melodic Minor, Major Pentatonic, Modes) only needs C-only → 7 naturals → 12, no crawl.
- **Phase 14 (Functional harmony):** two separate redundant ramps, one from the original audit and one added this session:
  - The 5-stage natural-key ramp (`'Progressions, Two Keys'` → `'Three Keys'` → `'Add D'` → `'Add A'` → `'Add E'`) — uniquely the only place in the entire Learning Path that ramps through natural keys one note at a time; every other phase does this in a single jump.
  - `'Borrowed Content, Two Keys'` (added this session, shipped in the borrowed/chromatic-mediant chords work) — redundant for the same reason once the 5-stage ramp ahead of it is gone: the very next stage, `'Functional, Nat. Keys'`, is a pre-existing catch-all with no `progressions` field, so it already auto-includes everything (see [[chord-progressions-learning-path-deferred]]) — no dedicated 2-key stage is needed before it.

## Design

### 1. Trim Phases 6, 7, and 14's redundant key-ramp stages

**Phase 6 (Triad inversions):** remove `'Two Keys, Inverted'`. 9 → 8 stages. New sequence: `Meet Inversions` → `Natural Majors Inv.` → `Add Minor Inversions` → `Inversion Timer` → `Inversions, 10 Sec` → `All 12, Inverted` → `Add Dim & Aug` → `Triad Mastery`.

**Phase 7 (Major scales):** remove `'Add G Major Scale'`, `'Add F Major Scale'`, `'Common Majors'`. 7 → 4 stages. New sequence: `First Scale` → `All Natural Scales` → `Scale Timer` → `All 12 Scales`.

**Phase 14 (Functional harmony):** remove all 5 of `'Progressions, Two Keys'` / `'Three Keys'` / `'Add D'` / `'Add A'` / `'Add E'`, plus `'Borrowed Content, Two Keys'`. 28 → 22 stages. New sequence: the 13 existing C-only content stages (`'Functional Harmony — C'` through `'More Minor Progressions'`) → the 5 C-only borrowed-content stages (`'Borrowed Chords — Intro'` through `'Minor Borrowed — ♭II'`) → straight into `'Functional, Nat. Keys'` → `'Functional, All 12'` → `'Functional + Chords'` → `'Full Functional Mix'`.

No other stage in any of the three phases changes — chord/scale/progression content, timer values, and hints for every kept stage stay exactly as they are today. `LEARNING_PATH_PHASES` counts update to match (6: 9→8, 7: 7→4, 14: 28→22).

### 2. Fix `mpr_learning_stage` to persist by stage name, not array index

**Why now, not deferred again (as it was 3 times before):** every prior Learning Path change was insertion-only — a saved index still landed on *some* real stage after the shift, just possibly the wrong one. This pass is the first to *remove* stages, which is a strictly worse version of the same bug (a saved index can now point past the end of a shrunk phase, or land on unrelated content).

**Approach:** `learningStage` stays an in-memory array index everywhere it's currently used that way (stage lookups, prev/next navigation, progress display, mastery lookup) — no change to any of that logic. Only the **persistence layer** changes:

- Every `localStorage.setItem('mpr_learning_stage', ...)` call site writes `LEARNING_PATH[learningStage].name` (a string) instead of the raw index.
- On load, instead of `parseInt(localStorage.getItem('mpr_learning_stage'))` + a bounds check, look up the index via `LEARNING_PATH.findIndex(s => s.name === storedName)`.
- **Migration is automatic and requires no special-case code:** a pre-existing save is a numeric string (e.g. `"42"`), which will never equal any stage's `.name` string, so `findIndex` naturally returns `-1` for old-format saves — exactly the same "not on path" state as if the key were absent. No stage-mapping guesswork, no explicit migration function. The one-time cost: a learner mid-path when this ships needs to re-open the Learning Path panel and pick a stage again, once. After that, their position survives any future insertion or removal permanently.
- The JSON export/import backup feature (`exportJSON()`/import handler) already treats `learning_stage` as an opaque string it round-trips through `localStorage` — no format-specific handling there today except one spot, the import handler's `learningStage = parseInt(data.learning_stage) ?? -1`, which must change to the same name-based `findIndex` lookup as the startup-load path (using the same fallback: name not found → `-1`, "not on path").

### 3. New "Left-Hand Voicing" phase, inserted between Phase 5 (Accidentals) and Phase 6 (Inversions)

**Why this position:** Left-Hand mode (see [[left-hand-mode-deferred]]) only supports Major/Minor triads in root position today, and explicitly disables `inversions` while active — so there's no reason to wait for Phase 6 (Inversions) or any later phase; the moment Major/Minor triads are solid across all 12 keys (end of Phase 5) is exactly when this two-handed coordination skill can be introduced.

**5 new stages**, following the same light-touch template established elsewhere (a C-only intro is justified here because two-handed coordination is a genuinely new physical/conceptual skill, distinct from the "keys are already known" redundancy this whole audit is trimming):

1. `Meet Left Hand` — C only, Major only, `leftHandMode` on, timer off
2. `Left Hand, Nat. Keys` — 7 naturals, Major only, timer off
3. `Add Minor, Left Hand` — 7 naturals, Major + Minor, timer off
4. `Left Hand Timer` — 7 naturals, Major + Minor, 15s
5. `Left Hand, All 12` — 12 keys, Major + Minor, 10s

**Required mechanism change:** `applyStage()`'s chord-checkbox handling (`ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions'])`) has no entry for `leftHandMode` at all today — no existing Learning Path stage has ever controlled that checkbox, since it didn't exist yet when `applyStage()` was written. `ALL_CHORDS` needs `'leftHandMode'` added, and each of the 5 new stages needs `'leftHandMode'` in its `chords` array (alongside `'chordMajor'`/`'chordMinor'` as appropriate) for `applyStage()` to check it. Every other existing stage's `chords` array is unaffected (none of them mention `leftHandMode`, so `applyStage()` will correctly uncheck it whenever navigating to any other stage — matching how it already unchecks every chord-type checkbox not listed).

`LEARNING_PATH_PHASES` gains a new entry (`{ name: 'Left-Hand Voicing', count: 5 }`) inserted between `'Accidentals one at a time'` and `'Triad inversions'`.

### Net effect

125 → **120 stages** (−1 Phase 6, −3 Phase 7, −6 Phase 14, +5 new phase). 17 → **18 phases**.

### Testing

- Regression coverage for the 3 trimmed phases: confirm the removed stage names no longer exist in `LEARNING_PATH`, confirm the new stage-to-stage adjacency (e.g. `'Meet Inversions'` is now immediately followed by `'Natural Majors Inv.'`), confirm every *kept* stage's content fields are byte-identical to before (nothing else about them changed).
- `mpr_learning_stage` persistence: a fresh save/load round-trips a stage name correctly; a pre-existing numeric-format value resets cleanly to "not on path" (`learningStage === -1`) rather than crashing or silently pointing at the wrong stage; the JSON export/import path is covered the same way.
- New Left-Hand phase: `applyStage()` on each of the 5 new stages correctly checks/unchecks `leftHandMode`, `chordMajor`, `chordMinor`, and notes; confirm `inversions` is never simultaneously checked (matches the existing mutual-exclusion behavior).
- `LEARNING_PATH_PHASES` counts still sum to `LEARNING_PATH.length` (125 → 120), and the several existing tests that hardcode the absolute total (a recurring staleness pattern noted in every prior Learning Path change) get updated together, once, rather than piecemeal.

## Out of scope

- Phase 2 (Major chords) and Phase 10 (7th chord inversions) were considered and deliberately left unchanged — see reasoning above.
- No changes to any phase's actual musical content (which chords/scales/progressions/intervals are taught, in what order) — this pass only removes redundant *key-count* stages and adds the new Left-Hand phase.
- Left-Hand mode itself gains no new capability here (still Major/Minor, root position only) — only Learning Path integration of what already exists.
- No further work on the remaining deferred progression tiers (secondary dominants, chord-quality overrides, slash-chords, quartal harmony — see [[chord-progressions-learning-path-deferred]]).
