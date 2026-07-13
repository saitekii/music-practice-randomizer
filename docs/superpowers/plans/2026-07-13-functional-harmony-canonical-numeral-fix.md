# Functional Harmony Canonical-Numeral Bug Fix + Random Numerals Drill Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the severe, pre-existing bug where every Functional Harmony Learning Path stage (including "Play Your First Song" and "Functional Harmony — C") serves mostly-wrong content, because the 7 canonical diatonic numerals per mode bypass all checkbox/stage restriction and `genFunctional()` coin-flips between major/minor regardless of which mode has enabled content. Add a new opt-in "Random Numerals" intense-drill toggle as a related feature.

**Architecture:** Give the 14 canonical numerals (7 major + 7 minor) their own mode-qualified checkboxes (`major:I`, `minor:i`, etc.) so they participate in the exact same checkbox-gating mechanism as every other Functional Harmony pattern. Fix `genFunctional()` to only pick a mode that has enabled content. Fix the one Learning Path stage whose entire design depended on the old bypass. Add a pool-restricting drill toggle on top of the now-correct foundation.

**Tech Stack:** Vanilla JS (`script.js`), static HTML (`index.html`), Playwright `.cjs` test scripts — per `CLAUDE.md`, no build step, no framework.

## Global Constraints

- Mode-qualified checkbox identifiers use the exact format `${mode}:${numeral}` (e.g. `major:I`, `minor:ii°`, `minor:III`) for **all 14** canonical numerals, not just the 3 that collide with existing checkboxes (`minor:III`, `minor:iv`, `minor:VI` collide in bare-string form with major's existing borrowed-chord checkboxes of the same name) — consistency was an explicit, approved design decision.
- `FUNCTIONAL.major` / `FUNCTIONAL.minor` arrays and `FUNCTIONAL_NUMERALS` (script.js:121-143) are read-only for this plan — every bare numeral string used for musical resolution (`getExpectedPCs()`, `genFunctional()`'s returned `key`) must stay exactly as today. Only the checkbox-lookup layer becomes mode-aware.
- All 14 new canonical-numeral checkboxes default to **checked**.
- The new "Random Numerals" checkbox defaults to **unchecked** and is never referenced by any `LEARNING_PATH` stage's data (pure free-play/Shuffle-Settings feature).
- Existing borrowed-chord checkboxes (`iv`, `♭II`, `♭III`, `♭VI`, `♭VII`, `II`, `III`, `VI`) must keep their current DOM identity and unchecked-by-default state — untouched by this fix.
- `saveSettings()` / `loadSettings()` require no code changes (they already derive their progression-checkbox id list from `checkboxGatedPatterns()`'s return value dynamically).

---

## Task 1: Canonical numerals become real, checkbox-gated content

**Files:**
- Modify: `index.html:347-348` (insert 14 new checkboxes into `functionalOptions`)
- Modify: `script.js:2111-2124` (`checkboxGatedPatterns()`, `enabledProgressions()`)
- Modify: `test-borrowed-checkbox-gating.cjs` (rewrite assertions that pinned the old bypass behavior)
- Modify: `test-progression-filtering.cjs` (rewrite one assertion, add a new one)

**Interfaces:**
- Produces: `checkboxGatedPatterns()` now returns `major:${p}` / `minor:${p}` for the 14 canonical entries (instead of excluding them), and unchanged bare strings for every other (non-canonical) pattern.
- Produces: `enabledProgressions(mode)` now resolves canonical entries via `document.querySelector('input[data-pattern="${mode}:${pattern}"]')` and treats them exactly like any other checkbox (no more automatic `return true`).
- Consumes: `CANONICAL_FUNCTIONAL_NUMERALS` (script.js:151-154), `FUNCTIONAL` (script.js:121-124) — read-only.

### Current code (script.js:2111-2124)

```javascript
function checkboxGatedPatterns() {
  return [
    ...FUNCTIONAL.major.filter(p => !CANONICAL_FUNCTIONAL_NUMERALS.major.includes(p)),
    ...FUNCTIONAL.minor.filter(p => !CANONICAL_FUNCTIONAL_NUMERALS.minor.includes(p)),
  ];
}

function enabledProgressions(mode) {
  return FUNCTIONAL[mode].filter(pattern => {
    if (CANONICAL_FUNCTIONAL_NUMERALS[mode].includes(pattern)) return true; // canonical diatonic numerals are never filtered
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return el ? el.checked : true;
  });
}
```

- [ ] **Step 1: Add 14 canonical-numeral checkboxes to `index.html`**

In `index.html`, immediately after line 347 (`<div class="category-options" id="functionalOptions" role="group" aria-label="Chord progressions">`) and before the existing `<div class="option-divider">Progressions</div>` (current line 348), insert:

```html
                <div class="option-divider">Diatonic Numerals — Major</div>
                <label><input type="checkbox" data-pattern="major:I" checked> I</label>
                <label><input type="checkbox" data-pattern="major:ii" checked> ii</label>
                <label><input type="checkbox" data-pattern="major:iii" checked> iii</label>
                <label><input type="checkbox" data-pattern="major:IV" checked> IV</label>
                <label><input type="checkbox" data-pattern="major:V" checked> V</label>
                <label><input type="checkbox" data-pattern="major:vi" checked> vi</label>
                <label><input type="checkbox" data-pattern="major:vii°" checked> vii°</label>
                <div class="option-divider">Diatonic Numerals — Minor</div>
                <label><input type="checkbox" data-pattern="minor:i" checked> i</label>
                <label><input type="checkbox" data-pattern="minor:ii°" checked> ii°</label>
                <label><input type="checkbox" data-pattern="minor:III" checked> III</label>
                <label><input type="checkbox" data-pattern="minor:iv" checked> iv</label>
                <label><input type="checkbox" data-pattern="minor:V" checked> V</label>
                <label><input type="checkbox" data-pattern="minor:VI" checked> VI</label>
                <label><input type="checkbox" data-pattern="minor:VII" checked> VII</label>
```

- [ ] **Step 2: Rewrite `checkboxGatedPatterns()` and `enabledProgressions()` in `script.js`**

Replace the current code shown above (script.js:2111-2124) with:

```javascript
function checkboxGatedPatterns() {
  return [
    ...FUNCTIONAL.major.map(p => CANONICAL_FUNCTIONAL_NUMERALS.major.includes(p) ? `major:${p}` : p),
    ...FUNCTIONAL.minor.map(p => CANONICAL_FUNCTIONAL_NUMERALS.minor.includes(p) ? `minor:${p}` : p),
  ];
}

function enabledProgressions(mode) {
  return FUNCTIONAL[mode].filter(pattern => {
    const lookupKey = CANONICAL_FUNCTIONAL_NUMERALS[mode].includes(pattern) ? `${mode}:${pattern}` : pattern;
    const el = document.querySelector(`input[data-pattern="${lookupKey}"]`);
    return el ? el.checked : true;
  });
}
```

Note: `checkboxGatedPatterns()` returns the qualified string (`major:I`) as the list item itself for canonical entries — this is intentional. `enabledProgressions(mode)` still returns the **bare** pattern string (`I`) in its filtered output (the `filter` predicate looks up the qualified checkbox but the array being filtered is `FUNCTIONAL[mode]`, which only ever holds bare strings) — so every caller of `enabledProgressions()` (`genFunctional()`, `getExpectedPCs()`) is completely unaffected by the qualification scheme.

- [ ] **Step 3: Rewrite `test-borrowed-checkbox-gating.cjs`**

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

  const canonical = await page.evaluate(() => {
    const gated = checkboxGatedPatterns();
    return {
      majorAllQualified: CANONICAL_FUNCTIONAL_NUMERALS.major.every(p => gated.includes(`major:${p}`)),
      minorAllQualified: CANONICAL_FUNCTIONAL_NUMERALS.minor.every(p => gated.includes(`minor:${p}`)),
    };
  });
  checkTrue('the 7 canonical major numerals are gated via their major: prefixed identifiers', canonical.majorAllQualified, null);
  checkTrue('the 7 canonical minor numerals are gated via their minor: prefixed identifiers', canonical.minorAllQualified, null);

  const existingProgressions = await page.evaluate(() =>
    ['ii–V–I', 'I–IV–V', 'i–iv–V'].every(p => checkboxGatedPatterns().includes(p))
  );
  checkTrue('existing multi-chord progressions are still gated (unchanged behavior)', existingProgressions, null);

  // Simulate a non-canonical bare (no dash) single-chord pattern, since real content like
  // this doesn't exist until Task 3. Confirms the general (non-canonical) gating path.
  const fakeEntry = await page.evaluate(() => {
    FUNCTIONAL.major.push('ZZZ');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.pattern = 'ZZZ';
    input.checked = false;
    document.getElementById('functionalOptions').appendChild(input);
    return {
      isGated: checkboxGatedPatterns().includes('ZZZ'),
      excludedWhenUnchecked: !enabledProgressions('major').includes('ZZZ'),
    };
  });
  checkTrue('a non-canonical bare single-chord pattern is included in checkboxGatedPatterns()', fakeEntry.isGated, null);
  checkTrue('enabledProgressions() excludes it while unchecked', fakeEntry.excludedWhenUnchecked, null);

  const includedWhenChecked = await page.evaluate(() => {
    document.querySelector('input[data-pattern="ZZZ"]').checked = true;
    return enabledProgressions('major').includes('ZZZ');
  });
  checkTrue('enabledProgressions() includes it once its checkbox is checked', includedWhenChecked, null);

  const persisted = await page.evaluate(() => {
    saveSettings();
    return JSON.parse(localStorage.getItem('mpr_settings')).progressions['ZZZ'];
  });
  check('saveSettings() persists the fake pattern\'s checkbox state via checkboxGatedPatterns()', persisted, true);

  // The core bug fix: canonical numerals are now individually gated, just like everything else.
  const canonicalGating = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = false;
    const after = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = true; // restore
    return { before, after };
  });
  check('enabledProgressions("major") includes I while major:I is checked', canonicalGating.before, true);
  check('enabledProgressions("major") excludes I once major:I is unchecked', canonicalGating.after, false);

  // Collision independence: minor's canonical III/iv/VI must be distinct checkboxes from
  // major's existing borrowed-chord III/iv/VI checkboxes.
  const collisionIndependence = await page.evaluate(() => {
    const borrowedIII = document.querySelector('input[data-pattern="III"]');
    const canonicalMinorIII = document.querySelector('input[data-pattern="minor:III"]');
    const distinctElements = borrowedIII !== canonicalMinorIII;
    borrowedIII.checked = false;
    const minorIIIStillEnabled = enabledProgressions('minor').includes('III');
    borrowedIII.checked = true; // restore
    return { distinctElements, minorIIIStillEnabled };
  });
  checkTrue('borrowed III (major) and canonical III (minor) are distinct checkbox elements', collisionIndependence.distinctElements, null);
  checkTrue('unchecking borrowed III (major) does not affect canonical minor III', collisionIndependence.minorIIIStillEnabled, null);

  const borrowedDefaults = await page.evaluate(() =>
    ['iv', 'III', 'VI'].every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false)
  );
  checkTrue('existing borrowed-chord iv/III/VI checkboxes keep their unchecked-by-default state', borrowedDefaults, null);

  const canonicalDefaults = await page.evaluate(() => {
    const allPatterns = [...CANONICAL_FUNCTIONAL_NUMERALS.major.map(p => `major:${p}`), ...CANONICAL_FUNCTIONAL_NUMERALS.minor.map(p => `minor:${p}`)];
    return allPatterns.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true);
  });
  checkTrue('all 14 canonical numeral checkboxes default to checked', canonicalDefaults, null);

  const appliedByStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx); // progressions: [] at this point in the plan -- should NOT include 'ZZZ'
    return document.querySelector('input[data-pattern="ZZZ"]').checked;
  });
  check('applyStage() uses checkboxGatedPatterns() and unchecks ZZZ (not in the stage\'s list)', appliedByStage, false);

  const diatonicUntouched = await page.evaluate(() => ({
    minorNumerals: DIATONIC.minor.numerals,
    minorQualities: DIATONIC.minor.qualities,
  }));
  check('DIATONIC.minor.numerals is untouched (still lowercase v at index 4, unrelated to Functional Harmony gating)', diatonicUntouched.minorNumerals, ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  check('DIATONIC.minor.qualities is untouched', diatonicUntouched.minorQualities, ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 4: Edit `test-progression-filtering.cjs`**

Replace this block:

```javascript
  const filtering = await page.evaluate(() => {
    const allMajor = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = false;
    const withOneUnchecked = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = true; // restore
    return {
      allMajorHasIIVV: allMajor.includes('I–IV–V'),
      afterUncheckMissingIIVV: !withOneUnchecked.includes('I–IV–V'),
      singleNumeralsUnaffected: withOneUnchecked.includes('I') && withOneUnchecked.includes('V'),
    };
  });
  check('enabledProgressions("major") includes I–IV–V when checked', filtering.allMajorHasIIVV, true);
  check('unchecking I–IV–V removes it from enabledProgressions("major")', filtering.afterUncheckMissingIIVV, true);
  check('single-chord numerals (I, V) are never filtered out', filtering.singleNumeralsUnaffected, true);
```

with:

```javascript
  const filtering = await page.evaluate(() => {
    const allMajor = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = false;
    const withOneUnchecked = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = true; // restore
    return {
      allMajorHasIIVV: allMajor.includes('I–IV–V'),
      afterUncheckMissingIIVV: !withOneUnchecked.includes('I–IV–V'),
      singleNumeralsUnaffectedByUnrelatedUncheck: withOneUnchecked.includes('I') && withOneUnchecked.includes('V'),
    };
  });
  check('enabledProgressions("major") includes I–IV–V when checked', filtering.allMajorHasIIVV, true);
  check('unchecking I–IV–V removes it from enabledProgressions("major")', filtering.afterUncheckMissingIIVV, true);
  check('unchecking I–IV–V does not affect unrelated single-chord numerals I, V', filtering.singleNumeralsUnaffectedByUnrelatedUncheck, true);

  const canonicalFiltering = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = false;
    const afterUncheck = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = true; // restore
    return { before, afterUncheck };
  });
  check('enabledProgressions("major") includes single-chord numeral I when its own checkbox is checked', canonicalFiltering.before, true);
  check('canonical single-chord numeral I IS filtered out once its own checkbox is unchecked (the bug this fix addresses)', canonicalFiltering.afterUncheck, false);
```

- [ ] **Step 5: Run the updated tests, verify they fail against pre-fix behavior is impossible to check retroactively — instead run against the now-fixed code and confirm PASS**

```bash
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
```

Expected: both print `RESULT: PASS`.

- [ ] **Step 6: Run the full existing Functional-Harmony-adjacent regression sweep**

```bash
node test-progression-curriculum-fix.cjs
node test-progression-learning-path.cjs
node test-borrowed-chords-content.cjs
node test-jazz-progressions-content.cjs
node test-secondary-dominant-content.cjs
node test-chord-progressions.cjs
node test-first-progressions.cjs
```

Expected: all print `RESULT: PASS` (none of these files reference canonical-numeral patterns directly — confirmed by inspection before writing this plan — so Task 1 alone should not break any of them). `test-progression-curriculum-fix.cjs` still passes at this point because it doesn't yet touch `progressions.length` for `Functional Harmony — C` in a way that Task 1 affects — no code these tests exercise has changed except `checkboxGatedPatterns()`/`enabledProgressions()`, which they exercise directly.

- [ ] **Step 7: Commit**

```bash
git add index.html script.js test-borrowed-checkbox-gating.cjs test-progression-filtering.cjs
git commit -m "Make Functional Harmony's 7 canonical diatonic numerals per mode checkbox-gated

Previously CANONICAL_FUNCTIONAL_NUMERALS caused checkboxGatedPatterns()
and enabledProgressions() to treat these 14 numerals (7 major + 7 minor)
as always-enabled regardless of checkbox or Learning Path stage state.
Give them their own mode-qualified checkboxes (major:I, minor:i, etc.)
so they participate in the same gating every other pattern already has."
```

---

## Task 2: Fix `genFunctional()`'s mode selection and "Functional Harmony — C"

**Files:**
- Modify: `script.js:2126-2144` (`genFunctional()`)
- Modify: `script.js` immediately before `applyStage` (currently script.js:2824) — add `qualifyStageProgression()`
- Modify: `script.js:2834` (`applyStage()`'s `onProgressions` construction)
- Modify: `script.js:312` (`"Functional Harmony — C"` stage's `progressions` field)
- Modify: `test-progression-curriculum-fix.cjs`
- Create: `test-functional-harmony-bug-fix.cjs`

**Interfaces:**
- Consumes: `enabledProgressions(mode)`, `checkboxGatedPatterns()` from Task 1 — both already correct and unchanged in this task.
- Produces: `genFunctional()` only ever selects a mode whose `enabledProgressions(mode)` is non-empty; returns `null` if neither mode has any enabled content (same fail-safe convention the rest of the resolver already uses).
- Produces: `qualifyStageProgression(pattern)` — new helper, maps a bare `stage.progressions` entry to its DOM lookup key. Used only inside `applyStage()`.

### Why `applyStage()` needs a code change (not "zero changes")

`checkboxGatedPatterns()` (Task 1) now returns the **qualified** identifier (`major:I`) as the canonical entries' own list item. `applyStage()`'s existing line:

```javascript
const onProgressions = new Set(stage.progressions ?? ALL_PROGRESSIONS);
...
ALL_PROGRESSIONS.forEach(p => { const el = document.querySelector(`input[data-pattern="${p}"]`); if (el) el.checked = onProgressions.has(p); });
```

builds `onProgressions` straight from `stage.progressions`, which (per this plan's Global Constraints) only ever contains **bare** numeral strings (`'I'`, not `'major:I'`). Comparing bare `stage.progressions` entries against `ALL_PROGRESSIONS`'s qualified entries via `.has(p)` would never match — the "Functional Harmony — C" stage's `progressions: ['I','ii',...]` would leave every canonical checkbox unchecked, breaking the stage entirely (worse than the original bug: zero playable content). `qualifyStageProgression()` closes this gap.

The mapping must preserve **every existing** stage that already lists bare `'iv'`/`'III'`/`'VI'` in its `progressions` field meaning the **major borrowed chord** (the pre-existing, non-canonical checkbox) — those must keep resolving to their current bare checkbox, not the new `minor:iv`/`minor:III`/`minor:VI` canonical ones. The rule: qualify to `major:` when the string is major-canonical; qualify to `minor:` when it's minor-canonical **and no existing bare checkbox already claims that string**; otherwise leave it bare. This preserves all current borrowed-chord stages unchanged and correctly resolves the new canonical stage.

### Current code (script.js:2126-2144)

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const note     = weightedPick(notes, 'roots');
  const isMinor  = Math.random() < 0.5;
  const mode     = isMinor ? 'minor' : 'Major';
  const modeKey  = isMinor ? 'minor' : 'major';
  const patterns = enabledProgressions(modeKey);
  if (!patterns.length) return null;
  const pattern  = pick(patterns);
  const steps    = pattern.split('–');

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]} (chord 1 of ${steps.length})` : `Play: ${pattern}`,
    key:   `func|${note}|${mode}|${pattern}|0`,
  };
}
```

### Current code (script.js:2824-2840)

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
  const onProgressions = new Set(stage.progressions ?? ALL_PROGRESSIONS); // no field -> all enabled (backward compatible)

  ALL_CATS.forEach(id   => { const el = document.getElementById(id);                              if (el) el.checked = onCats.has(id);   });
  ALL_CHORDS.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onChords.has(id); });
  ALL_SCALES.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onScales.has(id); });
  [...NOTES, ...ENHARMONIC_NOTES].forEach(n => { const el = document.querySelector(`input[data-note="${n}"]`); if (el) el.checked = onNotes.has(n); });
  ALL_PROGRESSIONS.forEach(p => { const el = document.querySelector(`input[data-pattern="${p}"]`); if (el) el.checked = onProgressions.has(p); });
