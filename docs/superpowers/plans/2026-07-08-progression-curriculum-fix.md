# Progression Curriculum Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix an early-unlock bug in the Functional Harmony Learning Path curriculum (the first stage silently enables all 26 chord progressions before any are introduced) and add a 5-stage key-diversity ramp before progressions jump to natural/all-12 keys.

**Architecture:** Pure data edit to the `LEARNING_PATH` array in `script.js`. No changes to `applyStage()`, `getStageMastery()`, or any other function — both `notes` and `progressions` fields are already handled generically by existing code.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No code logic changes — `LEARNING_PATH` array data only.
- New stages must use the exact same object shape/style as their neighbors (`cats: ['catFunctional']`, `chords: []`, `scales: []`, `timer: 'off'`).
- The 26-progression array used by the new stages must be the exact same 26 entries already used by `'More Minor Progressions'` — no reordering, no omissions.
- `'Functional, Nat. Keys'` and `'Functional, All 12'` stages must remain textually unchanged (content, not position).
- Playwright tests are `.cjs` files using `require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright')` and `file://` + `path.resolve(__dirname, 'index.html')`, run via `node <file>.cjs`.

---

### Task 1: Fix the early-unlock bug and add the key ramp

**Files:**
- Modify: `script.js` (the `LEARNING_PATH` array, currently spanning lines 172–297; the two edits land at the `'Functional Harmony — C'` entry (line 266) and between `'More Minor Progressions'` (line 278) and `'Functional, Nat. Keys'` (line 279))
- Test: `test-progression-curriculum-fix.cjs` (create, project root)

**Interfaces:**
- Consumes: `LEARNING_PATH` array shape (each entry: `{ name, hint, cats, notes, chords, scales, progressions?, timer }`), `applyStage(idx)` (already generic — reads `stage.progressions ?? ALL_PROGRESSIONS_ARRAY_COMPUTED_AT_RUNTIME`), `document.querySelector('input[data-pattern="..."]')` / `input[data-note="..."]` checkbox convention.
- Produces: nothing consumed by later tasks — this is the only task in this plan.

- [ ] **Step 1: Write the failing test**

Create `test-progression-curriculum-fix.cjs` with this exact content:

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

  const ALL_26 = ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'];

  // --- Bug fix: 'Functional Harmony — C' must have progressions: [] and updated hint ---
  const stage1Check = await page.evaluate(() => {
    const stage = LEARNING_PATH.find(s => s.name === 'Functional Harmony — C');
    return {
      exists: !!stage,
      progressionsLength: stage ? (stage.progressions || []).length : null,
      hint: stage ? stage.hint : null,
    };
  });
  checkTrue('Functional Harmony — C stage exists', stage1Check.exists, null);
  check('Functional Harmony — C has zero progressions (no early unlock)', stage1Check.progressionsLength, 0);
  check('Functional Harmony — C hint no longer mentions ii–V–I', stage1Check.hint, 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C');

  // --- applyStage() on that stage must leave every progression checkbox unchecked ---
  const stage1ApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    return all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false);
  }, [ALL_26]);
  checkTrue('applyStage() on Functional Harmony — C leaves all 26 progression checkboxes unchecked', stage1ApplyCheck, null);

  // --- 5 new key-ramp stages exist, in order, between 'More Minor Progressions' and 'Functional, Nat. Keys' ---
  const rampCheck = await page.evaluate(([all26]) => {
    const idxMoreMinor = LEARNING_PATH.findIndex(s => s.name === 'More Minor Progressions');
    const idxNatKeys    = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    const between = LEARNING_PATH.slice(idxMoreMinor + 1, idxNatKeys);
    const expectedNames = ['Progressions, Two Keys', 'Progressions, Three Keys', 'Progressions, Add D', 'Progressions, Add A', 'Progressions, Add E'];
    const expectedNotes  = [['C','G'], ['C','F','G'], ['C','D','F','G'], ['C','D','F','G','A'], ['C','D','E','F','G','A']];
    return {
      count: between.length,
      namesMatch: between.map(s => s.name).every((n, i) => n === expectedNames[i]),
      notesMatch: between.every((s, i) => JSON.stringify(s.notes) === JSON.stringify(expectedNotes[i])),
      progressionsMatch: between.every(s => all26.every(p => (s.progressions || []).includes(p)) && (s.progressions || []).length === 26),
      allHaveNoTimer: between.every(s => s.timer === 'off'),
      allHaveEmptyChordsScales: between.every(s => (s.chords || []).length === 0 && (s.scales || []).length === 0),
      immediatelyAdjacent: idxNatKeys === idxMoreMinor + 6,
    };
  }, [ALL_26]);
  check('exactly 5 stages inserted between More Minor Progressions and Functional, Nat. Keys', rampCheck.count, 5);
  checkTrue('the 5 stages are named and ordered correctly', rampCheck.namesMatch, null);
  checkTrue('each ramp stage has the correct notes array', rampCheck.notesMatch, null);
  checkTrue('each ramp stage keeps all 26 progressions enabled', rampCheck.progressionsMatch, null);
  checkTrue('each ramp stage has timer: off', rampCheck.allHaveNoTimer, null);
  checkTrue('each ramp stage has empty chords/scales arrays', rampCheck.allHaveEmptyChordsScales, null);
  checkTrue('Functional, Nat. Keys sits exactly 6 stages after More Minor Progressions (5 new + itself)', rampCheck.immediatelyAdjacent, null);

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

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-progression-curriculum-fix.cjs`

Expected: Several `FAIL` lines — at minimum `Functional Harmony — C has zero progressions` (currently the stage has no `progressions` field at all, so `(stage.progressions || []).length` is `0` from the `|| []` fallback in the test itself, so this specific check may spuriously pass; the hint-text check will `FAIL` since the current hint still says `'I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C'`), and the ramp-stage checks will `FAIL` (`exactly 5 stages inserted` will get `count: 0` since `Functional, Nat. Keys` is currently immediately after `More Minor Progressions`). Overall `RESULT: FAIL`.

- [ ] **Step 3: Make the two data edits in `script.js`**

First, fix the `'Functional Harmony — C'` stage (around line 266). Find this exact line:

```javascript
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C',                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace it with:

