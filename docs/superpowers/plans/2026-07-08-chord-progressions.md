# Chord Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 8 existing chord progressions in `FUNCTIONAL` (currently decorative — displayed but never checked) actually playable, one chord at a time, with per-progression stats.

**Architecture:** The func prompt key gains a step-index segment. `getExpectedPCs()` resolves whichever numeral the current step points to (replacing today's outright bail-out on any multi-chord pattern). `checkMidi()` advances the step in place on a correct answer, only running the normal "generate a new prompt" flow once the last step is done — and critically, does not reset `promptStartTime`/the wrong-note flag between steps, so the existing accuracy/stats machinery naturally captures "was the whole progression clean" and "how long did the whole thing take" for free.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`.
- Func prompt key format: `func|note|mode|pattern|stepIndex` — always 5 segments now, even for single-chord func prompts (`stepIndex` is always `'0'` for those, and `pattern.split('–')` on a single-numeral pattern just yields a 1-element array).
- `getExpectedPCs()`'s func branch must resolve `steps[stepIndex]` using the exact same numeral-lookup logic already used today (including the existing minor-mode `V` special case) — no bail-out on multi-chord patterns.
- Advancing a step must NOT reset `promptStartTime` or `promptHadWrongNote` — only the final step's completion runs the normal success flow (`triggerMidiSuccess`/`triggerBandSuccess`), which is what resets state for the next prompt.
- Correct completion of a multi-chord progression records into the existing `adaptWeights.variations` bucket under the full pattern string as its key (e.g. `"I–IV–V"`), via the existing `updateAdaptWeight()` — single-chord func prompts are unaffected (only `roots` gets updated for those, exactly as today).
- No new checkbox, no Learning Path changes, no changes to Ear Training.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`. Tests manipulating `heldNotes`/`updateKeyboard()` must call `updateMidiUI()` first (populates `keyElements`, or the per-key loop that sets `promptHadWrongNote` is a silent no-op — a known gotcha in this codebase).

---

### Task 1: Playable chord progressions

**Files:**
- Modify: `script.js:2021-2035` (`genFunctional`)
- Modify: `script.js:3257-3275` (`getExpectedPCs`'s func branch)
- Modify: `script.js:3315-3360` (`checkMidi`, plus two new helper functions placed just above it)
- Modify: `script.js:957` (`recordAdaptiveResult`'s func branch)
- Test: `test-chord-progressions.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL`, `DIATONIC`, `CHORD_INTERVALS`, `NOTE_TO_PC` (all unchanged), `updateAdaptWeight` (unchanged), `renderPrompt(prompt)` (unchanged — takes `{line1, line2, key}`), `promptCard` (unchanged DOM ref), `triggerMidiSuccess`/`triggerBandSuccess` (unchanged, still the terminal success path for the *last* step).
- Produces: `getProgressionInfo(key)` — returns `null` for non-progression keys (or single-chord func prompts), or `{ parts, steps, stepIndex, isLastStep }` for a multi-chord progression key. `advanceProgressionStep(progInfo)` — advances the step in place, does not depend on anything from a later task.

- [ ] **Step 1: Write the failing test**

Create `test-chord-progressions.cjs`:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // genFunctional() always appends a stepIndex segment, and its display text depends
  // on whether the randomly-picked pattern happens to be single-chord or a progression --
  // both are checked without needing to control which one gets picked.
  const genResult = await page.evaluate(() => {
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const prompt = genFunctional();
    const parts  = prompt.key.split('|');
    return { parts, line2: prompt.line2, pattern: parts[3] };
  });
  check('genFunctional() key always has 5 segments', genResult.parts.length, 5);
  check('genFunctional() key starts at step 0', genResult.parts[4], '0');
  const isProgression = genResult.pattern.includes('–');
  const firstNumeral  = genResult.pattern.split('–')[0];
  const expectedLine2 = isProgression
    ? `Play: ${firstNumeral} (chord 1 of ${genResult.pattern.split('–').length})`
    : `Play: ${genResult.pattern}`;
  check('genFunctional() line2 matches single-chord or progression format as appropriate', genResult.line2, expectedLine2);

  // getExpectedPCs() resolves each step of a hand-built progression key correctly.
  // Key of C major, progression I-IV-V: step 0 = C major (C E G), step 1 = F major
  // (IV of C = F, F A C), step 2 = G major (V of C = G, G B D).
  const shapes = await page.evaluate(() => ({
    step0: getExpectedPCs('func|C|Major|I–IV–V|0'),
    step1: getExpectedPCs('func|C|Major|I–IV–V|1'),
    step2: getExpectedPCs('func|C|Major|I–IV–V|2'),
  }));
  check('step 0 (I) resolves to C major (0,4,7)', JSON.stringify(shapes.step0.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([0, 4, 7]));
  check('step 1 (IV) resolves to F major (5,9,0)', JSON.stringify(shapes.step1.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([0, 5, 9]));
  check('step 2 (V) resolves to G major (7,11,2)', JSON.stringify(shapes.step2.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([2, 7, 11]));

  // End-to-end: play through I-IV-V correctly, verify it advances step-by-step without
  // resetting promptStartTime, and only fully completes (daily log entry) on the last step.
  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI(); // populates keyElements -- required for updateKeyboard() to do anything
    localStorage.removeItem('mpr_daily');
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = {};

    const results = {};
    const startTime = Date.now() - 500; // pretend the progression started 500ms ago

    currentPromptKey   = 'func|C|Major|I–IV–V|0';
    promptStartTime    = startTime;
    promptHadWrongNote = false;
    midiSuccessActive  = false;

    heldNotes = new Set([60, 64, 67]); // C E G -- step 0, correct
    updateKeyboard();
    checkMidi();
    results.afterStep0Key = currentPromptKey;
    results.promptStartTimeUnchangedAfterStep0 = (promptStartTime === startTime);

    midiSuccessActive = false; // step-advance sets this true and clears it after 700ms --
                                // reset directly here rather than waiting on a real timer
    heldNotes = new Set([61]); // C#4 -- a wrong note during step 1 (IV/F major)
    updateKeyboard();
    heldNotes = new Set([65, 69, 60]); // F A C -- step 1, now correct
    updateKeyboard();
    checkMidi();
    results.afterStep1Key = currentPromptKey;
    results.promptStartTimeUnchangedAfterStep1 = (promptStartTime === startTime);

    midiSuccessActive = false;
    heldNotes = new Set([67, 71, 62]); // G B D -- step 2 (V/G major), the LAST step, correct
    updateKeyboard();
    checkMidi();

    const log = JSON.parse(localStorage.getItem('mpr_daily') || '[]');
    results.dailyLogEntryAfterCompletion = log[log.length - 1];
    results.variationTracked = adaptWeights.variations['I–IV–V']?.count;

    return results;
  });
  check('after step 0, key advances to step 1', behavior.afterStep0Key, 'func|C|Major|I–IV–V|1');
  check('promptStartTime unchanged after step 0 (progression, not a new prompt)', behavior.promptStartTimeUnchangedAfterStep0, true);
  check('after step 1 (with a wrong note first), key advances to step 2', behavior.afterStep1Key, 'func|C|Major|I–IV–V|2');
  check('promptStartTime still unchanged after step 1', behavior.promptStartTimeUnchangedAfterStep1, true);
  check('completing the last step logs exactly 1 answer for the whole progression', behavior.dailyLogEntryAfterCompletion.answers, 1);
  check('the wrong note during step 1 means the whole progression is NOT first-try clean', behavior.dailyLogEntryAfterCompletion.firstTryCount, 0);
  check('completing the progression tracks "I–IV–V" in adaptWeights.variations', behavior.variationTracked, 1);

  // Single-chord func prompts must be unaffected: recordAdaptiveResult should NOT
  // create a variations entry for them, only roots.
  const singleChord = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    document.getElementById('adaptiveToggle').checked = true;
    recordAdaptiveResult('func|C|Major|V|0', 1000);
    return {
      variationKeys: Object.keys(adaptWeights.variations).length,
      rootTracked: adaptWeights.roots['C']?.count,
    };
  });
  check('a single-chord func answer creates no variations entry', singleChord.variationKeys, 0);
  check('a single-chord func answer still tracks roots as before', singleChord.rootTracked, 1);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-chord-progressions.cjs`
Expected: FAIL on most checks — `genFunctional()`'s key doesn't have a 5th segment yet, `getExpectedPCs()` returns `null` for any progression key (the current bail-out), and the step-advance behavior doesn't exist yet.

- [ ] **Step 3: Update `genFunctional`**

Current code (`script.js:2021-2035`):

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const note    = weightedPick(notes, 'roots');
  const isMinor = Math.random() < 0.5;
  const mode    = isMinor ? 'minor' : 'Major';
  const pattern = pick(FUNCTIONAL[isMinor ? 'minor' : 'major']);

  return {
    line1: `Key: ${note} ${mode}`,
    line2: `Play: ${pattern}`,
    key:   `func|${note}|${mode}|${pattern}`,
  };
}
```

Replace with:

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const note    = weightedPick(notes, 'roots');
  const isMinor = Math.random() < 0.5;
  const mode    = isMinor ? 'minor' : 'Major';
  const pattern = pick(FUNCTIONAL[isMinor ? 'minor' : 'major']);
  const steps   = pattern.split('–');

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]} (chord 1 of ${steps.length})` : `Play: ${pattern}`,
    key:   `func|${note}|${mode}|${pattern}|0`,
  };
}
```

- [ ] **Step 4: Update `getExpectedPCs`'s func branch**

Current code (`script.js:3257-3275`):

```javascript
  if (type === 'func') {
    const pattern = parts[3];
    if (pattern.includes('–')) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const data    = DIATONIC[modeKey];
    let degree    = data.numerals.indexOf(pattern);
    let quality;
    if (degree === -1) {
      if (pattern === 'V' && modeKey === 'minor') { degree = 4; quality = 'Major'; }
      else return null;
    } else {
      quality = data.qualities[degree];
    }
    const chordRootPC = (rootIdx + data.intervals[degree]) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }
```

Replace with:

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const data    = DIATONIC[modeKey];
    let degree    = data.numerals.indexOf(numeral);
    let quality;
    if (degree === -1) {
      if (numeral === 'V' && modeKey === 'minor') { degree = 4; quality = 'Major'; }
      else return null;
    } else {
      quality = data.qualities[degree];
    }
    const chordRootPC = (rootIdx + data.intervals[degree]) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }
```

- [ ] **Step 5: Add the progression-step helpers and update `checkMidi`**

Current code (`script.js:3315-3360`):

```javascript
function checkMidi() {
  if (!midiEnabled || midiSuccessActive || heldNotes.size === 0) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected) return;

  const heldPCs = new Set([...heldNotes].map(n => n % 12));
  let matched = false;

  if (expected.type === 'note') {
    matched = heldPCs.has(expected.pc);
  } else if (expected.type === 'chord') {
    const pcsMatch = expected.pcs.every(pc => heldPCs.has(pc));
    let bassMatch = true;
    if (expected.requiredBassPc != null) {
      const sortedHeld = [...heldNotes].sort((a, b) => a - b);
      bassMatch = sortedHeld.length > 0 && sortedHeld[0] % 12 === expected.requiredBassPc;
    }
    let handMatch = true;
    if (expected.leftHandPcs) {
      const leftHeld  = [...heldNotes].filter(n => n < 60).map(n => n % 12);
      const rightHeld = [...heldNotes].filter(n => n >= 60).map(n => n % 12);
      handMatch = expected.leftHandPcs.every(pc => leftHeld.includes(pc))
        && expected.rightHandPcs.every(pc => rightHeld.includes(pc));
    }
    matched = pcsMatch && bassMatch && handMatch;
  } else if (expected.type === 'scale') {
    matched = expected.pcs.every(pc => scaleNotesPlayed.has(pc));
  } else if (expected.type === 'interval') {
    matched = heldPCs.has(expected.rootPC) && heldPCs.has(expected.targetPC);
  } else if (expected.type === 'octave') {
    const sorted = [...heldNotes].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] % 12 === expected.rootPC && sorted[i + 1] - sorted[i] === 12) {
        matched = true; break;
      }
    }
  }

  if (matched) {
    if (bandActive) {
      triggerBandSuccess(expected);
    } else {
      triggerMidiSuccess();
    }
  }
}
```

