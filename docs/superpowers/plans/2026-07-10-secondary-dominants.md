# Secondary Dominants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support secondary-dominant slash notation (`V/<target-numeral>`, e.g. `V/vi`, `V/V`) in the Functional Harmony resolver, and ship the one progression from `Modern Harmony Reference.md` that uses it: `I–V/vi–vi–V/V–ii–V`.

**Architecture:** A new branch in `getExpectedPCs()`'s `func` handling parses `V/<target>`, looks up the target numeral's root offset in the existing `FUNCTIONAL_NUMERALS` table, and builds a plain Major triad a perfect 5th above it — no new dependency, pure arithmetic reusing the existing `CHORD_INTERVALS` table. Content-wise: one new `FUNCTIONAL.major` entry, one new checkbox in the existing "Circle of Fifths & Applied Chords" group, and the progression appended to that stage's Learning Path array plus the cumulative stage after it.

**Tech Stack:** Vanilla JS, no build step. See `CLAUDE.md`.

## Global Constraints

- New content is unchecked by default (existing convention — see `docs/superpowers/specs/2026-07-10-secondary-dominants-design.md`).
- The new resolver branch must run *before* the existing jazz-suffix regex fallback in `getExpectedPCs()`'s `func` block — a slash-containing numeral would otherwise be wrongly captured by that regex's greedy suffix group and silently fail to resolve.
- The applied side of the slash supports only literal uppercase `V` (no `V7/vi`, no other applied qualities) — out of scope per the approved spec.
- The target side is general: any numeral already present in `FUNCTIONAL_NUMERALS[modeKey]` must resolve correctly as a target, not just `vi` and `V`.
- No new checkbox group, no new Learning Path stage or phase — this is a single additive progression appended to existing structures.

---

### Task 1: Secondary-dominant resolver

**Files:**
- Modify: `script.js:3464-3472` (the `func` branch of `getExpectedPCs()`, between the direct `FUNCTIONAL_NUMERALS` lookup and the jazz-suffix fallback)
- Test: `test-secondary-dominant-resolution.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL_NUMERALS[modeKey]` (existing table, `{ numeral: [offset, quality] }`), `CHORD_INTERVALS['Major']` (existing table of semitone offsets for a Major triad), `rootIdx` and `modeKey` (already computed earlier in the `func` branch, in scope at the insertion point).
- Produces: nothing new consumed by Task 2 — Task 2 only needs the resolver to correctly handle `V/vi` and `V/V` when `getExpectedPCs()` is called on the new progression's steps, which this task delivers.

- [ ] **Step 1: Write the failing test**

