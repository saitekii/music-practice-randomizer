# Chord Progressions Learning Path Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Learning Path curate which chord progressions get practiced (e.g. "just I–IV–V, then add IV–V–I"), by adding per-progression checkboxes and wiring them into the existing stage-application and mastery-tracking machinery, then add 8 new curated stages that build the 8 existing progressions up one at a time.

**Architecture:** Task 1 builds the filtering mechanism itself (checkboxes identified by `data-pattern` attributes, mirroring how root notes already work, plus a new `enabledProgressions(mode)` function `genFunctional()` reads from instead of the raw `FUNCTIONAL[mode]` list). Task 2 builds the Learning Path layer on top of it (`applyStage()`/`getStageMastery()` extensions, plus the 8 new stages) — it depends on Task 1's checkboxes existing.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`/`index.html`.
- Progression checkboxes use `data-pattern="<exact pattern string>"` (not `id`), mirroring the existing `data-note` pattern used for root notes — not the generic `id`-based `checked(id)` convention most other settings use.
- Filtering applies ONLY to the 8 progressions. Single-chord numerals (patterns without "–") are never filtered — they always pass through `enabledProgressions()` regardless of any checkbox state.
- All 8 progression checkboxes are checked by default — existing behavior must be completely unchanged for anyone who doesn't touch the new checkboxes.
- A Learning Path stage with no `progressions` field at all (every one of the 6 existing Functional-Harmony-related stages today) must behave as if ALL 8 progressions are enabled — not zero. This is required for backward compatibility with those existing stages.
- `getStageMastery()`'s new progression handling maps each pattern in `stage.progressions` to `{dim: 'variations', key: pattern}`, reusing the exact existing mastery-threshold logic (`count >= 5 && ema <= threshold`) — no new logic needed there beyond adding the items.
- The 8 new stages are inserted directly after the `'Functional Harmony — C'` stage and before `'Functional, Nat. Keys'`, all fixed to `notes: ['C']`, `timer: 'off'`, cumulative (each stage's `progressions` array is the previous stage's array plus one more), in this exact order: `I–IV–V`, `IV–V–I`, `I–V–vi–IV`, `vi–IV–I–V`, `ii–V–I`, `i–iv–V`, `ii°–V–i`, `i–VI–III–VII`.
- No genre tagging/metadata system — ordering alone (via stage sequence) is how difficulty is expressed, matching the rest of the Learning Path.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Per-progression filtering

**Files:**
- Modify: `index.html` (Functional Harmony category, add a `functionalOptions` panel)
- Modify: `script.js:2024-2039` (`genFunctional`)
- Modify: `script.js:2542-2586` (`saveSettings`/`loadSettings`)
- Modify: `script.js:2590-2601` (`syncUI`, add one line)
- Test: `test-progression-filtering.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL` (unchanged), `pick` (unchanged, picks a random element from an array).
- Produces: `enabledProgressions(mode)` — takes `'major'` or `'minor'`, returns a filtered array of pattern strings from `FUNCTIONAL[mode]` (single-chord numerals always included; progressions included only if their `data-pattern` checkbox is checked). Task 2's `applyStage()`/`getStageMastery()` changes rely on the `data-pattern` checkboxes this task creates existing in the DOM, but do not call `enabledProgressions()` directly.

- [ ] **Step 1: Write the failing test**

