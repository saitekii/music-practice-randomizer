# Scale Practice: Duplicate Note-On Retrigger Fix

**Goal:** Fix a real, user-reported bug where a MIDI keyboard that sends a duplicate note-on event for a single physical key press makes scale practice completely unplayable — every note appears to register as wrong, with no way to progress.

## Background

User-reported on `'Meet the Scales'` (stage 31), immediately after two unrelated fixes shipped earlier the same day. Investigated via `superpowers:systematic-debugging`: live simulation of the full generate-and-check pipeline (including `onMidiMessage()` itself, with real note-on/note-off pairs) repeatedly passed cleanly, so the bug wasn't reproducible from code alone. A browser-console diagnostic was handed to the user, capturing every real `checkScaleStep()` call during an actual failing attempt.

**The diagnostic trace revealed the actual cause directly**: the user's MIDI keyboard fires a duplicate note-on for every single physical key press. The log shows each note twice in immediate succession, e.g.:
```
note: 48, cursorBefore: 0, expectedNext: 0   <- genuine press, matches, cursor advances to 1
note: 48, cursorBefore: 1, expectedNext: 2   <- duplicate of the same key, now mismatches (cursor already expects D)
```
`checkScaleStep()`'s mismatch branch (script.js:3817-3821) resets `scaleCursor` to 0 on ANY mismatch — so the very first duplicate immediately wipes out the correct progress, and every subsequent genuine note then also mismatches (since the cursor is stuck expecting the tonic again), producing exactly the reported symptom: every key press appears wrong, no progress possible.

**This is not caused by anything shipped today.** Verified via `git log -L` on `checkScaleStep()`'s exact lines: it was last modified 2026-07-14 (two days before this report) in the "Scale Practice Mechanics" round — unrelated to today's 3 shipped changes, none of which touched `checkScaleStep()`, `onMidiMessage()`, or any note-handling code. That 2026-07-14 commit already added a *partial* defense against "a note retriggered without intervening release" (clearing stale wrong-state on a correct match) but never handled the mismatch case — which is exactly the gap this keyboard is hitting. The user is very plausibly encountering this for the first time only because `'Meet the Scales'` and the reordered scales phase are brand new today, moving scale-checking content to a much earlier position in the Learning Path than it occupied before.

## Design

**`checkScaleStep()` gains a duplicate-retrigger guard**, checked before the existing match/mismatch logic: if the incoming note's pitch class matches the step that was *just* correctly played (`expected.seq[scaleCursor - 1]`, not the one currently expected), treat it as a harmless duplicate and ignore it entirely — no state change, no reset.

```js
function checkScaleStep(note) {
  if (midiSuccessActive) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected || expected.type !== 'scale') return;

  // Some MIDI keyboards send a duplicate/retriggered note-on for a single physical key
  // press. If this note matches the step we JUST correctly played (not the one we're
  // expecting next), treat it as a harmless duplicate and ignore it, rather than failing
  // the whole attempt -- verified live against a real user's diagnostic trace showing
  // exactly this double-fire pattern on every single note.
  if (scaleCursor > 0 && note % 12 === expected.seq[scaleCursor - 1]) return;

  if (note % 12 === expected.seq[scaleCursor]) {
    ... // unchanged from here down
```

**Why this specific check and not something broader**: it only ever suppresses a note that exactly repeats the immediately-preceding correct step — it does not swallow a genuinely wrong note that happens to match some *earlier* step further back in the sequence (that should still fail normally), and it does not affect the very first note of an attempt (`scaleCursor === 0`, nothing to compare against yet — verified this doesn't need separate handling, since JavaScript's single-threaded event loop means the cursor has always already advanced by the time a second, genuinely-separate event is processed).

**Verified by hand against the user's actual diagnostic trace, not just the abstract logic**: walked the fix through every logged event in their real failing attempt (`scale|C|Major`, all 15 up-and-down steps, each one double-fired) and confirmed it correctly ignores every duplicate and lets every genuine note advance the cursor — reconstructing a fully successful scale completion from data that, under the current code, fails at the very first step.

## Testing

- Reproduce the exact duplicate-fire pattern from the user's real diagnostic trace (each note in a full up-and-down scale fired twice in immediate succession, no note-off between the pair) via `onMidiMessage()` — confirm the scale completes successfully (reaches `completeScalePrompt()`), not reset to zero at the first duplicate.
- A genuinely wrong note (not a duplicate of the previous step) still correctly fails and resets the cursor — regression check, must not be silently swallowed by the new guard.
- A duplicate of the previous step arriving when `scaleCursor === 0` (before any progress) is not a special case needing its own test — confirm no crash / no incorrect behavior if it somehow occurs, since `expected.seq[-1]` is `undefined` and no real note's pitch class can equal `undefined`.
- A note that matches an *earlier* step (not the immediately-preceding one) still fails normally — must not be treated as a duplicate.
- Full regression pass on `test-scale-order-enforcement.cjs` (the existing suite for this mechanism) and `test-scale-hear-it-descending.cjs`.
