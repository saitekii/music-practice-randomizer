# Band Mode Always-On Groove Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Band Mode so the backing band always plays continuously (representing your last correct chord answer, never the current prompt), the current prompt advances the instant any answer is correct with a "Next" preview always visible, and a distinct hit-flourish (sound + flash) rewards correct answers — replacing the temporary "ride-out" model entirely.

**Architecture:** Replace `rideOutActive`/`rideOutChordPcs` (temporary, cleared at a bar boundary) with a single persistent `bandChordPcs` value that's never cleared except on full teardown. Remove the bar-counting reveal logic from `onBeatTick` entirely — prompt advancement moves from the beat scheduler into `checkMidi`'s correct-match handling, firing instantly. Drums (kick/snare/hihat) play unconditionally once the scheduler is running; only bass/comp read `bandChordPcs`. A new `nextPromptObj` is kept one prompt ahead at all times for the "Next" preview.

**Tech Stack:** Vanilla JS (`script.js`), Web Audio API, no build step, no framework. Testing via ad hoc Playwright `.cjs` scripts (project convention).

## Global Constraints

- No build step, no framework, no new dependencies.
- `script.js` is a flat file, no classes — new/changed code is plain top-level `function`/`let`/`const`, following existing style exactly.
- `.hidden` is never global — the new "Next" preview element needs its own scoped `.hidden` rule, not a shared one (per `CLAUDE.md`).
- Non-Band-Mode behavior must be provably unaffected — `metroTick()`, `triggerMidiSuccess()`, and the existing `.midi-success` flash stay untouched; this redesign only changes behavior while `bandActive` is true.
- Scope: Chords, Diatonic Chords, and Functional Harmony prompts feed the band's harmony (they resolve to the same `chord` type); Scales/Intervals/Note Finder still get the Now/Next/flourish treatment but never change what the band plays.
- Test scripts are `.cjs`, resolving `index.html` via `path.resolve(__dirname, 'index.html')`.
- Spec: `docs/superpowers/specs/2026-07-05-band-mode-always-on-groove.md` — read it if anything here seems ambiguous; this plan implements it exactly.

---

### Task 1: New building blocks — hit-chime voice, hit-flash, Next preview

**Files:**
- Modify: `script.js:1587` (insert after `playBandComp`, before `SYNTH_PRESETS`), `script.js:419` (DOM refs), `script.js` (new `renderNextPreview` function, placed near `renderPrompt`)
- Modify: `index.html:47-52` (prompt card area)
- Modify: `style.css` (new `.next-prompt-row` rules, new `.band-hit-flash` keyframe)
- Test: `test-band-hit-flourish.cjs`

**Interfaces:**
- Consumes: `getAudioCtx()`, `getSynthMasterGain()` (existing).
- Produces: `playHitChime(time)` — a bright, distinct success sound. `renderNextPreview(prompt)` — shows/hides and populates the "Next" preview text; `prompt` is a `{line1, line2, key}` object (same shape `generatePrompt()` returns) or `null` to hide it. `nextPromptRow`, `nextPromptText` (DOM refs). CSS class `band-hit-flash` (apply to `promptCard`, matching how `.midi-success` is already used).

This task only adds new, self-contained pieces — it doesn't wire them into the correctness-detection flow yet (that's Task 2), so there's no behavior change from this task alone.

- [ ] **Step 1: Add the hit-chime voice**

In `script.js`, directly after `playBandComp` (ends at line 1587) and before `const SYNTH_PRESETS = {` (line 1589), insert:

```javascript
function playHitChime(time) {
  try {
    const ctx  = getAudioCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    gain.connect(getSynthMasterGain());
    // A5 then E6 (a fifth above), 30ms apart -- a bright, game-like "ding-ding"
    // distinct in timbre from the drum/bass/comp voices.
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(time + i * 0.03);
      osc.stop(time + 0.5);
    });
  } catch (_) {}
}
```

- [ ] **Step 2: Add the `.band-hit-flash` CSS**

In `style.css`, directly after the existing `.prompt-card.midi-success` rule (ends around line 1531, right after the `@keyframes midi-success` block), add:

```css
@keyframes band-hit-flash {
  0%   { box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.55), 0 0 90px rgba(124,109,250,0.1),  inset 0 1px 0 rgba(255,255,255,0.06); }
  30%  { box-shadow: 0 2px 4px rgba(0,0,0,0.25), 0 20px 70px rgba(0,0,0,0.3), 0 0 140px rgba(255,214,90,0.6), inset 0 1px 0 rgba(255,255,255,0.08); }
  100% { box-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 20px 60px rgba(0,0,0,0.55), 0 0 90px rgba(124,109,250,0.1),  inset 0 1px 0 rgba(255,255,255,0.06); }
}

.prompt-card.band-hit-flash {
  animation: band-hit-flash 0.25s ease;
}
```

(A brighter gold glow than `.midi-success`'s green, and much quicker — 0.25s vs 0.7s — matching the spec's "brighter, quicker flash.")

- [ ] **Step 3: Add the "Next" preview HTML**

In `index.html`, the prompt card currently reads (lines 47-52):

```html
      <div class="prompt-card" id="promptCard">
        <div class="prompt-text">
          <span class="prompt-line" id="promptLine1"></span>
          <span class="prompt-line secondary" id="promptLine2"></span>
        </div>
      </div>

      <div id="drillBanner" class="drill-banner hidden">
```

