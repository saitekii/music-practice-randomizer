# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project

Single-page static app — no build step, no framework. Open `index.html` in a browser. Everything runs client-side. Four files: `index.html` (structure), `style.css` (dark theme, CSS custom properties), `script.js` (all logic, flat file, no classes), `tonal.min.js` (vendored [Tonal.js](https://github.com/tonaljs/tonal) music-theory library, used only for jazz-extended chord-quality parsing in Functional Harmony — no other dependencies, no CDN at runtime).

## Testing

No dev server or test suite runner beyond `run-all-tests.cjs`. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run a single test: `node test-script.cjs`
- Run the entire suite: `node run-all-tests.cjs` (discovers and runs every `test-*.cjs` file at the repo root sequentially; exits non-zero if anything fails)

## Architecture

### Prompt generation

`generatePrompt()` builds a pool of enabled generators (`genNote`, `genChord`, `genScale`, `genFunctional`, `genInterval`, `genDiatonic`), picks one at random, retries up to 12 times to avoid repeating `lastPromptKey`. Each returns `{ line1, line2, key }` or `null`.

### Settings persistence

Single `mpr_settings` JSON key in localStorage. Checkbox states by element ID; selects (`diatonicRoot`, `diatonicMode`) saved separately. `syncUI()` disables sub-option groups when their parent category is unchecked.

### Learning Path

`LEARNING_PATH` is a 41-entry array of stage objects. `applyStage(idx)` wipes all categories, chord types, scale types, and root notes, then sets only what the stage specifies plus the timer value. Calls `saveSettings()` + `syncUI()` + `showPrompt()`. Shuffle Settings exits the path. Stage persisted as `mpr_learning_stage` in localStorage.

### localStorage keys

| Key | Contents |
|-----|----------|
| `mpr_settings` | All checkbox/radio/select state |
| `mpr_theme` | `"dark"` or `"light"` |
| `mpr_learning_stage` | Current stage index (absent = not on path) |

### `.hidden` class

Not global — each element has its own scoped rule (`.hold-btn.hidden`, `.session-countdown.hidden`, etc). Add a new rule per element; don't add a global `.hidden`.

## Gotchas

- **Playwright radio inputs**: clicking a `.radio-pill` label times out — the label intercepts pointer events. Use `page.evaluate()` to set `.checked` and dispatch a `change` event instead.
- **Root Notes vs Diatonic**: Root Notes checkboxes apply to Chords, Scales, Note Finder, and Functional Harmony — not Diatonic Chords, which has its own key selector.
- **NOTES array spelling**: enharmonic choices throughout the codebase follow whatever `NOTES[]` uses (mixes sharps and flats). Don't introduce alternate spellings.
