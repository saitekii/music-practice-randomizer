# Band Style Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Band Mode's single hardcoded groove (`GROOVE_PATTERNS`) with three selectable rhythmic styles — Rock, Jazz/Swing, Latin/Bossa — each with its own kick/snare/hihat/bass/comp pattern, and (for Jazz) genuine swing timing.

**Architecture:** `GROOVE_PATTERNS[timeSig]` becomes `GROOVE_STYLES[styleName][timeSig]`, with a `swingRatio` per style. A new `getStepDuration()` helper makes the scheduler's per-step duration swing-aware (on-beat/off-beat split) instead of a fixed half-beat, while leaving the existing step-counting and catch-up-cap logic untouched. A new dropdown next to the Band Mode toggle selects the active style, persisted to its own localStorage key exactly like the existing Click volume slider.

**Tech Stack:** Vanilla JS, Web Audio API, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain `<script>`, edits go directly in `script.js`/`index.html`.
- Approach A only this pass: musical content is unchanged (bass = chord root, comp = remaining chord tones). Only rhythm/timing differs per style. Do not add per-style note-choice logic (walking bass, arpeggiation) — that is explicitly deferred.
- Exactly 3 styles: Rock, Jazz/Swing, Latin/Bossa. Do not add more.
- Do not change `playKick`/`playSnare`/`playHihat`/`playBandBass`/`playBandComp` (the synth voices themselves) — only when/where they're called.
- Style switch takes effect on the next scheduled step, no restart required (matches how BPM changes already behave — nothing needs to reset when the dropdown changes).
- New persistence key: `mpr_band_style` (own localStorage key, not part of `mpr_settings` — follow the existing `mpr_click_vol` pattern in `script.js:1489`, `script.js:3658-3663`, not the checkbox-list pattern in `saveSettings()`).
- Test convention: `.cjs` files in project root, run via `node test-script.cjs`, using the `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern already used by every `test-band-*.cjs` file. Always `JSON.stringify` both sides so array/object comparisons work.

---

### Task 1: Style selector UI, persistence, and `getBandStyle()`

**Files:**
- Modify: `index.html:252-264` (metronome panel, insert a new row between the Band Mode row and the Click row)
- Modify: `script.js:437` (DOM ref block), `script.js` (add `getBandStyle()` near the other metronome getters), `script.js:3658-3663` (init + persistence, right after the existing `clickVolumeSlider` block)
- Test: `test-band-style-ui.cjs`

**Interfaces:**
- Produces: `bandStyleSelect` (DOM ref), `getBandStyle()` — returns `'rock'`, `'jazz'`, or `'latin'`. Task 2 calls `getBandStyle()`; it must exist and work standalone before Task 2 needs it.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Add the style dropdown to the metronome panel**

In `index.html`, the Band Mode row currently ends at line 257 and the Click row starts at line 258:

```html
              <div class="metro-row">
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode</span>
                </label>
              </div>
              <div class="metro-row">
                <span class="metro-label">Click</span>
```

Insert a new `.metro-row` between them (reusing the same `.metro-row`/`.metro-label` classes `metroNoteDuration`/`metroTimeSig` already use — no new CSS needed):

```html
              <div class="metro-row">
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode</span>
                </label>
              </div>
              <div class="metro-row">
                <span class="metro-label">Style</span>
                <select id="bandStyle">
                  <option value="rock">Rock</option>
                  <option value="jazz">Jazz/Swing</option>
                  <option value="latin">Latin/Bossa</option>
                </select>
              </div>
              <div class="metro-row">
                <span class="metro-label">Click</span>
```

- [ ] **Step 2: Add the DOM ref**

In `script.js`, right after the existing `clickVolumeSlider` ref (`script.js:437`):

```javascript
const clickVolumeSlider   = document.getElementById('clickVolume');
const bandStyleSelect     = document.getElementById('bandStyle');
```

- [ ] **Step 3: Add `getBandStyle()`**

Add this next to `getBeatsPerBar()`/`getBeatsPerChange()` (`script.js:2176-2180`):

```javascript
function getBandStyle() {
  return bandStyleSelect.value || 'rock';
}
```

- [ ] **Step 4: Add init + persistence**

In `script.js`, right after the existing `clickVolumeSlider` init block (`script.js:3658-3663`):

```javascript
clickVolumeSlider.value = localStorage.getItem('mpr_click_vol') ?? '70';
clickVolumeSlider.addEventListener('input', () => {
  const vol = parseInt(clickVolumeSlider.value) / 100;
  if (clickGain) clickGain.gain.value = vol;
  localStorage.setItem('mpr_click_vol', clickVolumeSlider.value);
});