Create `test-secondary-dominant-resolution.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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

  // Identity checks: V/x should resolve to the exact same pitch classes as the existing
  // entry it's musically equivalent to, in the SAME key -- this avoids hand-computing new
  // pitch-class literals (a repeated source of plan-authoring bugs in this project's history;
  // see the Tonal.js jazz-extensions plan, where 7 hand-computed literals were wrong).
  const identityChecks = await page.evaluate(() => {
    const sorted = (pcs) => [...pcs].sort((a, b) => a - b);
    const resolve = (numeral, root, modeLabel) => {
      const r = getExpectedPCs(`func|${root}|${modeLabel}|${numeral}|0`);
      return r ? sorted(r.pcs) : null;
    };
    return {
      cMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'C', 'Major')) === JSON.stringify(resolve('III', 'C', 'Major')),
      cMajor_VoverV_eq_II:   JSON.stringify(resolve('V/V', 'C', 'Major')) === JSON.stringify(resolve('II', 'C', 'Major')),
      cMajor_VoverIV_eq_I:   JSON.stringify(resolve('V/IV', 'C', 'Major')) === JSON.stringify(resolve('I', 'C', 'Major')),
      gMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'G', 'Major')) === JSON.stringify(resolve('III', 'G', 'Major')),
      gMajor_VoverV_eq_II:   JSON.stringify(resolve('V/V', 'G', 'Major')) === JSON.stringify(resolve('II', 'G', 'Major')),
      fMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'F', 'Major')) === JSON.stringify(resolve('III', 'F', 'Major')),
    };
  });
  checkTrue('C major: V/vi resolves to the same pitches as III', identityChecks.cMajor_VoverVI_eq_III, null);
  checkTrue('C major: V/V resolves to the same pitches as II', identityChecks.cMajor_VoverV_eq_II, null);
  checkTrue("C major: V/IV resolves to the same pitches as I (tonic doubles as IV's dominant)", identityChecks.cMajor_VoverIV_eq_I, null);
  checkTrue('G major: V/vi resolves to the same pitches as III', identityChecks.gMajor_VoverVI_eq_III, null);
  checkTrue('G major: V/V resolves to the same pitches as II', identityChecks.gMajor_VoverV_eq_II, null);
  checkTrue('F major: V/vi resolves to the same pitches as III', identityChecks.fMajor_VoverVI_eq_III, null);

  // Unresolvable target numeral must fail safely, not throw or silently return wrong pitches.
  const badTarget = await page.evaluate(() => getExpectedPCs('func|C|Major|V/xyz|0'));
  check('V/<unknown numeral> returns null', badTarget, null);

  // Regression: the direct-lookup and jazz-suffix-fallback paths must be unaffected by the
  // new branch inserted between them.
  const regressionCheck = await page.evaluate(() => {
    const v = getExpectedPCs('func|C|Major|V|0');
    const v13 = getExpectedPCs('func|C|Major|V13|0');
    return { vLen: v ? v.pcs.length : null, v13Len: v13 ? v13.pcs.length : null };
  });
  check('plain "V" still resolves to a 3-note triad (direct-lookup path unaffected)', regressionCheck.vLen, 3);
  check('"V13" still resolves to a 6-note chord (jazz-suffix fallback path unaffected)', regressionCheck.v13Len, 6);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-secondary-dominant-resolution.cjs`
Expected: FAIL — every `V/x` identity check fails because `getExpectedPCs()` returns `null` for `V/vi`/`V/V`/`V/IV` (no resolver branch exists yet), so `JSON.stringify(null) === JSON.stringify([...III's pcs])` is false. The `V/<unknown numeral> returns null` check and the two regression checks (`plain "V"`, `"V13"`) already pass — that's expected, they exercise paths that already work.

- [ ] **Step 3: Add the resolver branch**

Current code (`script.js`, inside the `if (type === 'func') { ... }` block):

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
    // Fallback: a numeral with an explicit jazz quality suffix (e.g. "Imaj7", "V13", "viiø7"),
    // not a bare token FUNCTIONAL_NUMERALS already knows. Split off the base numeral and hand the
    // actual chord construction to Tonal instead of another hand-built lookup table. The degree
    // marker (°/ø) is parsed separately from the numeral-letters lookup because the table stores
    // some entries WITH the degree symbol baked into the key (vii°, ii°) and others without --
    // try the bare accidental+letters form first, then that form with ° appended.
    const jazzMatch = numeral.match(/^(♭|♯)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø)?(.+)$/);