```

### Current code (script.js:312)

```javascript
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C',                       cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: [],                                 timer: 'off' },
```

- [ ] **Step 1: Write the new regression test proving the exact bug is fixed**

Create `test-functional-harmony-bug-fix.cjs`:

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

  // --- The exact user-reported bug: "Play Your First Song" (C major, I-IV-V only) must
  //     never produce minor mode or any pattern outside I-IV-V. ---
  const firstSong = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    applyStage(idx);
    const modeCounts = {};
    const patternCounts = {};
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      const parts = prompt.key.split('|');
      modeCounts[parts[2]] = (modeCounts[parts[2]] || 0) + 1;
      patternCounts[parts[3]] = (patternCounts[parts[3]] || 0) + 1;
    }
    return { modeCounts, patternCounts };
  });
  check('Play Your First Song: 200 prompts are all Major mode (no minor leakage)', firstSong.modeCounts, { Major: 200 });
  check('Play Your First Song: 200 prompts are all the I–IV–V pattern (no bare-numeral leakage)', firstSong.patternCounts, { 'I–IV–V': 200 });

  // --- "Functional Harmony — C" must produce only Major mode, one of its 7 canonical numerals ---
  const canonicalStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    const modes = new Set();
    const patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      const parts = prompt.key.split('|');
      modes.add(parts[2]);
      patterns.add(parts[3]);
    }
    return { modes: [...modes], patterns: [...patterns].sort() };
  });
  check('Functional Harmony — C: only ever Major mode across 200 trials', canonicalStage.modes, ['Major']);
  checkTrue('Functional Harmony — C: every pattern seen is one of the 7 canonical numerals', canonicalStage.patterns.every(p => ['I','ii','iii','IV','V','vi','vii°'].includes(p)), `patterns=${JSON.stringify(canonicalStage.patterns)}`);
  checkTrue('Functional Harmony — C: more than one distinct numeral appears across 200 trials (real variety)', canonicalStage.patterns.length > 1, `patterns=${JSON.stringify(canonicalStage.patterns)}`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails against current (pre-fix) code**

```bash
node test-functional-harmony-bug-fix.cjs
```

Expected: FAIL — `Play Your First Song`'s `modeCounts` includes a nonzero `minor` count, and/or `patternCounts` includes patterns other than `I–IV–V`.

- [ ] **Step 3: Replace `genFunctional()` (script.js:2126-2144)**

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const majorPatterns = enabledProgressions('major');
  const minorPatterns = enabledProgressions('minor');
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

- [ ] **Step 4: Add `qualifyStageProgression()` and update `applyStage()` (script.js:2824 area)**

Insert this new function immediately before `function applyStage(idx) {`:

```javascript
// Maps a bare stage.progressions entry to its checkbox lookup key. Canonical numerals
// exclusive to major always qualify; canonical-minor numerals only qualify when no
// existing (non-canonical, e.g. borrowed-chord) checkbox already owns that bare string --
// this keeps every stage that already references borrowed iv/III/VI unqualified working
// exactly as before.
function qualifyStageProgression(pattern) {
  if (CANONICAL_FUNCTIONAL_NUMERALS.major.includes(pattern)) return `major:${pattern}`;
  if (CANONICAL_FUNCTIONAL_NUMERALS.minor.includes(pattern) && !document.querySelector(`input[data-pattern="${pattern}"]`)) return `minor:${pattern}`;
  return pattern;
}

function applyStage(idx) {
```

Then change this line inside `applyStage()`:

```javascript
  const onProgressions = new Set(stage.progressions ?? ALL_PROGRESSIONS); // no field -> all enabled (backward compatible)
```

to:

```javascript
  const onProgressions = new Set((stage.progressions ?? ALL_PROGRESSIONS).map(qualifyStageProgression)); // no field -> all enabled (backward compatible)
```

(`ALL_PROGRESSIONS` is already `checkboxGatedPatterns()`'s qualified output; mapping it through `qualifyStageProgression()` again is a no-op for every entry, since none of its qualified strings — e.g. `'major:I'` — are themselves in `CANONICAL_FUNCTIONAL_NUMERALS.major`/`.minor`, which only contain bare strings.)

- [ ] **Step 5: Update the `"Functional Harmony — C"` stage (script.js:312)**

Change:

```javascript
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C',                       cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: [],                                 timer: 'off' },
```

to:

```javascript
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C',                       cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I','ii','iii','IV','V','vi','vii°'], timer: 'off' },
```

- [ ] **Step 6: Run the new test, verify it passes**

```bash
node test-functional-harmony-bug-fix.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 7: Update `test-progression-curriculum-fix.cjs`**

