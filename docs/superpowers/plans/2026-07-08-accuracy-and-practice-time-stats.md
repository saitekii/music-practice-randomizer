# Accuracy and Practice Time Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "first-try accuracy" and "practice time" to the Practice stats page header row, by tracking two new signals that are already almost computed today (whether a wrong note was ever held before the correct answer, and the sum of already-filtered response times) but currently discarded.

**Architecture:** A new module-level flag (`promptHadWrongNote`) captures a signal `updateKeyboard()` already computes live but doesn't persist. `updateDailyLog()` gains two new per-day fields fed by that flag and by summing the same `ms` value it already uses for `avgMs`. `renderStats()`'s header row reads the new fields to render two new aggregate numbers.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`.
- Applies only to the main MIDI-based Practice stats (`renderStats()`) — Ear Training's stats tab (`renderEarStats()`) and its daily-log fields (`earAnswers`/`earAvgMs`) are untouched.
- Applies uniformly to every Practice prompt type (chords, scales, notes, intervals, etc.) — no per-type scoping.
- The daily log stays capped at 30 days (existing `while (log.length > 30) log.shift()` truncation, unchanged) — "practice time" and "first-try accuracy" are 30-day aggregates, not unbounded lifetime totals.
- First-try accuracy is computed as `sum(firstTryCount) / sum(answers)` across the full 30-day log, not a single day's number.
- Practice time is shown in minutes for both today and the 30-day total — no switching to hours.
- No changes to the 14-day response-time chart, the per-root/per-type mastery bars, the calendar, the weak-spots panel, or the explicit "Practice session" countdown timer feature (`sessionInterval`/`sessionGoal`).
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Track first-try accuracy and practice time in the daily log

**Files:**
- Modify: `script.js:524` (state variable declaration block, add `promptHadWrongNote`)
- Modify: `script.js:655-678` (`updateDailyLog`)
- Modify: `script.js:2151-2162` (`showPrompt`) and `script.js:2414-2429` (`advanceToNextPrompt`) — reset the new flag
- Modify: `script.js:3422-3438` (`updateKeyboard`) — set the new flag
- Modify: `script.js:3310-3329` (`triggerMidiSuccess`) and `script.js:3331-3354` (`triggerBandSuccess`) — pass the flag through
- Test: `test-stats-accuracy-practice-time.cjs`

**Interfaces:**
- Consumes: `heldNotes`, `isNoteWrong`, `getExpectedPCs`, `keyElements` (all unchanged), `MAX_RESPONSE_MS` (unchanged).
- Produces: `promptHadWrongNote` (module-level `let`, boolean). `updateDailyLog(ms, isEar = false, firstTryCorrect = false)` — new third parameter; each day's log entry (for non-ear answers) gains `totalMs` (number, sum of response times) and `firstTryCount` (number, count of first-try-correct answers). Task 2 reads these two new fields from `loadDailyLog()`'s entries.

- [ ] **Step 1: Write the failing test**

Create `test-stats-accuracy-practice-time.cjs`:

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

  const directLog = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    updateDailyLog(1000, false, true);  // first-try correct, 1s
    updateDailyLog(2000, false, false); // wrong note played first, 2s
    updateDailyLog(500, false, true);   // first-try correct, 0.5s
    const log = JSON.parse(localStorage.getItem('mpr_daily'));
    return log[log.length - 1]; // today's entry
  });
  check('answers accumulated', directLog.answers, 3);
  check('totalMs sums all three response times', directLog.totalMs, 3500);
  check('firstTryCount counts only the two first-try-correct answers', directLog.firstTryCount, 2);

  const earUnaffected = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    updateDailyLog(1000, true); // ear-training answer -- isEar=true, firstTryCorrect defaults to false
    const log = JSON.parse(localStorage.getItem('mpr_daily'));
    const entry = log[log.length - 1];
    return {
      hasTotalMs: 'totalMs' in entry,
      hasFirstTryCount: 'firstTryCount' in entry,
      earAnswers: entry.earAnswers,
    };
  });
  check('ear-training answers do not get totalMs', earUnaffected.hasTotalMs, false);
  check('ear-training answers do not get firstTryCount', earUnaffected.hasFirstTryCount, false);
  check('ear-training answers still increment earAnswers as before', earUnaffected.earAnswers, 1);

  const behavior = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    midiEnabled = true;
    const results = {};

    // Prompt 1: play a wrong note, then correct it -- should log as NOT first-try.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;
    heldNotes = new Set([61]); // C#4 -- wrong note for C Major
    updateKeyboard(); // this is what should flip promptHadWrongNote to true
    heldNotes = new Set([60, 64, 67]); // now the correct C E G
    updateKeyboard();
    checkMidi();
    const log1 = JSON.parse(localStorage.getItem('mpr_daily'));
    results.wrongNoteFirstLogsAsNotFirstTry = log1[log1.length - 1].firstTryCount;

    // Prompt 2 (new prompt -- flag must reset): play the correct notes immediately.
    currentPromptKey = 'chord|D|Major|';
    promptStartTime = Date.now();
    promptHadWrongNote = false; // showPrompt()/advanceToNextPrompt() do this in the real flow
    midiSuccessActive = false;
    heldNotes = new Set([62, 66, 69]); // D F# A -- correct D Major, no mistakes
    updateKeyboard();
    checkMidi();
    const log2 = JSON.parse(localStorage.getItem('mpr_daily'));
    results.cleanFirstTryLogsAsFirstTry = log2[log2.length - 1].firstTryCount;

    return results;
  });
  check('a wrong note played before the correct answer is NOT counted as first-try', behavior.wrongNoteFirstLogsAsNotFirstTry, 1);
  check('a clean first-try answer brings the running firstTryCount to 2', behavior.cleanFirstTryLogsAsFirstTry, 2);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-accuracy-practice-time.cjs`
