# First Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a small early Functional Harmony teaser — 3 cumulative progression stages, C-only, untimed — right after minor is introduced, so students reach a playable progression by stage ~18 instead of stage ~88.

**Architecture:** Reuses the existing, unmodified Functional Harmony practice mechanism (`catFunctional` category, `FUNCTIONAL.major` progression checkboxes, `applyStage()`/`getStageMastery()`) verbatim — pure data insertion into `LEARNING_PATH` and `LEARNING_PATH_PHASES`, no new capability.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- Roman numerals are kept, not stripped — this teaser is explicitly NOT a "concrete chord names" redesign (see spec background).
- The 3 new stage names (`"Play Your First Song"`, `"Add a Turnaround"`, `"Four Chord Song"`) must be distinct from every other stage name in `LEARNING_PATH` — verified zero collisions against the current 125-stage array, including the late-phase stages covering the same progressions (`'Progression: I–IV–V'`, `'Add IV–V–I'`, `'Add I–V–vi–IV'`), which stay completely untouched.
- All three progressions (`I–IV–V`, `IV–V–I`, `I–V–vi–IV`) are part of the "original 8" and already checked-by-default — no checkbox-gating changes needed anywhere.
- `LEARNING_PATH` grows from 125 to 128 stages; a new `LEARNING_PATH_PHASES` entry `{ name: 'First Progressions', count: 3 }` is inserted between `'Introduce minor'` and `'Add timer pressure'` — no existing phase's count changes.

---

### Task 1: Insert the "First Progressions" phase

**Files:**
- Modify: `script.js:224-226` (`LEARNING_PATH` — insert 3 new stages between `"All Natural Minor"` and `"Add a Timer"`)
- Modify: `script.js:357-358` (`LEARNING_PATH_PHASES` — insert the new phase entry between `'Introduce minor'` and `'Add timer pressure'`)
- Test: `test-first-progressions.cjs`

**Interfaces:**
- Consumes: nothing from other tasks (this is the only task in the plan).
- Produces: nothing consumed elsewhere — this is a self-contained, additive feature.

- [ ] **Step 1: Write the failing test**

