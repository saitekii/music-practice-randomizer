# Learning Path Key-Ramp Audit + Left-Hand Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim redundant one-key-at-a-time key ramps from Phases 6, 7, and 14 (key-fluency is already established well before any of them); fix `mpr_learning_stage`'s index-based persistence (flagged 3 times before, now actually breaking since this pass removes stages, not just inserts them); add a new "Left-Hand Voicing" phase integrating the existing Left-Hand chord mode into the curriculum.

**Architecture:** Pure data edits to the `LEARNING_PATH` array (remove specific stages, insert 5 new ones) plus two small, targeted mechanism changes: `applyStage()` gains a `leftHandMode` entry in its chord-checkbox set, and `getStageMastery()` gains a branch so left-hand stages track the `variations['Left Hand']` mastery bucket instead of the ordinary per-chord-type/per-root buckets (which would otherwise make them show "100% mastered" instantly, since those buckets are driven by earlier one-handed practice). The `mpr_learning_stage` persistence fix changes only the localStorage read/write format (name string instead of raw index) — `learningStage` stays an in-memory array index everywhere it's already used that way.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js` (no `index.html` changes needed anywhere in this plan; the `leftHandMode` checkbox already exists from a prior feature).
- No change to any *kept* stage's content fields (chords/scales/progressions/notes/timer/hint) in Phases 6, 7, or 14 — only the specifically-named redundant stages are removed.
- 3 test files hardcode an absolute `LEARNING_PATH.length` / `LEARNING_PATH_PHASES.length` total: `test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, `test-audit-fixes-scales-phase.cjs`. Per the design spec, these are updated **together, once, in Task 5** (the final task, once the true final total is known) — earlier tasks' regression sweeps deliberately exclude these 3 files. Do not "fix" them early; a mid-plan value would be wrong again by the next task anyway.
- `test-borrowed-chords-learning-path.cjs` currently also asserts an absolute `LEARNING_PATH.length` (125). Since Task 3 already substantially rewrites this file's other assertions (its subject, the Phase 14 stage sequence, changes completely), that one redundant absolute-total line is **removed** in Task 3 rather than updated — the 3 dedicated files above remain the sole source of truth for that number, one fewer place to go stale.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `checkTrue(label, condition, extra)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.
- Net stage-count math, verified against the live file, not just arithmetic on paper: 125 (current) − 1 (Task 1) − 3 (Task 2) − 6 (Task 3) + 5 (Task 5) = **120**. Phase count: 17 − 0 (Tasks 1-3 only change existing phase counts, not phase *count*) + 1 (Task 5's new phase) = **18**.

---

### Task 1: Trim Phase 6 (Triad inversions) — remove the redundant 2-key stage

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — remove `'Two Keys, Inverted'`; `LEARNING_PATH_PHASES` — `'Triad inversions'` count 9→8)
- Test: `test-trim-phase6-inversions.cjs`

