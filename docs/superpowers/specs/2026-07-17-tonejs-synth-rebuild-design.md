# Synth Preset Rebuild on Tone.js

**Goal:** Replace all 10 hand-rolled Web Audio synth presets (`Rhodes`, `Piano`, `Organ`, `Pad`, `Strings`, `Vibraphone`, `Marimba`, `Bell`, `Pluck`, `Bass`) with presets built on Tone.js — fixing `Pluck`'s known feedback-gain instability outright, and making future presets far cheaper to add than hand-writing a new oscillator/envelope/filter graph from scratch each time.

## Background

The current `SYNTH_PRESETS` object (script.js:1818+) hand-rolls every preset's sound directly from raw Web Audio primitives (`OscillatorNode`, `GainNode`, `BiquadFilterNode`), with each preset a bespoke `build(ctx, freq, vel, dest)` function scheduling its own gain-envelope ramps and, in `Pluck`'s case, a hand-implemented Karplus-Strong delay-line feedback loop. This has produced real, hard-won bugs (see [[synth-voice-quality]]): a feedback-gain instability cliff in `Pluck` that is still not fully resolved — its own regression test (`test-synth-pluck-karplus.cjs`, "stays warm, not metallic") has flipped between pass and fail across different runs *within this same session*, with no code changes in between, indicating the current implementation sits right on an edge rather than being solid.

The user wants a significantly larger, higher-quality preset palette (settled on 10-12, keeping today's count) with a meaningfully easier process for building each one. Real recorded instrument samples were considered and explicitly ruled out: this app is hosted on public GitHub Pages, and the user does not want to take on licensing risk or asset-hosting weight for sample files, even well-licensed ones (CC0 libraries like Salamander Grand Piano exist, but tracking/vetting licenses on a public repo was judged not worth it).

**Decision: adopt Tone.js**, a well-established, actively maintained Web Audio wrapper library, as this project's second-ever dependency (after vendored `tonal.min.js`). It provides several distinct, already-tested synthesis engines (`Synth`, `FMSynth`, `AMSynth`, `MonoSynth`, `DuoSynth`, `MetalSynth`, `PluckSynth`, and more), turning "build a new preset" into "pick an engine and tune parameters" instead of "design and debug a DSP graph from scratch." This keeps the same instrument categories the app has today (user's explicit choice — not a fresh sound palette), rebuilt on tested foundations, and directly replaces the broken `Pluck` with Tone.js's own `PluckSynth` (a maintained Karplus-Strong implementation).

## Design

### Vendoring

`tone.min.js`, downloaded once and vendored locally in the repo root (same pattern as `tonal.min.js`): no CDN at runtime, SHA-256-pinned in the same way. Loaded via a `<script>` tag in `index.html` before `script.js`, same as Tonal.js today.

### Preset → Tone.js engine mapping

| Preset | Tone.js engine | Notes |
|---|---|---|
| Rhodes | `PolySynth(FMSynth)` | Same FM technique as today's hand-rolled version, rebuilt on a tested implementation |
| Piano | `PolySynth(FMSynth)`, distinct tuning from Rhodes, or `PolySynth(Synth)` with a percussive/noisier attack envelope | Must be deliberately differentiated from Rhodes — without real samples, two FM electric-piano-family presets risk sounding too similar if not tuned apart on purpose |
| Organ | `PolySynth(AMSynth)` or stacked-harmonic `Synth` voices | Same additive-style approach as today, rebuilt on tested building blocks |
| Pad | `PolySynth(Synth)` with a slow-attack filter envelope | Direct equivalent of today's filtered-sawtooth pad |
| Strings | `PolySynth(DuoSynth)` (detuned/chorused) | Richer than a single-oscillator voice |
| Vibraphone | `PolySynth(MetalSynth)` | Inharmonic partials suit mallet percussion |
| Marimba | `PolySynth(MetalSynth)`, different tuning (shorter/woodier decay) from Vibraphone | Must sound clearly distinct from Vibraphone |
| Bell | `PolySynth(MetalSynth)`, a third distinct tuning | Tone.js's documented intended use case for this engine |
| Pluck | `PolySynth(PluckSynth)` | Direct fix for the broken hand-rolled Karplus-Strong implementation |
| Bass | `PolySynth(MonoSynth)` | Purpose-built for this role in Tone.js |