Create `test-first-progressions.cjs`:

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

  // --- LEARNING_PATH placement and content ---
  const pathCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    const stages = LEARNING_PATH.slice(idx, idx + 3);
    return {
      idx,
      prevName: LEARNING_PATH[idx - 1]?.name,
      nextName: LEARNING_PATH[idx + 3]?.name,
      names: stages.map(s => s.name),
      progressions: stages.map(s => s.progressions),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
      totalStages: LEARNING_PATH.length,
    };
  });
  check('the 3 new stages start right after "All Natural Minor"', pathCheck.prevName, 'All Natural Minor');
  check('"Add a Timer" immediately follows the 3 new stages', pathCheck.nextName, 'Add a Timer');
  check('stage names in order', pathCheck.names, ['Play Your First Song', 'Add a Turnaround', 'Four Chord Song']);
  check('cumulative progressions (1, then 2, then 3 entries)', pathCheck.progressions, [
    ['I–IV–V'],
    ['I–IV–V', 'IV–V–I'],
    ['I–IV–V', 'IV–V–I', 'I–V–vi–IV'],
  ]);
  check('all 3 stages are C only', pathCheck.notes, [['C'], ['C'], ['C']]);
  check('all 3 stages are untimed', pathCheck.timers, ['off', 'off', 'off']);
  check('LEARNING_PATH has 128 stages total (125 + 3 new)', pathCheck.totalStages, 128);

  // --- No duplicate stage names anywhere in the whole path (the collision risk this plan flagged) ---
  const nameUniqueness = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    return { uniqueDupes: [...new Set(dupes)] };
  });
  check('no two stages in LEARNING_PATH share the same name', nameUniqueness.uniqueDupes, []);

  // --- The existing late-phase stages covering the same progressions are untouched ---
  const lateStageCheck = await page.evaluate(() => {
    const s1 = LEARNING_PATH.find(s => s.name === 'Progression: I–IV–V');
    const s2 = LEARNING_PATH.find(s => s.name === 'Add IV–V–I');
    const s3 = LEARNING_PATH.find(s => s.name === 'Add I–V–vi–IV');
    return {
      s1Progressions: s1?.progressions,
      s2Progressions: s2?.progressions,
      s3Progressions: s3?.progressions,
    };
  });
  check('late-phase "Progression: I–IV–V" is untouched', lateStageCheck.s1Progressions, ['I–IV–V']);
  check('late-phase "Add IV–V–I" is untouched', lateStageCheck.s2Progressions, ['I–IV–V', 'IV–V–I']);
  check('late-phase "Add I–V–vi–IV" is untouched', lateStageCheck.s3Progressions, ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']);

  // --- LEARNING_PATH_PHASES ---
  const phaseCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH_PHASES.findIndex(p => p.name === 'First Progressions');
    return {
      idx,
      count: LEARNING_PATH_PHASES[idx]?.count,
      prevPhaseName: LEARNING_PATH_PHASES[idx - 1]?.name,
      nextPhaseName: LEARNING_PATH_PHASES[idx + 1]?.name,
      phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
      totalStages: LEARNING_PATH.length,
    };
  });
  checkTrue('"First Progressions" phase exists', phaseCheck.idx !== -1, null);
  check('"First Progressions" phase has count 3', phaseCheck.count, 3);
  check('"First Progressions" sits right after "Introduce minor"', phaseCheck.prevPhaseName, 'Introduce minor');
  check('"First Progressions" sits right before "Add timer pressure"', phaseCheck.nextPhaseName, 'Add timer pressure');
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);

  // --- applyStage() correctness ---
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Four Chord Song');
    applyStage(idx);
    return {
      iIvVChecked: document.querySelector('input[data-pattern="I–IV–V"]').checked,
      ivVIChecked: document.querySelector('input[data-pattern="IV–V–I"]').checked,
      iVViIVChecked: document.querySelector('input[data-pattern="I–V–vi–IV"]').checked,
      viIvIVChecked: document.querySelector('input[data-pattern="vi–IV–I–V"]').checked,
    };
  });
  check('applyStage() on "Four Chord Song" checks all 3 of its progressions', applyCheck, {
    iIvVChecked: true, ivVIChecked: true, iVViIVChecked: true, viIvIVChecked: false,
  });

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-first-progressions.cjs`
Expected: FAIL — `"Play Your First Song"` doesn't exist in `LEARNING_PATH` yet, cascading into failures on every subsequent check.

- [ ] **Step 3: Insert the 3 new stages**

Current code (`script.js:224-226`):

```javascript
  { name: 'All Natural Minor',   hint: 'Major and Minor in every natural key',                                                                    cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
  // ── Phase 4: Add timer pressure ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Add a Timer',         hint: 'Same chords — 15 seconds to respond',                                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '15' },
```

Replace with:

```javascript
  { name: 'All Natural Minor',   hint: 'Major and Minor in every natural key',                                                                    cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
  // ── Phase 3b: First Progressions ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Play Your First Song', hint: 'Your first real chord progression — three chords, one classic sound',                                    cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           timer: 'off' },
  { name: 'Add a Turnaround',    hint: 'Same three chords, different order — a classic turnaround',                                                cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I'],                                  timer: 'off' },
  { name: 'Four Chord Song',     hint: 'The real "four chord pop song" progression',                                                                cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     timer: 'off' },
  // ── Phase 4: Add timer pressure ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Add a Timer',         hint: 'Same chords — 15 seconds to respond',                                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '15' },
```

- [ ] **Step 4: Insert the "First Progressions" phase entry**

Current code (`script.js:357-358`):

```javascript
  { name: 'Introduce minor', count: 3 },
  { name: 'Add timer pressure', count: 3 },
```

Replace with:

```javascript
  { name: 'Introduce minor', count: 3 },
  { name: 'First Progressions', count: 3 },
  { name: 'Add timer pressure', count: 3 },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-first-progressions.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Update pre-existing tests with hardcoded stage-count assertions**

`grep -rn "125" test-*.cjs` (already run by the plan's author) found exactly 3 files, 4 assertions, all needing `125` → `128`:

In `test-all-paths-popup-redesign.cjs`, change:
```javascript
  check('LEARNING_PATH.length matches the expected 125 stages', phaseData.stageCount, 125);
```
to:
```javascript
  check('LEARNING_PATH.length matches the expected 128 stages', phaseData.stageCount, 128);
```
And change:
```javascript
  check('all 125 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 125);
```
to:
```javascript
  check('all 128 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 128);
```

In `test-left-hand-learning-path.cjs`, change:
```javascript
  check('LEARNING_PATH has 125 stages total (124 + 1 new Left Hand Shape stage)', phaseCheck.totalStages, 125);
```
to:
```javascript
  check('LEARNING_PATH has 128 stages total (124 + 1 Left Hand Shape + 3 First Progressions)', phaseCheck.totalStages, 128);
```

In `test-left-hand-shape-warmup.cjs`, change:
```javascript
  check('LEARNING_PATH has 125 stages total (124 + 1 new)', pathCheck.totalStages, 125);
```
to:
```javascript
  check('LEARNING_PATH has 128 stages total (124 + 1 Left Hand Shape + 3 First Progressions)', pathCheck.totalStages, 128);
```

If `grep -rn "125" test-*.cjs` finds anything beyond these 4 lines when you actually run it (a new test may have landed since this plan was written), treat any additional hit tied to the total stage count the same way; anything unrelated (a coincidental "125" in an unrelated context) should be left alone.

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-first-progressions.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-progression-curriculum-fix.cjs
node test-learning-stage-persistence.cjs
node test-left-hand-shape-warmup.cjs
node test-left-hand-mode-check.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
```

Expected: `RESULT: PASS` on all ten. If any fails, stop and investigate — do not assume it's unrelated without checking.

- [ ] **Step 8: Commit**

```bash
git add script.js test-first-progressions.cjs
git commit -m "Add First Progressions early teaser phase after minor is introduced"
```

(If Step 6 updated any pre-existing test files, `git add` those too before committing, in the same commit.)
