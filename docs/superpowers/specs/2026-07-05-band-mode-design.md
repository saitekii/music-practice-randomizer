# Band Mode: musical accompaniment for metronome chord practice

## Problem

Practicing chords against the metronome is correctness-checking with a click track — it doesn't feel like playing music. The goal is to make a correct answer feel like a real chord change in a song: when the player nails the prompted chord, a small backing band (bass, drums, comping) joins in and grooves in time until the next chord arrives.

## Scope

This is a first pass, deliberately narrow:

- Only affects **Chords** prompts (Note Finder, Scales, Functional Harmony, Intervals, Diatonic Chords are untouched — they still get the plain click).
- Only available in **Metronome timer mode**.
- Only available when **MIDI is enabled** — there is no way to detect what the player is playing in real time otherwise (the on-screen keyboard is display-only; `checkMidi()` is the sole correctness path, see `script.js:2874`).
- Only available when **`Change every` (`metroNoteDuration`) is set to a full bar or more** — Whole note or 2 bars. At Half note or Quarter note, a groove has nowhere to fit, so the Band Mode toggle is disabled (grayed out with an explanatory note) and metronome mode behaves exactly as it does today.

Any prompt/mode combination outside this scope falls back to current behavior, unchanged.

## Activation

A new checkbox, `bandModeToggle`, placed in the metronome settings panel next to the existing `metroBpm`/`metroNoteDuration`/`metroTimeSig` controls. Off by default.

- Persisted the same way every other checkbox is today: added to the `saveSettings()` id list, stored in the single `mpr_settings` JSON blob. No new localStorage key.
- Disabled (with a short inline note, e.g. "Needs Whole note or 2 bars") whenever `metroNoteDuration` resolves to less than one bar's worth of beats (`getBeatsPerChange() < getBeatsPerBar()`). `syncUI()` gets this rule added alongside its existing sub-option disabling logic.
- When checked but the current prompt isn't a chord, or MIDI isn't enabled, Band Mode is simply inert for that prompt — no error state, just silent fallback to plain click.

## Architecture: scheduler

The existing metronome click (`startMetronome`/`metroTick`/`stopMetronome`, `script.js:2038-2079`) drives itself off `setInterval(metroTick, 60000 / bpm)`. That has a few ms of JS-timer jitter, which is inaudible for a single click but would make a multi-instrument groove sound loose.

When Band Mode is engaged, metronome timing switches to the standard Web Audio **lookahead scheduler** pattern instead of the plain `setInterval` tick:

- A `setInterval` housekeeping loop runs every ~25ms (`SCHEDULER_INTERVAL_MS`).
- Each tick, it looks ~100ms ahead (`SCHEDULER_LOOKAHEAD_MS`) from `audioCtx.currentTime` and schedules any beat (and, once triggered, any band note) whose target time falls inside that window.
- All audio events are scheduled via `node.start(preciseAudioCtxTime)` — sample-accurate regardless of when the housekeeping callback actually fires, because Web Audio handles the precise timing internally once a start time is given.
- Visual side effects (beat pulse animation via `pulseBeat`, and the prompt swap via `showPrompt`) are driven by `setTimeout`s computed from the same precise times, converted to a wall-clock delay (`preciseAudioCtxTime - audioCtx.currentTime`). `setTimeout` imprecision here is fine — it's cosmetic, not audio.
- When Band Mode is off (or its preconditions aren't met), the existing `setInterval`-based `metroTick` path runs completely untouched. This isolates all new complexity behind the toggle and keeps regression risk on today's working code at zero.

## Trigger flow

`checkMidi()` (`script.js:2874`) keeps detecting a correct chord exactly as it does today — no change to matching logic. What changes is what happens on a match when Band Mode is active for this prompt, replacing today's `triggerMidiSuccess()` (flash + fixed 700ms delay then `showPrompt()`):

1. Response-time stats (`recordAdaptiveResult`, `updateDailyLog`, `showResponseTime`, streak) are recorded **immediately** on match, same as today — so "how fast you answered" isn't skewed by however long the subsequent ride-out takes.
2. The success flash (`promptCard.classList.add('midi-success')`) shows immediately, same as today.
3. The scheduler is handed the chord's root + tones and takes over the remaining beats until the next scheduled prompt-change boundary (`getBeatsPerChange()` beats out from wherever the beat counter currently is), firing the groove pattern (see below) in time.
4. `showPrompt()` — the actual advance to the next prompt — fires precisely on that boundary instead of 700ms later. This means answering correctly early in a bar produces a longer ride-out than answering late in the bar; the boundary itself never moves.
5. The existing `midiSuccessActive` guard is held for the full ride-out duration (not just 700ms), so further note input during the groove can't double-trigger a match.

Outside Band Mode's scope (wrong category, MIDI off, interval too fast, or toggle off), `triggerMidiSuccess()` is unchanged.

## Groove content

Three hand-written patterns, one per supported time signature (4/4, 3/4, 5/4 — matching `metroTimeSig`'s existing options). Not a generic algorithm; there are only three cases and a generic version would be harder to reason about for no benefit.

For 4/4 (the primary case):
- **Bass** — root note of the answered chord on beats 1 and 3 (light walking motion, not a static drone)
- **Comp** — the chord's other tones, stabbed on the upbeats ("and" of 2 and 4), through the existing Rhodes-style build
- **Drums** — kick on beats 1 and 3, snare on beats 2 and 4, hihat on every eighth note

3/4 and 5/4 get proportionally simplified versions of the same idea (kick on the strong beats for that meter, snare on the others, hihat still on every eighth).

If the `Change every` window spans more than one bar (the "2 bars" setting), the bar pattern simply repeats for however many bars fit.

**New percussion voices** (the synth engine currently only has pitched presets — Rhodes/Organ/Pad/Bell/Pluck):
- *Kick* — sine oscillator, pitch-swept 150Hz→50Hz, fast exponential decay envelope
- *Snare* — band-passed burst from a shared white-noise buffer
- *Hihat* — high-passed burst from the same shared white-noise buffer, very short decay

The white-noise `AudioBuffer` is created once (module scope) and reused via a fresh `AudioBufferSourceNode` per hit — the standard Web Audio noise-reuse pattern. All new voices route into the existing synth master gain, so the current volume slider controls them too; no new volume control.

## Out of scope for this pass

- Scales, intervals, functional harmony, diatonic chords, note finder — no accompaniment.
- Non-metronome timer modes.
- Time signatures other than 4/4, 3/4, 5/4 (matches what the UI already exposes).
- A separate band volume control.
- MIDI-less (self-graded / no keyboard) play — inherently can't detect correctness to trigger on.

## Testing

No existing test suite/dev server for this project; per `CLAUDE.md`, verification is via ad hoc Playwright `.cjs` scripts. For this feature:
- Toggle disable/enable behavior as `metroNoteDuration` changes (`syncUI()` rule).
- Simulated MIDI correct-answer input does *not* immediately advance the prompt when Band Mode is active (unlike today), and *does* advance at the expected bar-boundary delay.
- Existing metronome/click/chord-practice behavior is provably unchanged when Band Mode is off (regression check).
- Audio content itself (whether the groove *sounds* right) isn't something Playwright can verify — that part needs a manual listen.