```

Replace with:

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
    // Fallback: secondary-dominant slash notation "V/<target-numeral>" (e.g. "V/vi", "V/V") --
    // resolves to the plain Major triad built a perfect 5th above the target degree's root.
    // Checked before the jazz-suffix fallback below: a slash-containing numeral would otherwise
    // be wrongly captured by that regex's greedy suffix group and silently fail to resolve.
    const secondaryMatch = numeral.match(/^V\/(.+)$/);
    if (secondaryMatch) {
      const targetEntry = FUNCTIONAL_NUMERALS[modeKey][secondaryMatch[1]];
      if (!targetEntry) return null;
      const secondaryOffset = (targetEntry[0] + 7) % 12;
      const chordRootPC     = (rootIdx + secondaryOffset) % 12;
      const intervals       = CHORD_INTERVALS['Major'];
      return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
    }
    // Fallback: a numeral with an explicit jazz quality suffix (e.g. "Imaj7", "V13", "viiø7"),
    // not a bare token FUNCTIONAL_NUMERALS already knows. Split off the base numeral and hand the
    // actual chord construction to Tonal instead of another hand-built lookup table. The degree
    // marker (°/ø) is parsed separately from the numeral-letters lookup because the table stores
    // some entries WITH the degree symbol baked into the key (vii°, ii°) and others without --
    // try the bare accidental+letters form first, then that form with ° appended.
    const jazzMatch = numeral.match(/^(♭|♯)?(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°|ø)?(.+)$/);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-secondary-dominant-resolution.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-secondary-dominant-resolution.cjs
git commit -m "Add secondary-dominant slash-notation resolver (V/x)"
```

---

### Task 2: Content, checkbox, and Learning Path integration