bandStyleSelect.value = localStorage.getItem('mpr_band_style') ?? 'rock';
bandStyleSelect.addEventListener('change', () => {
  localStorage.setItem('mpr_band_style', bandStyleSelect.value);
});
```

- [ ] **Step 5: Write the test**

Create `test-band-style-ui.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const url = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const options = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#bandStyle option')).map(o => o.value)
  );
  check('exactly 3 style options in this order', options, ['rock', 'jazz', 'latin']);

  const defaultValue = await page.evaluate(() => document.getElementById('bandStyle').value);
  check('defaults to rock', defaultValue, 'rock');

  const getBandStyleResult = await page.evaluate(() => getBandStyle());
  check('getBandStyle() returns rock by default', getBandStyleResult, 'rock');

  await page.evaluate(() => {
    const sel = document.getElementById('bandStyle');
    sel.value = 'jazz';
    sel.dispatchEvent(new Event('change'));
  });
  const persisted = await page.evaluate(() => localStorage.getItem('mpr_band_style'));
  check('selecting jazz persists to mpr_band_style', persisted, 'jazz');

  const liveGetter = await page.evaluate(() => getBandStyle());
  check('getBandStyle() reflects the live selection without reload', liveGetter, 'jazz');

  await page.reload();
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.getElementById('bandStyle').value);
  check('selection survives reload', afterReload, 'jazz');

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 6: Run the test**

Run: `node test-band-style-ui.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Commit**

```bash
git add index.html script.js test-band-style-ui.cjs
git commit -m "Add band style selector dropdown with persistence"
```

---

### Task 2: `GROOVE_STYLES` data model and swing-aware scheduler timing

**Files:**
- Modify: `script.js:2237-2258` (replace `GROOVE_PATTERNS` with `GROOVE_STYLES`, rewrite `scheduleGrooveHit`)
- Modify: `script.js:2278-2298` (`bandSchedulerTick`, add `getStepDuration`)
- Modify: `test-band-groove-pattern.cjs` (references the old `GROOVE_PATTERNS` global and old kick positions — must be updated for the new data shape and Rock's new push-kick pattern)
- Test: `test-band-groove-styles.cjs` (new)

**Interfaces:**
- Consumes: `getBandStyle()` from Task 1 (`script.js`, returns `'rock'`/`'jazz'`/`'latin'`).
- Produces: `GROOVE_STYLES` (object, keyed by style name then time signature `4`/`3`/`5`, plus a `swingRatio` number per style), `getStepDuration(localStepIndex, styleName)` — returns seconds, callable standalone for testing.

- [ ] **Step 1: Replace `GROOVE_PATTERNS` with `GROOVE_STYLES`**

Current code (`script.js:2237-2258`):

```javascript
// Step positions (0-indexed eighth notes within the bar) for each supported time signature.
const GROOVE_PATTERNS = {
  4: { kick: [0, 4], snare: [2, 6], hihat: [0, 1, 2, 3, 4, 5, 6, 7], bass: [0, 4], comp: [3, 7] },
  3: { kick: [0],    snare: [2, 4], hihat: [0, 1, 2, 3, 4, 5],       bass: [0],    comp: [3] },
  5: { kick: [0, 6], snare: [4, 8], hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], bass: [0, 6], comp: [5, 9] },
};

