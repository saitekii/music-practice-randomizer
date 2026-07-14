# Two-Handed Progressions

**Goal:** Combine the just-shipped Progressions-with-Inversions phase with the existing Left-Hand mode — a new Learning Path phase where the right hand plays a progression's required inversion and the left hand plays the actual bass note that inversion calls for (plus the chord's root), teaching real two-hand voice-leading instead of two separate, disconnected skills.

## Background

Left-Hand mode (Phase 7) currently only combines with root-position Major/Minor chords: left hand always plays a fixed root+5th below middle C, right hand plays the full chord at/above middle C. Progressions-with-Inversions (Phase 9, just shipped) requires a specific voice-led inversion per chord in a progression, checked via a single `requiredBassPc` against the lowest held note across all keys pressed.

Combining them naively (left hand always root+5th, unchanged) breaks down: `checkMidi()`'s existing bass check looks at the lowest note across **both hands combined**, not per hand. If the left hand always plays a fixed root below middle C, that note will almost always be the overall lowest — making the right hand's required inversion (which might need the 3rd or 5th in the bass) unenforceable, since the combined-lowest-note check would only ever see the left hand's fixed root.

**Resolution, worked out during brainstorming:** the left hand plays the *actual* required bass note (not always the root) plus the chord's root — this is standard two-hand voice-leading technique, and it sidesteps the conflict entirely without touching shared bass-checking code, since the left hand's note naturally becomes the overall lowest note by construction (it's below middle C, matching the existing Left-Hand convention).

## Design

### Left-hand voicing rule

Two notes: the required bass pitch class, plus the chord's root pitch class — collapsing to today's exact `[root, 5th]` whenever the required bass *is* the root (root-position steps are visually and musically unchanged from existing Left-Hand mode). Verified by hand against every step of all 3 registered progressions — every resulting pair is a genuine chord tone combination, never a dissonant non-chord-tone:

| Progression | Step | Required bass | Chord root | Left hand plays |
|---|---|---|---|---|
| `I–IV–V` | I (root) | C | C | C, G *(root+5th, unchanged)* |
| `I–IV–V` | IV (2nd inv) | C | F | C, F |
| `I–IV–V` | V (1st inv) | B | G | B, G |
| `IV–V–I` | IV (root) | F | F | F, C *(root+5th, unchanged)* |
| `IV–V–I` | V (root) | G | G | G, D *(root+5th, unchanged)* |
| `IV–V–I` | I (2nd inv) | G | C | G, C |
| `I–V–vi–IV` | I (root) | C | C | C, G *(root+5th, unchanged)* |
| `I–V–vi–IV` | V (1st inv) | B | G | B, G |
| `I–V–vi–IV` | vi (root) | A | A | A, E *(root+5th, unchanged)* |
| `I–V–vi–IV` | IV (1st inv) | A | F | A, F |

Right hand: the full chord (all 3 pitch classes), unchanged from today's Left-Hand mode convention — no change to how the right hand is checked.

### A checking-logic conflict found and resolved during brainstorming

`checkMidi()`'s final match is `pcsMatch && bassMatch && handMatch`. If a prompt populated **both** the generic `requiredBassPc` field *and* `leftHandPcs`/`rightHandPcs`, a user playing the left hand's two notes in the "wrong" relative order (e.g. root voiced lower than the bass note, both still below middle C) would spuriously fail `bassMatch` even though `handMatch` — the check that actually matters here — would correctly pass. Checked directly: today's existing single-chord Left-Hand mode never hits this, because it forces the inversion segment empty whenever hand mode is on, which makes `requiredBassPc` resolve to `null` automatically.

**Resolution:** when hand mode is on, `getExpectedPCs()`'s `func` branch returns `requiredBassPc: null` explicitly and relies **only** on `leftHandPcs`/`rightHandPcs` hand-membership checking — mirroring the existing single-chord precedent exactly, not inventing a new dual-check pattern.

### Mechanism

- Reuses the **existing** `leftHandMode` checkbox (not a new toggle) — the same "Left-Hand mode" concept the app already has, just now also read by `genFunctional()`/`getExpectedPCs()`'s `func` branch, the same way it's already read by `genChord()`.
- `func`-type prompt keys gain a 6th segment: `func|note|mode|pattern|stepIndex|handMode` (mirrors the existing `chord|note|type|inv|handMode` shape). Always present (empty string when not in hand mode), matching the `chord`-type key's own convention. `advanceProgressionStep()` needs no changes — it already only mutates the step-index segment and passes every other segment through unchanged.
- A new helper, `progressionAllowsLeftHand(modeKey, pattern)`, confirms every numeral in the progression resolves to a plain Major or Minor triad before allowing hand mode — mirroring `genChord()`'s existing `type.label === 'Major' || type.label === 'Minor'` restriction. All 3 currently-registered progressions pass this check (verified: I/IV/V resolve to Major, vi resolves to Minor). This guard exists so a future progression built from a non-invertible-in-this-scheme quality (e.g. a borrowed chord or a diminished numeral) can't silently combine with hand mode in a way nobody designed for.
- `getExpectedPCs()`'s `func` branch: when `handMode === 'LH'` and the resolved quality is Major/Minor, compute the left-hand pitch classes per the table above (reusing `getRequiredBassPc()` for the "what's the required bass" half of that computation) and return `requiredBassPc: null` alongside `leftHandPcs`/`rightHandPcs`. Otherwise, behavior is completely unchanged from today.
- `applyStage()` needs **zero changes** — `leftHandMode` is already a generically-handled entry in `ALL_CHORDS` (set via a stage's `chords` field), and `requireProgressionInversions` is already generically handled from the previous round. The 3 new stages simply set both.

### Curriculum placement

New phase `'Two-Handed Progressions'`, inserted immediately after `'Four Chords, Inverted'` (the last stage of the just-shipped "Progressions, Inverted" phase) and before `'First Scale'` — confirmed adjacent in the live 131-stage array. 3 cumulative stages, mirroring the established pattern (the same 3 progressions have now been taught 3 times: root position in "First Progressions," single-hand inversions in "Progressions, Inverted," two-handed inversions here):

1. `'Two-Handed First Song'` — `I–IV–V` only.
2. `'Two-Handed Turnaround'` — `+ IV–V–I`.
3. `'Four Chords, Two Hands'` — `+ I–V–vi–IV`.

All 3: C-only, untimed, `cats: ['catFunctional']`, `chords: ['leftHandMode']`, `requireProgressionInversions: true`, cumulative `progressions` matching the pattern above.

Verified directly against the live array: none of the 4 new names (3 stages + 1 phase) collide with any existing stage or phase name.

### Explicitly out of scope

More complex voicings beyond triads (7ths, extensions) and any chord quality beyond Major/Minor — the `progressionAllowsLeftHand()` guard exists specifically to keep this out of scope safely rather than accidentally, not to be removed later without a real design pass.

## Testing

- `getExpectedPCs()` with hand mode on returns the exact `leftHandPcs`/`rightHandPcs` from the table above, for every step of all 3 progressions, at two different roots (not just C) to confirm transposition.
- `getExpectedPCs()` with hand mode on returns `requiredBassPc: null` (not the generic bass value) — confirming the checking-logic conflict is actually avoided, not just designed around on paper.
- `progressionAllowsLeftHand()` returns `true` for all 3 registered progressions.
- `checkMidi()` end-to-end: the correct two-hand voicing (bass+root below middle C, remaining chord tones at/above middle C) advances the prompt; the right pitch classes with the left-hand notes in the wrong relative order still advances (proving the conflict-avoidance actually works, not just that the happy path works); wrong hand placement or wrong notes does not advance.
- `applyStage()` on each of the 3 new stages checks `leftHandMode`, `functionalRequireInversions`, and the correct cumulative progressions.
- Regression: existing Phase 7 (single-chord Left-Hand mode) and Phase 9 (single-hand Progressions-with-Inversions) stages are unaffected — confirm `applyStage()` on stages from each of those phases leaves the *other* phase's mechanism inactive (Phase 7 stages don't set `requireProgressionInversions`; Phase 9 stages don't set `leftHandMode`).
- Full existing regression sweep (all Functional Harmony and Learning Path test files) still passes.