Expected: FAIL on every check (`updateDailyLog` doesn't accept a third argument or write `totalMs`/`firstTryCount` yet; `promptHadWrongNote` doesn't exist yet, causing a `ReferenceError` that shows up as a thrown/failed `page.evaluate`).

- [ ] **Step 3: Add the `promptHadWrongNote` state variable**

Current code (`script.js:524`):

```javascript
let promptStartTime = null;
```

Replace with:

```javascript
let promptStartTime    = null;
let promptHadWrongNote = false; // true once any wrong note is held during the current prompt
```

- [ ] **Step 4: Update `updateDailyLog`**

Current code (`script.js:655-678`):

```javascript
function updateDailyLog(ms, isEar = false) {
  const log   = loadDailyLog();
  const today = new Date().toISOString().slice(0, 10);
  const idx   = log.findIndex(e => e.date === today);
  if (idx >= 0) {
    const e = log[idx];
    if (isEar) {
      const ea = e.earAnswers ?? 0;
      e.earAvgMs  = Math.round(((e.earAvgMs ?? ms) * ea + ms) / (ea + 1));
      e.earAnswers = ea + 1;
    } else {
      e.avgMs  = Math.round((e.avgMs * e.answers + ms) / (e.answers + 1));
      e.answers++;
    }
  } else {
    if (isEar) {
      log.push({ date: today, answers: 0, avgMs: 0, earAnswers: 1, earAvgMs: ms });
    } else {
      log.push({ date: today, answers: 1, avgMs: ms });
    }
  }
  while (log.length > 30) log.shift();
  localStorage.setItem('mpr_daily', JSON.stringify(log));
}
```

Replace with:

```javascript
function updateDailyLog(ms, isEar = false, firstTryCorrect = false) {
  const log   = loadDailyLog();
  const today = new Date().toISOString().slice(0, 10);
  const idx   = log.findIndex(e => e.date === today);
  if (idx >= 0) {
    const e = log[idx];
    if (isEar) {
      const ea = e.earAnswers ?? 0;
      e.earAvgMs  = Math.round(((e.earAvgMs ?? ms) * ea + ms) / (ea + 1));
      e.earAnswers = ea + 1;
    } else {
      e.avgMs  = Math.round((e.avgMs * e.answers + ms) / (e.answers + 1));
      e.answers++;
      e.totalMs = (e.totalMs ?? 0) + ms;
      e.firstTryCount = (e.firstTryCount ?? 0) + (firstTryCorrect ? 1 : 0);
    }
  } else {
    if (isEar) {
      log.push({ date: today, answers: 0, avgMs: 0, earAnswers: 1, earAvgMs: ms });
    } else {
      log.push({ date: today, answers: 1, avgMs: ms, totalMs: ms, firstTryCount: firstTryCorrect ? 1 : 0 });
    }
  }
  while (log.length > 30) log.shift();
  localStorage.setItem('mpr_daily', JSON.stringify(log));
}
```

- [ ] **Step 5: Reset the flag when a new prompt begins**

Current code (`script.js:2151-2156`):

```javascript
function showPrompt() {
  const prompt = generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
```

Replace with:

```javascript
function showPrompt() {
  const prompt = generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
  promptHadWrongNote = false;
```

Current code (`script.js:2414-2419`):

```javascript
function advanceToNextPrompt() {
  const prompt = nextPromptObj || generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
```

