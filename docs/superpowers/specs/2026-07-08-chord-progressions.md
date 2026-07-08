# Chord progression practice: make existing progressions playable

## Problem

`genFunctional()` (Functional Harmony) already picks from a list of patterns that includes real chord progressions — `I–IV–V`, `ii–V–I`, `vi–IV–I–V`, `I–V–vi–IV`, `IV–V–I` (major), `ii°–V–i`, `i–VI–III–VII`, `i–iv–V` (minor) — and displays them as a hint ("Play: I–IV–V"). But `getExpectedPCs()`'s func branch explicitly bails out the moment it sees a multi-chord pattern (`if (pattern.includes('–')) return null`), so these are purely decorative today: the app can never confirm you played one, you just read the hint and manually click "Next."

## Scope

This pass makes the 8 existing progressions actually playable and checkable, one chord at a time, with an eventual "was this progression completed without any mistakes" stat. It deliberately does **not** add any new UI (no new checkbox, no way to select which progressions to practice) and does **not** integrate with the Learning Path — those are a separate, deliberately deferred follow-up, since they require a filtering mechanism for Functional Harmony that doesn't exist today (unlike Chords, there are no per-pattern checkboxes to restrict which functional patterns get picked).

## Design

### Prompt key and step tracking

The func prompt key gains a 5th segment: `func|note|mode|pattern|stepIndex` (e.g. `func|C|Major|I–IV–V|0`). `getExpectedPCs()`'s func branch splits `pattern` on "–" into a `steps` array and looks up `steps[stepIndex]` using the exact same single-numeral resolution logic that already works today (the `data.numerals.indexOf(numeral)` lookup, including the existing minor-mode `V` special case) — it just resolves whichever numeral the current step points to, instead of assuming the whole pattern is one numeral. A single-chord func prompt is simply a progression of length 1 (`steps.length === 1`), so this doesn't change any existing single-chord behavior.

### Advancing through steps

`checkMidi()` gains a check: when a step's chord matches and more steps remain in the same progression, instead of dispatching to the normal success handlers (which always generate a whole new random prompt), it advances the step index in place — updates `currentPromptKey`'s step segment, re-renders the hint to show the next roman numeral, and plays the same brief success-flash animation already used elsewhere. Critically, this step-advance does **not** reset `promptStartTime` or the existing wrong-note flag (`promptHadWrongNote`) the way `showPrompt()`/`advanceToNextPrompt()` normally do. Only when the *last* step is answered correctly does the normal flow run (generate a new prompt, reset state for it).

This one design choice — not resetting between steps — is what makes the rest work with almost no new code: the wrong-note flag naturally accumulates "was any step of this progression ever wrong," and the elapsed time captured at final-step completion is the time for the whole progression, not just the last chord. The existing red wrong-note highlighting and keyboard rendering need no changes — they already work generically off whatever `getExpectedPCs()` returns for the current step.

### Stats

Completing the last step calls the existing `recordAdaptiveResult()`/`updateDailyLog()` exactly as any other prompt does today. `recordAdaptiveResult()`'s func branch gains one line: when the pattern is a real progression (contains "–"), record it into the existing `adaptWeights.variations` bucket (already built for inversions and Left-Hand mode) under the full pattern string as its key (e.g. `"I–IV–V"`) — each of the 8 progressions gets its own tracked speed/count, visible in the existing stats section, no new rendering code. Single-chord func prompts are unaffected — this line only fires for actual multi-chord patterns. The existing first-try-accuracy daily-log stat also picks this up automatically (one "answer" per completed progression, first-try-clean only if `promptHadWrongNote` stayed false across every step).

## Out of scope for this pass

- Any new checkbox or way to select/filter which progressions get practiced — progressions stay mixed into the existing random Functional Harmony pool exactly as today.
- Learning Path integration, difficulty ordering, or genre grouping — deliberately deferred; needs its own design once a filtering mechanism exists for Functional Harmony (which doesn't exist today for any of its patterns, single-chord or progression).
- Special handling for manually clicking "Next" mid-progression — it abandons the progression and generates a whole new random prompt, same as skipping any other prompt today.
- Band Mode's "Next" preview — not specially handled for progressions; it will preview a hypothetical new random prompt rather than "the next chord in this same progression." A known minor inconsistency, not fixed this pass.
- Ear Training — func-type prompts aren't part of Ear Training, so this doesn't apply there.