Replace this block:

```javascript
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
```

with:

```javascript
  checkTrue('Functional Harmony — C stage exists', stage1Check.exists, null);
  check('Functional Harmony — C has exactly the 7 canonical numerals as its progressions (Major-only diatonic content)', stage1Check.progressionsLength, 7);
  check('Functional Harmony — C hint no longer mentions ii–V–I', stage1Check.hint, 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C');

  // --- applyStage() on that stage must leave every non-canonical progression checkbox
  //     unchecked, check all 7 major-canonical numeral checkboxes, and leave all 7
  //     minor-canonical numeral checkboxes unchecked (Major-only stage). ---
  const stage1ApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    const majorCanonical = ['I','ii','iii','IV','V','vi','vii°'].map(p => `major:${p}`);
    const minorCanonical = ['i','ii°','III','iv','V','VI','VII'].map(p => `minor:${p}`);
    return {
      nonCanonicalAllUnchecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false),
      majorCanonicalAllChecked: majorCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      minorCanonicalAllUnchecked: minorCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false),
    };
  }, [ALL_26]);
  checkTrue('applyStage() on Functional Harmony — C leaves all 26 non-canonical progression checkboxes unchecked', stage1ApplyCheck.nonCanonicalAllUnchecked, null);
  checkTrue('applyStage() on Functional Harmony — C checks all 7 major-canonical numeral checkboxes', stage1ApplyCheck.majorCanonicalAllChecked, null);
  checkTrue('applyStage() on Functional Harmony — C leaves all 7 minor-canonical numeral checkboxes unchecked', stage1ApplyCheck.minorCanonicalAllUnchecked, null);
```