**Files:**
- Modify: `script.js:121` (`FUNCTIONAL.major` array — append the new entry)
- Modify: `script.js:325-326` (`LEARNING_PATH` — append the new entry to the "Circle of Fifths & Applied Chords" and "Cadences & Color Chords" stages' `progressions` arrays)
- Modify: `index.html:462-463` (add one checkbox to the existing "Circle of Fifths & Applied Chords" group, before the "Cadences & Color Chords" divider)
- Test: `test-secondary-dominant-content.cjs`
- Test: `test-secondary-dominant-learning-path.cjs`

**Interfaces:**
- Consumes: the resolver from Task 1 (already merged) — this task only adds data, not logic. `enabledProgressions(mode)` and `checkboxGatedPatterns()` (existing functions, unchanged) automatically pick up the new `FUNCTIONAL.major` entry and its checkbox with no code changes, exactly as every prior content batch has worked.
- Produces: nothing — this is the last task in the plan.

- [ ] **Step 1: Write the failing tests**

Create `test-secondary-dominant-content.cjs`:

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

  const NEW_PATTERN = 'I–V/vi–vi–V/V–ii–V';

  const dataCheck = await page.evaluate((pattern) => ({
    hasEntry: FUNCTIONAL.major.includes(pattern),
    majorCount: FUNCTIONAL.major.length,
  }), NEW_PATTERN);
  checkTrue('FUNCTIONAL.major contains the new secondary-dominant progression', dataCheck.hasEntry, null);
  check('FUNCTIONAL.major has 111 entries total (110 existing + 1 new)', dataCheck.majorCount, 111);

  const checkboxCheck = await page.evaluate((pattern) => {
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return { exists: !!el, checked: el ? el.checked : null };
  }, NEW_PATTERN);
  checkTrue('checkbox exists for the new progression', checkboxCheck.exists, null);
  check('checkbox is unchecked by default', checkboxCheck.checked, false);

  const integration = await page.evaluate((pattern) => {
    const before = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = true;
    const after = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = false; // reset
    return { before, after };
  }, NEW_PATTERN);
  check('excluded from enabledProgressions() by default (unchecked)', integration.before, false);
  check('included in enabledProgressions() once checked', integration.after, true);

  // End-to-end: the full progression resolves correctly step by step (exercises Task 1's
  // resolver against the real prompt-key format this progression will actually generate).
  const stepResolution = await page.evaluate((pattern) => {
    const steps = pattern.split('–');
    return steps.map((_, i) => {
      const r = getExpectedPCs(`func|C|Major|${pattern}|${i}`);
      return r ? r.pcs.length > 0 : false;
    });
  }, NEW_PATTERN);
  checkTrue('all 6 steps of the progression resolve to a non-empty chord', stepResolution.every(Boolean), JSON.stringify(stepResolution));

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

Create `test-secondary-dominant-learning-path.cjs`:

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

  const NEW_PATTERN = 'I–V/vi–vi–V/V–ii–V';

  const stageCheck = await page.evaluate((pattern) => {
    const stage3 = LEARNING_PATH.find(s => s.name === 'Circle of Fifths & Applied Chords');
    const stage4 = LEARNING_PATH.find(s => s.name === 'Cadences & Color Chords');
    const otherStages = LEARNING_PATH.filter(s =>
      s.name !== 'Circle of Fifths & Applied Chords' && s.name !== 'Cadences & Color Chords');
    return {
      stage3HasIt: stage3.progressions.includes(pattern),
      stage3Count: stage3.progressions.length,
      stage4HasIt: stage4.progressions.includes(pattern),
      stage4Count: stage4.progressions.length,
      noOtherStageHasIt: otherStages.every(s => !(s.progressions || []).includes(pattern)),
    };
  }, NEW_PATTERN);
  checkTrue('"Circle of Fifths & Applied Chords" stage includes the new progression', stageCheck.stage3HasIt, null);
  check('"Circle of Fifths & Applied Chords" stage has 108 progressions (107 + 1 new)', stageCheck.stage3Count, 108);
  checkTrue('"Cadences & Color Chords" stage includes the new progression (cumulative)', stageCheck.stage4HasIt, null);
  check('"Cadences & Color Chords" stage has 113 progressions (112 + 1 new)', stageCheck.stage4Count, 113);
  checkTrue('no earlier stage was affected', stageCheck.noOtherStageHasIt, null);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is unchanged at 26 (no new stage)', phaseCheck.functionalHarmonyCount, 26);
  check('LEARNING_PATH_PHASES still has 18 entries', phaseCheck.phaseCount, 18);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH still has 124 stages total (no stage added)', phaseCheck.totalStages, 124);

  const applyStageCheck = await page.evaluate((pattern) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Circle of Fifths & Applied Chords');
    applyStage(idx);
    return document.querySelector(`input[data-pattern="${pattern}"]`).checked;
  }, NEW_PATTERN);
  check('applyStage() on "Circle of Fifths & Applied Chords" checks the new progression', applyStageCheck, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node test-secondary-dominant-content.cjs`
Expected: FAIL — `FUNCTIONAL.major` doesn't contain the new pattern yet, no checkbox exists, cascading failures.

Run: `node test-secondary-dominant-learning-path.cjs`
Expected: FAIL — neither stage's `progressions` array contains the new pattern yet, counts are 107/112 not 108/113.

- [ ] **Step 3: Add the FUNCTIONAL.major entry**

Current code (`script.js:121`, end of the array — showing only the tail):

```javascript
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'iv', '♭II', '♭III', '♭VI', '♭VII', 'II', 'III', 'VI', 'I–iv–I', 'I–♭VII–IV', 'I–♭III–IV', 'I–♭VI–IV', 'I–♭III', 'I–♭VI', 'I–♭VII', 'I–♭II', 'I–iv', '♭III–I', '♭VI–I', '♭VII–I', '♭II–I', 'I–♭III–I', 'I–♭VI–I', 'IV–♭VII–I', 'ii–♭VII–I', 'iv–♭VII–I', 'I–IV–♭VII', 'V–♭VI', 'V–♭III', 'vi–IV–I', 'V–ii', 'I–♭VI–♭VII–I', 'I–♭III–♭VI', 'I–iv–♭VII–I', 'I–♭III–♭VI–IV', 'I–♭VII–♭VI–V', 'I–ii–♭III–IV', 'I–iii–IV–iv', 'I–♭III–IV–iv', 'I–♭III–IV–V', 'I–vi–ii–♭II', 'I–♭II–vi', 'I–III–♭II–vi', 'I–♭II–IV–III', 'I–VI–ii–V', 'I–III–vi–II–ii–V–I', 'iii–VI–ii–V–I', 'vi–II–ii–V–I', 'I–III', 'I–VI', 'III–♭VI', 'I–III–vi–IV', 'I–III–♭VI–IV', 'I–VI7–ii–V', 'Imaj7–iii7–vi7–ii7–V7', 'iii7–vi7–ii7–V7–Imaj7', 'vi7–ii7–V7–Imaj7', 'Imaj7–VI7–ii7–V7', 'Imaj7–vi7–IVmaj7–V13', 'vi9–V13–Imaj9–IVmaj9', 'ii9–V13–Imaj9', 'IVmaj7–V7–iii7–vi7–ii7–V7', 'Imaj7–IVmaj7–ii7–V13', 'Imaj7–iii7–IVmaj7–iv7', 'Imaj7–♭VIImaj7–IVmaj7', 'Imaj9–VI7–ii9–V13', 'Imaj9–VI13–ii11–V13', 'Imaj9–♯IV°7–ii9–V13', 'Imaj7–IIImaj7–vi9–IVmaj7', 'Imaj9–♭IImaj7–vi11–V13♯11', 'Imaj9–♭IIImaj7–IVmaj9–iv7', 'Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13', 'I–III7–vi–II7–ii–V–I', 'iii–VI7–ii–V–I', 'vi–II7–ii–V–I', 'I–III7–vi', 'vi–II7–V', 'ii–♭II7–I', '♭II7–I', 'V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7'],
```

Replace the closing `]` so the array ends with the new entry — i.e. change the final `'Imaj7♯11–♭VIImaj7'],` to `'Imaj7♯11–♭VIImaj7', 'I–V/vi–vi–V/V–ii–V'],`. The full line becomes:

```javascript
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'iv', '♭II', '♭III', '♭VI', '♭VII', 'II', 'III', 'VI', 'I–iv–I', 'I–♭VII–IV', 'I–♭III–IV', 'I–♭VI–IV', 'I–♭III', 'I–♭VI', 'I–♭VII', 'I–♭II', 'I–iv', '♭III–I', '♭VI–I', '♭VII–I', '♭II–I', 'I–♭III–I', 'I–♭VI–I', 'IV–♭VII–I', 'ii–♭VII–I', 'iv–♭VII–I', 'I–IV–♭VII', 'V–♭VI', 'V–♭III', 'vi–IV–I', 'V–ii', 'I–♭VI–♭VII–I', 'I–♭III–♭VI', 'I–iv–♭VII–I', 'I–♭III–♭VI–IV', 'I–♭VII–♭VI–V', 'I–ii–♭III–IV', 'I–iii–IV–iv', 'I–♭III–IV–iv', 'I–♭III–IV–V', 'I–vi–ii–♭II', 'I–♭II–vi', 'I–III–♭II–vi', 'I–♭II–IV–III', 'I–VI–ii–V', 'I–III–vi–II–ii–V–I', 'iii–VI–ii–V–I', 'vi–II–ii–V–I', 'I–III', 'I–VI', 'III–♭VI', 'I–III–vi–IV', 'I–III–♭VI–IV', 'I–VI7–ii–V', 'Imaj7–iii7–vi7–ii7–V7', 'iii7–vi7–ii7–V7–Imaj7', 'vi7–ii7–V7–Imaj7', 'Imaj7–VI7–ii7–V7', 'Imaj7–vi7–IVmaj7–V13', 'vi9–V13–Imaj9–IVmaj9', 'ii9–V13–Imaj9', 'IVmaj7–V7–iii7–vi7–ii7–V7', 'Imaj7–IVmaj7–ii7–V13', 'Imaj7–iii7–IVmaj7–iv7', 'Imaj7–♭VIImaj7–IVmaj7', 'Imaj9–VI7–ii9–V13', 'Imaj9–VI13–ii11–V13', 'Imaj9–♯IV°7–ii9–V13', 'Imaj7–IIImaj7–vi9–IVmaj7', 'Imaj9–♭IImaj7–vi11–V13♯11', 'Imaj9–♭IIImaj7–IVmaj9–iv7', 'Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13', 'I–III7–vi–II7–ii–V–I', 'iii–VI7–ii–V–I', 'vi–II7–ii–V–I', 'I–III7–vi', 'vi–II7–V', 'ii–♭II7–I', '♭II7–I', 'V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7', 'I–V/vi–vi–V/V–ii–V'],
```

- [ ] **Step 4: Add the checkbox**

Current code (`index.html:462-463`):

```html
                <label><input type="checkbox" data-pattern="♭II7–I"> ♭II7–I</label>
                <div class="option-divider">Cadences &amp; Color Chords</div>
