# Progressions with Inversions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine Functional Harmony progressions with required inversions — a new opt-in toggle + lookup table makes `getExpectedPCs()` enforce a specific voice-led inversion per chord of a progression, reusing the exact bass-checking machinery Phase 8's single-chord inversions already use. Then add a new 3-stage Learning Path phase that teaches it, reusing Phase 4's exact 3 progressions.

**Architecture:** Task 1 builds the mechanism (checkbox, lookup table, `getExpectedPCs()`/display changes, `applyStage()` wiring) and is fully testable using the existing Phase 4 progression strings directly — no new stages needed yet. Task 2 adds the 3 new stages that turn the mechanism on.

**Tech Stack:** Vanilla JS (`script.js`), static HTML (`index.html`), Playwright `.cjs` test scripts — per `CLAUDE.md`, no build step, no framework.

## Global Constraints

- The toggle (`functionalRequireInversions`) defaults **unchecked**, and every stage not explicitly opting in must leave it unchecked after `applyStage()` — this must never leak into stages that don't request it (verified: 3 progressions in this plan reuse the exact same pattern strings — `I–IV–V`, `IV–V–I`, `I–V–vi–IV` — that Phase 4's existing stages already use without inversion requirements).
- `PROGRESSION_INVERSIONS` values (from the approved spec, do not deviate):
  - `'I–IV–V'`: `['Root position', '2nd inversion', '1st inversion']`
  - `'IV–V–I'`: `['Root position', 'Root position', '2nd inversion']`
  - `'I–V–vi–IV'`: `['Root position', '1st inversion', 'Root position', '1st inversion']`
- No changes to `checkMidi()`, `updateKeyboard()`, `getRequiredBassPc()`, `FUNCTIONAL`/`FUNCTIONAL_NUMERALS` — all already generalize correctly once `requiredBassPc` is populated on the `func`-branch return value.
- New stage names (`'Invert Your First Song'`, `'Invert the Turnaround'`, `'Four Chords, Inverted'`) and phase name (`'Progressions, Inverted'`) — verified against the live 128-stage/19-phase array to have zero collisions.

---

## Task 1: Progression-inversion checking mechanism

**Files:**
- Modify: `index.html:365` (new checkbox)
- Modify: `script.js:2126-2149` (`genFunctional()`)
- Modify: `script.js:2650` (`saveSettings()`'s `ids` array)
- Modify: `script.js:2843-2877` (`applyStage()`)
- Modify: `script.js:3421-3423` area (insert `PROGRESSION_INVERSIONS` + `progressionInversionSuffix` before `getExpectedPCs()`)
- Modify: `script.js:3487-3493` (`getExpectedPCs()`'s `func` branch, the `if (entry)` block)
- Modify: `script.js:3581-3591` (`advanceProgressionStep()`)
- Test: `test-progressions-with-inversions.cjs` (new)

**Interfaces:**
- Produces: `PROGRESSION_INVERSIONS` — a plain object, pattern string → array of inversion label strings (`'Root position'`, `'1st inversion'`, `'2nd inversion'`), one per step. Used by `getExpectedPCs()` and `progressionInversionSuffix()`.
- Produces: `progressionInversionSuffix(pattern, stepIndex)` — returns `''` when the `functionalRequireInversions` checkbox is unchecked or no label is registered for that pattern/step, otherwise `` ` (${label})` ``. Called from `genFunctional()` and `advanceProgressionStep()`.
- Produces: `getExpectedPCs()`'s `func` branch now returns `{ type: 'chord', pcs, requiredBassPc }` (previously just `{ type: 'chord', pcs }`) for the plain-numeral-table path — `requiredBassPc` is `null` unless the toggle is checked AND the pattern/step has a registered label.
- Produces: a new stage field `requireProgressionInversions` (boolean) that `applyStage()` reads to set the new checkbox — Task 2's stages will set this to `true`.
- Consumes: `getRequiredBassPc(typeLabel, invLabel, pcs)` (script.js:3406-3410) — unchanged, called with the numeral's resolved `quality` string (e.g. `'Major'`, `'Minor'` — both already in `INVERTIBLE_CHORD_TYPES`, confirmed) as `typeLabel`.
- Consumes: `checked(id)` (script.js:705-707) — existing helper for plain by-id checkboxes.

### Current code (index.html:364-366)

```html
                <div class="option-divider">Drill Mode</div>
                <label><input type="checkbox" id="functionalRandomNumerals"> Random Numerals (intense drill)</label>
                <div class="option-divider">Progressions</div>
```

### Current code (script.js:2126-2149, `genFunctional()`)

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const randomNumerals = checked('functionalRandomNumerals');
  const restrictToSingle = patterns => randomNumerals ? patterns.filter(p => !p.includes('–')) : patterns;

  const majorPatterns = restrictToSingle(enabledProgressions('major'));
  const minorPatterns = restrictToSingle(enabledProgressions('minor'));
  const eligibleModes = [];
  if (majorPatterns.length) eligibleModes.push({ mode: 'Major', patterns: majorPatterns });
  if (minorPatterns.length) eligibleModes.push({ mode: 'minor', patterns: minorPatterns });
  if (!eligibleModes.length) return null;

  const note = weightedPick(notes, 'roots');
  const { mode, patterns } = pick(eligibleModes);
  const pattern = pick(patterns);
  const steps   = pattern.split('–');

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]} (chord 1 of ${steps.length})` : `Play: ${pattern}`,
    key:   `func|${note}|${mode}|${pattern}|0`,
  };
}
```