function scheduleGrooveHit(localStep, time, beatsPerBar) {
  const pattern = GROOVE_PATTERNS[beatsPerBar] || GROOVE_PATTERNS[4];
  if (pattern.hihat.includes(localStep)) playHihat(time);
  if (pattern.kick.includes(localStep))  playKick(time);
  if (pattern.snare.includes(localStep)) playSnare(time);
  if (!bandChordPcs) return;
  if (pattern.bass.includes(localStep)) playBandBass(bandChordPcs[0], time);
  if (pattern.comp.includes(localStep)) {
    const compPcs = bandChordPcs.length > 1 ? bandChordPcs.slice(1) : bandChordPcs;
    playBandComp(compPcs, time);
  }
}
```

Replace with:

```javascript
// Step positions (0-indexed eighth notes within the bar) for each style and time signature.
// swingRatio: fraction of a beat the on-beat 8th note occupies (0.5 = straight/even).
const GROOVE_STYLES = {
  rock: {
    swingRatio: 0.5,
    4: { kick: [0, 3, 4], snare: [2, 6],    hihat: [0, 1, 2, 3, 4, 5, 6, 7],             bass: [0, 3, 4], comp: [2, 6] },
    3: { kick: [0, 3, 4], snare: [2],       hihat: [0, 1, 2, 3, 4, 5],                   bass: [0, 3, 4], comp: [2] },
    5: { kick: [0, 5, 6], snare: [2, 8],    hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],       bass: [0, 5, 6], comp: [2, 8] },
  },
  jazz: {
    swingRatio: 0.63,
    4: { kick: [0], snare: [],       hihat: [0, 3, 4, 7],       bass: [0, 4], comp: [3, 7] },
    3: { kick: [0], snare: [],       hihat: [0, 3, 4],          bass: [0, 4], comp: [3] },
    5: { kick: [0], snare: [],       hihat: [0, 3, 4, 7, 8],    bass: [0, 6], comp: [3, 7] },
  },
  latin: {
    swingRatio: 0.5,
    4: { kick: [0, 3], snare: [2, 5, 7],    hihat: [0, 1, 2, 3, 4, 5, 6, 7],             bass: [0, 3], comp: [1, 6] },
    3: { kick: [0, 3], snare: [2, 5],       hihat: [0, 1, 2, 3, 4, 5],                   bass: [0, 3], comp: [1] },
    5: { kick: [0, 5], snare: [2, 7, 9],    hihat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],       bass: [0, 5], comp: [1, 6] },
  },
};

function scheduleGrooveHit(localStep, time, beatsPerBar) {
  const style   = GROOVE_STYLES[getBandStyle()] || GROOVE_STYLES.rock;
  const pattern = style[beatsPerBar] || style[4];
  if (pattern.hihat.includes(localStep)) playHihat(time);
  if (pattern.kick.includes(localStep))  playKick(time);
  if (pattern.snare.includes(localStep)) playSnare(time);
  if (!bandChordPcs) return;
  if (pattern.bass.includes(localStep)) playBandBass(bandChordPcs[0], time);
  if (pattern.comp.includes(localStep)) {
    const compPcs = bandChordPcs.length > 1 ? bandChordPcs.slice(1) : bandChordPcs;
    playBandComp(compPcs, time);
  }
}
```

- [ ] **Step 2: Add `getStepDuration()` and use it in `bandSchedulerTick`**

Current code (`script.js:2278-2298`):

```javascript
function bandSchedulerTick() {
  const ctx = getAudioCtx();
  let caughtUp = 0;
  while (nextStepTime < ctx.currentTime + SCHEDULER_LOOKAHEAD_S) {
    if (caughtUp >= MAX_CATCHUP_STEPS) {
      nextStepTime = ctx.currentTime + SCHEDULER_LOOKAHEAD_S;
      break;
    }
    scheduleStep(stepIndex, nextStepTime);
    nextStepTime += (60 / getBpm()) / 2;
    stepIndex = (stepIndex + 1) % (getBeatsPerBar() * 2);
    caughtUp++;
  }
}
```

Replace with:

```javascript
// Each on-beat/off-beat step pair still totals exactly one beat's duration, so tempo
// and bar length are unaffected -- only where within the beat the off-beat 8th lands.
function getStepDuration(localStepIndex, styleName) {
  const style         = GROOVE_STYLES[styleName] || GROOVE_STYLES.rock;
  const swingRatio    = style.swingRatio ?? 0.5;
  const secondsPerBeat = 60 / getBpm();
  const isOnBeatStep  = localStepIndex % 2 === 0;
  return isOnBeatStep ? secondsPerBeat * swingRatio : secondsPerBeat * (1 - swingRatio);
}