Create `test-progression-filtering.cjs`:

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

  const checkboxes = await page.evaluate(() => {
    const patterns = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return patterns.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    });
  });
  checkTrue('all 8 progression checkboxes exist', checkboxes.every(c => c.exists), JSON.stringify(checkboxes.map(c => c.pattern)));
  checkTrue('all 8 progression checkboxes are checked by default', checkboxes.every(c => c.checked === true), null);

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

  const wireCheck = await page.evaluate(() => {
    const original = enabledProgressions;
    enabledProgressions = (mode) => mode === 'major' ? ['I–IV–V'] : ['i'];
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const results = [];
    for (let i = 0; i < 20; i++) {
      const prompt = genFunctional();
      results.push(prompt.key.split('|')[3]);
    }
    enabledProgressions = original;
    return results;
  });
  checkTrue('genFunctional() only ever picks patterns enabledProgressions() returned', wireCheck.every(p => p === 'I–IV–V' || p === 'i'), `results=${JSON.stringify(wireCheck)}`);

  const persistence = await page.evaluate(() => {
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = false;
    saveSettings();
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = true;
    loadSettings();
    return document.querySelector(`input[data-pattern="I–IV–V"]`).checked;
  });
  check('progression checkbox state persists through save/load', persistence, false);

  const disableBehavior = await page.evaluate(() => {
    document.getElementById('catFunctional').checked = false;
    syncUI();
    const whileOff = document.getElementById('functionalOptions').classList.contains('disabled');
    document.getElementById('catFunctional').checked = true;
    syncUI();
    const whileOn = document.getElementById('functionalOptions').classList.contains('disabled');
    return { whileOff, whileOn };
  });
  check('functionalOptions is disabled when catFunctional is off', disableBehavior.whileOff, true);
  check('functionalOptions is enabled when catFunctional is on', disableBehavior.whileOn, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-progression-filtering.cjs`
Expected: FAIL on every check — the checkboxes, `enabledProgressions`, and `functionalOptions` panel don't exist yet.

- [ ] **Step 3: Add the checkboxes to `index.html`**

Current code (Functional Harmony category):

```html
            <div class="category">
              <label class="category-header">
                <input type="checkbox" id="catFunctional" checked> Functional Harmony
              </label>
            </div>
```

Replace with:

```html
            <div class="category">
              <label class="category-header">
                <input type="checkbox" id="catFunctional" checked> Functional Harmony
              </label>
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
            </div>
```

- [ ] **Step 4: Add `enabledProgressions` and update `genFunctional`**

Current code (`script.js:2024-2039`):

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

Replace with:

```javascript
function enabledProgressions(mode) {
  return FUNCTIONAL[mode].filter(pattern => {
    if (!pattern.includes('–')) return true; // single-chord numerals are never filtered
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return el ? el.checked : true;
  });
}

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

- [ ] **Step 5: Update `saveSettings`/`loadSettings`**

Current code (`script.js:2542-2552`):

```javascript
  localStorage.setItem('mpr_settings', JSON.stringify({
    timer:            getTimerMode(),
    customTimer:      customTimer.value,
    checks:           Object.fromEntries(ids.map(id => [id, checked(id)])),
    notes:            Object.fromEntries([...NOTES, ...ENHARMONIC_NOTES].map(n => [n, document.querySelector(`input[data-note="${n}"]`)?.checked ?? false])),
    diatonicRoot:     document.getElementById('diatonicRoot').value,
    diatonicMode:     document.getElementById('diatonicMode').value,
    metroBpm:         metroBpmInput.value,
    metroNoteDuration:document.getElementById('metroNoteDuration').value,
    metroTimeSig:     document.getElementById('metroTimeSig').value,
  }));
}
```

Replace with:

```javascript
  const ALL_PROGRESSIONS = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));

  localStorage.setItem('mpr_settings', JSON.stringify({
    timer:            getTimerMode(),
    customTimer:      customTimer.value,
    checks:           Object.fromEntries(ids.map(id => [id, checked(id)])),
    notes:            Object.fromEntries([...NOTES, ...ENHARMONIC_NOTES].map(n => [n, document.querySelector(`input[data-note="${n}"]`)?.checked ?? false])),
    progressions:     Object.fromEntries(ALL_PROGRESSIONS.map(p => [p, document.querySelector(`input[data-pattern="${p}"]`)?.checked ?? false])),
    diatonicRoot:     document.getElementById('diatonicRoot').value,
    diatonicMode:     document.getElementById('diatonicMode').value,
    metroBpm:         metroBpmInput.value,
    metroNoteDuration:document.getElementById('metroNoteDuration').value,
    metroTimeSig:     document.getElementById('metroTimeSig').value,
  }));
}
```

Current code (`script.js:2573-2578`):

```javascript
    if (s.notes) {
      [...NOTES, ...ENHARMONIC_NOTES].forEach(n => {
        const el = document.querySelector(`input[data-note="${n}"]`);
        if (el && s.notes[n] !== undefined) el.checked = s.notes[n];
      });
    }
```

Replace with:

```javascript
    if (s.notes) {
      [...NOTES, ...ENHARMONIC_NOTES].forEach(n => {
        const el = document.querySelector(`input[data-note="${n}"]`);
        if (el && s.notes[n] !== undefined) el.checked = s.notes[n];
      });
    }

    if (s.progressions) {
      const allProgressions = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));
      allProgressions.forEach(p => {
        const el = document.querySelector(`input[data-pattern="${p}"]`);
        if (el && s.progressions[p] !== undefined) el.checked = s.progressions[p];
      });
    }
```

Note: `saveSettings()` (Step 5's first change) already declares a local `ALL_PROGRESSIONS` constant at the top of that function — `loadSettings()` is a separate function, so it needs its own local `allProgressions` (lowercase, to avoid confusion with the other function's constant, though both compute the same thing from the same source data).

- [ ] **Step 6: Update `syncUI`**

Current code (`script.js:2590-2594`):

```javascript
function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('intervalsOptions').classList.toggle('disabled', !checked('catIntervals'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));
```

Replace with:

```javascript
function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('intervalsOptions').classList.toggle('disabled', !checked('catIntervals'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));
  document.getElementById('functionalOptions').classList.toggle('disabled', !checked('catFunctional'));
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-progression-filtering.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Commit**

```bash
git add index.html script.js test-progression-filtering.cjs
git commit -m "Add per-progression filtering for Functional Harmony"
```

---

### Task 2: Learning Path stages for progressions

**Files:**
- Modify: `script.js:2707-2721` (`applyStage`)
- Modify: `script.js:2748-2780` (`getStageMastery`)
- Modify: `script.js:266` (`LEARNING_PATH`, insert 8 new stage entries after this line)
- Test: `test-progression-learning-path.cjs`

**Interfaces:**
- Consumes: the `data-pattern` checkboxes from Task 1 (this task's `applyStage()` changes set their `.checked` state directly, the same way it already does for `data-note` checkboxes).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-progression-learning-path.cjs`:

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

  const stageOrder = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    return {
      idx,
      afterFunctionalC: LEARNING_PATH[idx - 1]?.name === 'Functional Harmony — C',
      names: LEARNING_PATH.slice(idx, idx + 8).map(s => s.name),
      progressionsArrays: LEARNING_PATH.slice(idx, idx + 8).map(s => s.progressions),
    };
  });
  checkTrue('the 8 new stages are inserted right after "Functional Harmony — C"', stageOrder.afterFunctionalC, JSON.stringify(stageOrder.names));
  check('stage 1 has just I–IV–V', JSON.stringify(stageOrder.progressionsArrays[0]), JSON.stringify(['I–IV–V']));
  check('stage 5 has accumulated all 5 major progressions', JSON.stringify(stageOrder.progressionsArrays[4]), JSON.stringify(['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I']));
  check('stage 8 (last) has all 8 progressions', JSON.stringify(stageOrder.progressionsArrays[7]), JSON.stringify(['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII']));

  const applyStageResult = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    applyStage(idx); // progressions: ['I–IV–V'] only
    return {
      iivviChecked: document.querySelector(`input[data-pattern="I–IV–V"]`).checked,
      ivviChecked:  document.querySelector(`input[data-pattern="IV–V–I"]`).checked,
      iiViChecked:  document.querySelector(`input[data-pattern="ii–V–I"]`).checked,
    };
  });
  check('applyStage() checks only the progressions this stage lists', applyStageResult.iivviChecked, true);
  check('applyStage() unchecks progressions not listed by this stage', applyStageResult.ivviChecked, false);
  check('applyStage() unchecks other progressions not listed either', applyStageResult.iiViChecked, false);

  const backCompat = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C'); // no `progressions` field
    applyStage(idx);
    const patterns = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return patterns.map(p => document.querySelector(`input[data-pattern="${p}"]`).checked);
  });
  checkTrue('a stage with no progressions field enables all 8 (backward compatible)', backCompat.every(c => c === true), JSON.stringify(backCompat));

  const masteryResult = await page.evaluate(() => {
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = { 'I–IV–V': { ema: 1000, ema_slow: 1000, count: 5 } };
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    return getStageMastery(idx);
  });
  check('a mastered progression (count>=5, fast enough) shows the stage as ready', masteryResult.ready, true);
  check('mastery percentage is 100 for a single fully-mastered progression', masteryResult.pct, 100);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-progression-learning-path.cjs`
Expected: FAIL on every check — the 8 new stages don't exist yet, `applyStage()`/`getStageMastery()` don't handle `progressions` yet.

- [ ] **Step 3: Update `applyStage`**

Current code (`script.js:2707-2721`):

```javascript
function applyStage(idx) {
  const stage = LEARNING_PATH[idx];
  const ALL_CATS   = ['catNotes','catChords','catScales','catFunctional','catIntervals','catDiatonic'];
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions']);
  const ALL_SCALES = SCALE_TYPES.map(s => s.id);
  const onCats   = new Set(stage.cats);
  const onChords = new Set(stage.chords);
  const onScales = new Set(stage.scales);
  const onNotes  = new Set(stage.notes);

  ALL_CATS.forEach(id   => { const el = document.getElementById(id);                              if (el) el.checked = onCats.has(id);   });
  ALL_CHORDS.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onChords.has(id); });
  ALL_SCALES.forEach(id => { const el = document.getElementById(id);                              if (el) el.checked = onScales.has(id); });
  [...NOTES, ...ENHARMONIC_NOTES].forEach(n => { const el = document.querySelector(`input[data-note="${n}"]`); if (el) el.checked = onNotes.has(n); });