### Current code (script.js:2650, `saveSettings()`'s `ids` array)

```javascript
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals',
  ];
```

### Current code (script.js:2843-2877, `applyStage()`)

```javascript
function applyStage(idx) {
  const stage = LEARNING_PATH[idx];
  const ALL_CATS   = ['catNotes','catChords','catScales','catFunctional','catIntervals','catDiatonic'];
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions', 'leftHandMode']);
  const ALL_SCALES = SCALE_TYPES.map(s => s.id);
  const ALL_PROGRESSIONS = checkboxGatedPatterns();
  const onCats   = new Set(stage.cats);
  const onChords = new Set(stage.chords);
  const onScales = new Set(stage.scales);
  const onNotes  = new Set(stage.notes);
  const onProgressions = new Set((stage.progressions ?? ALL_PROGRESSIONS).map(qualifyStageProgression)); // no field -> all enabled (backward compatible)

  ALL_CATS.forEach(id   => { const el = document.getElementById(id);                              if (el) el.checked = onCats.has(id);   });
  ALL_CHORDS.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onChords.has(id); });
  ALL_SCALES.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onScales.has(id); });
  [...NOTES, ...ENHARMONIC_NOTES].forEach(n => { const el = document.querySelector(`input[data-note="${n}"]`); if (el) el.checked = onNotes.has(n); });
  ALL_PROGRESSIONS.forEach(p => { const el = document.querySelector(`input[data-pattern="${p}"]`); if (el) el.checked = onProgressions.has(p); });

  // Like the (now-fixed) progressions fallback: a catIntervals stage with no explicit
  // intervals/intDirs field silently enables ALL intervals. Every current interval-phase
  // stage sets both fields explicitly — keep doing so for any new one.
  const stageInts    = stage.intervals ?? (onCats.has('catIntervals') ? INTERVALS.map(i => i.id) : []);
  INTERVALS.forEach(i => { const el = document.getElementById(i.id); if (el) el.checked = stageInts.includes(i.id); });
  const stageIntDirs = stage.intDirs ?? (onCats.has('catIntervals') ? ['up'] : []);
  const elDirUp      = document.getElementById('intDirUp');
  const elDirDown    = document.getElementById('intDirDown');
  if (elDirUp)   elDirUp.checked   = stageIntDirs.includes('up');
  if (elDirDown) elDirDown.checked = stageIntDirs.includes('down');

  if (onCats.has('catDiatonic')) {
    const elDRoot = document.getElementById('diatonicRoot');
    const elDMode = document.getElementById('diatonicMode');
    if (elDRoot) elDRoot.value = stage.diatonicKey  ?? 'C';
    if (elDMode) elDMode.value = stage.diatonicMode ?? 'major';
  }
```