```

Replace with:

```html
                <label><input type="checkbox" data-pattern="♭II7–I"> ♭II7–I</label>
                <label><input type="checkbox" data-pattern="I–V/vi–vi–V/V–ii–V"> I–V/vi–vi–V/V–ii–V</label>
                <div class="option-divider">Cadences &amp; Color Chords</div>
```

- [ ] **Step 5: Update the two Learning Path stages**

Current code (`script.js:325`, "Circle of Fifths & Applied Chords" — showing only the tail of its `progressions` array):

```javascript
  { name: 'Circle of Fifths & Applied Chords',hint: 'Longer sequences moving through the circle of fifths, plus dominant-7-flavored borrowed chords',   cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: [ /* ... */ 'I–III7–vi–II7–ii–V–I', 'iii–VI7–ii–V–I', 'vi–II7–ii–V–I', 'I–III7–vi', 'vi–II7–V', 'ii–♭II7–I', '♭II7–I'], timer: 'off' },
```

Change the final `'♭II7–I'], timer: 'off' },` on that line to `'♭II7–I', 'I–V/vi–vi–V/V–ii–V'], timer: 'off' },`.

Current code (`script.js:326`, "Cadences & Color Chords" — showing only the tail of its `progressions` array):

```javascript
  { name: 'Cadences & Color Chords',          hint: 'Deceptive cadences, a half-diminished passing chord, and Lydian-flavored color chords',           cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: [ /* ... */ 'I–III7–vi–II7–ii–V–I', 'iii–VI7–ii–V–I', 'vi–II7–ii–V–I', 'I–III7–vi', 'vi–II7–V', 'ii–♭II7–I', '♭II7–I', 'V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7'], timer: 'off' },