Every preset is wrapped in `Tone.PolySynth(...)`, since this app needs to sound full chords (multiple simultaneous notes) and Tone.js's individual instrument classes are monophonic on their own — polyphony is Tone.js's own composition mechanism, not something to reimplement.

### Integration with the existing note-triggering path

`synthNoteOn`/`synthNoteOff` (script.js:2086-2120) currently:
- Use a `pendingNoteOns` cancellation-token `Map` to guard against a rapid note-on/note-off/note-on race during `AudioContext.resume()` — the exact mechanism [[feature-history]] item 51 built to fix stuck MIDI notes.
- Route through `getAudioCtx()` (the shared native `AudioContext`) and `getSynthMasterGain()` (the volume-slider gain node every preset currently connects into).
- Track live notes in a `synthNotes` Map (`noteNumber → { gain, oscs, release }`) so `synthNoteOff` knows what to release.

This rewrite replaces the internals of that flow — `preset.build(ctx, freq, vel, dest)` returning a raw node graph becomes a call into the relevant `PolySynth`'s `triggerAttack(frequency, time, velocity)`, and `synthNoteOff` becomes `triggerRelease(frequency, time)` — but the **outer guarantees stay intact**: the `pendingNoteOns` cancellation-token guard, the `getSynthMasterGain()` volume routing, and the sustain-pedal mechanism (`sustainedNotes` Set, which only defers *calls* to `synthNoteOff` and doesn't care what's inside it) are all preserved as-is around the new internals, not rebuilt.

**The one real technical risk**: Tone.js manages its own audio context and its own gesture-gated startup (`Tone.start()`), which is a separate concept from this app's existing manually-created and manually-resumed native `AudioContext`. These two need to be reconciled — either by pointing Tone.js at the app's existing context (`Tone.setContext()`) so there is only ever one `AudioContext` and one resume path, or by fully replacing the app's manual context/resume logic with Tone.js's own and re-verifying the item-51 fix's guarantees hold under it. Exact API specifics will be confirmed against the real vendored library during implementation, not assumed here — but whichever approach is used, the requirement carried over from item 51 is non-negotiable: **no note may play before a genuine user gesture, and no note may get stuck playing indefinitely.** This gets its own explicit verification pass before this ships, re-running (or re-deriving equivalents of) the original stuck-MIDI-notes race scenario against the new implementation.

### Explicitly out of scope

- Band Mode's kick/snare/hihat/bass/comp sounds are a fully separate code path (verified: nothing in Band Mode references `SYNTH_PRESETS`, `currentSynthPreset`, or `synthNoteOn`) and are not touched by this rebuild.
- No real audio samples anywhere in this change, per the hosting/licensing decision above.
- MIDI input handling, scale/chord checking, and the visual keyboard are unrelated to this change and untouched.
- Growing past 10-12 presets, or moving to a genuinely different set of instrument categories, is future work, not this round.

## Testing

The old per-preset tests asserted specific acoustic properties (harmonic ratios over time, decay curves, feedback stability) by hand — exactly the kind of test that produced the flaky `Pluck` result, since it's re-deriving DSP correctness that a maintained library like Tone.js has already had verified upstream. For the rebuilt presets, tests should confirm:

- Every preset triggers and releases without throwing, across the full note range the app uses.
- Polyphony genuinely works — multiple simultaneous notes (a full chord) trigger and release independently without one note's release cutting another off.
- The sustain pedal and volume slider still function correctly through the new internals.
- The gesture-gating/stuck-note guarantees from item 51 still hold under Tone.js's context lifecycle (the one must-verify item from the design above).
- Basic listening/manual verification that each of the 10 presets sounds like a plausible, distinct version of its instrument category — this is inherently a subjective/audible check, not something a script can assert, and should be called out as a manual step in the implementation plan rather than skipped.