```

Replace with:

```javascript
function applyStage(idx) {
  const stage = LEARNING_PATH[idx];
  const ALL_CATS   = ['catNotes','catChords','catScales','catFunctional','catIntervals','catDiatonic'];
  const ALL_CHORDS = CHORD_TYPES.map(c => c.id).concat(['inversions']);
  const ALL_SCALES = SCALE_TYPES.map(s => s.id);
  const ALL_PROGRESSIONS = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));
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

- [ ] **Step 4: Update `getStageMastery`**

Current code (`script.js:2757-2770`):

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
  const hasChordOrScale = (stage.cats || []).some(c => c === 'catChords' || c === 'catScales');
  if (hasChordOrScale) {
    (stage.notes || []).forEach(n => items.push({ dim: 'roots', key: n }));
  }
  if (!items.length) return null;
```

Replace with:

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
  if (!items.length) return null;
```

- [ ] **Step 5: Insert the 8 new Learning Path stages**

Current code (`script.js:265-266`):

```javascript
  // ── Phase 14: Functional harmony ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C',                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Replace with (adds 8 new entries right after the existing `'Functional Harmony — C'` line, before whatever line already follows it):

```javascript
  // ── Phase 14: Functional harmony ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Functional Harmony — C',   hint: 'I, ii, iii, IV, V, vi, vii°, ii–V–I… play chord functions in the key of C',                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       timer: 'off' },
  { name: 'Progression: I–IV–V',      hint: 'The most common progression in pop, rock, and folk — three chords, no borrowed tones',              cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V'],                                                                                                        timer: 'off' },
  { name: 'Add IV–V–I',               hint: 'Same three chords, different order — a classic turnaround',                                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I'],                                                                                               timer: 'off' },
  { name: 'Add I–V–vi–IV',            hint: 'The "four chord pop song" progression — introduces the vi chord',                                    cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                                                                                   timer: 'off' },
  { name: 'Add vi–IV–I–V',            hint: 'Same four chords, reordered',                                                                        cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V'],                                                                       timer: 'off' },
  { name: 'Add ii–V–I',               hint: 'The quintessential jazz progression — introduces the ii chord',                                       cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I'],                                                              timer: 'off' },
  { name: 'Add i–iv–V (minor)',       hint: 'First minor-key progression — the V stays major even in a minor key',                                 cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V'],                                                     timer: 'off' },
  { name: 'Add ii°–V–i (minor)',      hint: 'Minor-key jazz progression — introduces the diminished ii°',                                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i'],                                           timer: 'off' },
  { name: 'Add i–VI–III–VII (minor)', hint: 'Borrowed major chords from the relative major — the most harmonically unusual of the set',            cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                                                scales: [],                                       progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII'],                           timer: 'off' },
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-progression-learning-path.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-chord-progressions.cjs
node test-left-hand-mode-check.cjs
node test-left-hand-mode-ui.cjs
node test-inversion-stats-tracking.cjs
node test-inversion-stats-display.cjs
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
```

Expected: `RESULT: PASS` on all nine. `test-chord-progressions.cjs` in particular confirms the underlying progression-playing mechanism (from the prior pass) still works correctly now that `genFunctional()` picks from a filtered pool instead of the raw list.

- [ ] **Step 8: Commit**

```bash
git add script.js test-progression-learning-path.cjs
git commit -m "Add Learning Path stages for chord progressions, building them up one at a time"
```