```

Change the final `'Imaj7♯11–♭VIImaj7'], timer: 'off' },` on that line to `'Imaj7♯11–♭VIImaj7', 'I–V/vi–vi–V/V–ii–V'], timer: 'off' },`.

(Both edits only touch the closing bracket of each line — every other character of both very long lines is unchanged. Locate the exact tail string shown above with a find/replace rather than retyping the full line, since each line is ~2000 characters of existing content.)

- [ ] **Step 6: Run tests to verify they pass**

Run: `node test-secondary-dominant-content.cjs`
Expected: all `PASS`, `RESULT: PASS`

Run: `node test-secondary-dominant-learning-path.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-secondary-dominant-resolution.cjs
node test-secondary-dominant-content.cjs
node test-secondary-dominant-learning-path.cjs
node test-tonal-vendored.cjs
node test-jazz-numeral-resolution.cjs
node test-jazz-progressions-content.cjs
node test-jazz-progressions-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-progression-curriculum-fix.cjs
node test-borrowed-numerals-resolution.cjs
node test-borrowed-checkbox-gating.cjs
node test-borrowed-chords-content.cjs
node test-borrowed-chords-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-learning-stage-persistence.cjs
```

Expected: `RESULT: PASS` on all twenty. (`test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, and `test-audit-fixes-scales-phase.cjs` assert absolute `LEARNING_PATH.length`/stage-row totals — this plan does not add a new stage, so those totals stay at 124 and none of the three need edits. If any of the twenty fail unexpectedly, stop and investigate before continuing — do not assume it's a pre-existing/unrelated failure without checking.)

- [ ] **Step 8: Commit**

```bash
git add script.js index.html test-secondary-dominant-content.cjs test-secondary-dominant-learning-path.cjs
git commit -m "Add secondary-dominant progression, checkbox, and Learning Path integration"
```
