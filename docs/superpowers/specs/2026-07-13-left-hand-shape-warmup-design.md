# Left-Hand Shape Warmup

**Goal:** Fix a real gap in the Learning Path found via `critique.txt` review: `"Meet Left Hand"` jumps straight from single-hand-only chord play to simultaneous two-handed play (right hand full chord + left hand root+5th), with no stage that isolates the actual new skill — hand independence/coordination — before combining. Add one warmup stage that practices just the left-hand shape.

## Background

`checkMidi()`'s Left-Hand-mode path (`script.js`, the `expected.leftHandPcs` branch) always requires **both** hands together: the full chord's pitch classes must all be present, and a valid low/high split of held notes must satisfy root+5th below plus the full chord above. There is no existing code path that checks only a left-hand shape in isolation. Building a genuine left-hand-alone warmup therefore needs either new register-aware checking logic, or a way to sidestep that machinery entirely.

**Decision:** no register enforcement. The warmup only needs to confirm the student can find and play root+5th — it does not need to verify they used their literal left hand or a specific octave. This means the warmup doesn't need Left-Hand-mode's two-hand infrastructure at all; it can be an ordinary, single-voicing chord type.

## Design

**New chord type**: `CHORD_TYPES` gets one new entry:
```js
{ id: 'chordRoot5', label: 'Root + 5th', seventh: false, formula: '1 – 5' }
```
`CHORD_INTERVALS['Root + 5th'] = [0, 7]` (root and perfect fifth, no third). Not added to `INVERTIBLE_CHORD_TYPES` (a two-note voicing has no meaningful inversion). No `JAZZ_SYMBOLS` entry — the prompt falls back to the plain `"${note} Root + 5th"` display, same as any chord type without a jazz-symbol mapping.

This is a genuine, standalone chord type — it goes through the existing, **unmodified** `type === 'chord'` branch of `checkMidi()`/`getExpectedPCs()`. No Left-Hand-mode flag, no hand-split logic, no register check. It becomes a normal, freely-selectable checkbox in the Chords settings panel, consistent with how every other Learning-Path-introduced concept (including Left-Hand mode itself) remains manually toggleable after its stage teaches it.

**New Learning Path stage**: `"Left Hand Shape"`, inserted immediately before `"Meet Left Hand"` in the `Left-Hand Voicing` phase. `chords: ['chordRoot5']`, `notes: ['C']`, `timer: 'off'` — matches `"Meet Left Hand"`'s own starting simplicity (single key, untimed). It is a plain (non-`leftHandMode`) chord stage, so `applyStage()`/`getStageMastery()` need no special-casing — it's tracked exactly like any other chord-type stage.

**Phase/path counts**: `Left-Hand Voicing` phase count goes from 5 to 6 stages; `LEARNING_PATH` grows from 124 to 125 stages.

## Testing

- Confirm the new chord type resolves correctly via `getExpectedPCs()` for a `chord|C|Root + 5th||` key: pitch classes `[0, 7]`, no `requiredBassPc`, no `leftHandPcs`/`rightHandPcs`.
- Confirm `checkMidi()` accepts C+G played in any octave/order as correct for this chord type (no register enforcement, no hand-split check triggered).
- Confirm the new stage sits immediately before `"Meet Left Hand"` and that `Left-Hand Voicing`'s phase count and `LEARNING_PATH.length` both reflect the +1.
- Confirm `applyStage()` on `"Left Hand Shape"` checks only the `chordRoot5` checkbox (not `leftHandMode`, not any other chord type) and sets the C-only root note.
- Confirm the new chord type does not appear in any inversion-related logic (not in `INVERTIBLE_CHORD_TYPES`, no inversion label ever shown for it).
- Regression: confirm existing Left-Hand Voicing stages (`"Meet Left Hand"` onward) and their mastery tracking are unaffected — this is a pure insertion, no existing stage's content changes.
