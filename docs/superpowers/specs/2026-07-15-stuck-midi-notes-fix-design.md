# Stuck MIDI Notes / Audio Not Starting Immediately — Root Cause Fix

**Goal:** Fix a real, actively-affecting bug: MIDI-triggered notes don't produce sound until an unrelated UI control (volume slider, preset dropdown) is touched, and notes played during that window can get permanently stuck playing with no way to stop them short of reloading the page.

## Background

User-reported symptom, reproduced and root-caused via `superpowers:systematic-debugging`, not guessed at:

1. On page load, playing a connected MIDI keyboard produces no sound until the user touches an unrelated control (volume slider, instrument preset dropdown).
2. Once that happens, playing works — but individual notes sometimes get stuck playing indefinitely, with no way to silence them.

**Root cause**: `synthNoteOn()` (script.js:2070-2081) is `async` and does `await ctx.resume()` before registering the note in `synthNotes` and starting playback. A Web MIDI `onmidimessage` event does not count as a "user gesture" for the browser's audio-autoplay policy, so an `AudioContext.resume()` call triggered purely by MIDI input can stay pending indefinitely — it only actually resolves once the page receives an unrelated qualifying gesture (a slider drag, a dropdown click), which grants the whole page "user activation" and unblocks any pending `resume()` call.

There is already a **partial, incomplete mitigation** in `enableMidi()` (script.js:4071-4074): a comment explicitly describing this exact problem, and a `try { getSynthMasterGain(); } catch (_) {}` call meant to warm up the AudioContext while still inside the "Enable MIDI" button's click-gesture context. This genuinely helps (the resume is validly gesture-triggered) but doesn't fully close the gap, because:
- `getAudioCtx()`'s `.resume()` call (script.js:1648) is fire-and-forget — nothing in the `enableMidi()` call chain actually awaits it, so `enableMidi()`'s own promise (and the "MIDI: On" UI confirmation) can resolve before the context has actually finished resuming.
- `AudioContext.resume()` takes real, nonzero wall-clock time even when validly gesture-triggered. If the user plays a note very soon after clicking "Enable MIDI" (a completely normal thing to do), the same race window still exists — just shorter, not eliminated.

**The actual failure mode** (verified live via a direct reproduction against the real `synthNoteOn`/`synthNoteOff` functions, with `AudioContext.resume()` stubbed to a controllable pending promise to make the race deterministic rather than timing-dependent): if a MIDI note-off arrives for a note whose `synthNoteOn` call is still awaiting `ctx.resume()`, `synthNoteOff()` finds nothing yet in the `synthNotes` map (the note-on hasn't reached its `.set()` call) and does nothing. When the pending resume later completes — often well after the key was physically released — the stalled `synthNoteOn` call proceeds anyway, starts the oscillator, and registers it in `synthNotes`. Since the matching note-off already fired and was silently dropped, no further note-off will ever arrive for that note: it plays forever. Reproduced exactly, confirming this is the mechanism, not a guess.

## Design

Two changes, same root cause, verified together via a second live reproduction (both the original race and a rapid-retrigger edge case discovered while designing the fix):

**1. `enableMidi()` — make the existing gesture-triggered warm-up actually wait for the context to finish resuming**, so MIDI is only reported "on" once audio is genuinely ready:

```js
try {
  const ctx = getAudioCtx();
  getSynthMasterGain();
  if (ctx.state !== 'running') await ctx.resume();
} catch (_) {}
```

This still calls `getAudioCtx()` synchronously within the click handler's call stack (before any `await` in `enableMidi()`), preserving gesture validity — only the *awaiting* happens later, which is fine since the browser's requirement is on when `resume()` is *initiated*, not when its promise is awaited.

**2. `synthNoteOn()`/`synthNoteOff()` — a cancellation-token guard against the race**, so that even if the above doesn't fully close the window (hardware latency, or any other future path that lands a MIDI note before the context is ready), a note-off that arrives before its matching note-on has finished can never result in an orphaned, permanently-playing voice:

```js
const pendingNoteOns = new Map(); // note number -> a token object; only the most recent synthNoteOn call for a given note is allowed to actually start it

async function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  const token = {};
  pendingNoteOns.set(noteNumber, token);
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    if (pendingNoteOns.get(noteNumber) !== token) return; // superseded by a note-off (or a newer note-on) while we were waiting
    pendingNoteOns.delete(noteNumber);
    const freq   = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel    = velocity / 127;
    const preset = SYNTH_PRESETS[currentSynthPreset] || SYNTH_PRESETS['Rhodes'];
    const note   = preset.build(ctx, freq, vel, getSynthMasterGain());
    synthNotes.set(noteNumber, note);
  } catch (_) {
    if (pendingNoteOns.get(noteNumber) === token) pendingNoteOns.delete(noteNumber);
  }
}

function synthNoteOff(noteNumber) {
  pendingNoteOns.delete(noteNumber);
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  ... // unchanged from here down
}
```

A plain boolean/Set-based "was this note cancelled" flag was considered and rejected during design: it fails a rapid-retrigger edge case (note-on → note-off → note-on again, all before the first note-on's `resume()` resolves) — a shared boolean flag gets clobbered by the second note-on, and when the *first* note-on's await later resolves, it would incorrectly see "still wanted" and also start a note, producing two voices for one key. The token-identity approach (`pendingNoteOns.get(noteNumber) !== token`) ties each `synthNoteOn` call to its own token, so only the most recent call for a given note number can ever win — verified live: exactly one voice results from this exact retrigger sequence, not zero and not two.

**Why both changes, not just one**: change 1 minimizes how often the race window is ever entered in real use (the common case: MIDI enabled once, then played many times). Change 2 makes the failure mode itself impossible regardless of *why* a note-on ends up racing a note-off — genuine defense at the actual point where the bug manifests, not just at its most common trigger.

## Testing

- Live-reproduce the original bug against the real `synthNoteOn`/`synthNoteOff` functions with `AudioContext.resume()` stubbed to a controllable pending promise (deterministic, not timing-dependent): note-on, then note-off while resume is still pending, then resume completes — confirm no orphaned entry ends up in `synthNotes`.
- Live-reproduce the rapid-retrigger edge case (note-on → note-off → note-on again, all before resume resolves) — confirm exactly one voice results, not zero, not two.
- Confirm `enableMidi()` still reports "MIDI: On" / updates `midiStatus` correctly when `requestMIDIAccess()` succeeds, and "Access denied" when it's rejected — the new `await ctx.resume()` must not change either outcome or introduce a new failure path (wrapped in the same `try { ... } catch (_) {}` as before, so an audio-resume failure can't block MIDI itself from enabling).
- Confirm normal note-on → note-off (no race, no pending resume) still works exactly as before — a full regression pass on any existing MIDI/synth-adjacent test.