**Interfaces:** No new functions. Produces nothing later tasks depend on (Tasks 1-3 are independent of each other; Task 5 inserts stages before Phase 6's first stage, which is unaffected by whether this task has run first — either order is safe, this plan just runs them in this sequence for simplicity).

- [ ] **Step 1: Write the failing test**

Create `test-trim-phase6-inversions.cjs`:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const removed = await page.evaluate(() => LEARNING_PATH.some(s => s.name === 'Two Keys, Inverted'));
  checkTrue('"Two Keys, Inverted" no longer exists', !removed, null);

  const adjacency = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    return {
      nextName: LEARNING_PATH[idx + 1]?.name,
      nextNotes: LEARNING_PATH[idx + 1]?.notes,
    };
  });
  check('"Natural Majors Inv." immediately follows "Meet Inversions"', adjacency.nextName, 'Natural Majors Inv.');
  check('"Natural Majors Inv." is at 7 natural keys (no 2-key intermediate stage anymore)', adjacency.nextNotes, ['C','D','E','F','G','A','B']);

  const stageCount = await page.evaluate(() => {
    const idxMeet = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    const idxMastery = LEARNING_PATH.findIndex(s => s.name === 'Triad Mastery');
    return idxMastery - idxMeet + 1;
  });
  check('Triad inversions phase now has 8 stages (was 9)', stageCount, 8);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions').count);
  check('LEARNING_PATH_PHASES "Triad inversions" count is 8', phaseCount, 8);

  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    applyStage(idx);
    return { cChecked: document.querySelector('input[data-note="C"]').checked, gChecked: document.querySelector('input[data-note="G"]').checked };
  });
  check('applyStage() on "Meet Inversions" checks C', applyCheck.cChecked, true);
  check('applyStage() on "Meet Inversions" leaves G unchecked (single key)', applyCheck.gChecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-trim-phase6-inversions.cjs`
Expected: FAIL on the "no longer exists" / adjacency / stage-count / phase-count checks — `'Two Keys, Inverted'` still exists today.

- [ ] **Step 3: Remove `'Two Keys, Inverted'` from `LEARNING_PATH`**

Current code (`script.js`, in the Phase 6 block):

```javascript
  { name: 'Meet Inversions',     hint: 'C Major in all three positions — root, 1st, and 2nd inversion. Same notes, different bass note',          cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Two Keys, Inverted',  hint: 'C and G Major — any inversion, no timer',                                                                 cats: ['catChords'],             notes: ['C','G'],                                                        chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Natural Majors Inv.', hint: 'All seven natural keys — Major chord, any inversion',                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
```

Replace with:

```javascript
  { name: 'Meet Inversions',     hint: 'C Major in all three positions — root, 1st, and 2nd inversion. Same notes, different bass note',          cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
  { name: 'Natural Majors Inv.', hint: 'All seven natural keys — Major chord, any inversion',                                                     cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
```

- [ ] **Step 4: Update `LEARNING_PATH_PHASES`**

Current code:

```javascript
  { name: 'Triad inversions', count: 9 },
```

Replace with:

```javascript
  { name: 'Triad inversions', count: 8 },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-trim-phase6-inversions.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js test-trim-phase6-inversions.cjs
git commit -m "Trim redundant 2-key stage from Triad inversions phase"
```

---

### Task 2: Trim Phase 7 (Major scales) — remove the redundant natural-key crawl

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — remove `'Add G Major Scale'`, `'Add F Major Scale'`, `'Common Majors'`; `LEARNING_PATH_PHASES` — `'Major scales'` count 7→4)
- Test: `test-trim-phase7-scales.cjs`

**Interfaces:** No new functions. Independent of Task 1 and Task 3.

- [ ] **Step 1: Write the failing test**

Create `test-trim-phase7-scales.cjs`:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const stillPresent = await page.evaluate(() =>
    ['Add G Major Scale', 'Add F Major Scale', 'Common Majors'].filter(n => LEARNING_PATH.some(s => s.name === n))
  );
  check('the 3 redundant key-ramp stages no longer exist', stillPresent, []);

  const adjacency = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    return {
      nextName: LEARNING_PATH[idx + 1]?.name,
      nextNotes: LEARNING_PATH[idx + 1]?.notes,
    };
  });
  check('"All Natural Scales" immediately follows "First Scale"', adjacency.nextName, 'All Natural Scales');
  check('"All Natural Scales" is at 7 natural keys', adjacency.nextNotes, ['C','D','E','F','G','A','B']);

  const stageCount = await page.evaluate(() => {
    const idxFirst = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const idxAll12 = LEARNING_PATH.findIndex(s => s.name === 'All 12 Scales');
    return idxAll12 - idxFirst + 1;
  });
  check('Major scales phase now has 4 stages (was 7)', stageCount, 4);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Major scales').count);
  check('LEARNING_PATH_PHASES "Major scales" count is 4', phaseCount, 4);

  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'All Natural Scales');
    applyStage(idx);
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      bChecked: document.querySelector('input[data-note="B"]').checked,
      c2Checked: document.querySelector('input[data-note="C#"]').checked,
    };
  });
  check('applyStage() on "All Natural Scales" checks C', applyCheck.cChecked, true);
  check('applyStage() on "All Natural Scales" checks B (7th natural)', applyCheck.bChecked, true);
  check('applyStage() on "All Natural Scales" leaves C# unchecked (not all 12 keys)', applyCheck.c2Checked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-trim-phase7-scales.cjs`
Expected: FAIL — all 3 stages still exist today, so `stillPresent` is non-empty, adjacency is wrong, counts are 7/7 instead of 4/4.

- [ ] **Step 3: Remove the 3 redundant stages from `LEARNING_PATH`**

Current code (`script.js`, in the Phase 7 block):

```javascript
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Add G Major Scale',   hint: 'C and G Major scales',                                                                                    cats: ['catScales'],             notes: ['C','G'],                                                        chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Add F Major Scale',   hint: 'C, G and F',                                                                                              cats: ['catScales'],             notes: ['C','F','G'],                                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Common Majors',       hint: 'Six keys: C, G, D, F, A, E Major scales',                                                                 cats: ['catScales'],             notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'All Natural Scales',  hint: 'Major scale across all seven natural notes',                                                              cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
```

Replace with:

```javascript
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'All Natural Scales',  hint: 'Major scale across all seven natural notes',                                                              cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
```

- [ ] **Step 4: Update `LEARNING_PATH_PHASES`**

Current code:

```javascript
  { name: 'Major scales', count: 7 },
```

Replace with:

```javascript
  { name: 'Major scales', count: 4 },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-trim-phase7-scales.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js test-trim-phase7-scales.cjs
git commit -m "Trim redundant natural-key crawl from Major scales phase"
```

---

### Task 3: Trim Phase 14 (Functional harmony) — remove the 5-stage ramp and the 2-key borrowed-content stage

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — remove `'Progressions, Two Keys'`, `'Progressions, Three Keys'`, `'Progressions, Add D'`, `'Progressions, Add A'`, `'Progressions, Add E'`, `'Borrowed Content, Two Keys'`; `LEARNING_PATH_PHASES` — `'Functional harmony'` count 28→22)
- Modify: `test-progression-curriculum-fix.cjs` (rewrite the sections that test the now-removed 5-stage ramp)
- Modify: `test-borrowed-chords-learning-path.cjs` (rewrite to reflect 5 stages instead of 6, and the new adjacency)
- Test: the two modified files above serve as this task's test coverage — no new file needed.

**Interfaces:** No new functions. Independent of Task 1 and Task 2. This is the biggest single removal in the plan (6 stages) and the only task that requires rewriting pre-existing tests wholesale rather than just adding new ones, since those tests directly assert on the stages being removed.

- [ ] **Step 1: Run the two affected tests to see current (passing) state**

Run: `node test-progression-curriculum-fix.cjs` and `node test-borrowed-chords-learning-path.cjs`
Expected: both `RESULT: PASS` — this is the baseline before the rewrite. (This task's "RED" step is the rewritten assertions in Step 2 failing against the *current* `LEARNING_PATH`, not a fresh test against no implementation — the mechanism already exists, only the data is changing.)

- [ ] **Step 2: Rewrite `test-progression-curriculum-fix.cjs`**

Current code (`test-progression-curriculum-fix.cjs:44-102`):

```javascript
  // --- 11 stages now exist between 'More Minor Progressions' and 'Functional, Nat. Keys' (5 ramps + 6 borrowed chord stages) ---
  const rampCheck = await page.evaluate(([all26]) => {
    const idxMoreMinor = LEARNING_PATH.findIndex(s => s.name === 'More Minor Progressions');
    const idxNatKeys    = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    const between = LEARNING_PATH.slice(idxMoreMinor + 1, idxNatKeys);
    const expectedNames = ['Progressions, Two Keys', 'Progressions, Three Keys', 'Progressions, Add D', 'Progressions, Add A', 'Progressions, Add E', 'Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords', 'Raised Mediants', 'Minor Borrowed — ♭II', 'Borrowed Content, Two Keys'];
    const expectedNotes  = [['C','G'], ['C','F','G'], ['C','D','F','G'], ['C','D','F','G','A'], ['C','D','E','F','G','A'], ['C'], ['C'], ['C'], ['C'], ['C'], ['C','G']];
    return {
      count: between.length,
      namesMatch: between.map(s => s.name).every((n, i) => n === expectedNames[i]),
      notesMatch: between.every((s, i) => JSON.stringify(s.notes) === JSON.stringify(expectedNotes[i])),
      progressionsMatch: between.slice(0, 5).every(s => all26.every(p => (s.progressions || []).includes(p)) && (s.progressions || []).length === 26),
      allHaveNoTimer: between.every(s => s.timer === 'off'),
      allHaveEmptyChordsScales: between.every(s => (s.chords || []).length === 0 && (s.scales || []).length === 0),
      immediatelyAdjacent: idxNatKeys === idxMoreMinor + 12,
    };
  }, [ALL_26]);
  check('exactly 11 stages inserted between More Minor Progressions and Functional, Nat. Keys (5 ramps + 6 borrowed)', rampCheck.count, 11);
  checkTrue('the 11 stages are named and ordered correctly', rampCheck.namesMatch, null);
  checkTrue('each stage has the correct notes array', rampCheck.notesMatch, null);
  checkTrue('each ramp stage keeps all 26 progressions enabled', rampCheck.progressionsMatch, null);
  checkTrue('each ramp stage has timer: off', rampCheck.allHaveNoTimer, null);
  checkTrue('each ramp stage has empty chords/scales arrays', rampCheck.allHaveEmptyChordsScales, null);
  checkTrue('Functional, Nat. Keys sits exactly 12 stages after More Minor Progressions (11 between + itself)', rampCheck.immediatelyAdjacent, null);

  // --- 'Functional, Nat. Keys' and 'Functional, All 12' remain unchanged ---
  const tailCheck = await page.evaluate(() => {
    const natKeys = LEARNING_PATH.find(s => s.name === 'Functional, Nat. Keys');
    const all12   = LEARNING_PATH.find(s => s.name === 'Functional, All 12');
    return {
      natKeysNotes: natKeys ? natKeys.notes : null,
      all12Notes:   all12 ? all12.notes : null,
    };
  });
  check('Functional, Nat. Keys notes unchanged (7 naturals)', JSON.stringify(tailCheck.natKeysNotes), JSON.stringify(['C','D','E','F','G','A','B']));
  check('Functional, All 12 notes unchanged (12 keys)', JSON.stringify(tailCheck.all12Notes), JSON.stringify(['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']));

  // --- applyStage() on 'Progressions, Two Keys' sets notes to C,G and checks all 26 progressions ---
  // Guarded: this stage doesn't exist until Step 3's edit lands, and calling applyStage(-1) would
  // throw (LEARNING_PATH[-1] is undefined), crashing page.evaluate before any result comes back.
  const twoKeysApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progressions, Two Keys');
    if (idx === -1) return { found: false };
    applyStage(idx);
    return {
      found: true,
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      dUnchecked: document.querySelector('input[data-note="D"]').checked,
      allProgressionsChecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
    };
  }, [ALL_26]);
  checkTrue('Progressions, Two Keys stage exists', twoKeysApplyCheck.found, null);
  if (twoKeysApplyCheck.found) {
    check('applyStage() on Progressions, Two Keys checks C', twoKeysApplyCheck.cChecked, true);
    check('applyStage() on Progressions, Two Keys checks G', twoKeysApplyCheck.gChecked, true);
    check('applyStage() on Progressions, Two Keys leaves D unchecked', twoKeysApplyCheck.dUnchecked, false);
    checkTrue('applyStage() on Progressions, Two Keys checks all 26 progression checkboxes', twoKeysApplyCheck.allProgressionsChecked, null);
  }
```

Replace with:

```javascript
  // --- The old 5-stage key ramp and the 2-key borrowed-content stage were removed by the key-ramp
  //     audit (redundant: key fluency is already established well before Phase 14). Only the 5 C-only
  //     borrowed-content stages remain between 'More Minor Progressions' and 'Functional, Nat. Keys'. ---
  const rampCheck = await page.evaluate(([all26]) => {
    const idxMoreMinor = LEARNING_PATH.findIndex(s => s.name === 'More Minor Progressions');
    const idxNatKeys    = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    const between = LEARNING_PATH.slice(idxMoreMinor + 1, idxNatKeys);
    const expectedNames = ['Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords', 'Raised Mediants', 'Minor Borrowed — ♭II'];
    const removedNames  = ['Progressions, Two Keys', 'Progressions, Three Keys', 'Progressions, Add D', 'Progressions, Add A', 'Progressions, Add E', 'Borrowed Content, Two Keys'];
    return {
      count: between.length,
      namesMatch: between.map(s => s.name).every((n, i) => n === expectedNames[i]),
      allCOnly: between.every(s => JSON.stringify(s.notes) === JSON.stringify(['C'])),
      allHaveNoTimer: between.every(s => s.timer === 'off'),
      immediatelyAdjacent: idxNatKeys === idxMoreMinor + 6,
      noneOfTheRemovedStagesExist: !LEARNING_PATH.some(s => removedNames.includes(s.name)),
    };
  }, [ALL_26]);
  check('exactly 5 stages remain between More Minor Progressions and Functional, Nat. Keys (down from 11)', rampCheck.count, 5);
  checkTrue('the 5 stages are named and ordered correctly', rampCheck.namesMatch, null);
  checkTrue('all 5 stages are C only (no key ramp needed anymore)', rampCheck.allCOnly, null);
  checkTrue('each stage has timer: off', rampCheck.allHaveNoTimer, null);
  checkTrue('Functional, Nat. Keys sits exactly 6 stages after More Minor Progressions (5 between + itself)', rampCheck.immediatelyAdjacent, null);
  checkTrue('all 6 removed stages (5 old ramp + Borrowed Content, Two Keys) are gone', rampCheck.noneOfTheRemovedStagesExist, null);

  // --- 'Functional, Nat. Keys' and 'Functional, All 12' remain unchanged ---
  const tailCheck = await page.evaluate(() => {
    const natKeys = LEARNING_PATH.find(s => s.name === 'Functional, Nat. Keys');
    const all12   = LEARNING_PATH.find(s => s.name === 'Functional, All 12');
    return {
      natKeysNotes: natKeys ? natKeys.notes : null,
      all12Notes:   all12 ? all12.notes : null,
    };
  });
  check('Functional, Nat. Keys notes unchanged (7 naturals)', JSON.stringify(tailCheck.natKeysNotes), JSON.stringify(['C','D','E','F','G','A','B']));
  check('Functional, All 12 notes unchanged (12 keys)', JSON.stringify(tailCheck.all12Notes), JSON.stringify(['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']));

  // --- applyStage() on 'Functional, Nat. Keys' (the stage that now immediately follows the C-only
  //     content buildup) still checks all 26+ progressions via its no-progressions-field fallback ---
  const natKeysApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    applyStage(idx);
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      dChecked: document.querySelector('input[data-note="D"]').checked,
      allProgressionsChecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
    };
  }, [ALL_26]);
  check('applyStage() on Functional, Nat. Keys checks C', natKeysApplyCheck.cChecked, true);
  check('applyStage() on Functional, Nat. Keys checks G', natKeysApplyCheck.gChecked, true);
  check('applyStage() on Functional, Nat. Keys checks D (all 7 naturals, not a partial ramp)', natKeysApplyCheck.dChecked, true);
  checkTrue('applyStage() on Functional, Nat. Keys checks all 26 original progression checkboxes (fallback still works)', natKeysApplyCheck.allProgressionsChecked, null);
```

- [ ] **Step 3: Replace `test-borrowed-chords-learning-path.cjs` entirely**

Current file: as committed in the prior session (6-stage version, asserts an absolute 125-stage total).

Replace the entire file with:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const stageData = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    const stages = LEARNING_PATH.slice(idx, idx + 5);
    return {
      idx,
      afterMoreMinor: LEARNING_PATH[idx - 1]?.name === 'More Minor Progressions',
      beforeNatKeys: LEARNING_PATH[idx + 5]?.name === 'Functional, Nat. Keys',
      names: stages.map(s => s.name),
      counts: stages.map(s => (s.progressions || []).length),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 5 borrowed-chord stages start right after "More Minor Progressions" (the old 5-stage key ramp and the 2-key stage were removed by the key-ramp audit)', stageData.afterMoreMinor, JSON.stringify(stageData.names));
  checkTrue('"Functional, Nat. Keys" immediately follows the 5 stages', stageData.beforeNatKeys, null);
  check('stage names in order', stageData.names, [
    'Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords',
    'Raised Mediants', 'Minor Borrowed — ♭II',
  ]);
  check('cumulative progression counts', stageData.counts, [34, 57, 70, 79, 81]);
  check('all 5 stages are timer off', stageData.timers, ['off','off','off','off','off']);
  check('all 5 stages are C only (no key ramp needed here anymore)', stageData.notes, [['C'],['C'],['C'],['C'],['C']]);

  const contentSpotCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    const [intro, single, combo, mediants, minor] = LEARNING_PATH.slice(idx, idx + 5);
    return {
      introHasStandalones: ['iv','♭II','♭III','♭VI','♭VII','II','III','VI'].every(p => intro.progressions.includes(p)),
      singleHasNewOnes: ['I–♭VII–IV','vi–IV–I','V–ii'].every(p => single.progressions.includes(p)),
      singleLacksCombo: !single.progressions.includes('I–♭VI–♭VII–I'), // belongs to stage 3
      comboHasNewOnes: ['I–♭VI–♭VII–I','I–vi–ii–♭II'].every(p => combo.progressions.includes(p)),
      mediantsHasNewOnes: ['I–VI–ii–V','I–III–vi–II–ii–V–I'].every(p => mediants.progressions.includes(p)),
      minorHasNewOnes: ['♭II','i–♭II–VII–i'].every(p => minor.progressions.includes(p)),
    };
  });
  checkTrue('stage 1 has the 8 standalone borrowed chords', contentSpotCheck.introHasStandalones, null);
  checkTrue('stage 2 has its new single-borrowed-chord progressions', contentSpotCheck.singleHasNewOnes, null);
  checkTrue('stage 2 does not yet have stage-3-only combos', contentSpotCheck.singleLacksCombo, null);
  checkTrue('stage 3 has its new two-borrowed-chord combos', contentSpotCheck.comboHasNewOnes, null);
  checkTrue('stage 4 has its new raised-mediant progressions', contentSpotCheck.mediantsHasNewOnes, null);
  checkTrue('stage 5 has the new minor content', contentSpotCheck.minorHasNewOnes, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    applyStage(idx);
    return {
      ivChecked: document.querySelector('input[data-pattern="iv"]').checked,
      flatVIIChecked: document.querySelector('input[data-pattern="♭VII"]').checked,
      singleOnlyStillUnchecked: document.querySelector('input[data-pattern="I–♭VII–IV"]').checked, // belongs to stage 2, not 1
    };
  });
  check('applyStage() on "Borrowed Chords — Intro" checks the new standalone chords', applyStageCheck.ivChecked, true);
  check('applyStage() checks ♭VII too', applyStageCheck.flatVIIChecked, true);
  check('applyStage() leaves stage-2-only progressions unchecked', applyStageCheck.singleOnlyStillUnchecked, false);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is 22 (28 minus the 6 redundant key-ramp stages removed by the key-ramp audit)', phaseCheck.functionalHarmonyCount, 22);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

Note: the absolute `LEARNING_PATH.length` assertion (125, then later 120) is deliberately **not** re-added here — it's redundant with the 3 dedicated cross-cutting test files (see Global Constraints), and this file no longer needs to track a number that isn't really about its own subject.

- [ ] **Step 4: Run both rewritten tests to verify they fail against current `LEARNING_PATH`**

Run: `node test-progression-curriculum-fix.cjs` and `node test-borrowed-chords-learning-path.cjs`
Expected: both FAIL — the rewritten assertions expect the trimmed shape (5 stages, adjacency to `'More Minor Progressions'`), which doesn't exist yet.

- [ ] **Step 5: Remove the 6 stages from `LEARNING_PATH`**

Current code (`script.js`, spanning from the end of the C-only content buildup through the start of `'Functional, Nat. Keys'`):

```javascript
  { name: 'Progressions, Two Keys',     hint: 'Same 26 progressions — now in C and G',                                                             cats: ['catFunctional'], notes: ['C','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Three Keys',   hint: 'C, F and G',                                                                                        cats: ['catFunctional'], notes: ['C','F','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add D',        hint: 'C, D, F, G',                                                                                        cats: ['catFunctional'], notes: ['C','D','F','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add A',        hint: 'C, D, F, G, A',                                                                                     cats: ['catFunctional'], notes: ['C','D','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add E',        hint: 'C, D, E, F, G, A — one key short of all naturals',                                                  cats: ['catFunctional'], notes: ['C','D','E','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Borrowed Chords — Intro',          hint: 'Eight chords borrowed from outside the key — play each on its own before combining them',       cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI'], timer: 'off' },
  { name: 'Single Borrowed Chord Progressions',hint: 'Each of these progressions uses exactly one borrowed chord',                                    cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii'], timer: 'off' },
  { name: 'Combining Borrowed Chords',        hint: 'Now two borrowed chords appear in the same progression',                                        cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III'], timer: 'off' },
  { name: 'Raised Mediants',                  hint: 'A different kind of borrowed chord — major triads on scale degrees that are normally minor',      cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV'], timer: 'off' },
  { name: 'Minor Borrowed — ♭II',             hint: 'The Neapolitan chord in a minor key — same borrowed relationship, different tonic mode',          cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Borrowed Content, Two Keys',       hint: 'Everything so far — now in C and G',                                                             cats: ['catFunctional'], notes: ['C','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace with (the 5 kept borrowed-chord stages, unchanged, now falling straight into the pre-existing `'Functional, Nat. Keys'` catch-all):

```javascript
  { name: 'Borrowed Chords — Intro',          hint: 'Eight chords borrowed from outside the key — play each on its own before combining them',       cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI'], timer: 'off' },
  { name: 'Single Borrowed Chord Progressions',hint: 'Each of these progressions uses exactly one borrowed chord',                                    cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii'], timer: 'off' },
  { name: 'Combining Borrowed Chords',        hint: 'Now two borrowed chords appear in the same progression',                                        cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III'], timer: 'off' },
  { name: 'Raised Mediants',                  hint: 'A different kind of borrowed chord — major triads on scale degrees that are normally minor',      cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV'], timer: 'off' },
  { name: 'Minor Borrowed — ♭II',             hint: 'The Neapolitan chord in a minor key — same borrowed relationship, different tonic mode',          cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

- [ ] **Step 6: Update `LEARNING_PATH_PHASES`**

Current code:

```javascript
  { name: 'Functional harmony', count: 28 },
```

Replace with:

```javascript
  { name: 'Functional harmony', count: 22 },
```

- [ ] **Step 7: Run both tests to verify they pass**

Run: `node test-progression-curriculum-fix.cjs` and `node test-borrowed-chords-learning-path.cjs`
Expected: both all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Commit**

```bash
git add script.js test-progression-curriculum-fix.cjs test-borrowed-chords-learning-path.cjs
git commit -m "Trim redundant 5-stage key ramp and 2-key stage from Functional harmony phase"
```

---

### Task 4: Fix `mpr_learning_stage` to persist by stage name, not array index

**Files:**
- Modify: `script.js` (6 call sites: `startPathBtn`, `stagePrevBtn`, `stageNextBtn`, stage-list row click, startup load, onboarding "beginner" choice, plus the JSON-import handler's assignment logic)
- Modify: `test-all-paths-popup-redesign.cjs` (line ~43 sets `mpr_learning_stage` to a raw index directly — must become a name lookup, or this test breaks under the new format)
- Test: `test-learning-stage-persistence.cjs`

**Interfaces:** `learningStage` (module-level `let`, already exists) stays an in-memory array index everywhere — no change to how it's *read* for display/navigation/mastery logic. Only the localStorage read/write format changes. Independent of Tasks 1-3 and Task 5 (works correctly against any `LEARNING_PATH` shape, since it only ever looks up by `.name`).

- [ ] **Step 1: Write the failing test**

Create `test-learning-stage-persistence.cjs`:

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

  // Starting the path stores a stage NAME, not a raw numeric index
  const startCheck = await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    return { stored: localStorage.getItem('mpr_learning_stage'), expectedName: LEARNING_PATH[0].name };
  });
  check('starting the path stores the stage name in localStorage', startCheck.stored, startCheck.expectedName);
  checkTrue('the stored value is not a bare numeric index', isNaN(Number(startCheck.stored)), null);

  // Next/Prev also store names
  const navCheck = await page.evaluate(() => {
    document.getElementById('stageNextBtn').click();
    const afterNext = localStorage.getItem('mpr_learning_stage');
    document.getElementById('stagePrevBtn').click();
    const afterPrev = localStorage.getItem('mpr_learning_stage');
    return { afterNext, afterPrev, name1: LEARNING_PATH[1].name, name0: LEARNING_PATH[0].name };
  });
  check('Next stores the new stage\'s name', navCheck.afterNext, navCheck.name1);
  check('Prev stores the stage name it lands back on', navCheck.afterPrev, navCheck.name0);

  // Reload restores position by name lookup
  await page.evaluate(() => location.reload());
  await page.waitForTimeout(500);
  const reloadCheck = await page.evaluate(() => learningStage);
  check('reload restores learningStage to the same index via name lookup', reloadCheck, 0);

  // A pre-existing numeric-format save (simulating a pre-migration user) resets cleanly to "not on path"
  await page.evaluate(() => { localStorage.setItem('mpr_learning_stage', '42'); location.reload(); });
  await page.waitForTimeout(500);
  const afterMigration = await page.evaluate(() => learningStage);
  check('an old numeric-format save resets to -1 (not on path) instead of landing on the wrong stage', afterMigration, -1);

  // Clicking a stage-list row stores that stage's name
  await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    document.getElementById('showStageListBtn').click();
  });
  await page.waitForTimeout(200);
  const rowClickCheck = await page.evaluate(() => {
    const openBody = Array.from(document.querySelectorAll('.stage-list-phase-body')).find(b => !b.classList.contains('collapsed'));
    const firstRow = openBody.querySelector('.stage-list-row');
    const idx = parseInt(firstRow.dataset.idx);
    firstRow.click();
    return { stored: localStorage.getItem('mpr_learning_stage'), expectedName: LEARNING_PATH[idx].name };
  });
  check('clicking a stage-list row stores that stage\'s name', rowClickCheck.stored, rowClickCheck.expectedName);

  // Export/import round-trip via the real file-input flow (Playwright can set files on a hidden input directly)
  await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    document.getElementById('stageNextBtn').click();
    document.getElementById('stageNextBtn').click();
  });
  const exportedName = await page.evaluate(() => localStorage.getItem('mpr_learning_stage'));
  checkTrue('export captures a stage name, not a numeric index', isNaN(Number(exportedName)), null);
  const backupJson = JSON.stringify({ learning_stage: exportedName });
  await page.evaluate(() => { localStorage.removeItem('mpr_learning_stage'); learningStage = -1; }); // simulate leaving the path
  await page.setInputFiles('#importFileInput', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupJson) });
  await page.waitForTimeout(300);
  const afterImport = await page.evaluate(() => learningStage);
  check('importing a backup with a stage-name learning_stage restores the correct index', afterImport, 2);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-learning-stage-persistence.cjs`
Expected: FAIL on the "not a bare numeric index" checks (today's format IS a bare numeric index) and the "old numeric-format save resets to -1" check (today it's read via `parseInt` + bounds check, so `'42'` is accepted as a valid index rather than rejected).

- [ ] **Step 3: Fix `startPathBtn`'s click handler**

Current code (`script.js`):

```javascript
startPathBtn.addEventListener('click', () => {
  learningStage = 0;
  localStorage.setItem('mpr_learning_stage', '0');
  updateLearningUI();
  applyStage(0);
});
```

Replace with:

```javascript
startPathBtn.addEventListener('click', () => {
  learningStage = 0;
  localStorage.setItem('mpr_learning_stage', LEARNING_PATH[0].name);
  updateLearningUI();
  applyStage(0);
});
```

- [ ] **Step 4: Fix `stagePrevBtn` and `stageNextBtn`'s click handlers**

Current code:

```javascript
stagePrevBtn.addEventListener('click', () => {
  if (learningStage <= 0) return;
  learningStage--;
  localStorage.setItem('mpr_learning_stage', String(learningStage));
  updateLearningUI();
  applyStage(learningStage);
});