Replace with (adds two helper functions above `checkMidi`, and changes only the final `if (matched)` block):

```javascript
// Returns null for any key that isn't a multi-chord func progression (including
// single-chord func prompts, which are just a "progression" of length 1 and don't
// need this special handling). Otherwise returns the current step's position.
function getProgressionInfo(key) {
  const parts = key.split('|');
  if (parts[0] !== 'func') return null;
  const steps = parts[3].split('–');
  if (steps.length <= 1) return null;
  const stepIndex = parseInt(parts[4]) || 0;
  return { parts, steps, stepIndex, isLastStep: stepIndex >= steps.length - 1 };
}

// Advances to the next chord in the same progression without generating a whole new
// prompt -- deliberately does NOT touch promptStartTime or promptHadWrongNote, so both
// keep accumulating across every step until the final step's normal success flow runs.
function advanceProgressionStep(progInfo) {
  midiSuccessActive = true;
  const nextIndex = progInfo.stepIndex + 1;
  const parts = progInfo.parts.slice();
  parts[4] = String(nextIndex);
  currentPromptKey = parts.join('|');
  renderPrompt({
    line1: `Key: ${parts[1]} ${parts[2]}`,
    line2: `Play: ${progInfo.steps[nextIndex]} (chord ${nextIndex + 1} of ${progInfo.steps.length})`,
    key:   currentPromptKey,
  });
  promptCard.classList.add('midi-success');
  setTimeout(() => {
    promptCard.classList.remove('midi-success');
    midiSuccessActive = false;
  }, 700);
}

function checkMidi() {
  if (!midiEnabled || midiSuccessActive || heldNotes.size === 0) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected) return;

  const heldPCs = new Set([...heldNotes].map(n => n % 12));
  let matched = false;

  if (expected.type === 'note') {
    matched = heldPCs.has(expected.pc);
  } else if (expected.type === 'chord') {
    const pcsMatch = expected.pcs.every(pc => heldPCs.has(pc));
    let bassMatch = true;
    if (expected.requiredBassPc != null) {
      const sortedHeld = [...heldNotes].sort((a, b) => a - b);
      bassMatch = sortedHeld.length > 0 && sortedHeld[0] % 12 === expected.requiredBassPc;
    }
    let handMatch = true;
    if (expected.leftHandPcs) {
      const leftHeld  = [...heldNotes].filter(n => n < 60).map(n => n % 12);
      const rightHeld = [...heldNotes].filter(n => n >= 60).map(n => n % 12);
      handMatch = expected.leftHandPcs.every(pc => leftHeld.includes(pc))
        && expected.rightHandPcs.every(pc => rightHeld.includes(pc));
    }
    matched = pcsMatch && bassMatch && handMatch;
  } else if (expected.type === 'scale') {
    matched = expected.pcs.every(pc => scaleNotesPlayed.has(pc));
  } else if (expected.type === 'interval') {
    matched = heldPCs.has(expected.rootPC) && heldPCs.has(expected.targetPC);
  } else if (expected.type === 'octave') {
    const sorted = [...heldNotes].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i] % 12 === expected.rootPC && sorted[i + 1] - sorted[i] === 12) {
        matched = true; break;
      }
    }
  }

  if (matched) {
    const progInfo = getProgressionInfo(currentPromptKey);
    if (progInfo && !progInfo.isLastStep) {
      advanceProgressionStep(progInfo);
    } else if (bandActive) {
      triggerBandSuccess(expected);
    } else {
      triggerMidiSuccess();
    }
  }
}
```

- [ ] **Step 6: Update `recordAdaptiveResult`'s func branch**

Current code (`script.js:957`):

```javascript
  else if (type === 'func')     { updateAdaptWeight('roots', parts[1], ms); }
```

Replace with:

```javascript
  else if (type === 'func')     {
    updateAdaptWeight('roots', parts[1], ms);
    if (parts[3] && parts[3].includes('–')) updateAdaptWeight('variations', parts[3], ms);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-chord-progressions.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Run the full regression sweep**

```bash
node test-chord-progressions.cjs
node test-left-hand-mode-check.cjs
node test-left-hand-mode-ui.cjs
node test-inversion-stats-tracking.cjs
node test-inversion-stats-display.cjs
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
```

Expected: `RESULT: PASS` on all nine. The other test files are included because they all construct/parse prompt keys, call `checkMidi()`/`recordAdaptiveResult()`, or exercise the general prompt-advance flow — this confirms the new func-key segment and the `checkMidi()` branching don't break any of them (none of their keys are `func`-type progressions, so `getProgressionInfo()` returns `null` for all of them and the new branch is a no-op).

- [ ] **Step 9: Commit**

```bash
git add script.js test-chord-progressions.cjs
git commit -m "Make chord progressions playable and checkable, one chord at a time"
```