Also replace this block:

```javascript
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

with:

```javascript
  const natKeysApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    applyStage(idx);
    const allCanonical = [...['I','ii','iii','IV','V','vi','vii°'].map(p => `major:${p}`), ...['i','ii°','III','iv','V','VI','VII'].map(p => `minor:${p}`)];
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      dChecked: document.querySelector('input[data-note="D"]').checked,
      allProgressionsChecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      allCanonicalChecked: allCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
    };
  }, [ALL_26]);
  check('applyStage() on Functional, Nat. Keys checks C', natKeysApplyCheck.cChecked, true);
  check('applyStage() on Functional, Nat. Keys checks G', natKeysApplyCheck.gChecked, true);
  check('applyStage() on Functional, Nat. Keys checks D (all 7 naturals, not a partial ramp)', natKeysApplyCheck.dChecked, true);
  checkTrue('applyStage() on Functional, Nat. Keys checks all 26 original progression checkboxes (fallback still works)', natKeysApplyCheck.allProgressionsChecked, null);
  checkTrue('applyStage() on Functional, Nat. Keys also checks all 14 canonical numeral checkboxes (fallback covers new canonical content too)', natKeysApplyCheck.allCanonicalChecked, null);
```

- [ ] **Step 8: Run the updated test, verify it passes**

```bash
node test-progression-curriculum-fix.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 9: Run the full regression sweep**

