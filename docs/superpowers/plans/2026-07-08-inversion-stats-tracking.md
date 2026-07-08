# Inversion Stats Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `adaptWeights.variations` tracking bucket (parallel to the existing `roots`/`types`/`combos`) so chord inversion attempts are tracked and displayed as their own stat, instead of being silently lumped into the chord-type stat regardless of which inversion was actually asked.

**Architecture:** `recordAdaptiveResult()` gains one line reading the inversion label already present in the prompt key, feeding it into the already-generic `updateAdaptWeight(dim, key, ms)` function under a new `'variations'` dimension. Three normalization points (initial load, backup restore, manual reset) get a `variations: {}` fallback so the new bucket can never be `undefined`. Display reuses the existing generic `buildSection()` renderer — no new rendering code.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`.
- The new bucket is `adaptWeights.variations`, entries shaped exactly like `roots`/`types`/`combos` (`{ ema, ema_slow, count }`), fed via the existing `updateAdaptWeight(dim, key, ms)` — no changes to that function.
- Keyed by inversion label alone ("Root position", "1st inversion", "2nd inversion", "3rd inversion"), aggregated across every chord type/root — NOT a per-type-per-inversion combo.
- All four labels are tracked, including "Root position" — it is not treated as a non-tracked default.
- When the `inversions` checkbox is off (empty inversion-label key segment), nothing is recorded to `variations` for that answer. `roots`/`types`/`combos` tracking is unaffected either way.
- Three places must each gain a `variations: {}` fallback: the initial `adaptWeights` load, the backup-restore import handler, and the "Reset learning data" button handler.
- Display: one more `buildSection(...)` call, no changes to that function.
- Out of scope: `genChord()`'s inversion-picking logic, any new practice mode, scales/intervals/other prompt types gaining a variation dimension, and `weightedPick`'s adaptive-selection weighting.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Track inversion variations in `adaptWeights`

**Files:**
- Modify: `script.js:536-543` (initial `adaptWeights` load)
- Modify: `script.js:935-946` (`recordAdaptiveResult`)
- Modify: `script.js:3718` (backup-restore import handler)
- Modify: `script.js:3802` (Reset learning data handler)
- Test: `test-inversion-stats-tracking.cjs`

**Interfaces:**
- Consumes: `updateAdaptWeight(dim, key, ms)` (`script.js:618-627`, unchanged, already generic).
- Produces: `adaptWeights.variations` — an object shaped like `roots`/`types`/`combos`, always present (never `undefined`) after this task, in all three load paths. Task 2 reads `adaptWeights.variations` via `Object.entries(...)`.

- [ ] **Step 1: Write the failing test**

Create `test-inversion-stats-tracking.cjs`:

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

  const freshLoad = await page.evaluate(() => {
    return { hasVariations: 'variations' in adaptWeights, isObject: typeof adaptWeights.variations === 'object' };
  });
  check('adaptWeights.variations exists on fresh load', freshLoad.hasVariations, true);
  check('adaptWeights.variations is an object', freshLoad.isObject, true);

  const tracking = await page.evaluate(() => {
    localStorage.removeItem('mpr_weights');
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    document.getElementById('adaptiveToggle').checked = true;

    recordAdaptiveResult('chord|C|Major|1st inversion', 1000);
    recordAdaptiveResult('chord|G|Minor|1st inversion', 1500);
    recordAdaptiveResult('chord|D|Major|Root position', 800);
    recordAdaptiveResult('chord|F|Major|', 900); // inversions checkbox off -- empty label

    return {
      firstInvCount: adaptWeights.variations['1st inversion']?.count,
      rootPosCount:  adaptWeights.variations['Root position']?.count,
      totalVariationKeys: Object.keys(adaptWeights.variations).length,
      typesStillTracked: adaptWeights.types['Major']?.count,
    };
  });
  check('1st inversion tracked across two different chords/roots (count 2)', tracking.firstInvCount, 2);
  check('Root position is tracked too, not skipped as a default', tracking.rootPosCount, 1);
  check('no entry created for the empty-label (inversions off) answer', tracking.totalVariationKeys, 2);
  check('existing types tracking is unaffected', tracking.typesStillTracked, 3);

  const restoreSafety = await page.evaluate(() => {
    // Simulate the exact fallback the restore-import handler applies (script.js:3718-3719)
    // when loading a backup exported before this feature existed (no variations key) --
    // NOT a bypass of it. recordAdaptiveResult itself is not expected to be defensive on
    // its own; the guard lives at this load boundary, matching the other two load points.
    adaptWeights = { roots: {}, types: {}, combos: {} };
    adaptWeights.variations = adaptWeights.variations || {};
    try {
      recordAdaptiveResult('chord|C|Major|1st inversion', 1000);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('recording after an old-format restore does not throw', restoreSafety.threw, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-inversion-stats-tracking.cjs`