Insert the new row directly after the prompt card's closing `</div>` and before `drillBanner`:

```html
      <div class="prompt-card" id="promptCard">
        <div class="prompt-text">
          <span class="prompt-line" id="promptLine1"></span>
          <span class="prompt-line secondary" id="promptLine2"></span>
        </div>
      </div>

      <div id="nextPromptRow" class="next-prompt-row hidden">
        <span class="next-prompt-label">Next:</span>
        <span id="nextPromptText" class="next-prompt-text"></span>
      </div>

      <div id="drillBanner" class="drill-banner hidden">
```

- [ ] **Step 4: Add the "Next" preview CSS**

In `style.css`, directly after the `.prompt-card.empty .prompt-line` rule (ends around line 202, right before the `/* ── Structure hint ── */` comment), add:

```css
.next-prompt-row {
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: -8px;
  margin-bottom: 16px;
}

.next-prompt-row.hidden {
  display: none;
}

.next-prompt-label {
  font-weight: 600;
  opacity: 0.7;
}
```

- [ ] **Step 5: Add DOM refs and the render function**

In `script.js`, directly after line 419 (`const bandModeRow = document.getElementById('bandModeRow');`), add:

```javascript
const nextPromptRow  = document.getElementById('nextPromptRow');
const nextPromptText = document.getElementById('nextPromptText');
```

Then, in `script.js`, directly after `renderPrompt` (ends at line 2001, right before `function addToHistory`), add:

```javascript
function renderNextPreview(prompt) {
  if (!prompt) {
    nextPromptRow.classList.add('hidden');
    nextPromptText.textContent = '';
    return;
  }
  nextPromptRow.classList.remove('hidden');
  nextPromptText.textContent = prompt.line1;
}
```

- [ ] **Step 6: Write and run the Playwright verification script**

Create `test-band-hit-flourish.cjs`:

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
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const chimeResult = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      playHitChime(ctx.currentTime + 0.05);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('playHitChime runs without throwing', chimeResult.threw, false);

  const hiddenByDefault = await page.evaluate(() =>
    document.getElementById('nextPromptRow').classList.contains('hidden')
  );
  check('Next preview is hidden with no prompt', hiddenByDefault, true);

  const shown = await page.evaluate(() => {
    renderNextPreview({ line1: 'G Major', line2: '', key: 'chord|G|Major|' });
    return {
      hidden: document.getElementById('nextPromptRow').classList.contains('hidden'),
      text: document.getElementById('nextPromptText').textContent,
    };
  });
  check('Next preview shows and populates text', shown, { hidden: false, text: 'G Major' });

  const hiddenAgain = await page.evaluate(() => {
    renderNextPreview(null);
    return {
      hidden: document.getElementById('nextPromptRow').classList.contains('hidden'),
      text: document.getElementById('nextPromptText').textContent,
    };
  });
  check('Next preview hides and clears text when passed null', hiddenAgain, { hidden: true, text: '' });

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

Run: `node test-band-hit-flourish.cjs`
Expected: all `PASS`, ending in `RESULT: PASS`.

- [ ] **Step 7: Commit**

```bash
git add script.js index.html style.css test-band-hit-flourish.cjs
git commit -m "Add hit-chime voice, hit-flash CSS, and Next-preview UI building blocks"
```

---

### Task 2: Core mechanics rewrite — persistent groove, instant advance

**Files:**
- Modify: `script.js:486-491` (state vars), `script.js:2218-2320` (`scheduleGrooveHit`, `onBeatTick`, `scheduleStep`, `startBandScheduler`, `stopBandScheduler`), `script.js:3129-3200` (`checkMidi`, `triggerBandSuccess`)
- Delete: `test-band-groove-transition.cjs` (tests a race-condition fix for temporary ride-out state that no longer exists)
- Modify: `test-band-groove-pattern.cjs`, `test-band-scheduler-core.cjs`, `test-band-toggle-live.cjs`, `test-band-scheduler-catchup.cjs`
- Rewrite: `test-band-trigger-flow.cjs`

**Interfaces:**
- Consumes: `playHitChime`, `renderNextPreview`, `nextPromptRow`/`nextPromptText` (Task 1); `getBeatsPerBar()`, `getBpm()`, `getAudioCtx()`, `playClick`/`playKick`/`playSnare`/`playHihat`/`playBandBass`/`playBandComp`, `GROOVE_PATTERNS`, `pulseBeat`, `generatePrompt`, `renderPrompt`, `promptCard`, `midiSuccessActive`, `MAX_RESPONSE_MS`, `responseTimes`, `recordAdaptiveResult`, `updateDailyLog`, `showResponseTime`, `updateMidiStats`, `updateStreakDisplay`, `scaleNotesPlayed`, `updateHearBtn`, `clearHold`, `historyIndex`, `addToHistory`, `updateBackBtn`, `sessionInterval`, `sessionPromptCount`, `checkSessionGoal` (all existing).
- Produces: `bandChordPcs` (global, `Array<number> | null` — pitch classes of the last correctly-answered chord; persists across the whole Band Mode session, never cleared except on teardown). `nextPromptObj` (global, prompt object or `null` — the pre-generated "up next" prompt). `advanceToNextPrompt()` (function — promotes `nextPromptObj` to the current prompt and generates a fresh one). Removes `rideOutActive` and `rideOutChordPcs` entirely.

