# Click Volume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent volume slider for the metronome click, separate from the existing instrument/band volume control.

**Architecture:** The click already renders through its own isolated audio path (`playClick` connects straight to `ctx.destination`, bypassing the shared instrument gain node entirely) — introduce a dedicated `clickGain` node on that existing path, and a new slider in the metronome panel that controls it, following the exact persistence/wiring pattern already used for the instrument volume slider.

**Tech Stack:** Vanilla JS (`script.js`), Web Audio API, no build step, no framework.

## Global Constraints

- No build step, no framework, no new dependencies.
- `script.js` is a flat file, no classes — new code is plain top-level `function`/`let`/`const`, following existing style exactly.
- No change to the existing instrument volume slider (`synthVolume`/`mpr_synth_vol`) or the audio path it controls.
- Spec: `docs/superpowers/specs/2026-07-05-click-volume.md`.

---

### Task 1: Click volume slider

**Files:**
- Modify: `script.js:510` (state var), `script.js:1483-1498` (`playClick`), `script.js:436` (DOM ref), `script.js:3640-3645` (slider wiring)
- Modify: `index.html:252-257` (metronome panel, new row)
- Modify: `style.css` (reuse existing `.synth-vol-label`-style pattern for the new row's icon+slider)
- Test: `test-click-volume.cjs`

**Interfaces:**
- Consumes: `getAudioCtx()` (existing).
- Produces: `clickGain` (global `GainNode | null`, lazily created), `getClickGain()` (function, returns the node, creating it on first call).

- [ ] **Step 1: Add the `clickGain` state variable**

In `script.js`, directly after line 510 (`let synthMasterGain    = null;`), add:

```javascript
let clickGain          = null;
```

- [ ] **Step 2: Add `getClickGain()` and route `playClick` through it**

In `script.js`, directly before `function playClick(accented, time) {` (currently at line 1483), add:

```javascript
function getClickGain() {
  if (clickGain) return clickGain;
  const ctx  = getAudioCtx();
  clickGain  = ctx.createGain();
  clickGain.gain.value = (parseInt(localStorage.getItem('mpr_click_vol') ?? '70')) / 100;
  clickGain.connect(ctx.destination);
  return clickGain;
}
```

Then, `playClick` (lines 1483-1498) currently reads:

```javascript
function playClick(accented, time) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = accented ? 1100 : 800;
    const now = time ?? ctx.currentTime;
    gain.gain.setValueAtTime(accented ? 0.55 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (_) {}
}
```

Replace the single `gain.connect(ctx.destination);` line with `gain.connect(getClickGain());`:

```javascript
function playClick(accented, time) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(getClickGain());
    osc.type = 'sine';
    osc.frequency.value = accented ? 1100 : 800;
    const now = time ?? ctx.currentTime;
    gain.gain.setValueAtTime(accented ? 0.55 : 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (_) {}
}
```

- [ ] **Step 3: Add the HTML row**

In `index.html`, the metronome panel currently ends (lines 252-257):

```html
              <div class="metro-row">
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
```

Insert a new row directly after the Band Mode row, before the closing `</div>` of `#metroPanel`:

```html
              <div class="metro-row">
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode</span>
                </label>
              </div>
              <div class="metro-row">
                <span class="metro-label">Click</span>
                <label class="synth-vol-label">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  <input type="range" id="clickVolume" min="0" max="100" value="70">
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
```

(Reuses the existing `synth-vol-label` class — the same icon+slider styling already used for the instrument volume control, so no new CSS is needed.)

- [ ] **Step 4: Add the DOM ref and slider wiring**

In `script.js`, directly after line 436 (`const synthVolumeSlider   = document.getElementById('synthVolume');`), add:

```javascript
const clickVolumeSlider   = document.getElementById('clickVolume');
```

Then, directly after the existing instrument-volume wiring (lines 3640-3645):

```javascript
synthVolumeSlider.value = localStorage.getItem('mpr_synth_vol') ?? '70';
synthVolumeSlider.addEventListener('input', () => {
  const vol = parseInt(synthVolumeSlider.value) / 100;
  if (synthMasterGain) synthMasterGain.gain.value = vol;
  localStorage.setItem('mpr_synth_vol', synthVolumeSlider.value);
});
```

add:

```javascript
clickVolumeSlider.value = localStorage.getItem('mpr_click_vol') ?? '70';
clickVolumeSlider.addEventListener('input', () => {
  const vol = parseInt(clickVolumeSlider.value) / 100;
  if (clickGain) clickGain.gain.value = vol;
  localStorage.setItem('mpr_click_vol', clickVolumeSlider.value);
});
```

- [ ] **Step 5: Write and run the Playwright verification script**

Create `test-click-volume.cjs`:

```javascript
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    // GainNode values round-trip through 32-bit float storage (e.g. 0.7 reads
    // back as 0.699999988079071), so numeric checks need a tolerance -- exact
    // JSON.stringify equality would spuriously fail on clickGain.gain.value.
    const ok = typeof expected === 'number'
      ? Math.abs(actual - expected) < 0.0001
      : JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Default value matches the instrument slider's default (70).
  const defaultValue = await page.evaluate(() => document.getElementById('clickVolume').value);
  check('click volume slider defaults to 70', defaultValue, '70');

  // Playing a click lazily creates clickGain, independent of synthMasterGain.
  const afterClick = await page.evaluate(() => {
    playClick(true, getAudioCtx().currentTime + 0.05);
    return {
      clickGainExists: clickGain !== null,
      clickGainValue: clickGain.gain.value,
      synthMasterGainUntouched: synthMasterGain === null,
    };
  });
  check('clickGain is created on first playClick call', afterClick.clickGainExists, true);
  check('clickGain defaults to 0.7 (70/100)', afterClick.clickGainValue, 0.7);
  check('synthMasterGain is untouched by playClick', afterClick.synthMasterGainUntouched, true);

  // Moving the slider updates clickGain's live value and persists to localStorage.
  const afterSlide = await page.evaluate(() => {
    const slider = document.getElementById('clickVolume');
    slider.value = '30';
    slider.dispatchEvent(new Event('input'));
    return {
      clickGainValue: clickGain.gain.value,
      stored: localStorage.getItem('mpr_click_vol'),
    };
  });
  check('moving the slider updates clickGain.gain.value', afterSlide.clickGainValue, 0.3);
  check('moving the slider persists to mpr_click_vol', afterSlide.stored, '30');

  // Persists across reload.
  await page.reload();
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.getElementById('clickVolume').value);
  check('click volume persists across reload', afterReload, '30');

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

Run: `node test-click-volume.cjs`
Expected: all `PASS`, ending in `RESULT: PASS`.

- [ ] **Step 6: Manual sanity check**

Open `index.html` in a browser, select Metronome timer mode, and confirm the new "Click" slider appears below "Band Mode" in the panel, moves independently of the existing instrument volume slider (in the MIDI row), and audibly changes the click's loudness without affecting instrument/band volume.

- [ ] **Step 7: Commit**

```bash
git add script.js index.html test-click-volume.cjs
git commit -m "Add independent click volume control"
```

---

## Self-Review Notes

- **Spec coverage:** New slider in the metronome panel (Step 3), isolated audio routing via a new `clickGain` node (Step 2), `mpr_click_vol` persistence matching the existing pattern (Step 4) — all covered. No change to the instrument volume slider or its audio path (confirmed: `synthMasterGain` untouched by any step here).
- **Placeholder scan:** every step has complete, runnable code; no TBD/TODO.
- **Type/name consistency checked:** `clickGain`, `getClickGain()`, `clickVolumeSlider`, `mpr_click_vol` are spelled identically everywhere introduced and used.
- **Correction found during implementation:** the test's `check()` used exact `JSON.stringify` equality, but `GainNode.gain.value` round-trips through 32-bit float storage (`0.7` reads back as `0.699999988079071`), so the `0.7`/`0.3` assertions would have spuriously failed. Fixed by adding a numeric tolerance path to `check()` (the code above reflects the fix).
