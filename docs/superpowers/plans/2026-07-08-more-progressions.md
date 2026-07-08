# More Chord Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 18 new chord progressions (14 major, 4 minor) as data + checkboxes (unchecked by default), and extend the Learning Path with 4 new cumulative stages that introduce them in groups after the existing 8-progression curriculum.

**Architecture:** This reuses every mechanism already built for the original 8 progressions — `FUNCTIONAL` data, `data-pattern` checkboxes, `enabledProgressions()`, `applyStage()`/`getStageMastery()`'s `progressions` field — with zero new plumbing. It's purely additive data plus 4 more `LEARNING_PATH` stage entries.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`/`index.html`.
- The 18 new progressions, exactly (character-exact, including the en-dash `–` and degree symbols):
  - Major (14): `I–IV–V–I`, `I–vi–IV–V`, `I–iii–IV–V`, `I–V–IV–I`, `I–iii–vi–ii–V`, `vi–ii–V–I`, `iii–vi–ii–V–I`, `IV–V–iii–vi`, `IV–V–I–vi`, `I–ii–IV–V`, `I–IV–ii–V`, `I–V–ii–IV`, `I–IV–vi–V`, `vi–V–I–IV`
  - Minor (4): `i–VII–VI–V`, `i–iv–VI–V`, `i–VI–iv–V`, `i–III–VII–VI`
- Unlike the original 8 progression checkboxes (checked by default), all 18 new checkboxes are **unchecked by default** — new content must not change the existing random-practice pool for anyone not using the Learning Path.
- 4 new cumulative Learning Path stages, inserted directly after the existing `'Add i–VI–III–VII (minor)'` stage (the end of the original 8-progression curriculum) and before `'Functional, Nat. Keys'`:
  - Stage 9: adds `I–IV–V–I`, `I–vi–IV–V`, `I–V–IV–I`, `vi–ii–V–I`, `IV–V–I–vi` (5 major, no new harmonic concept)
  - Stage 10: adds `I–ii–IV–V`, `I–IV–ii–V`, `I–V–ii–IV`, `I–IV–vi–V`, `vi–V–I–IV` (5 more major, no new concept)
  - Stage 11: adds `I–iii–IV–V`, `I–iii–vi–ii–V`, `iii–vi–ii–V–I`, `IV–V–iii–vi` (introduces the **iii** chord, never used in any earlier progression stage)
  - Stage 12: adds `i–VII–VI–V`, `i–iv–VI–V`, `i–VI–iv–V`, `i–III–VII–VI` (4 more minor, no new concept) — this stage's `progressions` array is all 26 progressions (original 8 + all 18 new)
  - All 4 fixed to `notes: ['C']`, `timer: 'off'`.
- No genre metadata, no changes to the original 8 progressions/checkboxes/stages, no new capability beyond plain diatonic roman numerals.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Add the 18 progressions, checkboxes, and 4 Learning Path stages

**Files:**
- Modify: `script.js:120-123` (`FUNCTIONAL` data)
- Modify: `index.html:346-356` (`functionalOptions` panel, add 18 checkboxes)
- Modify: `script.js:265-275` (`LEARNING_PATH`, insert 4 new stages)
- Test: `test-more-progressions.cjs`

**Interfaces:**
- Consumes: `enabledProgressions(mode)`, `applyStage(idx)`, `getStageMastery(stageIdx)` (all unchanged — this task only adds data they already know how to handle).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-more-progressions.cjs`:

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

  const NEW_MAJOR = ['I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV'];
  const NEW_MINOR = ['i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'];

  const dataCheck = await page.evaluate((newMajor, newMinor) => ({
    majorHasAll: newMajor.every(p => FUNCTIONAL.major.includes(p)),
    minorHasAll: newMinor.every(p => FUNCTIONAL.minor.includes(p)),
    majorTotalCount: FUNCTIONAL.major.length,
    minorTotalCount: FUNCTIONAL.minor.length,
  }), [NEW_MAJOR, NEW_MINOR]);
  checkTrue('FUNCTIONAL.major contains all 14 new major progressions', dataCheck.majorHasAll, null);
  checkTrue('FUNCTIONAL.minor contains all 4 new minor progressions', dataCheck.minorHasAll, null);
  check('FUNCTIONAL.major has 26 entries total (7 single-chord + 19 progressions)', dataCheck.majorTotalCount, 26);
  check('FUNCTIONAL.minor has 14 entries total (7 single-chord + 3 original + 4 new progressions)', dataCheck.minorTotalCount, 14);

  const checkboxCheck = await page.evaluate((newMajor, newMinor) => {
    const all = [...newMajor, ...newMinor];
    return all.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    });
  }, [NEW_MAJOR, NEW_MINOR]);
  checkTrue('all 18 new progression checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 18 new progression checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const originalCheck = await page.evaluate(() => {
    const original = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return original.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true);
  });
  check('the original 8 progression checkboxes are still checked by default (unaffected)', originalCheck, true);

  const stageCheck = await page.evaluate((newMajor, newMinor) => {
    const idx9 = LEARNING_PATH.findIndex(s => (s.progressions || []).length === 13);
    const stage9  = LEARNING_PATH[idx9];
    const stage10 = LEARNING_PATH[idx9 + 1];
    const stage11 = LEARNING_PATH[idx9 + 2];
    const stage12 = LEARNING_PATH[idx9 + 3];
    return {
      afterStage8: LEARNING_PATH[idx9 - 1]?.name === 'Add i–VI–III–VII (minor)',
      stage9Count: (stage9?.progressions || []).length,
      stage10Count: (stage10?.progressions || []).length,
      stage11Count: (stage11?.progressions || []).length,
      stage12Count: (stage12?.progressions || []).length,
      stage9HasFirst5:  ['I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi'].every(p => (stage9?.progressions || []).includes(p)),
      stage10HasNext5:  ['I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV'].every(p => (stage10?.progressions || []).includes(p)),
      stage11HasIii:    ['I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi'].every(p => (stage11?.progressions || []).includes(p)),
      stage12HasMinor:  newMinor.every(p => (stage12?.progressions || []).includes(p)),
      stage12HasAll26:  [...newMajor, ...newMinor, 'ii–V–I','I–IV–V','vi–IV–I–V','I–V–vi–IV','IV–V–I','ii°–V–i','i–VI–III–VII','i–iv–V'].every(p => (stage12?.progressions || []).includes(p)),
    };
  }, [NEW_MAJOR, NEW_MINOR]);
  checkTrue('stage 9 (13 progressions) is right after the original 8-stage curriculum', stageCheck.afterStage8, null);
  check('stage 9 has 13 progressions (original 8 + 5 new)', stageCheck.stage9Count, 13);
  check('stage 10 has 18 progressions (stage 9 + 5 more)', stageCheck.stage10Count, 18);
  check('stage 11 has 22 progressions (stage 10 + 4 iii-introducing)', stageCheck.stage11Count, 22);
  check('stage 12 has 26 progressions (all of them)', stageCheck.stage12Count, 26);
  checkTrue('stage 9 includes its intended 5 new progressions', stageCheck.stage9HasFirst5, null);
  checkTrue('stage 10 includes its intended 5 new progressions', stageCheck.stage10HasNext5, null);
  checkTrue('stage 11 includes the 4 iii-introducing progressions', stageCheck.stage11HasIii, null);
  checkTrue('stage 12 includes the 4 new minor progressions', stageCheck.stage12HasMinor, null);
  checkTrue('stage 12 includes literally all 26 progressions', stageCheck.stage12HasAll26, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx9 = LEARNING_PATH.findIndex(s => (s.progressions || []).length === 13);
    applyStage(idx9);
    return {
      newOneChecked: document.querySelector(`input[data-pattern="I–IV–V–I"]`).checked,
      notYetIntroducedUnchecked: document.querySelector(`input[data-pattern="I–iii–IV–V"]`).checked, // belongs to stage 11, not 9
    };
  });
  check('applyStage() on stage 9 checks its new progressions', applyStageCheck.newOneChecked, true);
  check('applyStage() on stage 9 leaves stage-11-only progressions unchecked', applyStageCheck.notYetIntroducedUnchecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-more-progressions.cjs`
Expected: FAIL on every check involving the 18 new progressions, their checkboxes, and the 4 new stages (none of it exists yet).

- [ ] **Step 3: Update `FUNCTIONAL`**

Current code (`script.js:120-123`):

```javascript
const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'],
};
```

Replace with:

```javascript
const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'],
};
```

- [ ] **Step 4: Add the 18 new checkboxes to `index.html`**

Current code (`index.html:346-356`):

```html
              <div class="category-options" id="functionalOptions" role="group" aria-label="Chord progressions">
                <div class="option-divider">Progressions</div>
                <label><input type="checkbox" data-pattern="ii–V–I" checked> ii–V–I</label>
                <label><input type="checkbox" data-pattern="I–IV–V" checked> I–IV–V</label>
                <label><input type="checkbox" data-pattern="vi–IV–I–V" checked> vi–IV–I–V</label>
                <label><input type="checkbox" data-pattern="I–V–vi–IV" checked> I–V–vi–IV</label>
                <label><input type="checkbox" data-pattern="IV–V–I" checked> IV–V–I</label>
                <label><input type="checkbox" data-pattern="ii°–V–i" checked> ii°–V–i</label>
                <label><input type="checkbox" data-pattern="i–VI–III–VII" checked> i–VI–III–VII</label>
                <label><input type="checkbox" data-pattern="i–iv–V" checked> i–iv–V</label>
              </div>
