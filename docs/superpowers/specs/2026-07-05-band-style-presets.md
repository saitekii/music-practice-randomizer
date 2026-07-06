# Band Mode style presets: Rock, Jazz/Swing, Latin/Bossa

## Problem

Band Mode's groove currently has exactly one rhythmic character, hardcoded per time signature (`GROOVE_PATTERNS`). Now that the always-on-groove design is confirmed working well on real hardware, the next step is making the accompaniment feel like a specific kind of music rather than one generic backing pattern — starting with a small set of genuinely distinct styles, with room to make them musically richer (not just rhythmically different) in a later pass.

## Scope

**This pass (Approach A):** each style has its own rhythmic pattern — when kick/snare/hihat/bass/comp hit within the bar, and (for Jazz) a swing feel. The actual musical content each style plays stays the same as today: bass plays the chord's root, comp plays the remaining chord tones together. Three styles: **Rock**, **Jazz/Swing**, **Latin/Bossa**.

**Explicitly deferred (Approach B, future pass):** per-style musical content — walking bass with passing tones, arpeggiated/varied comp voicings, genuinely different note choices per style. The data model below is shaped so that pass can slot in cleanly later, but no such logic is built now.

## Design

### Style data model

Replace the single `GROOVE_PATTERNS` (keyed only by time signature) with `GROOVE_STYLES`, keyed by style name first, then time signature — each style is a self-contained bundle:

```
GROOVE_STYLES = {
  rock:  { swingRatio: 0.5,  4: {kick,snare,hihat,bass,comp}, 3: {...}, 5: {...} },
  jazz:  { swingRatio: 0.63, 4: {...}, 3: {...}, 5: {...} },
  latin: { swingRatio: 0.5,  4: {...}, 3: {...}, 5: {...} },
}
```

Keeping each style's data together (rather than splitting by time signature first) makes it easy to add a fourth style later, and later gives each bundle an obvious place to grow a `bassNoteSelector`/`compVoicer` function for Approach B without touching the others.

### Swing timing

Genuine swing means off-beat 8th notes land late (long-short feel) rather than exactly halfway between beats — this can't be expressed as "different step positions" alone, since today's scheduler advances every step by a fixed half-beat duration. Each style gets a `swingRatio` (0.5 = straight/even; Jazz uses ~0.63) that the scheduler applies to make on-beat steps proportionally longer and off-beat steps shorter when swing is requested. Rock and Latin stay at 0.5 (straight). This only changes how long each step *lasts* — the existing step-counting and catch-up-cap logic (`MAX_CATCHUP_STEPS`) is unaffected, since that logic counts steps, not their duration.

### The three styles (4/4 character; 3/4 and 5/4 get proportionally adapted versions)

- **Rock** — kick and bass locked together, hitting hard on the beat plus a syncopated push; snare cracks the backbeat; hi-hat drives straight through every 8th note. Comp is sparse, accenting the backbeat only.
- **Jazz/Swing** — swung 8ths (`swingRatio` above). Kick nearly silent (a light anchor on beat 1 only). Hi-hat plays a real jazz ride shape ("ding, ding-a-ding") instead of straight 8ths — sparser than rock. Bass holds a simple two-feel (root on beats 1 and 3 — the natural stepping stone to a real walking bass in Approach B). Comp stabs syncopate off the beat ("Charleston" rhythm).
- **Latin/Bossa** — kick and bass anticipate the downbeat (landing slightly *before* beat 3, not on it — the classic bossa syncopation). A clave-like accent pattern replaces the straight backbeat. Comp lands on different offbeats than Jazz's, so the two don't feel like variations of the same idea.

Exact step positions for each style/time-signature combination are pattern-design details worked out in the implementation plan, not this spec — the goal here is that each style is recognizably, rhythmically distinct, not a precise transcription of any specific recording.

### UI and persistence

A new style dropdown ("Rock" / "Jazz/Swing" / "Latin/Bossa") next to the existing Band Mode toggle in the metronome panel, persisted as a new `mpr_band_style` localStorage key, following the same save/load pattern as every other setting. Switching styles takes effect on the next scheduled step — no restart needed, matching how BPM changes already behave.

## Out of scope for this pass

- Approach B (per-style note/voicing logic) — noted above as the deliberate next pass, not built now.
- More than 3 styles.
- Changes to the percussion/bass/comp synth voices themselves (`playKick`/`playSnare`/`playHihat`/`playBandBass`/`playBandComp`) — only their timing/placement changes per style, not their sound.
- Any change to non-Band-Mode practice, or to the click-volume/instrument-volume controls.