function bandSchedulerTick() {
  const ctx = getAudioCtx();
  let caughtUp = 0;
  while (nextStepTime < ctx.currentTime + SCHEDULER_LOOKAHEAD_S) {
    if (caughtUp >= MAX_CATCHUP_STEPS) {
      nextStepTime = ctx.currentTime + SCHEDULER_LOOKAHEAD_S;
      break;
    }
    scheduleStep(stepIndex, nextStepTime);
    nextStepTime += getStepDuration(stepIndex, getBandStyle());
    stepIndex = (stepIndex + 1) % (getBeatsPerBar() * 2);
    caughtUp++;
  }
}
```

Note: `stepIndex` is the running step counter (not yet wrapped to `localStep`), but since it always wraps at `beatsPerBar * 2` (an even number), `stepIndex % 2` is always equal to `localStep % 2` — parity survives the wrap, so passing `stepIndex` directly is correct and matches what `scheduleStep` does internally with `step % (beatsPerBar * 2)`.

- [ ] **Step 3: Update the existing groove pattern test**

`test-band-groove-pattern.cjs` references the old `GROOVE_PATTERNS` global directly and asserts the old Rock-only kick positions (`[0,4]`, `[0]`, `[0,6]`), which no longer exist under the new default Rock pattern (`[0,3,4]`, `[0,3,4]`, `[0,5,6]`). Replace its content with:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // No chord confirmed yet: drums still fire (band is never silent), bass/comp don't.
      bandChordPcs = null;
      scheduleGrooveHit(0, t, 4);

      // Confirmed C major chord (pcs [0, 4, 7]): drums + bass/comp all fire.
      bandChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (rock pattern)
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + kick + bass (push)
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat + comp

      bandChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('scheduleGrooveHit runs without throwing (with and without a confirmed chord)', result.threw, false);

  const patternShape = await page.evaluate(() => ({
    fourFour:  JSON.stringify(GROOVE_STYLES.rock[4]),
    threeFour: JSON.stringify(GROOVE_STYLES.rock[3]),
    fiveFour:  JSON.stringify(GROOVE_STYLES.rock[5]),
  }));
  check('rock 4/4 pattern defined', patternShape.fourFour.includes('"kick":[0,3,4]'), true);
  check('rock 3/4 pattern defined', patternShape.threeFour.includes('"kick":[0,3,4]'), true);
  check('rock 5/4 pattern defined', patternShape.fiveFour.includes('"kick":[0,5,6]'), true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 4: Run the updated test and existing regression tests**

Run: `node test-band-groove-pattern.cjs`
Expected: all `PASS`, `RESULT: PASS`

Run: `node test-band-scheduler-core.cjs`
Expected: all `PASS`, `RESULT: PASS` (unchanged — this test only checks scheduler engagement/state, not exact pattern content)

Run: `node test-band-scheduler-catchup.cjs`
Expected: all `PASS`, `RESULT: PASS` (unchanged — Rock's `swingRatio: 0.5` makes `getStepDuration` numerically identical to the old fixed `(60/getBpm())/2` for the default style, so the catch-up-cap step-count math is unaffected)

Run: `node test-band-trigger-flow.cjs`
Expected: all `PASS`, `RESULT: PASS` (unchanged — doesn't reference pattern content)

Run: `node test-band-toggle-live.cjs`
Expected: all `PASS`, `RESULT: PASS` (unchanged — doesn't reference pattern content)

- [ ] **Step 5: Write the new swing-timing/style-distinctness test**

Create `test-band-groove-styles.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkClose = (label, actual, expected, tolerance) => {
    const ok = Math.abs(actual - expected) < tolerance;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${actual}, expected ~${expected}`);
    if (!ok) failed = true;
  };

  const styleKeys = await page.evaluate(() => Object.keys(GROOVE_STYLES));
  check('exactly 3 styles defined', styleKeys.sort(), ['jazz', 'latin', 'rock']);

  const shapeCheck = await page.evaluate(() =>
    Object.entries(GROOVE_STYLES).every(([name, style]) =>
      typeof style.swingRatio === 'number' &&
      [4, 3, 5].every(sig =>
        style[sig] && ['kick', 'snare', 'hihat', 'bass', 'comp'].every(voice => Array.isArray(style[sig][voice]))
      )
    )
  );
  check('every style has swingRatio + kick/snare/hihat/bass/comp arrays for 4, 3, and 5', shapeCheck, true);

  // Rock and Latin are straight (swingRatio 0.5): every step should take exactly
  // half a beat, matching today's original fixed-increment behavior exactly.
  await page.evaluate(() => { metroBpmInput.value = '120'; });
  const straightDurations = await page.evaluate(() => ({
    rockOnBeat:  getStepDuration(0, 'rock'),
    rockOffBeat: getStepDuration(1, 'rock'),
    latinOnBeat:  getStepDuration(0, 'latin'),
    latinOffBeat: getStepDuration(1, 'latin'),
  }));
  checkClose('rock on-beat step = quarter-beat straight (0.25s @ 120bpm)', straightDurations.rockOnBeat, 0.25, 0.0001);
  checkClose('rock off-beat step = same as on-beat (straight)', straightDurations.rockOffBeat, 0.25, 0.0001);
  checkClose('latin on-beat step = quarter-beat straight (0.25s @ 120bpm)', straightDurations.latinOnBeat, 0.25, 0.0001);
  checkClose('latin off-beat step = same as on-beat (straight)', straightDurations.latinOffBeat, 0.25, 0.0001);

  // Jazz swings (swingRatio 0.63): on-beat longer, off-beat shorter, but the pair
  // still sums to exactly one full beat (no tempo drift introduced by swing).
  const jazzDurations = await page.evaluate(() => ({
    onBeat:  getStepDuration(0, 'jazz'),
    offBeat: getStepDuration(1, 'jazz'),
  }));
  checkClose('jazz on-beat step is longer than off-beat (genuine swing)', jazzDurations.onBeat - jazzDurations.offBeat, 0.13, 0.01);
  checkClose('jazz on-beat + off-beat sums to exactly one beat (no tempo drift)', jazzDurations.onBeat + jazzDurations.offBeat, 0.5, 0.0001);

  // Styles must be rhythmically distinct from each other, not just relabeled copies.
  const distinctness = await page.evaluate(() => ({
    rockComp:  JSON.stringify(GROOVE_STYLES.rock[4].comp),
    jazzComp:  JSON.stringify(GROOVE_STYLES.jazz[4].comp),
    latinComp: JSON.stringify(GROOVE_STYLES.latin[4].comp),
    jazzSnareEmpty: GROOVE_STYLES.jazz[4].snare.length === 0,
    rockCompMatchesSnare: JSON.stringify(GROOVE_STYLES.rock[4].comp) === JSON.stringify(GROOVE_STYLES.rock[4].snare),
  }));
  check('rock, jazz, and latin have different comp patterns in 4/4', new Set([distinctness.rockComp, distinctness.jazzComp, distinctness.latinComp]).size, 3);
  check('jazz has no snare hits (ride/kick carry time instead)', distinctness.jazzSnareEmpty, true);
  check('rock comp accents the backbeat only (matches snare positions)', distinctness.rockCompMatchesSnare, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 6: Run the new test**

Run: `node test-band-groove-styles.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Commit**

```bash
git add script.js test-band-groove-pattern.cjs test-band-groove-styles.cjs
git commit -m "Add GROOVE_STYLES data model with swing-aware scheduler timing"
```

---

### Task 3: Final regression sweep

**Files:** none modified — this task only runs existing tests and records the result. If any test fails, fix the regression in the file(s) it points to before considering this task done.

**Interfaces:**
- Consumes: everything from Tasks 1 and 2.
- Produces: nothing new — a verification gate before this feature is considered complete.

- [ ] **Step 1: Run every Band Mode test in the suite**

```bash
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-scheduler-core.cjs
node test-band-scheduler-catchup.cjs
node test-band-groove-pattern.cjs
node test-band-groove-styles.cjs
node test-band-style-ui.cjs
```

Expected: `RESULT: PASS` on all seven.

- [ ] **Step 2: Manual listening note**

Playwright can confirm data shapes, timing math, and DOM state, but not whether the accompaniment actually *sounds* like Rock, Jazz, or Latin. Note in the final report to the user that a real listen-through (switching the new Style dropdown while Band Mode is running with MIDI input) is the only way to confirm the musical feel, same caveat as the original Band Mode design.

- [ ] **Step 3: Commit (only if Step 1 required fixes)**

If all tests passed on the first run in Step 1, there is nothing to commit for this task. If fixes were needed:

```bash
git add -A
git commit -m "Fix regressions found in band style presets regression sweep"
```