```javascript
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C',                       cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: [],                                 timer: 'off' },
```

Second, insert the 5 key-ramp stages. Find this exact line (the `'More Minor Progressions'` stage, immediately followed by the `'Functional, Nat. Keys'` line):

```javascript
  { name: 'More Minor Progressions',    hint: 'Four more minor progressions to complete the set',                                                 cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace it with (inserting 5 new stages between the two, using the exact same 26-entry progressions array as `'More Minor Progressions'`):

```javascript
  { name: 'More Minor Progressions',    hint: 'Four more minor progressions to complete the set',                                                 cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Two Keys',     hint: 'Same 26 progressions — now in C and G',                                                             cats: ['catFunctional'], notes: ['C','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Three Keys',   hint: 'C, F and G',                                                                                        cats: ['catFunctional'], notes: ['C','F','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add D',        hint: 'C, D, F, G',                                                                                        cats: ['catFunctional'], notes: ['C','D','F','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add A',        hint: 'C, D, F, G, A',                                                                                     cats: ['catFunctional'], notes: ['C','D','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Progressions, Add E',        hint: 'C, D, E, F, G, A — one key short of all naturals',                                                  cats: ['catFunctional'], notes: ['C','D','E','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Do not modify any other stage in `LEARNING_PATH`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-progression-curriculum-fix.cjs`

Expected: every line `PASS`, ending with `RESULT: PASS`.

- [ ] **Step 5: Run the existing progression-related regression tests**

Run each of these and confirm every one still prints `RESULT: PASS` (these exercise `LEARNING_PATH`/`applyStage()`/`FUNCTIONAL` and must not regress from the insert):

```bash
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-chord-progressions.cjs
node test-progression-filtering.cjs
```

- [ ] **Step 6: Commit**

```bash
git add script.js test-progression-curriculum-fix.cjs
git commit -m "$(cat <<'EOF'
Fix early-unlock bug in Functional Harmony progressions, add key ramp

The first Functional Harmony stage had no `progressions` field, so
applyStage()'s backward-compatible default silently enabled all 26
progressions before any were introduced. Also adds 5 new stages that
gradually ramp key diversity (C -> C,G -> C,F,G -> +D -> +A -> +E)
before the existing jump to all natural/all-12 keys, mirroring the
same ramp shape already used by the chord phase.
EOF
)"
```