```

Replace with:

```html
              <div class="category-options" id="functionalOptions" role="group" aria-label="Chord progressions">
                <div class="option-divider">Progressions</div>
                <label><input type="checkbox" data-pattern="ii–V–I" checked> ii–V–I</label>
                <label><input type="checkbox" data-pattern="I–IV–V" checked> I–IV–V</label>
                <label><input type="checkbox" data-pattern="vi–IV–I–V" checked> vi–IV–I–V</label>
                <label><input type="checkbox" data-pattern="I–V–vi–IV" checked> I–V–vi–IV</label>
                <label><input type="checkbox" data-pattern="IV–V–I" checked> IV–V–I</label>
                <label><input type="checkbox" data-pattern="ii°–V–i" checked> ii°–V–i</label>
                <label><input type="checkbox" data-pattern="i–VI–III–VII" checked> i–VI–III–VII</label>
                <label><input type="checkbox" data-pattern="i–iv–V" checked> i–iv–V</label>
                <div class="option-divider">More Progressions</div>
                <label><input type="checkbox" data-pattern="I–IV–V–I"> I–IV–V–I</label>
                <label><input type="checkbox" data-pattern="I–vi–IV–V"> I–vi–IV–V</label>
                <label><input type="checkbox" data-pattern="I–iii–IV–V"> I–iii–IV–V</label>
                <label><input type="checkbox" data-pattern="I–V–IV–I"> I–V–IV–I</label>
                <label><input type="checkbox" data-pattern="I–iii–vi–ii–V"> I–iii–vi–ii–V</label>
                <label><input type="checkbox" data-pattern="vi–ii–V–I"> vi–ii–V–I</label>
                <label><input type="checkbox" data-pattern="iii–vi–ii–V–I"> iii–vi–ii–V–I</label>
                <label><input type="checkbox" data-pattern="IV–V–iii–vi"> IV–V–iii–vi</label>
                <label><input type="checkbox" data-pattern="IV–V–I–vi"> IV–V–I–vi</label>
                <label><input type="checkbox" data-pattern="I–ii–IV–V"> I–ii–IV–V</label>
                <label><input type="checkbox" data-pattern="I–IV–ii–V"> I–IV–ii–V</label>
                <label><input type="checkbox" data-pattern="I–V–ii–IV"> I–V–ii–IV</label>
                <label><input type="checkbox" data-pattern="I–IV–vi–V"> I–IV–vi–V</label>
                <label><input type="checkbox" data-pattern="vi–V–I–IV"> vi–V–I–IV</label>
                <label><input type="checkbox" data-pattern="i–VII–VI–V"> i–VII–VI–V</label>
                <label><input type="checkbox" data-pattern="i–iv–VI–V"> i–iv–VI–V</label>
                <label><input type="checkbox" data-pattern="i–VI–iv–V"> i–VI–iv–V</label>
                <label><input type="checkbox" data-pattern="i–III–VII–VI"> i–III–VII–VI</label>
              </div>
