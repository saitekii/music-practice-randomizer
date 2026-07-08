# Left-Hand mode: two-handed chord voicing practice

## Problem

The user has gotten comfortable with right-hand triads and wants to start incorporating the left hand — a natural next step, and a real, common piano skill (root+5th in the left hand, chord shape in the right). Building this the same way `inversions` was built (a checkbox that reuses today's data model) would inherit the exact stats blind spot the just-shipped `adaptWeights.variations` foundation was built to fix: no way to see "how am I doing on two-handed voicings specifically."

## Scope

**This pass:** Major and Minor chord types only, root-position voicings only — left hand plays root + 5th (below middle C), right hand plays the full chord (root+3rd+5th, at/above middle C). Scoped to the plain Chords generator only (matching how `inversions` is scoped today — Diatonic Chords and Functional Harmony are untouched).

**Explicitly deferred, but the architecture is shaped to allow it later without another data-model change:** other chord types, other inversions, and chord extensions (7ths/9ths/etc.) combined with Left-Hand mode. Real per-inversion, per-extension voicing rules (e.g., "what does the left hand play for a 1st-inversion 7th chord") are genuinely non-trivial piano voicing decisions, not a mechanical generalization of root+5th — they are deliberately not designed in this pass.

## Design

### Data model

The prompt key gains a 5th segment: `chord|${note}|${type.label}|${inv}|${handMode}`, where `handMode` is `'LH'` or `''`. This is kept as its own independent segment — not overloaded into the existing inversion slot — specifically so a future pass can combine `handMode='LH'` with a real inversion label without changing the key format again. For this pass, whenever Left-Hand mode is on, `inv` is always forced to `''` (see UI section below — the `inversions` checkbox is disabled while Left-Hand mode is active).

### Correctness check

`getExpectedPCs()`'s chord branch, when `handMode === 'LH'` (and the chord type is Major or Minor — the only two types this pass supports), additionally computes and returns:
- `leftHandPcs: [pcs[0], pcs[2]]` — root and 5th (index 2 is the 5th for both Major `[0,4,7]` and Minor `[0,3,7]`, since both are simple root-position triads).
- `rightHandPcs: pcs` — the full chord.

`checkMidi()`'s chord branch, when `leftHandPcs`/`rightHandPcs` are present, requires: every pitch class in `leftHandPcs` is present among held notes with MIDI note number below 60 (middle C), AND every pitch class in `rightHandPcs` is present among held notes with MIDI note number at or above 60. This register-based check is layered on top of (not replacing) the existing pitch-class-membership logic — it's a new, additional requirement specific to Left-Hand-mode prompts.

### UI

A new checkbox in the Chords category options, alongside the existing `inversions`/`jazzSymbols` checkboxes. When checked, the `inversions` checkbox becomes visually disabled — reusing the existing `.category-options.disabled`-style pattern (`opacity: 0.3; pointer-events: none`), scoped to just that one checkbox's row rather than the whole Chords section, with a short inline note (e.g. "combines with Left-Hand mode in a future update") so the restriction reads as intentional, not broken. This is purely a UI-level restriction for this pass — the underlying key format already keeps the two concepts independent, so lifting it later (once real inversion+hand-mode voicings are designed) won't require another data-model change.

### Stats integration

When a Left-Hand-mode prompt is answered correctly, `recordAdaptiveResult()` records it into the same `adaptWeights.variations` bucket already used for inversion labels, under a new label, `'Left Hand'` — alongside `'Root position'`, `'1st inversion'`, etc. The existing "Inversions" section on the stats page (built in the immediately-prior feature) automatically shows a separate, trackable "Left Hand" entry with its own speed/mastery bar — no new stats-page section or rendering logic needed, since `buildSection()` is already generic over whatever keys exist in that bucket.

## Out of scope for this pass

- Any chord type besides Major/Minor.
- Any inversion besides root position — the `inversions` checkbox is disabled in the UI while Left-Hand mode is on.
- A dedicated visual marker for "right notes, wrong hand/register" (analogous to the bass-target marker built for chord inversion checking). For this pass, playing the right notes in the wrong hand simply doesn't register as a correct answer yet — the existing red wrong-note highlighting still flags genuinely wrong pitch classes regardless of register.
- Diatonic Chords, Functional Harmony, or any `LEARNING_PATH` changes.
- Any actual per-inversion or per-extension left-hand voicing rules — the data model is shaped to support them later, but none are designed or built now.