Expected: FAIL on `hasVariations`/`isObject` (the key doesn't exist yet) and FAIL on the tracking counts (nothing populates `variations` yet, since `recordAdaptiveResult` doesn't call `updateAdaptWeight('variations', ...)` until Step 4). `restoreSafety` will already print PASS at this point — not because the fix works yet, but because `recordAdaptiveResult` never touches `variations` before Step 4 exists, so there's nothing to throw. It becomes a meaningful check only after Step 4 is in place, which is why it's still included here rather than in a later step.

- [ ] **Step 3: Add the fallback to the initial `adaptWeights` load**

Current code (`script.js:536-543`):

```javascript
let adaptWeights = (() => {
  try {
    const p = JSON.parse(localStorage.getItem('mpr_weights'));
    if (!p) return { roots: {}, types: {}, combos: {} };
    return { roots: p.roots || {}, types: p.types || {}, combos: p.combos || {} };
  }
  catch (_) { return { roots: {}, types: {}, combos: {} }; }
})();
```

Replace with:

```javascript
let adaptWeights = (() => {
  try {
    const p = JSON.parse(localStorage.getItem('mpr_weights'));
    if (!p) return { roots: {}, types: {}, combos: {}, variations: {} };
    return { roots: p.roots || {}, types: p.types || {}, combos: p.combos || {}, variations: p.variations || {} };
  }
  catch (_) { return { roots: {}, types: {}, combos: {}, variations: {} }; }
})();
```

- [ ] **Step 4: Record the inversion variation in `recordAdaptiveResult`**

Current code (`script.js:935-946`):

```javascript
function recordAdaptiveResult(key, ms) {
  if (!adaptiveOn()) return;
  const parts = key.split('|');
  const type  = parts[0];
  if      (type === 'note')     { updateAdaptWeight('roots', parts[1], ms); }
  else if (type === 'chord')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms); }
  else if (type === 'scale')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms); }
  else if (type === 'interval') { updateAdaptWeight('roots', parts[2], ms); updateAdaptWeight('types', parts[1], ms); }
  else if (type === 'func')     { updateAdaptWeight('roots', parts[1], ms); }
  saveAdaptWeights();
  updateMasteryUI();
}
```

Replace with:

```javascript
function recordAdaptiveResult(key, ms) {
  if (!adaptiveOn()) return;
  const parts = key.split('|');
  const type  = parts[0];
  if      (type === 'note')     { updateAdaptWeight('roots', parts[1], ms); }
  else if (type === 'chord')    {
    updateAdaptWeight('roots', parts[1], ms);
    updateAdaptWeight('types', parts[2], ms);
    updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms);
    if (parts[3]) updateAdaptWeight('variations', parts[3], ms);
  }
  else if (type === 'scale')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms); }
  else if (type === 'interval') { updateAdaptWeight('roots', parts[2], ms); updateAdaptWeight('types', parts[1], ms); }
  else if (type === 'func')     { updateAdaptWeight('roots', parts[1], ms); }
  saveAdaptWeights();
  updateMasteryUI();
}
```