```bash
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-borrowed-chords-content.cjs
node test-jazz-progressions-content.cjs
node test-secondary-dominant-content.cjs
node test-chord-progressions.cjs
node test-first-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
```

Expected: all print `RESULT: PASS`. (The last three are included because Task 2 changes `LEARNING_PATH` stage data, and those files assert stage-count/adjacency invariants elsewhere in the array — confirm no incidental breakage.)

- [ ] **Step 10: Commit**

```bash
git add script.js test-progression-curriculum-fix.cjs test-functional-harmony-bug-fix.cjs
git commit -m "Fix genFunctional() mode coin-flip and restore Functional Harmony — C's scope

genFunctional() previously chose Major/minor with an unconditional 50/50
coin-flip before checking whether either mode had any enabled content --
combined with the canonical-numeral bypass this produced mostly-wrong
prompts on every catFunctional Learning Path stage (reported live as
'Key: C minor, Play: ii°' on a stage configured for C-major I-IV-V only).
Now only modes with non-empty enabledProgressions() are eligible.

Functional Harmony — C's progressions field is updated to explicitly list
its 7 canonical numerals now that they're checkbox-gated (Task 1) --
previously an empty array + the bypass was how it worked. applyStage()
gained qualifyStageProgression() to resolve those bare numeral strings to
their new mode-qualified checkboxes without disturbing any existing stage
that already references borrowed iv/III/VI unqualified."
```