Replace with:

```javascript
function advanceToNextPrompt() {
  const prompt = nextPromptObj || generatePrompt();
  currentPromptKey = prompt ? prompt.key : '';
  scaleNotesPlayed.clear();
  updateHearBtn();
  promptStartTime = Date.now();
  promptHadWrongNote = false;
```

- [ ] **Step 6: Set the flag in `updateKeyboard`**

Current code (`script.js:3422-3438`):

```javascript
function updateKeyboard() {
  const expected   = getExpectedPCs(currentPromptKey);
  const heldPCs    = new Set([...heldNotes].map(n => n % 12));
  const sortedHeld = [...heldNotes].sort((a, b) => a - b);
  const pcsSatisfied = expected?.type === 'chord' && expected.pcs.every(pc => heldPCs.has(pc));
  const wrongBass = expected?.type === 'chord' && expected.requiredBassPc != null
    && pcsSatisfied && sortedHeld.length > 0 && sortedHeld[0] % 12 !== expected.requiredBassPc;

  for (const [n, el] of keyElements) {
    const isHeld       = heldNotes.has(n) || demoNotes.has(n);
    const isWrong      = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    const isBassTarget = wrongBass && heldNotes.has(n) && n % 12 === expected.requiredBassPc;
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
    el.classList.toggle('bass-target', isBassTarget);
  }
}
```

Replace with:

```javascript
function updateKeyboard() {
  const expected   = getExpectedPCs(currentPromptKey);
  const heldPCs    = new Set([...heldNotes].map(n => n % 12));
  const sortedHeld = [...heldNotes].sort((a, b) => a - b);
  const pcsSatisfied = expected?.type === 'chord' && expected.pcs.every(pc => heldPCs.has(pc));
  const wrongBass = expected?.type === 'chord' && expected.requiredBassPc != null
    && pcsSatisfied && sortedHeld.length > 0 && sortedHeld[0] % 12 !== expected.requiredBassPc;

  for (const [n, el] of keyElements) {
    const isHeld       = heldNotes.has(n) || demoNotes.has(n);
    const isWrong      = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    const isBassTarget = wrongBass && heldNotes.has(n) && n % 12 === expected.requiredBassPc;
    if (isWrong) promptHadWrongNote = true;
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
    el.classList.toggle('bass-target', isBassTarget);
  }
}
```

- [ ] **Step 7: Pass the flag through at success time**

Current code (`script.js:3310-3329`):

```javascript
function triggerMidiSuccess() {
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
  setTimeout(() => {
    promptCard.classList.remove('midi-success');
    midiSuccessActive = false;
    showPrompt();
  }, 700);
}
```

Replace with:

```javascript
function triggerMidiSuccess() {
  midiSuccessActive = true;
  if (promptStartTime) {
    const ms = Date.now() - promptStartTime;
    if (ms <= MAX_RESPONSE_MS) {
      responseTimes.push(ms);
      recordAdaptiveResult(currentPromptKey, ms);
      updateDailyLog(ms, false, !promptHadWrongNote);
      showResponseTime(ms);
      updateMidiStats();
      updateStreakDisplay();
    }
  }
  promptCard.classList.add('midi-success');
  setTimeout(() => {
    promptCard.classList.remove('midi-success');
    midiSuccessActive = false;
    showPrompt();
  }, 700);
}
```

Current code (`script.js:3331-3354`):

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

Replace with:

