# All Paths popup redesign

## Problem

The "All Paths" popup (`stageListModal` / `renderStageList()` in `script.js`) renders all 112 Learning Path stages as one flat scrolling list — a 380px-wide, 70vh-tall panel with nothing but a number, name, and optional mastery dot per row. There's no grouping, no headers, no way to search. With 112 rows, finding anything beyond scrolling top-to-bottom is hard. This is Part 2 of the ongoing Learning Path audit (Part 1, a progression-curriculum bug fix, already shipped).

## Scope

Redesign the popup's content to be collapsible by phase and searchable by name, without changing panel sizing, the mastery dot, auto-scroll-to-current behavior, or the click-a-row-to-jump interaction.

## Design

### Data: `LEARNING_PATH_PHASES`

A new array declared immediately after `LEARNING_PATH` in `script.js`, one entry per phase currently marked only by a code comment in the array. Each entry's `count` is the number of consecutive `LEARNING_PATH` stages in that phase — verified against the current file:

```js
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Triad inversions', count: 9 },
  { name: 'Major scales', count: 7 },
  { name: 'Combine chords + scales', count: 3 },
  { name: 'Seventh chords — root position', count: 4 },
  { name: 'Seventh chord inversions', count: 5 },
  { name: 'Full Foundation', count: 1 },
  { name: 'Scales beyond natural minor', count: 11 },
  { name: 'Enharmonic spellings', count: 3 },
  { name: 'Extended chords', count: 9 },
  { name: 'Functional harmony', count: 22 },
  { name: 'Interval reading', count: 7 },
  { name: 'Diatonic chords', count: 5 },
];
```

17 phases, counts summing to exactly 112 (matches `LEARNING_PATH.length`). A stage's phase index is derived at render time by walking the counts in order — no per-stage field, so future stage insertions only require bumping one phase's `count` rather than touching every affected stage object (the exact fragility that bit `mpr_learning_stage`'s index-based persistence during Part 1 of this audit).

### Rendering: collapsible phase groups

`renderStageList()` is rewritten to walk `LEARNING_PATH_PHASES`, emitting one header row per phase (`name` + stage count, e.g. "Accidentals one at a time (6)", plus a collapse chevron) followed by that phase's stage rows when expanded. Only the phase containing the current stage (`learningStage`) starts expanded; every other phase starts collapsed. Clicking a phase header toggles that phase's expanded/collapsed state (client-side only, not persisted — resets to "current phase expanded" every time the popup opens, matching the existing auto-scroll-to-current behavior).

### Search box

A text input added inside `.stage-list-header` (next to the title). While it has text, the phase grouping is replaced entirely by a flat list of stages whose `name` contains the search text (case-insensitive substring match) — same row markup, same click-to-jump behavior, no headers. Clearing the box restores the grouped, collapsed-by-default view.

### Unchanged

- Panel sizing (`min(380px, calc(100vw - 32px))` width, `70vh` max height) — the app's viewport target (phone-width, confirmed by existing Playwright tests at 420px) doesn't need a wider panel; collapsing plus search solves the navigation problem without resizing.
- The mastery dot per stage row (`getStageMastery()` — unaffected).
- Auto-scroll-to-current-row when the popup opens.
- Clicking a stage row applies that stage and closes the popup (`applyStage(idx)`, `stageListModal` hidden).

## Out of scope

- Any change to `LEARNING_PATH` stage content, ordering, or the Learning Path stages themselves (this redesign only touches how the popup displays them).
- A similar popup/redesign for the separate Ear Training path (`EAR_TRAINING_PATH`) — it has no equivalent "All Paths" popup today, and none is being added here.
- Persisting collapse state across popup opens or app reloads.
- Searching by hint text (only stage `name` is matched).
- Part 3 of the Learning Path audit (a broader pass over the other stages for the same *kind* of issue found in Part 1) — separate, later piece of work.