Note: `key.split('|')` on a chord prompt key always produces `parts[3]` as either a real inversion label (e.g. `"1st inversion"`) or an empty string (when the `inversions` checkbox is off — see `genChord()`'s `key: \`chord|${note}|${type.label}|${inv}\`` where `inv` defaults to `''`). `if (parts[3])` is `false` for an empty string, so no entry is recorded in that case, exactly as required.

- [ ] **Step 5: Add the fallback to the backup-restore import handler**

Current code (`script.js:3718`):

```javascript
        adaptWeights = data.adaptive_weights;
```

Replace with:

```javascript
        adaptWeights = data.adaptive_weights;
        adaptWeights.variations = adaptWeights.variations || {};
```

- [ ] **Step 6: Add the fallback to the Reset learning data handler**

Current code (`script.js:3802`):

```javascript
    adaptWeights = { roots: {}, types: {}, combos: {} };
```

Replace with:

```javascript
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-inversion-stats-tracking.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Commit**

```bash
git add script.js test-inversion-stats-tracking.cjs
git commit -m "Track chord inversion attempts as their own adaptive-stats dimension"
```

---

### Task 2: Display the Inversions section on the stats page

**Files:**
- Modify: `script.js:931-932` (`renderStats`'s final `buildSection` calls)
- Test: `test-inversion-stats-display.cjs`

**Interfaces:**
- Consumes: `adaptWeights.variations` (Task 1), `buildSection(entries, title)` (defined earlier inside `renderStats`, unchanged — already generic over any `[key, {ema, ema_slow, count}]` entry list).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-inversion-stats-display.cjs`:

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
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {
        'Root position':  { ema: 900,  ema_slow: 950,  count: 5 },
        '1st inversion':  { ema: 1600, ema_slow: 1500, count: 5 },
      },
    };
    return renderStats();
  });

  checkTrue('stats page shows an Inversions section', html.includes('Inversions'), null);
  checkTrue('the section lists Root position', html.includes('Root position'), null);
  checkTrue('the section lists 1st inversion', html.includes('1st inversion'), null);

  const emptyVariations = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {},
    };
    return renderStats();
  });
  checkTrue('no empty Inversions heading when there is no variation data yet', !emptyVariations.includes('Inversions'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-inversion-stats-display.cjs`
Expected: FAIL on the first three checks (no "Inversions" section exists yet); the fourth check passes vacuously either way since nothing renders it yet, but will remain meaningful once Step 3 is done.

- [ ] **Step 3: Add the Inversions section**

Current code (`script.js:931-932`):

```javascript
    + buildSection(rootEntries, 'Root Notes')
    + buildSection(typeEntries, 'Types');
```

Replace with:

```javascript
    + buildSection(rootEntries, 'Root Notes')
    + buildSection(typeEntries, 'Types')
    + buildSection(Object.entries(adaptWeights.variations), 'Inversions');
```

Note: `buildSection(entries, title)` (defined earlier in `renderStats`, unchanged by this task) already returns `''` when `entries` is empty (`if (!entries.length) return '';`), which is why the "no empty heading" check in the test above passes once this line is in place — no extra guard is needed here.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-inversion-stats-display.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Run the full regression sweep**

```bash
node test-inversion-stats-tracking.cjs
node test-inversion-stats-display.cjs
node test-stats-accuracy-practice-time.cjs
node test-stats-header-display.cjs
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
```

Expected: `RESULT: PASS` on all eight. The `test-stats-*` and `test-chord-inversion-*` and `test-band-*` tests are included because they all call `recordAdaptiveResult`/`renderStats`/`checkMidi` as part of their existing scenarios — this confirms the new `variations` bucket and the extra `buildSection` call don't break any of them (none of their existing assertions depend on `adaptWeights.variations`, so nothing should change for them).

- [ ] **Step 6: Commit**

```bash
git add script.js test-inversion-stats-display.cjs
git commit -m "Display chord inversion stats as their own section on the stats page"
```
