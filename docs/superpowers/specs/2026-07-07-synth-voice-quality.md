# Synth voice quality: FM Rhodes, Karplus-Strong pluck, and touch-ups

## Problem

Several instrument voices sound thin/"chiptune" compared to others in the same file. `Organ`, `Piano`, `Marimba`, `Vibraphone`, `Strings`, and `Pad` already use multi-oscillator additive synthesis or detuned unison stacks. `Rhodes` and `Pluck` (in `SYNTH_PRESETS`), the melodic `Bass` preset, and all of Band Mode's percussion/bass/comp voices (`playKick`/`playSnare`/`playHihat`/`playBandBass`/`playBandComp`) are bare single oscillators or a single filtered noise burst — no unison, no filter movement, no harmonic content beyond the raw waveform.

## Scope

Apply known, well-documented Web Audio synthesis techniques (researched and confirmed against published references, not guessed) to the specific thin voices, in place. No new dependency, no build step — everything stays inside `script.js` using native Web Audio nodes (`OscillatorNode`, `GainNode`, `BiquadFilterNode`, `DelayNode`, the existing shared noise `AudioBuffer`).

## Design

### Rhodes — FM synthesis

Replace the current single triangle oscillator with a 2-operator FM pair: a sine **carrier** at the note's pitch, modulated by a second sine **modulator** at a 1:1 frequency ratio (the standard ratio for mellow electric-piano FM patches, per published Yamaha DX7 "Rhodes" patch technique). The **modulation depth** (an audio-rate gain feeding the modulator's output into the carrier's `frequency` `AudioParam`) starts high — a bright, slightly metallic "tine" attack transient — and decays quickly (over roughly 0.3s) to a much lower sustained depth, producing a mellow tone for the remainder of the note. This mirrors the physical behavior of a real Rhodes: a bright hammer-strike transient settling into a soft sustained tone.

The existing amplitude envelope (attack/decay shape, `vel * 0.7` → `vel * 0.35`) is unchanged. The preset's return contract is unchanged (`{ gain, oscs, release }`), except `oscs` now contains both the carrier and modulator oscillators, so both are released together by the existing `synthNoteOff` logic.

### Pluck — Karplus-Strong plucked-string synthesis

Replace the sawtooth-with-filter-sweep with genuine Karplus-Strong physical modeling:

1. A short burst (a few milliseconds) from the existing shared noise buffer (`getNoiseBuffer`) injects an initial burst of energy — the "pluck."
2. The burst feeds into a feedback loop: a `DelayNode` (delay time set to `1 / freq`, i.e. the period of the target pitch) feeding into a `BiquadFilterNode` (lowpass), whose output feeds back into the delay node's input (feedback gain strictly `< 1`, combined with the lowpass filter's own high-frequency roll-off).
3. Each pass around the loop loses a little energy and a little brightness — exactly how a real plucked string's energy dissipates — producing a natural decay rather than a programmed envelope curve.
4. The loop's output taps to an output `GainNode` (for the overall note velocity) connected to `dest`.

This preset is percussive/self-decaying by nature (like a real plucked string, it can't be meaningfully "held" — it rings out regardless of note-off), so it keeps the existing `freeDecay: true` contract used by `Pluck`/`Bell`/`Marimba`/`Vibraphone` today (`synthNoteOff` is a no-op for these).

**Safety and cleanup** (this is the one place this design carries real risk, not just a taste question):
- Feedback gain must stay strictly below 1. Combined with the lowpass filter's own energy loss, the loop must reliably decay to inaudibility within roughly 1-2 seconds — never grow, never sustain indefinitely.
- Unlike oscillators, `DelayNode`/`BiquadFilterNode`/`GainNode` have no `.stop()` method. The feedback loop's nodes must be explicitly `.disconnect()`ed via a bounded `setTimeout` (~2.5s after the pluck) once the signal has decayed — otherwise a long practice session accumulates orphaned feedback loops silently processing near-zero signal forever.

### Bass — filter envelope (+ subtle unison for the melodic preset)

Both the melodic `SYNTH_PRESETS.Bass` preset and Band Mode's `playBandBass` get a **filter envelope**: the lowpass cutoff starts brighter on attack and settles to a warmer, darker sustain value, instead of today's static cutoff frequency. This is the standard "bass pluck" technique and directly targets the flat, static character of the current voice.

The melodic `Bass` preset additionally gets a second oscillator at a subtle detune (a few cents, the same technique already used by `Pad` and `Strings`) for a touch of unison thickness. Band Mode's `playBandBass` stays single-oscillator — it's a short percussive stab within a groove, not a sustained note, so the filter envelope alone is the relevant improvement; added unison would just thicken the low end unnecessarily in a mix that already has kick and comp competing for space.

### Snare and Comp — smaller touch-ups

- **Snare** (`playSnare`): add a low triangle "body" tone (short decay, mixed at a low level) underneath the existing bandpass-filtered noise burst — the standard recipe for a fuller-sounding synthesized snare (noise for the wire-rattle character, a touch of low tone for the drum shell's body), rather than pure filtered noise.
- **Comp** (`playBandComp`): wrap the existing chord-tone oscillators in a lowpass filter with a brief bright-to-warm envelope (the same filter-envelope technique as Bass), instead of raw unfiltered triangle waves straight to the gain.

### Unchanged

Kick (`playKick`) and hihat (`playHihat`) already match the standard synthesis recipe for those sounds (confirmed against published references) and are not touched. `Organ`/`Piano`/`Marimba`/`Vibraphone`/`Strings`/`Pad` are already reasonably rich and are not touched.

## Testing

Playwright can't judge whether something sounds like a Rhodes or a plucked string — that's inherently a listening question. But it can catch real regressions using `OfflineAudioContext` to render a note's output offline and inspect the actual rendered sample buffer:

- The rendered buffer is not silent (confirms the voice actually produces sound at all).
- Peak amplitude decays over the render window rather than sustaining at full level indefinitely or cutting off abruptly (confirms the envelope/decay behaves as intended).
- For Karplus-Strong specifically: the rendered buffer's energy trends downward across the render window and never exceeds a sane amplitude ceiling (e.g. never clips wildly past ±1.0) — a concrete, automatable check against the one real bug this design could introduce (an unstable/runaway feedback loop), not a taste judgment.

This is a new testing technique for this codebase (prior tests only ever checked DOM state, localStorage, and scheduler timing math — never actual rendered audio sample content), justified here because it catches a genuine correctness bug rather than trying to automate a subjective quality judgment.

A manual listen-through with the user remains the only way to confirm these voices actually sound better, and at least one round of "this parameter's off, adjust it" should be expected — this is not a one-shot fix.

## Out of scope for this pass

- Organ, Pad, Bell, Piano, Marimba, Vibraphone, Strings — already reasonably rich, not touched.
- Kick, hihat — already match the standard recipe, not touched.
- Reverb or any shared effects bus — considered and explicitly scrapped (needs careful tuning to avoid sounding washy, judged not to be the core issue).
- Any new UI controls (sliders, preset pickers) — this is purely internal synthesis-quality work.
- Any new dependency, library, or build step — everything stays inside `script.js`, native Web Audio nodes only.
- Any change to Band Mode's rhythm/timing (`GROOVE_STYLES`, the scheduler) — unrelated to this pass, which only changes how existing voices sound, not when they play.
