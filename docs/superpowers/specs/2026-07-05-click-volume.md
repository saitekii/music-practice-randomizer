# Separate click volume control

## Problem

The metronome click and the instrument/band audio share no volume control today in a way that lets you balance them independently — there's a single "instrument volume" slider (`synthVolume`, persisted as `mpr_synth_vol`), and the click's loudness is fixed. With Band Mode's continuous groove now working well, players want the option to turn the click down (or off) without affecting the band/instrument volume, since the kick/hihat already keep time.

## Design

**A new "Click" volume slider in the metronome settings panel**, alongside the existing BPM/Change-every/Time-sig/Band-Mode controls — visible whenever that panel is visible (any timer mode that uses the click, not just Band Mode).

**Audio routing:** `playClick()` currently connects its gain node directly to `ctx.destination`, bypassing the shared instrument path (`getSynthMasterGain()` → compressor → destination) entirely — the click has always been on its own signal path. This makes the change fully isolated: introduce a new `clickGain` node (created once, lazily, the same pattern as `getSynthMasterGain()`) between the click's oscillator and the output. `playClick` connects to `clickGain` instead of `ctx.destination` directly. No compressor needed — a short beep doesn't need dynamics processing.

**Persistence:** A new `mpr_click_vol` localStorage key, default `70`, following the exact same save/load/slider-wiring pattern already used for `mpr_synth_vol`/`synthVolume`.

**UI:** A new `metro-row` in the metronome panel (after the Band Mode row): a `metro-label` "Click" + a `<input type="range">` (0-100), styled consistently with the panel's other rows.

## Out of scope

- No change to the existing instrument volume slider, its persistence, or the audio path it controls.
- No mute/solo logic beyond what the slider itself provides (dragging to 0 is the mute).
- No change to which timer modes show the metronome panel — this only adds a row inside a panel that already shows/hides based on existing logic.