```

Note: none of the 18 new `<input>` elements have a `checked` attribute — this is what makes them unchecked by default, per the global constraint.

- [ ] **Step 5: Insert the 4 new Learning Path stages**

Current code (`script.js:274-275`):

```javascript
  { name: 'Add i–VI–III–VII (minor)', hint: 'Borrowed major chords from the relative major — the most harmonically unusual of the set',            cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII'],                           timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace with:

```javascript
  { name: 'Add i–VI–III–VII (minor)', hint: 'Borrowed major chords from the relative major — the most harmonically unusual of the set',            cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII'],                           timer: 'off' },
  { name: 'More Major Progressions I',  hint: 'Five more major progressions using chords you already know — new arrangements, no new concepts', cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi'], timer: 'off' },
  { name: 'More Major Progressions II', hint: 'Five more major progressions, same familiar chords',                                              cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV'], timer: 'off' },
  { name: 'Introducing iii',            hint: 'The iii chord — never used in any progression until now',                                         cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi'], timer: 'off' },
  { name: 'More Minor Progressions',    hint: 'Four more minor progressions to complete the set',                                                 cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-more-progressions.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-more-progressions.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-chord-progressions.cjs
node test-left-hand-mode-check.cjs
node test-inversion-stats-tracking.cjs
node test-chord-inversion-check.cjs
```

Expected: `RESULT: PASS` on all seven. `test-progression-filtering.cjs` and `test-progression-learning-path.cjs` in particular confirm the existing 8-progression mechanism and original 8-stage curriculum are completely unaffected by this purely-additive change.

- [ ] **Step 8: Commit**

```bash
git add script.js index.html test-more-progressions.cjs
git commit -m "Add 18 more chord progressions with 4 new Learning Path stages"
```