- [ ] **Step 1: Replace the ride-out state variables**

In `script.js`, lines 486-491 currently read:

```javascript
let bandActive       = false;  // true while the lookahead scheduler (not setInterval) drives the click
let bandSchedulerId  = null;
let nextStepTime     = 0;      // audioCtx time of the next unscheduled eighth-note step
let stepIndex        = 0;      // eighth-note step counter, wraps at (beatsPerBar * 2)
let rideOutActive    = false;  // true while playing the post-correct-answer groove (wired in Task 5)
let rideOutChordPcs  = null;   // pitch classes of the chord being ridden out (wired in Task 5)
```

Replace with:

```javascript
let bandActive       = false;  // true while the lookahead scheduler (not setInterval) drives the click
let bandSchedulerId  = null;
let nextStepTime     = 0;      // audioCtx time of the next unscheduled eighth-note step
let stepIndex        = 0;      // eighth-note step counter, wraps at (beatsPerBar * 2)
let bandChordPcs     = null;   // pitch classes of the last correctly-answered chord; persists all session
let nextPromptObj    = null;   // pre-generated "up next" prompt, always one step ahead of currentPromptKey
```

- [ ] **Step 2: Update `scheduleGrooveHit` — drums always play, only bass/comp need a chord**

In `script.js`, `scheduleGrooveHit` (lines 2218-2232) currently reads:

```javascript
function scheduleGrooveHit(localStep, time, beatsPerBar) {
  if (!rideOutActive) return;
  const pattern = GROOVE_PATTERNS[beatsPerBar] || GROOVE_PATTERNS[4];

  if (pattern.hihat.includes(localStep)) playHihat(time);
  if (pattern.kick.includes(localStep))  playKick(time);
  if (pattern.snare.includes(localStep)) playSnare(time);

  if (!rideOutChordPcs) return;
  if (pattern.bass.includes(localStep)) playBandBass(rideOutChordPcs[0], time);
  if (pattern.comp.includes(localStep)) {
    const compPcs = rideOutChordPcs.length > 1 ? rideOutChordPcs.slice(1) : rideOutChordPcs;
    playBandComp(compPcs, time);
  }
}
```

Replace with:

```javascript
function scheduleGrooveHit(localStep, time, beatsPerBar) {
  const pattern = GROOVE_PATTERNS[beatsPerBar] || GROOVE_PATTERNS[4];

  // Drums always play once the scheduler is running -- the band never stops,
  // even before the first correct answer of a session (rhythm only, no harmony yet).
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

- [ ] **Step 3: Simplify `onBeatTick` — no more bar-counting reveal logic**

In `script.js`, `onBeatTick` (lines 2234-2248) currently reads:

```javascript
function onBeatTick(beatNum) {
  metroBeat = beatNum;
  pulseBeat(beatNum === 0);
  metroCount++;
  if (metroCount >= getBeatsPerChange()) {
    metroCount = 0;
    if (rideOutActive) {
      rideOutActive   = false;
      rideOutChordPcs = null;
      promptCard.classList.remove('midi-success');
      midiSuccessActive = false;
    }
    advancePromptOnSchedule();
  }
}
```

Replace with:

```javascript
function onBeatTick(beatNum) {
  metroBeat = beatNum;
  pulseBeat(beatNum === 0);
}
```

The prompt no longer advances on a bar-count boundary at all — advancing now happens the instant a correct answer registers (Step 6, in `checkMidi`/`triggerBandSuccess`). `metroCount`/`getBeatsPerChange()` are untouched elsewhere — they still drive the separate, unmodified non-Band-Mode `metroTick()` path.

- [ ] **Step 4: Remove the now-obsolete pickup-note scheduling from `scheduleStep`**

In `script.js`, `scheduleStep` (lines 2250-2274) currently reads:

```javascript
function scheduleStep(step, time) {
  const beatsPerBar = getBeatsPerBar();
  const localStep   = step % (beatsPerBar * 2);

  if (localStep % 2 === 0) {
    playClick(localStep === 0, time);
    const delayMs = Math.max(0, (time - getAudioCtx().currentTime) * 1000);
    setTimeout(() => onBeatTick(localStep / 2), delayMs);

    // If this on-beat is the ride-out's final beat, onBeatTick's boundary check
    // (above) will clear rideOutActive at this beat's own audio time — but the
    // lookahead loop wouldn't otherwise reach the *next* (off-beat) step until
    // roughly half a beat later, well after that clearing already happened,
    // silently dropping the pickup note leading into the next bar/chord.
    // Schedule it eagerly, right now, while rideOutActive/rideOutChordPcs are
    // still valid.
    if (rideOutActive && metroCount + 1 >= getBeatsPerChange()) {
      const secondsPerBeat = 60 / getBpm();
      const nextLocalStep  = (localStep + 1) % (beatsPerBar * 2);
      scheduleGrooveHit(nextLocalStep, time + secondsPerBeat / 2, beatsPerBar);
    }
  }

  scheduleGrooveHit(localStep, time, beatsPerBar);
}
```

Replace with:

```javascript
function scheduleStep(step, time) {
  const beatsPerBar = getBeatsPerBar();
  const localStep   = step % (beatsPerBar * 2);

  if (localStep % 2 === 0) {
    playClick(localStep === 0, time);
    const delayMs = Math.max(0, (time - getAudioCtx().currentTime) * 1000);
    setTimeout(() => onBeatTick(localStep / 2), delayMs);
  }

  scheduleGrooveHit(localStep, time, beatsPerBar);
}
```

(That block existed to avoid dropping a note right when `rideOutActive` got cleared at a boundary. `bandChordPcs` is never transiently cleared mid-session — only replaced instantly, or cleared entirely on teardown — so that race no longer exists.)

- [ ] **Step 5: Update `startBandScheduler`/`stopBandScheduler` and add `advanceToNextPrompt`**

In `script.js`, these two functions (lines 2298-2320) currently read:

```javascript
function startBandScheduler() {
  const ctx = getAudioCtx();
  stepIndex       = 0;
  metroBeat       = 0;
  metroCount      = 0;
  rideOutActive   = false;
  rideOutChordPcs = null;
  nextStepTime    = ctx.currentTime + 0.05;
  bandActive      = true;
  bandSchedulerId = setInterval(bandSchedulerTick, SCHEDULER_INTERVAL_MS);
  syncWakeLock();
}