stageNextBtn.addEventListener('click', () => {
  if (learningStage >= LEARNING_PATH.length - 1) return;
  learningStage++;
  localStorage.setItem('mpr_learning_stage', String(learningStage));
  updateLearningUI();
  applyStage(learningStage);
});
```

Replace with:

```javascript
stagePrevBtn.addEventListener('click', () => {
  if (learningStage <= 0) return;
  learningStage--;
  localStorage.setItem('mpr_learning_stage', LEARNING_PATH[learningStage].name);
  updateLearningUI();
  applyStage(learningStage);
});

stageNextBtn.addEventListener('click', () => {
  if (learningStage >= LEARNING_PATH.length - 1) return;
  learningStage++;
  localStorage.setItem('mpr_learning_stage', LEARNING_PATH[learningStage].name);
  updateLearningUI();
  applyStage(learningStage);
});
```

- [ ] **Step 5: Fix the stage-list row click handler**

Current code:

```javascript
  const row = e.target.closest('.stage-list-row');
  if (!row) return;
  const idx = parseInt(row.dataset.idx);
  if (isNaN(idx)) return;
  learningStage = idx;
  localStorage.setItem('mpr_learning_stage', String(idx));
  updateLearningUI();
  applyStage(idx);
  document.getElementById('stageListModal').classList.add('hidden');
});
```

Replace with:

```javascript
  const row = e.target.closest('.stage-list-row');
  if (!row) return;
  const idx = parseInt(row.dataset.idx);
  if (isNaN(idx)) return;
  learningStage = idx;
  localStorage.setItem('mpr_learning_stage', LEARNING_PATH[idx].name);
  updateLearningUI();
  applyStage(idx);
  document.getElementById('stageListModal').classList.add('hidden');
});
```

- [ ] **Step 6: Fix the onboarding "beginner" choice handler**

Current code:

```javascript
document.querySelectorAll('.onboard-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const c = btn.dataset.choice;
    if (c === 'beginner') {
      learningStage = 0;
      localStorage.setItem('mpr_learning_stage', '0');
      updateLearningUI();
      applyStage(0);
      document.getElementById('onboardOverlay').classList.add('hidden');
```

Replace with:

```javascript
document.querySelectorAll('.onboard-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const c = btn.dataset.choice;
    if (c === 'beginner') {
      learningStage = 0;
      localStorage.setItem('mpr_learning_stage', LEARNING_PATH[0].name);
      updateLearningUI();
      applyStage(0);
      document.getElementById('onboardOverlay').classList.add('hidden');
```

- [ ] **Step 7: Fix the startup load logic**

Current code:

```javascript
const _savedStage = parseInt(localStorage.getItem('mpr_learning_stage') ?? '-1');
if (!isNaN(_savedStage) && _savedStage >= 0 && _savedStage < LEARNING_PATH.length) {
  learningStage = _savedStage;
}
updateLearningUI();
```

Replace with:

```javascript
const _savedStageName = localStorage.getItem('mpr_learning_stage');
const _savedStageIdx  = _savedStageName ? LEARNING_PATH.findIndex(s => s.name === _savedStageName) : -1;
if (_savedStageIdx >= 0) {
  learningStage = _savedStageIdx;
}
updateLearningUI();
```

This automatically handles migration with no special-case code: a pre-existing numeric-format save (e.g. `"42"`) will never equal any stage's `.name`, so `findIndex` naturally returns `-1` — the same "not on path" state as if the key were absent.

- [ ] **Step 8: Fix the JSON-import handler's assignment**

Current code:

```javascript
      if (data.learning_stage != null) {
        localStorage.setItem('mpr_learning_stage', data.learning_stage);
        learningStage = parseInt(data.learning_stage) ?? -1;
        updateLearningUI();
        restored.push('learning stage');
      }
```

Replace with:

```javascript
      if (data.learning_stage != null) {
        localStorage.setItem('mpr_learning_stage', data.learning_stage);
        learningStage = LEARNING_PATH.findIndex(s => s.name === data.learning_stage);
        updateLearningUI();
        restored.push('learning stage');
      }
```

(`exportJSON()`'s `learning_stage: localStorage.getItem('mpr_learning_stage')` line needs no change — it already just passes through whatever string is stored, which is now a name.)

- [ ] **Step 9: Fix `test-all-paths-popup-redesign.cjs`'s raw-index usage**

Current code (`test-all-paths-popup-redesign.cjs`):

```javascript
  await page.evaluate(() => {
    localStorage.setItem('mpr_learning_stage', '20'); // an arbitrary mid-path stage
    location.reload();
  });
```

Replace with:

```javascript
  await page.evaluate(() => {
    localStorage.setItem('mpr_learning_stage', LEARNING_PATH[20].name); // an arbitrary mid-path stage
    location.reload();
  });
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `node test-learning-stage-persistence.cjs` and `node test-all-paths-popup-redesign.cjs`
Expected: both all `PASS`, `RESULT: PASS`. (`test-all-paths-popup-redesign.cjs`'s own absolute-total assertions are still stale at this point per the Global Constraints — Task 5 fixes those. Everything else in it, including the stage-20 round-trip this step fixes, should pass now.)

- [ ] **Step 11: Run the broader regression sweep**

```bash
node test-trim-phase6-inversions.cjs
node test-trim-phase7-scales.cjs
node test-progression-curriculum-fix.cjs
node test-borrowed-chords-learning-path.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-chord-progressions.cjs
```

Expected: `RESULT: PASS` on all eight — confirms Tasks 1-4 don't interfere with each other or with the pre-existing progression mechanism.

- [ ] **Step 12: Commit**

```bash
git add script.js test-learning-stage-persistence.cjs test-all-paths-popup-redesign.cjs
git commit -m "Persist mpr_learning_stage by stage name instead of array index"
```

---

### Task 5: New "Left-Hand Voicing" phase + `getStageMastery()` isolation fix

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — insert 5 new stages between `'Speed Up'` and `'Meet Inversions'`; `LEARNING_PATH_PHASES` — insert `'Left-Hand Voicing'` entry; `applyStage()`'s `ALL_CHORDS`; `getStageMastery()`'s item-generation logic)
- Modify: `test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, `test-audit-fixes-scales-phase.cjs` (the 3 dedicated cross-cutting absolute-total assertions, updated together per Global Constraints, now that the true final total is known)
- Test: `test-left-hand-learning-path.cjs`

**Interfaces:**
- Consumes: `checked('leftHandMode')` and the existing `syncUI()` mutual-exclusion logic (both already exist, unmodified).
- Produces: nothing later tasks depend on — this is the last task.

- [ ] **Step 1: Write the failing test**

Create `test-left-hand-learning-path.cjs`:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const stageData = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    const stages = LEARNING_PATH.slice(idx, idx + 5);
    return {
      afterSpeedUp: LEARNING_PATH[idx - 1]?.name === 'Speed Up',
      beforeMeetInversions: LEARNING_PATH[idx + 5]?.name === 'Meet Inversions',
      names: stages.map(s => s.name),
      notes: stages.map(s => s.notes),
      chords: stages.map(s => s.chords),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 5 new stages start right after "Speed Up"', stageData.afterSpeedUp, JSON.stringify(stageData.names));
  checkTrue('"Meet Inversions" immediately follows the 5 new stages', stageData.beforeMeetInversions, null);
  check('stage names in order', stageData.names, ['Meet Left Hand', 'Left Hand, Nat. Keys', 'Add Minor, Left Hand', 'Left Hand Timer', 'Left Hand, All 12']);
  checkTrue('all 5 stages include leftHandMode and chordMajor', stageData.chords.every(c => c.includes('leftHandMode') && c.includes('chordMajor')), null);
  checkTrue('stages 3-5 also include chordMinor', stageData.chords.slice(2).every(c => c.includes('chordMinor')), null);
  checkTrue('stages 1-2 do not yet include chordMinor', stageData.chords.slice(0, 2).every(c => !c.includes('chordMinor')), null);
  check('notes progression: C, 7 naturals, 7 naturals, 7 naturals, 12 keys', stageData.notes, [
    ['C'],
    ['C','D','E','F','G','A','B'],
    ['C','D','E','F','G','A','B'],
    ['C','D','E','F','G','A','B'],
    ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],
  ]);
  check('timers: off, off, off, 15, 10', stageData.timers, ['off','off','off','15','10']);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Add Minor, Left Hand');
    applyStage(idx);
    return {
      leftHandChecked: document.getElementById('leftHandMode').checked,
      majorChecked: document.getElementById('chordMajor').checked,
      minorChecked: document.getElementById('chordMinor').checked,
      inversionsChecked: document.getElementById('inversions').checked,
      inversionsDisabled: document.getElementById('inversions').disabled,
    };
  });
  check('applyStage() checks leftHandMode', applyStageCheck.leftHandChecked, true);
  check('applyStage() checks chordMajor', applyStageCheck.majorChecked, true);
  check('applyStage() checks chordMinor', applyStageCheck.minorChecked, true);
  check('applyStage() leaves inversions unchecked (mutually exclusive with left-hand mode)', applyStageCheck.inversionsChecked, false);
  checkTrue('the inversions checkbox is disabled while left-hand mode is active (existing mutual-exclusion UI)', applyStageCheck.inversionsDisabled, null);

  const navigateAwayCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    applyStage(idx);
    return { leftHandStillChecked: document.getElementById('leftHandMode').checked };
  });
  check('navigating to a non-left-hand stage unchecks leftHandMode', navigateAwayCheck.leftHandStillChecked, false);

  const masteryCheck = await page.evaluate(() => {
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = { 'Left Hand': { ema: 1000, ema_slow: 1000, count: 5 } };
    adaptWeights.types = {};
    adaptWeights.roots = {};
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    return getStageMastery(idx);
  });
  check('a mastered Left Hand variation makes the stage ready, even with empty types/roots buckets', masteryCheck.ready, true);
  check('mastery percentage is 100 for a single fully-mastered Left Hand item', masteryCheck.pct, 100);

  const masteryIsolationCheck = await page.evaluate(() => {
    adaptWeights.variations = {}; // no left-hand practice yet
    adaptWeights.types = { 'Major': { ema: 1000, ema_slow: 1000, count: 5 } }; // Major IS mastered, but from earlier one-handed practice
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    return getStageMastery(idx);
  });
  check('a Left Hand stage does NOT show as mastered just because Major chord type is already mastered elsewhere (the bug this task fixes)', masteryIsolationCheck.ready, false);

  const regressionMasteryCheck = await page.evaluate(() => {
    adaptWeights.types = { 'Major': { ema: 1000, ema_slow: 1000, count: 5 } };
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Chord'); // a normal, pre-existing, non-left-hand stage
    return getStageMastery(idx);
  });
  check('a normal (non-left-hand) stage\'s mastery calculation is unaffected (regression)', regressionMasteryCheck.ready, true);

  const phaseCheck = await page.evaluate(() => ({
    phaseNames: LEARNING_PATH_PHASES.map(p => p.name),
    lhPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Left-Hand Voicing'),
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  checkTrue('"Left-Hand Voicing" phase exists', !!phaseCheck.lhPhase, null);
  check('"Left-Hand Voicing" phase has count 5', phaseCheck.lhPhase?.count, 5);
  check('"Left-Hand Voicing" sits right after "Accidentals one at a time"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') - 1], 'Accidentals one at a time');
  check('"Left-Hand Voicing" sits right before "Triad inversions"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') + 1], 'Triad inversions');
  check('LEARNING_PATH_PHASES has 18 entries total', phaseCheck.phaseNames.length, 18);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 120 stages total', phaseCheck.totalStages, 120);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-left-hand-learning-path.cjs`
Expected: FAIL — `'Meet Left Hand'` doesn't exist yet, cascading into failures on every subsequent check.

- [ ] **Step 3: Insert the 5 new stages into `LEARNING_PATH`**

Current code (end of Phase 5, start of Phase 6 — this line's exact position may have shifted from Task 1's edit; locate by content, not line number):

```javascript
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 6: Triad inversions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Inversions',     hint: 'C Major in all three positions — root, 1st, and 2nd inversion. Same notes, different bass note',          cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
```

Replace with:

```javascript
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Left Hand',      hint: 'Left hand plays root + 5th below middle C, right hand plays the full chord — two hands, one chord',        cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','leftHandMode'],                                                   scales: [],                             timer: 'off' },
  { name: 'Left Hand, Nat. Keys',hint: 'Same two-handed voicing — all seven natural keys, Major only',                                             cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','leftHandMode'],                                                   scales: [],                             timer: 'off' },
  { name: 'Add Minor, Left Hand',hint: 'Minor chords added to the two-handed voicing',                                                              cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','leftHandMode'],                                      scales: [],                             timer: 'off' },
  { name: 'Left Hand Timer',     hint: 'Same two-handed voicing — 15 seconds to respond',                                                           cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','leftHandMode'],                                      scales: [],                             timer: '15' },
  { name: 'Left Hand, All 12',   hint: 'Every key — two-handed Major and Minor voicings, 10 seconds',                                               cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','leftHandMode'],                                      scales: [],                             timer: '10' },
  // ── Phase 6: Triad inversions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Inversions',     hint: 'C Major in all three positions — root, 1st, and 2nd inversion. Same notes, different bass note',          cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','inversions'],                                                     scales: [],                             timer: 'off' },
```

- [ ] **Step 4: Insert the new phase into `LEARNING_PATH_PHASES`**

Current code (this task runs after Task 1, so `'Triad inversions'` already reads `count: 8`):

```javascript
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Triad inversions', count: 8 },
```

Replace with:

```javascript
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 5 },
  { name: 'Triad inversions', count: 8 },
```

- [ ] **Step 5: Extend `applyStage()`'s `ALL_CHORDS`**

Current code (`script.js`, inside `applyStage()`):

```javascript
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions']);
```

Replace with:

```javascript
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions', 'leftHandMode']);
```

- [ ] **Step 6: Fix `getStageMastery()` to isolate Left-Hand stages**

Current code (`script.js`):

```javascript
  const items = [];
  (stage.chords || []).forEach(id => {
    if (id === 'inversions') return;
    const ct = CHORD_TYPES.find(c => c.id === id);
    if (ct) items.push({ dim: 'types', key: ct.label });
  });
  (stage.scales || []).forEach(id => {
    const st = SCALE_TYPES.find(s => s.id === id);
    if (st && st.label) items.push({ dim: 'types', key: st.label });
  });
  (stage.progressions || []).forEach(p => items.push({ dim: 'variations', key: p }));
  const hasChordOrScale = (stage.cats || []).some(c => c === 'catChords' || c === 'catScales');
  if (hasChordOrScale) {
    (stage.notes || []).forEach(n => items.push({ dim: 'roots', key: n }));
  }
```

Replace with:

```javascript
  const items = [];
  const isLeftHandStage = (stage.chords || []).includes('leftHandMode');
  if (isLeftHandStage) {
    // Left-hand answers update ONLY adaptWeights.variations['Left Hand'] (see recordAdaptiveResult) --
    // never .types or .roots. Falling through to the normal per-chord-type/per-root items below would
    // pull mastery weights from earlier, unrelated one-handed practice, making this stage look
    // instantly "100% mastered" without a single left-hand answer given.
    items.push({ dim: 'variations', key: 'Left Hand' });
  } else {
    (stage.chords || []).forEach(id => {
      if (id === 'inversions') return;
      const ct = CHORD_TYPES.find(c => c.id === id);
      if (ct) items.push({ dim: 'types', key: ct.label });
    });
  }
  (stage.scales || []).forEach(id => {
    const st = SCALE_TYPES.find(s => s.id === id);
    if (st && st.label) items.push({ dim: 'types', key: st.label });
  });
  (stage.progressions || []).forEach(p => items.push({ dim: 'variations', key: p }));
  const hasChordOrScale = (stage.cats || []).some(c => c === 'catChords' || c === 'catScales');
  if (hasChordOrScale && !isLeftHandStage) {
    (stage.notes || []).forEach(n => items.push({ dim: 'roots', key: n }));
  }
```

- [ ] **Step 7: Update the 3 dedicated cross-cutting absolute-total test files**

In `test-all-paths-popup-redesign.cjs`, change:

```javascript
  check('LEARNING_PATH_PHASES has 17 entries', phaseData.phaseCount, 17);
```
to:
```javascript
  check('LEARNING_PATH_PHASES has 18 entries', phaseData.phaseCount, 18);
```

Change:
```javascript
  check('LEARNING_PATH.length matches the expected 125 stages', phaseData.stageCount, 125);
```
to:
```javascript
  check('LEARNING_PATH.length matches the expected 120 stages', phaseData.stageCount, 120);
```

Change:
```javascript
  check('17 phase headers rendered', groupedView.headerCount, 17);
  check('17 phase bodies rendered', groupedView.bodyCount, 17);
  check('all 125 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 125);
```
to:
```javascript
  check('18 phase headers rendered', groupedView.headerCount, 18);
  check('18 phase bodies rendered', groupedView.bodyCount, 18);
  check('all 120 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 120);
```

Change:
```javascript
  check('clearing search restores the 17 phase headers', clearedView, 17);
```
to:
```javascript
  check('clearing search restores the 18 phase headers', clearedView, 18);
```

In `test-audit-fixes-extended-chords-phase.cjs`, change:
```javascript
  check('LEARNING_PATH has 125 stages (119 + 6 new)', data.totalStages, 125);
```
to:
```javascript
  check('LEARNING_PATH has 120 stages (125 - 10 trimmed by the key-ramp audit + 5 new Left-Hand stages)', data.totalStages, 120);
```

In `test-audit-fixes-scales-phase.cjs`, change:
```javascript
  check('LEARNING_PATH has the expected 125 stages', data.totalStages, 125);
```
to:
```javascript
  check('LEARNING_PATH has the expected 120 stages', data.totalStages, 120);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-left-hand-learning-path.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 9: Run the full regression sweep**

```bash
node test-trim-phase6-inversions.cjs
node test-trim-phase7-scales.cjs
node test-progression-curriculum-fix.cjs
node test-borrowed-chords-learning-path.cjs
node test-learning-stage-persistence.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-chord-progressions.cjs
node test-borrowed-numerals-resolution.cjs
node test-borrowed-checkbox-gating.cjs
node test-borrowed-chords-content.cjs
node test-left-hand-mode-check.cjs
node test-left-hand-mode-ui.cjs
node test-inversion-stats-tracking.cjs
node test-chord-inversion-check.cjs
```

Expected: `RESULT: PASS` on all nineteen. This is the full closure check: every test touched by this plan, plus the pre-existing Left-Hand mode and progression/mastery tests this plan's changes are adjacent to but didn't intend to modify.

- [ ] **Step 10: Commit**

```bash
git add script.js test-left-hand-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs
git commit -m "Add Left-Hand Voicing phase to the Learning Path, with isolated mastery tracking"
```
