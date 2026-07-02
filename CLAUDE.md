# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-page static app — no build step, no framework, no dependencies. Open `index.html` directly in a browser. Everything runs client-side.

## Running and testing

There is no dev server or test suite. To verify changes:

- Open `index.html` in a browser directly (`file:///...`)
- For automated testing, use Playwright via a temporary install:
  ```
  npm install playwright --prefix /tmp/pw
  /tmp/pw/node_modules/.bin/playwright install chromium
  node test-script.cjs  # write a CJS script, not ESM
  ```
- Playwright path on this machine: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` (CommonJS), not `.mjs` — ESM absolute Windows paths fail in Node

## Architecture

Three files, no module system:

- **`index.html`** — structure only; all settings panels are always visible (no tabs/accordion)
- **`style.css`** — dark theme with CSS custom properties in `:root`; three mobile breakpoints at 600px, 480px, 360px
- **`script.js`** — all logic in one flat file, no classes

### How prompt generation works (`script.js`)

1. `generatePrompt()` builds a `pool` of enabled generator functions, picks one at random, calls it, and retries up to 12 times to avoid repeating `lastPromptKey`
2. Each generator (`genChord`, `genScale`, `genFunctional`, `genDiatonic`) returns `{ line1, line2, key }` or `null` if nothing is enabled
3. `showPrompt()` triggers a CSS flash transition, then updates `#promptLine1` / `#promptLine2`
4. `restartTimer()` clears any running interval and starts a new countdown; timer fires `showPrompt()` when it hits 0

### Settings persistence

`saveSettings()` / `loadSettings()` read and write a single `mpr_settings` JSON object in `localStorage`. Checkbox states are saved by element ID; select values (`diatonicRoot`, `diatonicMode`) are saved separately. `syncUI()` disables sub-option groups when their parent category is unchecked.

### Diatonic chord generation

`DIATONIC` constant holds intervals, chord qualities, and Roman numerals for major and minor keys. `genDiatonic()` indexes into `NOTES[]` by `(rootIndex + interval) % 12` — enharmonic spellings follow whatever the `NOTES` array uses (mixes sharps and flats).

## Key constants

- `NOTES` — 12-note chromatic array; order and spelling matter (enharmonic choices follow this array throughout)
- Root Notes checkboxes apply only to Chords, Scales, and Functional Harmony — **not** to Diatonic Chords, which has its own key selector