function stopBandScheduler() {
  clearInterval(bandSchedulerId);
  bandSchedulerId = null;
  bandActive      = false;
  rideOutActive   = false;
  rideOutChordPcs = null;
  promptCard.classList.remove('midi-success');
  midiSuccessActive = false;
  syncWakeLock();
}
```

Replace with:

```javascript
function advanceToNextPrompt() {
  const prompt = nextPromptObj || generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
  clearHold();
  historyIndex = 0;
  addToHistory(prompt);
  updateBackBtn();
  if (sessionInterval) { sessionPromptCount++; checkSessionGoal(); }
  renderPrompt(prompt);

  nextPromptObj = generatePrompt();
  renderNextPreview(nextPromptObj);
}

function startBandScheduler() {
  const ctx = getAudioCtx();
  stepIndex       = 0;
  metroBeat       = 0;
  bandChordPcs    = null;
  nextStepTime    = ctx.currentTime + 0.05;
  bandActive      = true;
  bandSchedulerId = setInterval(bandSchedulerTick, SCHEDULER_INTERVAL_MS);
  nextPromptObj   = generatePrompt();
  renderNextPreview(nextPromptObj);
  syncWakeLock();
}

function stopBandScheduler() {
  clearInterval(bandSchedulerId);
  bandSchedulerId = null;
  bandActive      = false;
  bandChordPcs    = null;
  nextPromptObj   = null;
  renderNextPreview(null);
  promptCard.classList.remove('midi-success');
  promptCard.classList.remove('band-hit-flash');
  midiSuccessActive = false;
  syncWakeLock();
}
```

(`metroCount = 0` is dropped from `startBandScheduler` — it's no longer read anywhere in the Band Mode path after Step 3, only by the separate non-Band-Mode `metroTick()`, so resetting it here would be a vestigial no-op. `advanceToNextPrompt` is placed here, immediately before the two functions that need it conceptually adjacent, matching this section's "Band Mode scheduler" grouping.)

- [ ] **Step 6: Rewire `checkMidi`/`triggerBandSuccess` for instant, any-type advance**

In `script.js`, `checkMidi`'s match-routing line (inside the function, currently) reads:

```javascript
  if (matched) {
    if (bandActive && expected.type === 'chord') {
      triggerBandSuccess(expected);
    } else {
      triggerMidiSuccess();
    }
  }
```

Replace with:

```javascript
  if (matched) {
    if (bandActive) {
      triggerBandSuccess(expected);
    } else {
      triggerMidiSuccess();
    }
  }
```

(Every correct answer gets the instant Now/Next/flourish treatment while Band Mode is engaged, not just chords — only the band's *harmony* stays chord-specific, per the spec's scope section.)

Then, `triggerBandSuccess` currently reads:

```javascript
function triggerBandSuccess(expected) {
  midiSuccessActive = true;
  if (promptStartTime) {
    const ms = Date.now() - promptStartTime;
    if (ms <= MAX_RESPONSE_MS) {
      responseTimes.push(ms);
      recordAdaptiveResult(currentPromptKey, ms);
      updateDailyLog(ms);
      showResponseTime(ms);
      updateMidiStats();
      updateStreakDisplay();
    }
  }
  promptCard.classList.add('midi-success');
  rideOutActive   = true;
  rideOutChordPcs = expected.pcs.slice();
}
```

Replace with:

```javascript
function triggerBandSuccess(expected) {
  midiSuccessActive = true;
  if (promptStartTime) {
    const ms = Date.now() - promptStartTime;
    if (ms <= MAX_RESPONSE_MS) {
      responseTimes.push(ms);
      recordAdaptiveResult(currentPromptKey, ms);
      updateDailyLog(ms);
      showResponseTime(ms);
      updateMidiStats();
      updateStreakDisplay();
    }
  }

  if (expected.type === 'chord') {
    bandChordPcs = expected.pcs.slice();
  }

  playHitChime(getAudioCtx().currentTime);
  promptCard.classList.add('band-hit-flash');
  setTimeout(() => promptCard.classList.remove('band-hit-flash'), 250);

  advanceToNextPrompt();
  midiSuccessActive = false;
}
```

- [ ] **Step 7: Delete the now-obsolete race-condition test**

```bash
rm test-band-groove-transition.cjs
```

That test exercised a fix for a race between the ride-out's temporary state clearing and a trailing note. `bandChordPcs` is never transiently cleared mid-session, so the race no longer exists.

- [ ] **Step 8: Fix `test-band-groove-pattern.cjs`**

The `page.evaluate` block currently reads:

```javascript
  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // Inactive ride-out: dispatch should be a no-op (no throw either way).
      rideOutActive = false;
      scheduleGrooveHit(0, t, 4);

      // Active ride-out with a C major chord (pcs [0, 4, 7]).
      rideOutActive   = true;
      rideOutChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (per GROOVE_PATTERNS[4])
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + comp
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat

      rideOutActive   = false;
      rideOutChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('scheduleGrooveHit runs without throwing (active and inactive)', result.threw, false);