### Current code (script.js, `resolveJazzQuality()` through `getExpectedPCs()`'s start)

```javascript
function resolveJazzQuality(degreeMarker, isUpper, suffix) {
  if (degreeMarker === 'ø' && suffix === '7') return 'm7b5';
  if (degreeMarker === '°' && suffix === '7') return 'dim7';
  if (/^\d+(sus\d?)?$/.test(suffix)) return (isUpper ? '' : 'm') + suffix;
  return suffix.replace(/♯/g, '#').replace(/♭/g, 'b');
}

function getExpectedPCs(key) {
```

### Current code (script.js:3487-3493, inside `getExpectedPCs()`'s `func` branch)

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
```

### Current code (script.js:3581-3591, `advanceProgressionStep()`)

```javascript
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
```

- [ ] **Step 1: Write the failing test**

Create `test-progressions-with-inversions.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // --- Toggle ON: each step of each of the 3 progressions resolves the exact
  //     required bass pitch class, verified at two different roots (C and D)
  //     to confirm it transposes rather than being hardcoded to C. ---
  const bassChecks = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    return {
      cIIVV_step0: getExpectedPCs('func|C|Major|I–IV–V|0').requiredBassPc,
      cIIVV_step1: getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc,
      cIIVV_step2: getExpectedPCs('func|C|Major|I–IV–V|2').requiredBassPc,
      dIIVV_step0: getExpectedPCs('func|D|Major|I–IV–V|0').requiredBassPc,
      dIIVV_step1: getExpectedPCs('func|D|Major|I–IV–V|1').requiredBassPc,
      dIIVV_step2: getExpectedPCs('func|D|Major|I–IV–V|2').requiredBassPc,
      cIVVI_step0: getExpectedPCs('func|C|Major|IV–V–I|0').requiredBassPc,
      cIVVI_step1: getExpectedPCs('func|C|Major|IV–V–I|1').requiredBassPc,
      cIVVI_step2: getExpectedPCs('func|C|Major|IV–V–I|2').requiredBassPc,
      cIVviIV_step0: getExpectedPCs('func|C|Major|I–V–vi–IV|0').requiredBassPc,
      cIVviIV_step1: getExpectedPCs('func|C|Major|I–V–vi–IV|1').requiredBassPc,
      cIVviIV_step2: getExpectedPCs('func|C|Major|I–V–vi–IV|2').requiredBassPc,
      cIVviIV_step3: getExpectedPCs('func|C|Major|I–V–vi–IV|3').requiredBassPc,
    };
  });
  check('I–IV–V (C) step 0 (I, root) required bass = C (0)', bassChecks.cIIVV_step0, 0);
  check('I–IV–V (C) step 1 (IV, 2nd inv) required bass = C (0)', bassChecks.cIIVV_step1, 0);
  check('I–IV–V (C) step 2 (V, 1st inv) required bass = B (11)', bassChecks.cIIVV_step2, 11);
  check('I–IV–V (D) step 0 (I, root) required bass = D (2)', bassChecks.dIIVV_step0, 2);
  check('I–IV–V (D) step 1 (IV, 2nd inv) required bass = D (2)', bassChecks.dIIVV_step1, 2);
  check('I–IV–V (D) step 2 (V, 1st inv) required bass = C# (1)', bassChecks.dIIVV_step2, 1);
  check('IV–V–I (C) step 0 (IV, root) required bass = F (5)', bassChecks.cIVVI_step0, 5);
  check('IV–V–I (C) step 1 (V, root) required bass = G (7)', bassChecks.cIVVI_step1, 7);
  check('IV–V–I (C) step 2 (I, 2nd inv) required bass = G (7)', bassChecks.cIVVI_step2, 7);
  check('I–V–vi–IV (C) step 0 (I, root) required bass = C (0)', bassChecks.cIVviIV_step0, 0);
  check('I–V–vi–IV (C) step 1 (V, 1st inv) required bass = B (11)', bassChecks.cIVviIV_step1, 11);
  check('I–V–vi–IV (C) step 2 (vi, root) required bass = A (9)', bassChecks.cIVviIV_step2, 9);
  check('I–V–vi–IV (C) step 3 (IV, 1st inv) required bass = A (9)', bassChecks.cIVviIV_step3, 9);

  // --- Toggle OFF: same prompts have no bass requirement (today's lenient behavior). ---
  const toggleOffCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = false;
    return getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc;
  });
  check('toggle off: I–IV–V step 1 has no required bass', toggleOffCheck, null);

  // --- Unregistered pattern, toggle on: no bass requirement (safe fallback). ---
  const unregisteredCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    return getExpectedPCs('func|C|Major|ii–V–I|0').requiredBassPc;
  });
  check('toggle on, unregistered pattern (ii–V–I): no required bass', unregisteredCheck, null);

  // --- applyStage() on an existing stage that predates this field leaves the
  //     toggle unchecked -- proving default-off, not leaking prior global state. ---
  const isolationCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true; // force on first
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    applyStage(idx);
    return document.getElementById('functionalRequireInversions').checked;
  });
  check('applyStage() on a stage without requireProgressionInversions unchecks the toggle', isolationCheck, false);

  // --- checkMidi() end-to-end: wrong inversion (right pitch classes, wrong bass)
  //     does not advance; correct inversion does. ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|0'; // I, requires root position (bass C)
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;

    heldNotes = new Set([64, 67, 72]); // E4 G4 C5 -- right pitch classes, bass is E not C
    updateKeyboard();
    checkMidi();
    const afterWrongInversion = currentPromptKey;

    heldNotes = new Set([60, 64, 67]); // C4 E4 G4 -- bass is C, correct
    updateKeyboard();
    checkMidi();
    const afterCorrectInversion = currentPromptKey;

    return { afterWrongInversion, afterCorrectInversion };
  });
  check('wrong inversion (right pitch classes, wrong bass) does not advance the prompt', midiCheck.afterWrongInversion, 'func|C|Major|I–IV–V|0');
  check('correct inversion (root position, bass C) advances to step 1', midiCheck.afterCorrectInversion, 'func|C|Major|I–IV–V|1');

  // --- Display text: genFunctional() includes the step-0 inversion label. ---
  const genDisplayCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === 'I–IV–V');
    });
    const prompt = genFunctional();
    return prompt.line2;
  });
  checkTrue('genFunctional() line2 includes the step-0 inversion label', genDisplayCheck.includes('(Root position)'), `line2="${genDisplayCheck}"`);

  // --- Display text: advanceProgressionStep() includes the next step's inversion label. ---
  const advanceDisplayCheck = await page.evaluate(async () => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|0';
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C E G, root position -- correct step 0, advances to step 1
    updateKeyboard();
    checkMidi();
    await new Promise(r => setTimeout(r, 200)); // renderPrompt()'s flash delay
    return promptLine2.textContent;
  });
  checkTrue('advanceProgressionStep() line2 includes step 1\'s inversion label (2nd inversion)', advanceDisplayCheck.includes('(2nd inversion)'), `line2="${advanceDisplayCheck}"`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-progressions-with-inversions.cjs
```

Expected: FAIL — `document.getElementById('functionalRequireInversions')` is `null` (checkbox doesn't exist yet), causing errors/non-PASS output for most assertions.

- [ ] **Step 3: Add the checkbox to `index.html`**

Change the block shown above (index.html:364-366) to:

```html
                <div class="option-divider">Drill Mode</div>
                <label><input type="checkbox" id="functionalRandomNumerals"> Random Numerals (intense drill)</label>
                <div class="option-divider">Progression Voicing</div>
                <label><input type="checkbox" id="functionalRequireInversions"> Require Inversions in Progressions</label>
                <div class="option-divider">Progressions</div>
```

- [ ] **Step 4: Add `PROGRESSION_INVERSIONS` and `progressionInversionSuffix()` to `script.js`**

Insert immediately before `function getExpectedPCs(key) {` (right after `resolveJazzQuality()`'s closing brace shown above):

```javascript
// Voice-led inversion sequences for progressions that opt into requiring them via the
// functionalRequireInversions checkbox. Chosen for smooth bass motion (common tone held
// where one exists, otherwise the nearest step) -- see docs/superpowers/specs/2026-07-13-progressions-with-inversions-design.md
// for the full reasoning per progression. Keys are bare pattern strings (same convention
// as FUNCTIONAL.major/minor); values are one inversion label per step, in order.
const PROGRESSION_INVERSIONS = {
  'I–IV–V':     ['Root position', '2nd inversion', '1st inversion'],
  'IV–V–I':     ['Root position', 'Root position', '2nd inversion'],
  'I–V–vi–IV':  ['Root position', '1st inversion', 'Root position', '1st inversion'],
};

// Builds the " (2nd inversion)"-style suffix for a progression step's display text.
// Returns '' when the toggle is off or the pattern/step has no registered label --
// safe to call unconditionally from both genFunctional() and advanceProgressionStep().
function progressionInversionSuffix(pattern, stepIndex) {
  if (!checked('functionalRequireInversions')) return '';
  const label = PROGRESSION_INVERSIONS[pattern]?.[stepIndex];
  return label ? ` (${label})` : '';
}

function getExpectedPCs(key) {
```

- [ ] **Step 5: Update `getExpectedPCs()`'s `func` branch (script.js:3487-3493)**

Change:

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
```

to:

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      const pcs = intervals.map(i => (chordRootPC + i) % 12);
      const invLabel = PROGRESSION_INVERSIONS[fullPattern]?.[stepIndex];
      const requiredBassPc = checked('functionalRequireInversions') ? getRequiredBassPc(quality, invLabel, pcs) : null;
      return { type: 'chord', pcs, requiredBassPc };
    }
```

- [ ] **Step 6: Update `genFunctional()` (script.js:2126-2149)**

Replace the block shown above with:

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const randomNumerals = checked('functionalRandomNumerals');
  const restrictToSingle = patterns => randomNumerals ? patterns.filter(p => !p.includes('–')) : patterns;

  const majorPatterns = restrictToSingle(enabledProgressions('major'));
  const minorPatterns = restrictToSingle(enabledProgressions('minor'));
  const eligibleModes = [];
  if (majorPatterns.length) eligibleModes.push({ mode: 'Major', patterns: majorPatterns });
  if (minorPatterns.length) eligibleModes.push({ mode: 'minor', patterns: minorPatterns });
  if (!eligibleModes.length) return null;

  const note = weightedPick(notes, 'roots');
  const { mode, patterns } = pick(eligibleModes);
  const pattern = pick(patterns);
  const steps   = pattern.split('–');
  const invSuffix0 = progressionInversionSuffix(pattern, 0);

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]}${invSuffix0} (chord 1 of ${steps.length})` : `Play: ${pattern}${invSuffix0}`,
    key:   `func|${note}|${mode}|${pattern}|0`,
  };
}
```

- [ ] **Step 7: Update `advanceProgressionStep()` (script.js:3581-3591)**

Change:

```javascript
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
```

to:

```javascript
function advanceProgressionStep(progInfo) {
  midiSuccessActive = true;
  const nextIndex = progInfo.stepIndex + 1;
  const parts = progInfo.parts.slice();
  parts[4] = String(nextIndex);
  currentPromptKey = parts.join('|');
  const invSuffix = progressionInversionSuffix(parts[3], nextIndex);
  renderPrompt({
    line1: `Key: ${parts[1]} ${parts[2]}`,
    line2: `Play: ${progInfo.steps[nextIndex]}${invSuffix} (chord ${nextIndex + 1} of ${progInfo.steps.length})`,
    key:   currentPromptKey,
  });
```

- [ ] **Step 8: Add `'functionalRequireInversions'` to `saveSettings()`'s `ids` array (script.js:2650)**

Change:

```javascript
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals',
  ];