---

## Task 3: "Random Numerals (intense drill)" toggle

**Files:**
- Modify: `index.html` (insert 1 new checkbox into `functionalOptions`)
- Modify: `script.js:2629-2645` (`saveSettings()`'s `ids` array)
- Modify: `script.js` (`genFunctional()`, from Task 2)
- Create: `test-random-numerals-drill.cjs`

**Interfaces:**
- Consumes: `checked(id)` (script.js:705-707) — existing helper for plain by-id checkboxes (already used for `catFunctional`, `adaptiveToggle`, etc.).
- Produces: when `#functionalRandomNumerals` is checked, `genFunctional()` restricts its candidate pool (per mode) to patterns with no `–` in them before picking — every other constraint (per-numeral checkbox state, root-note selection) stays exactly as today.

### Current code (script.js, after Task 2's Step 3)

```javascript
function genFunctional() {
  const notes = enabledNotes();
  if (!notes.length) return null;

  const majorPatterns = enabledProgressions('major');
  const minorPatterns = enabledProgressions('minor');
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

### Current code (script.js:2629-2645)

```javascript
function saveSettings() {
  const ids = [
    'catNotes',
    'catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7',
    'chordSus2', 'chordSus4', 'chord7sus4',
    'chordDom9', 'chordMaj9', 'chordMin9', 'chordDom13',
    'chord7b9', 'chord7s9', 'chord7s11', 'chordHalfDim', 'chordDim7',
    'inversions', 'jazzSymbols', 'leftHandMode',
    'scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor',
    'scaleMajPent', 'scaleMinPent', 'scaleModes',
    'intMin2', 'intMaj2', 'intMin3', 'intMaj3', 'intPerf4', 'intTT',
    'intPerf5', 'intMin6', 'intMaj6', 'intMin7', 'intMaj7', 'intOct',
    'intDirUp', 'intDirDown',
    'adaptiveToggle', 'bandModeToggle',
  ];
```

- [ ] **Step 1: Write the failing test**

Create `test-random-numerals-drill.cjs`:

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

  const defaultState = await page.evaluate(() => document.getElementById('functionalRandomNumerals').checked);
  check('Random Numerals toggle is unchecked by default', defaultState, false);

  // Enable the toggle, restrict to C only, and confirm genFunctional() never returns a
  // multi-step progression while it's on -- only single canonical/borrowed numerals.
  const drillResults = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      patterns.add(prompt.key.split('|')[3]);
    }
    document.getElementById('functionalRandomNumerals').checked = false; // restore
    return [...patterns];
  });
  checkTrue('with Random Numerals on, every pattern across 200 trials is single-numeral (no dash)', drillResults.every(p => !p.includes('–')), `patterns=${JSON.stringify(drillResults)}`);

  // Confirm it still respects individual numeral checkbox state.
  const respectsCheckboxes = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const keepOnly = 'major:I';
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === keepOnly);
    });
    const patterns = new Set();
    for (let i = 0; i < 100; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      patterns.add(prompt.key.split('|')[3]);
    }
    document.getElementById('functionalRandomNumerals').checked = false; // restore
    return [...patterns];
  });
  check('with Random Numerals on and only major:I checked, every prompt is exactly "I"', respectsCheckboxes, ['I']);

  const persistence = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    saveSettings();
    document.getElementById('functionalRandomNumerals').checked = false;
    loadSettings();
    return document.getElementById('functionalRandomNumerals').checked;
  });
  check('Random Numerals toggle state persists through save/load', persistence, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-random-numerals-drill.cjs
```

Expected: FAIL — `document.getElementById('functionalRandomNumerals')` is `null` (element doesn't exist yet), causing a thrown error / non-PASS output.

- [ ] **Step 3: Add the checkbox to `index.html`**

Immediately after the 14 checkboxes inserted in Task 1's Step 1 (i.e. after the `minor:VII` `<label>` line) and before the existing `<div class="option-divider">Progressions</div>`, insert:

```html
                <div class="option-divider">Drill Mode</div>
                <label><input type="checkbox" id="functionalRandomNumerals"> Random Numerals (intense drill)</label>
```

- [ ] **Step 4: Update `genFunctional()` in `script.js`**

Replace the current code shown above with:

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

- [ ] **Step 5: Add `functionalRandomNumerals` to `saveSettings()`'s `ids` array**

Change:

```javascript
    'adaptiveToggle', 'bandModeToggle',
  ];
```

to:

```javascript
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals',
  ];
```

- [ ] **Step 6: Run the test, verify it passes**

```bash
node test-random-numerals-drill.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 7: Run the full regression sweep one more time**

```bash
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-curriculum-fix.cjs
node test-progression-learning-path.cjs
node test-borrowed-chords-content.cjs
node test-jazz-progressions-content.cjs
node test-secondary-dominant-content.cjs
node test-chord-progressions.cjs
node test-first-progressions.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all print `RESULT: PASS`.

- [ ] **Step 8: Commit**

```bash
git add index.html script.js test-random-numerals-drill.cjs
git commit -m "Add opt-in Random Numerals intense-drill mode to Functional Harmony

When enabled, genFunctional() restricts its candidate pool to single-
numeral entries only (no multi-chord progressions), while still fully
respecting individual numeral checkbox state. Off by default, not
referenced by any Learning Path stage -- pure free-play/Shuffle Settings
feature for drilling raw numeral-to-chord recall in isolation."
```

---

## Final Verification

After all 3 tasks are complete, run the complete regression sweep one final time:

```bash
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-curriculum-fix.cjs
node test-progression-learning-path.cjs
node test-borrowed-chords-content.cjs
node test-jazz-progressions-content.cjs
node test-secondary-dominant-content.cjs
node test-chord-progressions.cjs
node test-first-progressions.cjs
node test-functional-harmony-bug-fix.cjs
node test-random-numerals-drill.cjs
node test-left-hand-shape-warmup.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
```

Expected: all `RESULT: PASS`, zero failures.