```javascript
function triggerBandSuccess(expected) {
  midiSuccessActive = true;
  if (promptStartTime) {
    const ms = Date.now() - promptStartTime;
    if (ms <= MAX_RESPONSE_MS) {
      responseTimes.push(ms);
      recordAdaptiveResult(currentPromptKey, ms);
      updateDailyLog(ms, false, !promptHadWrongNote);
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

Note: `updateDailyLog(ms, false, !promptHadWrongNote)` reads `promptHadWrongNote` for the prompt that was JUST answered, before `showPrompt()`/`advanceToNextPrompt()` reset it to `false` for the next prompt — in `triggerMidiSuccess`, the reset happens later inside the 700ms `setTimeout` callback; in `triggerBandSuccess`, `advanceToNextPrompt()` (which resets it) is called after the `updateDailyLog` line. Both orderings are already correct as shown above — no further change needed beyond what's in this step.

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-stats-accuracy-practice-time.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 9: Commit**

```bash
git add script.js test-stats-accuracy-practice-time.cjs
git commit -m "Track first-try accuracy and total practice time in the daily log"
```

---

### Task 2: Display first-try accuracy and practice time in the stats header

**Files:**
- Modify: `script.js:786-816` (`renderStats`, the header row)
- Test: `test-stats-header-display.cjs`

**Interfaces:**
- Consumes: `loadDailyLog()`'s entries' `totalMs`/`firstTryCount` fields (Task 1), `totalAns` (already computed earlier in `renderStats`, unchanged), `todayEntry` (already computed earlier in `renderStats`, unchanged).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-stats-header-display.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const html = await page.evaluate(() => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const log = [
      { date: yesterday, answers: 4, avgMs: 2000, totalMs: 5 * 60000, firstTryCount: 2 },  // 5 min
      { date: today,     answers: 6, avgMs: 1500, totalMs: 12 * 60000, firstTryCount: 4 }, // 12 min
    ];
    localStorage.setItem('mpr_daily', JSON.stringify(log));
    return renderStats();
  });

  // 10 total answers, 6 first-try (2+4) -> 60% accuracy
  checkTrue('header shows 60% first-try accuracy', html.includes('60%'), 'expected "60%" somewhere in rendered HTML');
  checkTrue('header labels it "first-try accuracy"', html.includes('first-try accuracy'), null);
  // today = 12 min, 30-day total = 5 + 12 = 17 min
  checkTrue('header shows today\'s practice minutes (12 min)', html.includes('12 min'), null);
  checkTrue('header shows the 30-day practice total (17 min)', html.includes('17 min'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-header-display.cjs`
Expected: FAIL on all four `checkTrue` assertions (the header row doesn't render accuracy or practice-time numbers yet).

- [ ] **Step 3: Update the header row in `renderStats`**

Current code (`script.js:792, 798-816`) — note line 792 (`totalAns`) stays exactly where it is; only the block starting at the `streak` declaration changes:

```javascript
  const streak     = calcStreak();
  const headerHtml = `<div class="stats-header-row">
    <div class="stats-header-stat">
      <span class="stats-header-num">${totalAns}</span>
      <span class="stats-header-lbl">answers (30 days)</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${log.length}</span>
      <span class="stats-header-lbl">days practiced</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayEntry ? todayEntry.answers : 0}</span>
      <span class="stats-header-lbl">today</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${streak}</span>
      <span class="stats-header-lbl">day streak</span>
    </div>
  </div>`;
```

Replace with:

```javascript
  const totalFirstTry   = log.reduce((s, e) => s + (e.firstTryCount ?? 0), 0);
  const accuracyPct     = totalAns > 0 ? Math.round(totalFirstTry / totalAns * 100) : null;
  const totalPracticeMs = log.reduce((s, e) => s + (e.totalMs ?? 0), 0);
  const todayPracticeMin = Math.round((todayEntry?.totalMs ?? 0) / 60000);
  const totalPracticeMin = Math.round(totalPracticeMs / 60000);

  const streak     = calcStreak();
  const headerHtml = `<div class="stats-header-row">
    <div class="stats-header-stat">
      <span class="stats-header-num">${totalAns}</span>
      <span class="stats-header-lbl">answers (30 days)</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${log.length}</span>
      <span class="stats-header-lbl">days practiced</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayEntry ? todayEntry.answers : 0}</span>
      <span class="stats-header-lbl">today</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${streak}</span>
      <span class="stats-header-lbl">day streak</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${accuracyPct !== null ? accuracyPct + '%' : '—'}</span>
      <span class="stats-header-lbl">first-try accuracy</span>
    </div>
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayPracticeMin} min</span>
      <span class="stats-header-lbl">today · ${totalPracticeMin} min (30 days)</span>
    </div>
  </div>`;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-stats-header-display.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Run the full regression sweep**

```bash
node test-stats-accuracy-practice-time.cjs
node test-stats-header-display.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-scheduler-core.cjs
node test-band-scheduler-catchup.cjs
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
```

Expected: `RESULT: PASS` on all eight. The `test-band-*` and `test-chord-inversion-*` tests are included because they all trigger `updateDailyLog`/`triggerMidiSuccess`/`triggerBandSuccess`/`updateKeyboard` as part of simulating correct answers — this confirms the new third parameter and the new `promptHadWrongNote` flag don't break any existing flow (all these tests supply `heldNotes` that already match the expected pitch classes on the first and only `updateKeyboard()` call before `checkMidi()`, so `promptHadWrongNote` stays `false` and `firstTryCorrect` is `true` for all of them — none of their existing assertions depend on the daily log's new fields, so nothing should change for them).

- [ ] **Step 6: Commit**

```bash
git add script.js test-stats-header-display.cjs
git commit -m "Display first-try accuracy and practice time in the stats header"
```
