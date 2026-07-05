# Band Mode addendum: confirm-then-groove reveal timing

## Problem

The original Band Mode design (see `2026-07-05-band-mode-design.md`) ties three things to a single event: the moment `getBeatsPerChange()` beats elapse after a correct answer, the groove ends, the next chord is revealed, and you're expected to already know and play it — instantly, or the band goes silent and you feel off-rhythm. Real testing surfaced two related problems:

1. **No time to find the next chord.** The reveal and the "you must play this now" deadline are the same instant, giving zero lead time.
2. **Chord changes land off-beat.** The instant you answer correctly, the groove's bass/comp/drums switch to the new chord on whatever note happens to be scheduled next — which can be an off-beat eighth note, making the transition sound like a stutter rather than a clean chord change.

## Design

**Instant recognition, deferred (bar-quantized) audio; reveal one full bar after that.**

Per chord, the cycle is: you play it correctly at any point (visual "correct!" feedback is immediate) → the audio switch to that chord happens on the *next downbeat*, however far away that is → the band grooves on it for one full bar → on the downbeat after that, the next chord is revealed on screen while the band keeps grooving the just-confirmed chord → repeat.

There is no forced timeout: if you're still hunting for the revealed chord when its grace bar ends, nothing changes — same chord stays revealed, same groove keeps playing — until you get it.

This fixes both problems at once: since the audio only ever changes on a downbeat, you get natural slack in *when* you play a chord (early, late, anywhere in the bar) without the transition ever landing mid-pattern; and since the reveal always happens with a full bar of groove already established, you always have at least one full bar of lead time before you need to have found the next chord.

## State changes

- `confirmedChordPcs` (replaces `rideOutChordPcs`) — the chord currently audible in the groove. `null` until the first chord is ever confirmed in a session; once set, it is only ever *replaced* on a downbeat, never transiently cleared mid-session (only on full teardown).
- `pendingChordPcs` (new) — a chord that's been answered correctly but hasn't reached a downbeat yet to become confirmed. `null` when nothing is pending.
- `rideOutActive` (the old boolean) is removed entirely — `scheduleGrooveHit`'s "is there anything to play" guard becomes `if (!confirmedChordPcs) return;`, since `confirmedChordPcs`'s nullness already carries that information. One less piece of state to keep in sync.
- The reveal counter (currently `metroCount` against `getBeatsPerChange()`) is repurposed to count **bars since the last chord was confirmed**, incremented only on downbeat ticks, checked against a new **bar-based** cadence (see below) rather than the old fixed beat count.

## Bar-alignment fix

`getBeatsPerChange()` (pre-existing, drives non-Band-Mode auto-advance too) returns a fixed beat count (4 for "Whole note", 8 for "2 bars") independent of time signature — it was never bar-aligned, because the original metronome feature never needed to be. This design needs true bar alignment, so Band Mode gets its own interpretation of the same UI setting: a new `getBandBarsPerChange()` returns `1` when `metroNoteDuration` is `"4"` (Whole note) or `2` when it's `"8"` (2 bars), and the actual beat-cadence used by the scheduler is `getBandBarsPerChange() * getBeatsPerBar()` — always a whole number of bars, for any time signature.

**Eligibility changes accordingly:** `bandModeEligible()` becomes "is `metroNoteDuration` one of the two bar-aligned values (`'4'` or `'8'`)?" instead of the old beat-count comparison. Net effect: 4/4 behaves identically to before; 3/4 and 5/4 now get *correct* bar-aligned cadences instead of the old fixed-beat-count approximation. One concrete improvement: 5/4 + "Whole note" was previously ineligible (4 beats < a 5-beat bar) and is now eligible (1 full 5-beat bar).

**Non-Band-Mode behavior is unaffected** — `getBeatsPerChange()` itself is untouched; `getBandBarsPerChange()` is new and used only inside the band scheduler's own reveal logic.

## Trigger flow changes

`triggerBandSuccess(expected)`: unchanged except its last two lines. Instead of `rideOutActive = true; rideOutChordPcs = expected.pcs.slice();`, it now only sets `pendingChordPcs = expected.pcs.slice();`. Response-time stats and the success flash still happen immediately, as today — "how fast you found it" is measured from reveal to recognition, not affected by the deferred audio.

`onBeatTick(beatNum)`: unchanged for every beat's click/pulse. On downbeats specifically (`beatNum === 0`):
- If `pendingChordPcs` is set: it becomes `confirmedChordPcs`, `pendingChordPcs` clears, and the bars-since-confirm counter resets to 0. (This takes priority over the reveal check below — you don't reveal a new chord on the same downbeat you just confirmed one.)
- Otherwise, if a chord is already confirmed: increment the bars-since-confirm counter; once it reaches `getBandBarsPerChange()`, reset it, clear `midiSuccessActive` and the success-flash class (unlocking input for the newly revealed prompt), and call `advancePromptOnSchedule()`. The groove is untouched — it keeps playing `confirmedChordPcs`.

`scheduleGrooveHit`: guard changes from `rideOutActive` to `confirmedChordPcs` being non-null; voicing logic (bass = root, comp = remaining tones) is otherwise unchanged.

## Removed: the pickup-note race-condition fix

A recent fix eagerly pre-scheduled a ride-out's trailing off-beat note to avoid it being dropped when `rideOutActive` was cleared exactly at a boundary. Under this design, `confirmedChordPcs` is never transiently cleared mid-session (only replaced, or cleared entirely on teardown) — the race this fix addressed no longer exists. That fix (the extra block in `scheduleStep` referencing `rideOutActive`/`rideOutChordPcs`/`metroCount`) is removed as part of this change, since it references variables/semantics that no longer exist in this form.

## Teardown

Toggling Band Mode off, leaving metronome mode, or otherwise stopping the scheduler clears `confirmedChordPcs`, `pendingChordPcs`, the bars-since-confirm counter, `midiSuccessActive`, and the success-flash class — the same cleanup `stopBandScheduler()` already does today, just against the renamed/added state.

## Out of scope for this addendum

- No change to non-chord prompt types (scales/intervals/note finder) — still the plain click, unaffected.
- No change to the "keep it broad" scope decision (Chords, Diatonic Chords, and Functional Harmony all still get Band Mode).
- No new UI — the existing toggle, panel, and prompt display are unchanged; this is purely a timing-model change underneath.