```

Replace with:

```javascript
  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // No chord confirmed yet: drums still fire (band is never silent), bass/comp don't.
      bandChordPcs = null;
      scheduleGrooveHit(0, t, 4);

      // Confirmed C major chord (pcs [0, 4, 7]): drums + bass/comp all fire.
      bandChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (per GROOVE_PATTERNS[4])
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + comp
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat

      bandChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('scheduleGrooveHit runs without throwing (with and without a confirmed chord)', result.threw, false);
```

The `GROOVE_PATTERNS` shape checks below are unchanged.

- [ ] **Step 9: Fix `test-band-scheduler-core.cjs`**

The section from `const keyBefore` through the `metroCount`-based checks currently reads (lines 39-61):

```javascript
  const keyBefore = await page.evaluate(() => currentPromptKey);

  // At BPM 300 and Whole note (4 beats), one bar is 4 * 60/300 = 0.8s. Wait for it to elapse.
  await page.waitForTimeout(1500);

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt key changed after one bar elapsed', keyAfter !== keyBefore, true);

  // Manual "Next" (showPrompt()) while Band Mode is running must NOT tear down and
  // restart the scheduler — it should just reset the beat/change counters in place,
  // the same way the old setInterval path's `else` branch does.
  const result = await page.evaluate(() => {
    metroCount = 2; // simulate partway through a change
    const bandSchedulerIdBefore = bandSchedulerId;
    showPrompt();
    return {
      bandSchedulerIdSame: bandSchedulerId === bandSchedulerIdBefore,
      bandActiveStillTrue: bandActive === true,
      metroCount: metroCount,
    };
  });
  check('showPrompt() does not tear down/recreate the running scheduler', result.bandSchedulerIdSame && result.bandActiveStillTrue, true);
  check('showPrompt() resets metroCount in place', result.metroCount, 0);
```

Replace with:

```javascript
  const keyBefore = await page.evaluate(() => currentPromptKey);

  // With no correct answer ever given, the prompt no longer auto-advances at
  // all -- advancing now only happens from a correct answer (checkMidi), not
  // from the beat scheduler counting bars. Waiting doesn't change anything.
  await page.waitForTimeout(1500);

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt does NOT auto-advance without ever answering correctly', keyAfter, keyBefore);

  // Manual "Next" (showPrompt()) while Band Mode is running must NOT tear down and
  // restart the scheduler — it should just reset the beat position in place, the
  // same way the old setInterval path's `else` branch does.
  const result = await page.evaluate(() => {
    const bandSchedulerIdBefore = bandSchedulerId;
    showPrompt();
    return {
      bandSchedulerIdSame: bandSchedulerId === bandSchedulerIdBefore,
      bandActiveStillTrue: bandActive === true,
    };
  });
  check('showPrompt() does not tear down/recreate the running scheduler', result.bandSchedulerIdSame && result.bandActiveStillTrue, true);
```

- [ ] **Step 10: Fix `test-band-scheduler-catchup.cjs`**

The setup's inline comment and the final state-consistency section need updating for the renamed variable. The setup currently reads (around line 43):

```javascript
    heldNotes = new Set([60, 64, 67]);
    checkMidi(); // triggerBandSuccess sets rideOutActive/rideOutChordPcs immediately
  });
```

Replace with:

```javascript
    heldNotes = new Set([60, 64, 67]);
    checkMidi(); // triggerBandSuccess sets bandChordPcs and advances the prompt immediately
  });
```

The final section currently reads:

```javascript
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
  const after = await page.evaluate(() => ({
    metroCount,
    beatsPerChange: getBeatsPerChange(),
    rideOutActive,
    midiSuccessActive,
  }));
  check('metroCount stayed within a sane range (not corrupted by the capped burst)', after.metroCount < after.beatsPerChange * 2, true);
  check('rideOutActive/midiSuccessActive stayed consistent with each other', after.rideOutActive, after.midiSuccessActive);
```

Replace with:

```javascript
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
  const after = await page.evaluate(() => ({
    bandChordPcsSet: bandChordPcs !== null,
    midiSuccessActive,
  }));
  check('bandChordPcs was set by the earlier correct answer and the capped burst did not corrupt it', after.bandChordPcsSet, true);
  check('midiSuccessActive is not left stuck true by the capped burst', after.midiSuccessActive, false);
```

(Under the new model, `checkMidi()` in the setup already advances the prompt and clears `midiSuccessActive` synchronously — there's no more multi-bar "ride-out in progress" window for a burst to interfere with, so this test now only needs to confirm the capped burst didn't leave anything in a broken state.)

- [ ] **Step 11: Fix `test-band-toggle-live.cjs`'s ride-out-interrupt section**

The section from the `// ── Fix 1 regression ──` comment through the end currently reads (lines 74-122):

