# Band Mode addendum: always-on groove, instant advance, Now/Next

## History and why this supersedes the reveal-timing addendum

Band Mode originally shipped with a "ride-out" model: correct answer → groove plays until the current bar/cycle boundary → next chord revealed at that exact boundary, and you had to already know it or the band went silent. Real testing found this gave zero lead time. A reveal-timing rework (`2026-07-05-band-mode-reveal-timing-addendum.md`) tried fixing that by deferring the audible chord change to the next downbeat and revealing the next chord a full bar ahead of when it was needed. That rework was implemented, reviewed, and shipped — then reverted, because real playing surfaced a worse problem: the band would audibly keep grooving the *previous* chord while the screen asked about a *different* one, and a player's ear naturally pulls toward matching what they hear, not what they read. That's a structural mismatch, not a bug, and no amount of downbeat-quantization or timing-window tuning fixes it.

This addendum starts over from a different reference point entirely: what makes practicing *with* a rhythm game (Guitar Hero, Rocksmith) feel good, while explicitly keeping this app's core mechanic (you're shown a chord/scale *name* and have to find it yourself — no literal note highway, no notes-per-se shown).

## Core model: Now / Next / the band plays your last win

Three things happen independently, and none of them ever claims to be another:

- **"Now"** — the big, primary prompt. The chord/scale you're currently trying to find. No timer, no deadline — take as long as you want.
- **"Next"** — a small, secondary preview showing what "Now" will become once you get the current one right. Purely a name; it implies nothing about what's currently audible.
- **The band** — always playing (once eligible — see Activation), continuously, and it always represents your *most recently correct chord answer*, never the current "Now" prompt. Before your first correct chord answer in a session, it's rhythm only (kick/snare/hihat, no harmony) since there's nothing to represent yet.

The loop: you find "Now" and play it correctly, at any moment, no timing requirement →
1. A hit-flourish plays immediately (see Feedback).
2. The band's harmony updates to the chord you just answered, instantly (see Timing — this is the piece that makes it feel responsive rather than laggy).
3. "Now" instantly becomes what "Next" was; a fresh "Next" is generated and shown.

Nothing ever waits, nothing ever times out, and the band and the display never contradict each other because they're explicitly not describing the same moment.

## Timing: instant update, no downbeat quantization

The reveal-timing addendum quantized the audible chord switch to the next downbeat, reasoning that changing bass/comp notes off-beat would sound like a stutter. Re-examined: that reasoning doesn't hold once the groove is always-on. The drum pattern (kick/snare/hihat) never changes and never stops regardless of chord — only the bass and comp voices carry chord identity, and they only fire at their own scheduled positions within a bar (a few times per bar, not once). Updating "which chord is confirmed" the instant a correct answer registers doesn't retroactively change an already-sounding note; it just changes what the *next* scheduled bass/comp hit plays — typically a fraction of a beat away, not up to a full bar. This is both simpler to implement (no pending-state machine, no bar-counting) and produces a much snappier, more responsive feel than downbeat-quantization did.

The scheduler's normal lookahead latency (~100ms) means a hit already queued in the next instant might still reflect the previous chord — imperceptible, and not worth engineering around.

## Feedback: the hit-flourish

On a correct answer:
- A short, distinct success sound — a bright bell/chime, timbrally separate from the band's own instruments (kick/snare/hihat/bass/comp) — plays immediately, layered on top of whatever the band is doing.
- The prompt card gets a brighter, quicker visual flash than the existing `.midi-success` animation (which stays as-is for non-Band-Mode practice).

This applies to any correct answer while Band Mode is engaged, not only chord-type prompts (see Scope) — the "Now/Next instantly advances, flourish plays" loop is the same regardless of prompt type. Only the band's *harmonic content* is chord-specific.

## Scope

Unchanged from the prior addendum's "keep it broad" decision: Chords, Diatonic Chords, and Functional Harmony prompts all feed the band's harmony (they share the same resolved `chord` type). Scales, Intervals, and Note Finder prompts still get the Now/Next/flourish treatment but never change what the band is playing, since there's no chord to voice.

## Activation / eligibility simplification

The old eligibility rule (`bandModeEligible()` requiring `Change every` to be `Whole note` or `2 bars`) existed only because the reveal-timing model needed a bar-aligned cadence to know when to reveal the next chord. That concept is gone entirely — "Now" advances the instant you're correct, with no cycle-length dependency at all. Band Mode should now be available whenever Metronome timer mode and MIDI are both on, regardless of `Change every` or time signature. The toggle's current disabled/grayed-out state and its eligibility-note text should be removed along with the restriction.

## State model (conceptual — exact names/wiring belong in the implementation plan)

- A persistent "last correct chord" value, updated instantly on any correct chord-type answer, read by the groove's bass/comp voices. Never cleared to null once set (only reset on full Band Mode teardown, same as today's teardown contract).
- A pre-generated "next" prompt, always one step ahead of "Now," so there's never a moment with nothing to preview. Regenerated immediately whenever "Now" advances.
- The existing per-beat scheduler (click, kick/snare/hihat, bass/comp dispatch) is otherwise unchanged — this addendum removes the reveal-timing rework's downbeat-gating logic and bar-counting state, not the underlying lookahead scheduler itself.

## Out of scope for this pass

- No timing/accuracy scoring, no combo multiplier, no streak-driven arrangement build-up (a `#4` idea raised and explicitly deferred during brainstorming — worth a future pass, not this one).
- No literal note highway, no note-level display — prompts remain names only, per the explicit "I still want to find them myself" requirement.
- No change to non-Band-Mode practice behavior anywhere in the app.