```

to:

```javascript
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals', 'functionalRequireInversions',
  ];
```

- [ ] **Step 9: Update `applyStage()` (script.js:2843-2877)**

Insert this new block right after the `intDirDown` handling and before the `catDiatonic` block:

```javascript
  if (elDirUp)   elDirUp.checked   = stageIntDirs.includes('up');
  if (elDirDown) elDirDown.checked = stageIntDirs.includes('down');

  const elReqInv = document.getElementById('functionalRequireInversions');
  if (elReqInv) elReqInv.checked = !!stage.requireProgressionInversions;

  if (onCats.has('catDiatonic')) {
```

- [ ] **Step 10: Run the test, verify it passes**

```bash
node test-progressions-with-inversions.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 11: Run the broader Functional Harmony regression sweep**

```bash
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-curriculum-fix.cjs
node test-progression-learning-path.cjs
node test-chord-progressions.cjs
node test-first-progressions.cjs
node test-functional-harmony-bug-fix.cjs
node test-random-numerals-drill.cjs
```

Expected: all print `RESULT: PASS` (none of these exercise `PROGRESSION_INVERSIONS`, the new toggle, or the new `applyStage()` line in a way that changes their existing assertions — `functionalRequireInversions` defaults unchecked and none of these stages set the new field, so `getExpectedPCs()`'s `requiredBassPc` stays `null` for all of them, unchanged from today).

- [ ] **Step 12: Commit**

```bash
git add index.html script.js test-progressions-with-inversions.cjs
git commit -m "Add progression-inversion checking mechanism

New opt-in functionalRequireInversions toggle + PROGRESSION_INVERSIONS
lookup table let a Learning Path stage require a specific voice-led
inversion per chord of a progression, reusing the exact bass-checking
machinery (getRequiredBassPc(), checkMidi(), updateKeyboard()) Phase 8's
single-chord inversions already use -- neither needed any changes.
Covers the 3 progressions already taught in First Progressions
(I-IV-V, IV-V-I, I-V-vi-IV); off by default, no existing stage affected."
```

---

## Task 2: "Progressions, Inverted" Learning Path phase

**Files:**
- Modify: `script.js:255-256` (insert 3 new stages between `'Triad Mastery'` and the Phase 7 boundary comment)
- Modify: `script.js:366` (insert new `LEARNING_PATH_PHASES` entry between `'Triad inversions'` and `'Major scales'`)
- Modify: `test-all-paths-popup-redesign.cjs:37,71` (128 → 131)
- Modify: `test-left-hand-learning-path.cjs:116` (128 → 131)
- Modify: `test-first-progressions.cjs:47` (128 → 131)
- Modify: `test-left-hand-shape-warmup.cjs:93` (128 → 131)
- Test: `test-progressions-inverted-learning-path.cjs` (new)

**Interfaces:**
- Consumes: `requireProgressionInversions` stage field, `applyStage()`'s handling of it (Task 1) — the 3 new stages set this to `true`.
- Consumes: `PROGRESSION_INVERSIONS` (Task 1) — must already have entries for all 3 progressions these stages use (it does, per Task 1's Global Constraints).

### Current code (script.js:254-257)

```javascript
  { name: 'Add Dim & Aug',       hint: 'Diminished and Augmented triads added — all inversions, 10 seconds',                                      cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '10' },
  { name: 'Triad Mastery',       hint: 'All triads, all inversions, all 12 keys — 5 seconds',                                                     cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '5'  },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
```

### Current code (script.js:358-378, `LEARNING_PATH_PHASES`)

```javascript
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'First Progressions', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Triad inversions', count: 8 },
  { name: 'Major scales', count: 4 },
  { name: 'Combine chords + scales', count: 3 },
  { name: 'Seventh chords — root position', count: 4 },
  { name: 'Seventh chord inversions', count: 5 },
  { name: 'Full Foundation', count: 1 },
  { name: 'Scales beyond natural minor', count: 15 },
  { name: 'Enharmonic spellings', count: 3 },
  { name: 'Extended chords', count: 12 },
  { name: 'Functional harmony', count: 26 },
  { name: 'Interval reading', count: 7 },
  { name: 'Diatonic chords', count: 5 },
];
```

- [ ] **Step 1: Write the failing test**

Create `test-progressions-inverted-learning-path.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // --- The 3 new stages exist, immediately after Triad Mastery and before First Scale ---
  const orderCheck = await page.evaluate(() => {
    const idxTriadMastery = LEARNING_PATH.findIndex(s => s.name === 'Triad Mastery');
    const idxFirstScale   = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const between = LEARNING_PATH.slice(idxTriadMastery + 1, idxFirstScale);
    return {
      count: between.length,
      names: between.map(s => s.name),
    };
  });
  check('exactly 3 new stages between Triad Mastery and First Scale', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted']);

  // --- Total stage count and the new phase's count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    invertedPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Progressions, Inverted'),
  }));
  check('LEARNING_PATH has 131 stages total (128 + 3 new)', phaseData.totalStages, 131);
  check('LEARNING_PATH_PHASES sums to 131', phaseData.phaseSum, 131);
  check('Progressions, Inverted phase has count 3', phaseData.invertedPhase?.count, 3);

  // --- applyStage() on each new stage: cumulative progressions, requireProgressionInversions
  //     on, C-only, untimed. ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedProgressions] of [
      ['Invert Your First Song', ['I–IV–V']],
      ['Invert the Turnaround', ['I–IV–V', 'IV–V–I']],
      ['Four Chords, Inverted', ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        requireInvChecked: document.getElementById('functionalRequireInversions').checked,
        cChecked: document.querySelector('input[data-note="C"]').checked,
        dChecked: document.querySelector('input[data-note="D"]').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        progressionsChecked: expectedProgressions.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted']) {
    checkTrue(`applyStage() on ${name} checks functionalRequireInversions`, applyChecks[name].requireInvChecked, null);
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves D unchecked (C-only)`, !applyChecks[name].dChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected progressions`, applyChecks[name].progressionsChecked, null);
  }

  // --- End-to-end sanity: Invert Your First Song actually requires the registered
  //     inversion, not just root position. ---
  const e2eCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Invert Your First Song');
    applyStage(idx);
    return {
      step1RequiredBass: getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc, // IV, 2nd inversion -> C (0)
    };
  });
  check('Invert Your First Song: step 1 (IV) requires bass C via the registered voicing', e2eCheck.step1RequiredBass, 0);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-progressions-inverted-learning-path.cjs
```

Expected: FAIL — no stages named `'Invert Your First Song'` etc. exist yet, `LEARNING_PATH.length` is 128 not 131.

- [ ] **Step 3: Insert the 3 new stages (script.js:255-256)**

Change:

```javascript
  { name: 'Triad Mastery',       hint: 'All triads, all inversions, all 12 keys — 5 seconds',                                                     cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '5'  },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

to:

```javascript
  { name: 'Triad Mastery',       hint: 'All triads, all inversions, all 12 keys — 5 seconds',                                                     cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '5'  },
  // ── Phase 6b: Progressions, Inverted ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Invert Your First Song', hint: 'Same I–IV–V, now each chord requires its voice-led inversion',                                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           requireProgressionInversions: true, timer: 'off' },
  { name: 'Invert the Turnaround',  hint: 'Add IV–V–I, voiced for a smooth bass line between chords',                                              cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I'],                                  requireProgressionInversions: true, timer: 'off' },
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 4: Insert the new `LEARNING_PATH_PHASES` entry (script.js:358-378)**

Change:

```javascript
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'First Progressions', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Triad inversions', count: 8 },
  { name: 'Major scales', count: 4 },
```

to:

```javascript
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'First Progressions', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Triad inversions', count: 8 },
  { name: 'Progressions, Inverted', count: 3 },
  { name: 'Major scales', count: 4 },
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
node test-progressions-inverted-learning-path.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 6: Update the 4 stale stage-count assertions**

In `test-all-paths-popup-redesign.cjs`, change:

```javascript
  check('LEARNING_PATH.length matches the expected 128 stages', phaseData.stageCount, 128);
```

to:

```javascript
  check('LEARNING_PATH.length matches the expected 131 stages', phaseData.stageCount, 131);
```

and change:

```javascript
  check('all 128 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 128);
```

to:

```javascript
  check('all 131 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 131);
```

In `test-left-hand-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 128 stages total (124 + 1 Left Hand Shape + 3 First Progressions)', phaseCheck.totalStages, 128);
```

to:

```javascript
  check('LEARNING_PATH has 131 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted)', phaseCheck.totalStages, 131);
```

In `test-first-progressions.cjs`, change:

```javascript
  check('LEARNING_PATH has 128 stages total (125 + 3 new)', pathCheck.totalStages, 128);
```

to:

```javascript
  check('LEARNING_PATH has 131 stages total (125 + 3 First Progressions + 3 Progressions Inverted)', pathCheck.totalStages, 131);
```

In `test-left-hand-shape-warmup.cjs`, change:

```javascript
  check('LEARNING_PATH has 128 stages total (124 + 1 Left Hand Shape + 3 First Progressions)', pathCheck.totalStages, 128);
```

to:

```javascript
  check('LEARNING_PATH has 131 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted)', pathCheck.totalStages, 131);
```

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-progressions-inverted-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-left-hand-learning-path.cjs
node test-first-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-progression-learning-path.cjs
node test-functional-harmony-bug-fix.cjs
node test-progressions-with-inversions.cjs
```

Expected: all print `RESULT: PASS`.

- [ ] **Step 8: Commit**

```bash
git add script.js test-all-paths-popup-redesign.cjs test-left-hand-learning-path.cjs test-first-progressions.cjs test-left-hand-shape-warmup.cjs test-progressions-inverted-learning-path.cjs
git commit -m "Add Progressions, Inverted Learning Path phase

3 new cumulative stages right after Triad inversions (Phase 8), reusing
First Progressions' exact 3 progressions (I-IV-V, IV-V-I, I-V-vi-IV) now
with required voice-led inversions -- combines two skills the learner
already has by this point in the path, and gives progressions a
mid-path touchpoint (previously silent for 71 stages between Phase 4
and Phase 17). LEARNING_PATH: 128 -> 131 stages, 19 -> 20 phases."
```

---

## Final Verification

```bash
node test-progressions-with-inversions.cjs
node test-progressions-inverted-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-left-hand-learning-path.cjs
node test-first-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-progression-learning-path.cjs
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-curriculum-fix.cjs
node test-chord-progressions.cjs
node test-functional-harmony-bug-fix.cjs
node test-random-numerals-drill.cjs
```

Expected: all `RESULT: PASS`, zero failures.

After this ships, update `docs/learning-path-design.md` (add the new Phase 6b entry with its stage table, renumber the phase list, move the "progression silence" open issue to reflect the new mid-path touchpoint — note it's now 2 touchpoints, not fully closed) and the `learning-path-audit.md` memory entry — controller follow-up, not part of this plan's tasks, matching every prior round.