```javascript
  // ── Fix 1 regression: unchecking Band Mode mid-ride-out must not leave
  // midiSuccessActive stuck true (and must not permanently kill MIDI detection). ──
  await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    metroBpmInput.value = '120'; // slow bar (2s) so we have time to interrupt the ride-out
    document.getElementById('metroNoteDuration').value = '4'; // whole note = 4 beats/bar
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.querySelector('input[name="timer"][value="metronome"]').click();
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) to force a correct chord answer.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const rideOutState = await page.evaluate(() => ({ rideOutActive, midiSuccessActive }));
  check('ride-out engaged before interrupting Band Mode', rideOutState.rideOutActive && rideOutState.midiSuccessActive, true);

  // Uncheck Band Mode WHILE the ride-out is still in progress (well before the 2s bar ends).
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(50);

  const afterInterrupt = await page.evaluate(() => ({ midiSuccessActive, rideOutActive }));
  check('midiSuccessActive is cleared when scheduler is torn down mid-ride-out', afterInterrupt.midiSuccessActive, false);

  // Prove MIDI answer detection is not permanently dead: simulate another correct answer.
  await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const detectionRevived = await page.evaluate(() => midiSuccessActive);
  check('MIDI answer detection works again after Band Mode is unchecked mid-ride-out', detectionRevived, true);

  check('no uncaught page errors during the whole test', errors.length, 0);
  if (errors.length) console.log('Errors seen:', errors);
```

Under the new model there's no multi-bar "ride-out in progress" window to interrupt — a correct answer resolves instantly. Replace the whole section with a check that Band Mode's core teardown contract (clearing `bandChordPcs` and `midiSuccessActive`, and not leaving detection dead) still holds, and that turning Band Mode off then correctly falls back to the non-Band 700ms path:

```javascript
  // Band Mode teardown must not leave midiSuccessActive stuck true (which would
  // permanently kill MIDI detection), and bandChordPcs must clear on teardown.
  await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    document.querySelector('input[name="timer"][value="metronome"]').click();
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) to force a correct chord answer.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const afterAnswer = await page.evaluate(() => ({
    bandChordPcsSet: bandChordPcs !== null,
    midiSuccessActive,
  }));
  check('bandChordPcs is set and midiSuccessActive is released right after answering (instant advance)', afterAnswer, { bandChordPcsSet: true, midiSuccessActive: false });

  // Turn Band Mode off entirely.
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(50);

  const afterTeardown = await page.evaluate(() => ({
    bandChordPcs,
    midiSuccessActive,
  }));
  check('bandChordPcs is cleared on teardown', afterTeardown.bandChordPcs, null);
  check('midiSuccessActive stays false after teardown', afterTeardown.midiSuccessActive, false);

  // Prove MIDI answer detection is not dead: simulate another correct answer,
  // now on the non-Band-Mode 700ms path.
  await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const detectionRevived = await page.evaluate(() => midiSuccessActive);
  check('MIDI answer detection works again after Band Mode is turned off', detectionRevived, true);

  check('no uncaught page errors during the whole test', errors.length, 0);
  if (errors.length) console.log('Errors seen:', errors);
```

- [ ] **Step 12: Rewrite `test-band-trigger-flow.cjs`**

