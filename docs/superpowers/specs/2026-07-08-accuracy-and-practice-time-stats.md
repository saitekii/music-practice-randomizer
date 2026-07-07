# Stats page: first-try accuracy and practice time

## Problem

The stats page (`renderStats()`) already tracks a lot — a 5-week activity calendar, streaks, weak-spot drilling, a 14-day avg-response-time chart, and per-root/per-type mastery bars — but every one of those measures *speed*. Nothing tracks whether the eventual correct answer came with wrong notes played first, and nothing tracks how much actual time was spent practicing (only answer counts). Both are common, motivating stats in this genre of app and neither requires new UI real estate beyond the existing header row.

## Scope

This applies only to the main MIDI-based Practice stats tab (`renderStats()`), not Ear Training's stats tab (`renderEarStats()`) — Ear Training's wrong-answer flow is a different interaction model (multiple-choice clicks, not MIDI note detection) and is deliberately left for a future pass. Applies uniformly across every Practice prompt type (chords, scales, notes, intervals, etc.) — no per-type scoping needed, since the underlying wrong-note detection already works generically across all of them.

## Design

### Data model

`updateDailyLog(ms, isEar, firstTryCorrect)` gains two new per-day fields alongside the existing `answers`/`avgMs`:
- `firstTryCount` — how many of the day's answers were first-try correct (no wrong note held at any point before the correct answer).
- `totalMs` — sum of response times for the day, reusing the same `ms` value already computed for `avgMs`. Because that `ms` is already filtered by the existing `MAX_RESPONSE_MS` (30s) "user was probably away" cutoff before `updateDailyLog` is ever called, summing it gives a reasonable "actual engaged practice time" estimate without any new idle-detection logic.

Both fields cap at 30 days along with the rest of the daily log (the existing `while (log.length > 30) log.shift()` truncation) — there is no unbounded lifetime history in this data model, and extending that is out of scope here.

### Detecting a first-try mistake

A new module-level flag, `promptHadWrongNote`, is reset to `false` at the same two points `promptStartTime` already gets reset when a new prompt begins (`showPrompt()` and `advanceToNextPrompt()`). `updateKeyboard()` already computes, live, on every MIDI note-on/off, whether each held note is wrong (`isNoteWrong`, currently used only to drive the red-highlight visual) — this design adds one line: if any key comes back wrong during that computation, set `promptHadWrongNote = true`. No new detection logic is introduced; this only remembers a signal that's already being computed and otherwise discarded every render.

At the moment a prompt is answered correctly, `triggerMidiSuccess()` and `triggerBandSuccess()` (both of which already call `updateDailyLog(ms)` at the identical point, gated by the same `ms <= MAX_RESPONSE_MS` check) pass `!promptHadWrongNote` through as the new `firstTryCorrect` argument.

### Display

Two new stats added to the existing header row in `renderStats()`, alongside `answers (30 days)` / `days practiced` / `today` / `streak`:
- **First-try accuracy** — `sum(firstTryCount) / sum(answers)` across the full 30-day log, shown as a percentage. This is an aggregate rate rather than a single day's number, since one day's answer count is too small a sample to be a meaningful percentage on its own.
- **Practice time** — today's `totalMs` converted to minutes, plus a 30-day total in minutes alongside it (e.g. "12 min today · 192 min (30 days)"). Minutes are used consistently for both numbers rather than switching to hours for the larger one, to avoid an extra unit-formatting decision with no real benefit at this scale.

No changes to the 14-day response-time chart, the per-root/per-type mastery bars, the calendar, the weak-spots panel, or anything in `renderEarStats()`/Ear Training's daily-log fields (`earAnswers`/`earAvgMs`).

## Out of scope for this pass

- Ear Training's stats tab and its `earAnswers`/`earAvgMs` daily-log fields.
- Per-root/per-type accuracy breakdown (accuracy stays an aggregate header stat only, not integrated into the existing speed bars/`adaptWeights` data structure).
- Extending the 14-day chart to show practice minutes.
- Any change to the 30-day rolling window itself (no long-term/lifetime history is added).
- Any change to the explicit "Practice session" countdown timer feature (`sessionInterval`/`sessionGoal`) — this is a separate, already-existing feature and is untouched.
