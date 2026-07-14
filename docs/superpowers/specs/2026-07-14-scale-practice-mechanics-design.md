# Scale Practice Mechanics

**Goal:** Fix Scale practice mode so it actually tests what it claims to teach — playing a scale in order, tonic to octave and back — instead of accepting any 7 (or however many) correct pitch classes touched in any order, with no penalty for wrong notes and no visible feedback on progress.

## Background

Scale practice (Learning Path Phase 12: "First Scale", "All Natural Scales", "Scale Timer", "All 12 Scales", plus every other scale-type phase — Harmonic Minor, Melodic Minor, Pentatonics, Modes) currently reuses the chord-checking model: `checkMidi()`'s `scale` branch is `expected.pcs.every(pc => scaleNotesPlayed.has(pc))`, where `scaleNotesPlayed` is an unordered `Set<pitchClass>` that accumulates on every note-on since the last clear (`script.js:3613`, cleared at `showPrompt`/`advanceToNextPrompt`/`goBack`/`disableMidi` — `script.js:2318`, `2582`, `2309`, `3960`).

That model fits chords, which are played as one simultaneous held gesture. It doesn't fit scales, which are played as a sequence of separate keypresses:
- **No order enforcement.** Any order, any octave, satisfies the check.
- **No wrong-note rejection.** Extra notes are never checked — the scale's pitch classes are a subset of the chromatic scale, so a chromatic run up the keyboard eventually satisfies any scale prompt.
- **No lasting visual feedback.** `isNoteWrong()`'s `scale` case (`script.js:3827`) flags a wrong note red only while it's physically held; `scaleNotesPlayed` itself is never rendered — it's write-only, read solely by the completion check.

This spec covers only the `scale` prompt type's checking and feedback mechanics. Curriculum pacing (the too-fast key/type ramps across every scale-type phase) is a separate, later round.

## Design

### Expected sequence

`getExpectedPCs()`'s `scale` branch (`script.js:3496-3501`) currently returns `{ type: 'scale', pcs: [...] }` — the scale's unique pitch classes, unordered. It changes to return an ordered `seq` covering a full tonic-to-octave-and-back run:

```js
const up   = SCALE_INTERVALS[parts[2]].map(i => (rootPC + i) % 12);  // length N
const down = [...up].reverse();                                       // length N, ends on root
const seq  = [...up, up[0], ...down];                                 // length 2N + 1
```

For Major (`up = [0,2,4,5,7,9,11]`): `seq = [0,2,4,5,7,9,11, 0, 11,9,7,5,4,2,0]` — 15 steps. This generalizes to every entry in `SCALE_INTERVALS` (both minors, both pentatonics, all 7 modes) with no per-type special-casing, since they're all already stored as ascending interval lists.

Matching stays pitch-class based (`note % 12`), not tied to absolute octave/register — consistent with every other prompt type in this app (`heldPCs`, chord matching, etc. are all pitch-class based).

### State

Replace `scaleNotesPlayed` (`Set<pc>`, `script.js:617`) with:
- `scaleCursor` — index into `seq`, starts at 0.
- `scalePlayedNotes` — array of the actual MIDI note numbers played so far, in order, for rendering.

Both reset at the same 4 sites `scaleNotesPlayed.clear()` fires today (`showPrompt`, `advanceToNextPrompt`, `goBack`, `disableMidi`) — swap what's cleared, no new reset call sites.

### Matching and reset

This moves out of `checkMidi()` (built around the *current held set*, sampled on a 100ms debounce — wrong model for a sequence of discrete, one-at-a-time keypresses where earlier notes are already released by the time later ones are played) and into `onMidiMessage()`'s note-on branch (`script.js:3610-3617`), which sees each keypress as a discrete event:

- If `currentPromptKey` resolves to a `scale`-type expected value:
  - Played pitch class equals `seq[scaleCursor]` → advance `scaleCursor` by 1, push the note to `scalePlayedNotes`, call `updateKeyboard()`. If `scaleCursor` now equals `seq.length`, the scale is complete — trigger the existing success path (`triggerMidiSuccess()` / `triggerBandSuccess()`, same as today's `matched` branch in `checkMidi()`).
  - Any other pitch class → flag the key red (existing `.wrong` flash, via `isNoteWrong()`'s `scale` case, now comparing against `seq[scaleCursor]` instead of set membership), set `promptHadWrongNote = true` (existing accuracy-stat flag, unchanged), reset `scaleCursor` to 0 and clear `scalePlayedNotes` — **always back to the very first note**, regardless of how far into the 2N+1 run the mistake happened. No partial-credit or nearest-boundary reset.
- `checkMidi()`'s `scale` branch and its use of `scaleNotesPlayed` (`script.js:3697-3698`) are removed; scale completion is driven entirely from the note-on handler now, not the debounced held-set check. `checkMidi()`'s other branches (`note`, `chord`, `interval`, `octave`) are untouched.

### Visual feedback

`updateKeyboard()` (`script.js:3834-3851`) gets a `scale`-specific branch: any MIDI note present in `scalePlayedNotes` gets a new CSS class, `.piano-key.scale-correct`, styled green (`#22c55e`, matching the existing success-state green used elsewhere in the app) and — unlike `.active` — **not** cleared on key-up, so the keyboard visibly fills in left-to-right (and back) as the cursor advances, and visibly wipes on a reset. No forward-looking "next expected note" hint.

Because descending revisits the same physical keys as ascending, no special-casing is needed: a key already in `scalePlayedNotes` just stays flagged; playing it again during the descent doesn't remove or duplicate its visual state.

### Hear It demo consistency

`playPromptKey()`'s `scale` branch (`script.js:3886-3897`) currently only demonstrates the ascending run plus the octave root — it stops short of what will now be required. It's extended to also play the descending half (`seq`'s second half), so the demo always matches exactly what the learner is expected to play. This reuses the same `seq` the checking logic now builds, rather than a separately hand-written note list.

### Scope

Only the `scale` prompt type is touched: `getExpectedPCs()`'s `scale` branch, `onMidiMessage()`, `checkMidi()`'s `scale` branch (removed), `isNoteWrong()`'s `scale` case, `updateKeyboard()`, and `playPromptKey()`'s `scale` branch. `note`/`chord`/`interval`/`octave`/`diatonic`/`func` prompt types are unchanged. Applies uniformly to every scale type already in `SCALE_INTERVALS` — no stage data changes required. Curriculum pacing for the scale-type phases (Phase 12 and its siblings) is explicitly out of scope for this round.

## Testing

- Unit-style checks on the `seq`-building logic for at least one 7-note type (Major) and one 5-note type (Major pentatonic), confirming length `2N+1` and correct up/turnaround/down ordering.
- Playing a scale's `seq` in order, one pitch class at a time (any octave), completes the prompt and triggers the existing success flow.
- Playing an out-of-sequence note at each of: the very first note, mid-ascent, the turnaround, mid-descent — resets `scaleCursor` to 0 and clears `scalePlayedNotes` in every case; the run must be replayed from the start.
- `scale-correct` class appears on played keys and persists after key-up; is fully cleared after a reset and after prompt completion/advance.
- `promptHadWrongNote` is set on a scale mistake, consistent with existing accuracy-stat behavior for other prompt types.
- Hear It demo for a scale prompt plays the full up-and-down `seq`, not just the ascending half.
- Regression: `note`/`chord`/`interval`/`octave`/`diatonic`/`func` prompt checking and visual feedback unaffected — existing MIDI test suite still passes.