The old model (ride out, then advance at a bar boundary) is gone; this test needs to prove instant advance instead. Replace the entire file with:

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

  // ── Band Mode ON: correct chord should advance instantly, update bandChordPcs,
  // and roll the Next preview forward ──
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.querySelector('input[name="timer"][value="metronome"]').click();
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    // Force a known C major prompt so the correct notes are predictable.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const before = await page.evaluate(() => ({
    promptStartTime,
    nextBefore: nextPromptObj ? nextPromptObj.key : null,
    bandChordPcs,
  }));
  check('bandChordPcs is null before any correct answer', before.bandChordPcs, null);
  check('a Next prompt was already pre-generated', before.nextBefore !== null, true);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) via the MIDI path.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  const after = await page.evaluate(() => ({
    currentPromptKey,
    promptStartTime,
    bandChordPcs,
    midiSuccessActive,
    nextPromptObjExists: nextPromptObj !== null,
  }));
  check('prompt advanced instantly (currentPromptKey became the pre-generated Next)', after.currentPromptKey, before.nextBefore);
  check('promptStartTime updated (a real advance happened)', after.promptStartTime !== before.promptStartTime, true);
  check('bandChordPcs was set to the answered chord', after.bandChordPcs, [0, 4, 7]);
  check('midiSuccessActive is released immediately, not held', after.midiSuccessActive, false);
  check('a fresh Next prompt was generated', after.nextPromptObjExists, true);

  // ── Non-chord correct answer: still advances instantly, but must not touch bandChordPcs ──
  await page.evaluate(() => {
    document.getElementById('catIntervals').checked = true;
    document.getElementById('intMaj3').checked = true;
    document.getElementById('intDirUp').checked = true;
    currentPromptKey = 'interval|Major 3rd|C|above';
    promptStartTime = Date.now();
  });
  const beforeInterval = await page.evaluate(() => ({ bandChordPcs, promptStartTime }));

  await page.evaluate(() => {
    heldNotes = new Set([60, 64]); // C, then E a major third above -- pcs 0 and 4
    checkMidi();
  });
  const afterInterval = await page.evaluate(() => ({ bandChordPcs, promptStartTime, midiSuccessActive }));
  check('a correct non-chord answer still advances instantly', afterInterval.promptStartTime !== beforeInterval.promptStartTime, true);
  check('a correct non-chord answer does not change bandChordPcs', afterInterval.bandChordPcs, beforeInterval.bandChordPcs);
  check('midiSuccessActive released after the non-chord advance too', afterInterval.midiSuccessActive, false);

  // ── Band Mode OFF: correct chord should advance via the original 700ms path (regression) ──
  await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('catIntervals').checked = false;
    stopBandScheduler();
    stopMetronome();
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const bandActiveOff = await page.evaluate(() => bandActive);
  check('bandActive is false after Band Mode is turned off', bandActiveOff, false);

  const startTimeBefore2 = await page.evaluate(() => promptStartTime);

  await page.evaluate(() => {
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  await page.waitForTimeout(50);
  const stateRightAfter2 = await page.evaluate(() => ({ promptStartTime, midiSuccessActive }));
  check('Band Mode off: prompt has not advanced yet at 50ms (still on the 700ms path)', stateRightAfter2.promptStartTime, startTimeBefore2);
  check('Band Mode off: success guard held during the 700ms wait', stateRightAfter2.midiSuccessActive, true);

  await page.waitForTimeout(900); // triggerMidiSuccess advances after a fixed 700ms
  const startTimeAfter2 = await page.evaluate(() => promptStartTime);
  check('Band Mode off: prompt still advances via the original 700ms path', startTimeAfter2 !== startTimeBefore2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 13: Run all seven touched/remaining test files**

```bash
node test-band-groove-pattern.cjs
node test-band-scheduler-core.cjs
node test-band-scheduler-catchup.cjs
node test-band-toggle-live.cjs
node test-band-trigger-flow.cjs
node test-band-hit-flourish.cjs
node test-band-percussion.cjs
```

Expected: all seven print only `PASS` lines and end with `RESULT: PASS`.

- [ ] **Step 14: Commit**

```bash
git add script.js test-band-groove-pattern.cjs test-band-scheduler-core.cjs test-band-scheduler-catchup.cjs test-band-toggle-live.cjs test-band-trigger-flow.cjs
git rm test-band-groove-transition.cjs
git commit -m "Rework Band Mode to an always-on groove with instant Now/Next advance"
```

---

### Task 3: Eligibility simplification and full regression sweep

**Files:**
- Modify: `script.js:2141-2143` (`bandModeEligible`), `script.js:2171` (`startMetronome`'s condition), `script.js:2426-2428` (`syncUI`'s disabling logic)
- Modify: `index.html:248-251` (remove the hint text)
- Modify: `style.css` (remove now-dead `.band-mode-row.disabled`/`.band-mode-note` rules)
- Rewrite: `test-band-mode-toggle.cjs`
- Modify: `test-band-e2e.cjs`

**Interfaces:**
- Consumes: everything produced by Tasks 1-2.

`Change every`/time signature no longer gate anything about Band Mode — the reveal-timing concept that needed a bar-aligned cadence is gone (Task 2). Band Mode should simply be available whenever Metronome timer mode and MIDI are both on.

- [ ] **Step 1: Remove the eligibility check from `startMetronome`**

In `script.js`, `startMetronome`'s Band Mode branch currently reads:

```javascript
  if (bandModeToggle.checked && bandModeEligible() && midiEnabled) {
    startBandScheduler();
    return;
  }
```

Replace with:

```javascript
  if (bandModeToggle.checked && midiEnabled) {
    startBandScheduler();
    return;
  }
```

- [ ] **Step 2: Remove `bandModeEligible()` and its use in `syncUI`**

In `script.js`, `bandModeEligible()` (lines 2141-2143) currently reads:

```javascript
function bandModeEligible() {
  return getBeatsPerChange() >= getBeatsPerBar();
}
```

Delete this function entirely (it has no remaining callers after Step 1 and this step).

Then, in `syncUI()`, the trailing block currently reads:

```javascript
  const bandEligible = bandModeEligible();
  bandModeRow.classList.toggle('disabled', !bandEligible);
  bandModeToggle.disabled = !bandEligible;
}
```

Delete these three lines (leaving `syncUI()`'s closing `}` from the line above it, the `metroPanel.classList.toggle(...)` line).

- [ ] **Step 3: Remove the eligibility hint text from the HTML**

In `index.html`, the Band Mode row currently reads:

```html
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode <em class="band-mode-note">(needs Whole note or 2 bars)</em></span>
                </label>
```

Replace with:

```html
                <label class="adaptive-row band-mode-row" id="bandModeRow">
                  <input type="checkbox" id="bandModeToggle">
                  <span>Band Mode</span>
                </label>
```

- [ ] **Step 4: Remove the now-dead CSS**

In `style.css`, these rules currently exist:

```css
.band-mode-row.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.band-mode-note {
  font-style: normal;
  font-size: 0.75rem;
  color: var(--text-muted);
}
```

Delete both rules. Leave `.band-mode-row { margin-bottom: 0; }` in place — it still lays out the row.

- [ ] **Step 5: Rewrite `test-band-mode-toggle.cjs`**

The eligibility-disabling checks no longer apply — the toggle should now always be enabled. Replace the entire file with:

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
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  await page.evaluate(() => {
    document.querySelector('input[name="timer"][value="metronome"]').click();
  });
  await page.waitForTimeout(100);

  // Band Mode is never disabled anymore, regardless of "Change every" or time signature.
  for (const noteDuration of ['4', '2', '1', '8']) {
    const state = await page.evaluate((val) => {
      const sel = document.getElementById('metroNoteDuration');
      sel.value = val;
      sel.dispatchEvent(new Event('change'));
      return {
        rowDisabled: document.getElementById('bandModeRow').classList.contains('disabled'),
        inputDisabled: document.getElementById('bandModeToggle').disabled,
      };
    }, noteDuration);
    check(`Change-every "${noteDuration}": row not disabled`, state.rowDisabled, false);
    check(`Change-every "${noteDuration}": input not disabled`, state.inputDisabled, false);
  }

  for (const timeSig of ['4', '3', '5']) {
    const rowDisabled = await page.evaluate((sig) => {
      const sel = document.getElementById('metroTimeSig');
      sel.value = sig;
      sel.dispatchEvent(new Event('change'));
      return document.getElementById('bandModeRow').classList.contains('disabled');
    }, timeSig);
    check(`Time sig ${timeSig}/4: row not disabled`, rowDisabled, false);
  }

  // Toggle persists across reload
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(100);
  await page.reload();
  await page.waitForTimeout(300);
  const persisted = await page.evaluate(() => document.getElementById('bandModeToggle').checked);
  check('toggle persists across reload', persisted, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 6: Update `test-band-e2e.cjs`**

The loop currently sets `metroNoteDuration` to `'8'` specifically "so eligibility holds regardless of time signature" and asserts on `currentPromptKey` differing (a flakiness-prone signal with a narrow chord pool — see the file's own history). Since eligibility no longer depends on this setting at all, and advance is now instant (no bar-length wait needed), replace the entire loop body and its setup comment:

```javascript
  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      // "2 bars" (beatsPerChange = 8) so eligibility (beatsPerChange >= beatsPerBar) holds
      // for every tested time signature, including 5/4.
      document.getElementById('metroNoteDuration').value = '8';
      document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const before = await page.evaluate(() => currentPromptKey);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    // 8 beats @ 300bpm = 1.6s worst case (answered right at the top of the cycle); pad generously
    // for headless-browser/scheduler-housekeeping overhead on top of that.
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => currentPromptKey);
    check(`time sig ${timeSig}/4: prompt advances after ride-out`, after !== before, true);
  }
```

with:

```javascript
  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const before = await page.evaluate(() => promptStartTime);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    await page.waitForTimeout(50); // advance is instant now -- no bar-length wait needed
    const after = await page.evaluate(() => promptStartTime);
    check(`time sig ${timeSig}/4: prompt advances instantly after a correct answer`, after !== before, true);
  }
```

- [ ] **Step 7: Run the full suite**

```bash
node test-band-mode-toggle.cjs
node test-band-scheduler-core.cjs
node test-band-percussion.cjs
node test-band-groove-pattern.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-e2e.cjs
node test-band-scheduler-catchup.cjs
node test-band-hit-flourish.cjs
```

Expected: every file prints only `PASS` lines and ends with `RESULT: PASS`. (`test-band-groove-transition.cjs` no longer exists, per Task 2 Step 7, and is correctly absent from this list.)

- [ ] **Step 8: Commit**

```bash
git add script.js index.html style.css test-band-mode-toggle.cjs test-band-e2e.cjs
git commit -m "Simplify Band Mode eligibility -- available whenever Metronome + MIDI are on"
```

- [ ] **Step 9: Note the manual-listening gap**

As with every prior pass on this feature, no MIDI/audio hardware is available in this environment — every check above proves the state machine, scheduling, and UI wiring are correct, not that the result actually sounds and feels like the Guitar Hero/Rocksmith quality the user asked for. Say so plainly in your final report: this rework needs a real listen-and-play-through before being considered done.

---

## Self-Review Notes

- **Spec coverage:** Now/Next/band-plays-last-win core loop (Task 2 Steps 5-6), always-on drums (Task 2 Step 2), instant no-quantization advance (Task 2 Step 6), hit-flourish sound+visual (Task 1, wired in Task 2 Step 6), rhythm-only-before-first-answer (Task 2 Step 2's `bandChordPcs` null-guard), scope (chord types feed harmony, all types get Now/Next/flourish — Task 2 Step 6), eligibility simplification (Task 3) — all covered.
- **Placeholder scan:** every step has complete, runnable code; no TBD/TODO.
- **Type/name consistency checked:** `bandChordPcs`, `nextPromptObj`, `advanceToNextPrompt()`, `renderNextPreview()`, `playHitChime()`, `nextPromptRow`/`nextPromptText` are spelled identically everywhere they're introduced (Task 1-2) and consumed (Task 2-3). `rideOutActive`/`rideOutChordPcs`/`bandModeEligible` do not appear anywhere after their respective removal steps — confirmed by re-reading every remaining test file's planned content above.
- **Cross-task risk called out explicitly:** Task 2 Step 6's routing change (`bandActive` alone, not `bandActive && expected.type === 'chord'`) is a deliberate, spec-mandated behavior change — flagged here so a reviewer doesn't mistake it for scope creep.
