# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project

Single-page static app — no build step, no framework. Open `index.html` in a browser. Everything runs client-side. Four files: `index.html` (structure), `style.css` (dark theme, CSS custom properties), `script.js` (all logic, flat file, no classes), plus two vendored libraries — `tonal.min.js` ([Tonal.js](https://github.com/tonaljs/tonal), used only for jazz-extended chord-quality parsing in Functional Harmony) and `tone.min.js` ([Tone.js](https://tonejs.github.io/), used only for the synth voice presets in `SYNTH_PRESETS` — no other dependencies, no CDN at runtime).

## Testing

No dev server or test suite runner beyond `run-all-tests.cjs`. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run a single test: `node test-script.cjs`
- Run the entire suite: `node run-all-tests.cjs` (discovers and runs every `test-*.cjs` file at the repo root sequentially; exits non-zero if anything fails)
- New test files should use `test-helpers.cjs` instead of inlining the Playwright/reporting boilerplate (existing test files predate this and are not migrated):

  ```js
  const { createReporter, launchApp } = require('./test-helpers.cjs');

  (async () => {
    const { browser, page } = await launchApp();
    const { check, checkTrue, finish } = createReporter();

    // ... test body using check()/checkTrue() ...

    await browser.close();
    finish();
  })();
  ```

## Architecture

### Prompt generation

`generatePrompt()` builds a pool of enabled generators (`genNote`, `genChord`, `genScale`, `genFunctional`, `genInterval`, `genDiatonic`), picks one at random, retries up to 12 times to avoid repeating `lastPromptKey`. Each returns `{ line1, line2, key }` or `null`.

### Settings persistence

Single `mpr_settings` JSON key in localStorage. Checkbox states by element ID; selects (`diatonicRoot`, `diatonicMode`) saved separately. `syncUI()` disables sub-option groups when their parent category is unchecked.

### Learning Path

`LEARNING_PATH` is a large, still-growing array of stage objects — check `LEARNING_PATH.length` live rather than trusting a hardcoded count in prose (it was wrong here for a long time: this doc said "41-entry" while the live array had grown to 154). `applyStage(idx)` wipes all categories, chord types, scale types, and root notes, then sets only what the stage specifies plus the timer value. Calls `saveSettings()` + `syncUI()` + `showPrompt()`. Shuffle Settings exits the path. Stage persisted as `mpr_learning_stage` in localStorage (by stage **name**, not index — this was fixed 2026-07-09 specifically so stage insertions don't silently shift a learner's saved position). **Adding, removing, or reordering stages/phases**: use the `learning-path-stages` skill (`.claude/skills/learning-path-stages/SKILL.md`) — it covers the column-alignment conventions and pre-flight adjacency-grep discipline this project has learned the hard way.

### localStorage keys

| Key | Contents |
|-----|----------|
| `mpr_settings` | All checkbox/radio/select state |
| `mpr_theme` | `"dark"` or `"light"` |
| `mpr_learning_stage` | Current stage **name** (not index; absent = not on path) |
| `mpr_midi` | `"1"` if MIDI was enabled last session |
| `mpr_daily` | 30-day practice history log |
| `mpr_weights` | Adaptive-practice weights (Playing mode) |
| `mpr_weights_ear` | Adaptive-practice weights (Ear Training mode) |
| `mpr_ear_settings` | Ear Training category checkboxes + label visibility |
| `mpr_ear_stage` | Current Ear Training learning-path stage index |
| `mpr_synth_preset` | Selected synth voice preset |
| `mpr_synth_vol` | Synth master volume (0-100) |
| `mpr_click_vol` | Metronome click volume (0-100) |
| `mpr_band_style` | Selected Band Mode groove style |
| `mpr_auto_backup_enabled` | `"1"` if auto-backup is on (off by default) |
| `mpr_auto_backup_cadence` | `"daily"` / `"weekly"` / `"monthly"` |
| `mpr_last_auto_backup` | Timestamp of the last automatic backup |

### `.hidden` class

Not global — each element has its own scoped rule (`.hold-btn.hidden`, `.session-countdown.hidden`, etc). Add a new rule per element; don't add a global `.hidden`.

## Gotchas

- **Playwright radio inputs**: clicking a `.radio-pill` label times out — the label intercepts pointer events. Use `page.evaluate()` to set `.checked` and dispatch a `change` event instead.
- **Root Notes vs Diatonic**: Root Notes checkboxes apply to Chords, Scales, Note Finder, and Functional Harmony — not Diatonic Chords, which has its own key selector.
- **NOTES array spelling**: enharmonic choices throughout the codebase follow whatever `NOTES[]` uses (mixes sharps and flats). Don't introduce alternate spellings.
- **Tone.js classes that need an AudioWorklet are silent under `file://`**: `AudioContext.audioWorklet.addModule()` with a blob URL fails with `AbortError: Unable to load a worklet's module` when the page origin is `file://` (verified with a minimal Tone.js-free repro — this is a Chromium platform restriction, not a Tone.js bug). Since this app is opened via `file://` with no server, any `SYNTH_PRESETS` entry built on a worklet-backed class is effectively dead on arrival — it constructs without throwing and produces true silence. `Tone.PluckSynth` and `Tone.FeedbackCombFilter` both hit this (their Karplus-Strong-style comb filter is worklet-based); there's no worklet-free equivalent in this vendored bundle. Before wiring any new Tone.js class into a preset, check whether it (or something it wraps) is worklet-backed.
