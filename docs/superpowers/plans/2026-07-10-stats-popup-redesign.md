# Practice Stats Popup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 real bugs (Ear Training chord/scale stat collision, sample-size-blind sorting, measured-vs-synthesized weak-spot ambiguity) and 5 organization/labeling issues in the Practice Stats popup (`#statsModal`).

**Architecture:** Pure edits to `script.js`'s existing rendering functions (`renderStats`, `renderEarStats`, and their nested `buildSection`/`buildEarSection` closures) plus one small CSS addition. No new files, no new dependencies, no data-model changes beyond the Ear Training weight key format.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No new dependencies, no build step (per `CLAUDE.md`).
- The Ear Training key-format change (Task 1) is a breaking storage-format change intentionally: it triggers a **one-time reset of `earAdaptWeights` only** (not `mpr_daily`, not `adaptWeights`, not any Playing-tab data) the first time the updated code runs against pre-fix data. This is a deliberate, approved decision — not an oversight to "fix" by preserving old data.
- **`startDrill()`'s ear branch (script.js, unchanged in this plan) looks up a bare label against `EAR_INT_MAP`/`EAR_CHORD_MAP`/`EAR_SCALE_MAP` values** (e.g. `'Major'`), not a category-prefixed key. Any UI-facing text derived from a category-prefixed `earAdaptWeights.types` key (row labels, `data-type` attributes, drill button labels) MUST have the `category:` prefix stripped before being displayed or used as a `data-type` attribute — otherwise the ear-tab Drill button silently becomes a no-op. This is the single most important interface detail in this plan.
- Every task that changes rendered text in `renderStats()`/`renderEarStats()` must check whether any pre-existing test file asserts on the old text and update it in the same task (not left for a later cleanup pass).

---

### Task 1: Ear Training key-collision fix

**Files:**
- Modify: `script.js:630-633` (`earAdaptWeights` init IIFE — add one-time cleanup)
- Modify: `script.js:1052-1082` (`saveEarAdaptWeights`, `updateEarAdaptWeight`, `weightedPickEar`, `recordEarResult` — add `stripEarCategory` helper, thread `category` through `weightedPickEar`/`recordEarResult`)
- Modify: `script.js:1138`, `1154`, `1169` (the three `weightedPickEar(pool)` call sites in `genEarInterval`/`genEarChord`/`genEarScale`)
- Modify: `script.js:1288`, `1374` (the two `recordEarResult(...)` call sites)
- Modify: `script.js:1556-1596` (inside `renderEarStats()`: `buildEarSection`'s row template and `earWeakSpotsHtml`'s row template — strip the category prefix for display AND for the `data-type` attribute)
- Test: `test-ear-stats-category-keys.cjs`

**Interfaces:**
- Consumes: nothing from other tasks (this is the first task).
- Produces: `stripEarCategory(key)` — new top-level function, `key.replace(/^(interval|chord|scale):/, '')` → bare label string. `weightedPickEar(items, category)` — `category` is now a required second parameter (`'interval'|'chord'|'scale'`). `recordEarResult(category, label, ms)` — `category` is now a required first parameter. Later tasks (2 onward) that touch `buildEarSection` must build on the POST-this-task state of that function (it now calls `stripEarCategory(key)` in its row template).

- [ ] **Step 1: Write the failing test**

Create `test-ear-stats-category-keys.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });

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

  // --- Test 1: pre-fix bare-label data gets reset on load ---
  await page.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
    localStorage.setItem('mpr_weights_ear', JSON.stringify({ types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } } }));
  });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);
  const afterReset = await page.evaluate(() => Object.keys(earAdaptWeights.types));
  check('pre-fix bare-label data is reset to empty on load', afterReset, []);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('mpr_weights_ear')).types);
  check('the reset is persisted to localStorage, not just in-memory', persisted, {});
  await page.close();

  // --- Test 2: fresh page with no ear weights at all -- no-op, no crash ---
  const page2 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page2.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page2.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page2.waitForTimeout(300);
  const freshTypes = await page2.evaluate(() => earAdaptWeights.types);
  check('a fresh install with no ear data has empty types, no crash', freshTypes, {});
  await page2.close();

  // --- Test 3: post-fix prefixed data is NOT reset, chord/scale 'Major' stay separate ---
  const page3 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page3.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
    localStorage.setItem('mpr_weights_ear', JSON.stringify({
      types: {
        'chord:Major': { ema: 1000, ema_slow: 1000, count: 5 },
        'scale:Major': { ema: 2000, ema_slow: 2000, count: 5 },
      },
    }));
  });
  await page3.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page3.waitForTimeout(300);
  const keys3 = await page3.evaluate(() => Object.keys(earAdaptWeights.types).sort());
  check('already-prefixed data survives untouched (no reset)', keys3, ['chord:Major', 'scale:Major']);
  const emas3 = await page3.evaluate(() => ({
    chordMajor: earAdaptWeights.types['chord:Major'].ema,
    scaleMajor: earAdaptWeights.types['scale:Major'].ema,
  }));
  check('chord Major and scale Major keep distinct EMA values (not merged)', emas3, { chordMajor: 1000, scaleMajor: 2000 });

  // --- Test 4: recordEarResult writes distinct keys for the same label in different categories ---
  const recordResult = await page3.evaluate(() => {
    recordEarResult('chord', 'Minor', 1500);
    recordEarResult('scale', 'Minor', 2500);
    return {
      chordMinor: earAdaptWeights.types['chord:Minor']?.ema,
      scaleMinor: earAdaptWeights.types['scale:Minor']?.ema,
    };
  });
  check('recordEarResult keys by category, same label in two categories stay separate', recordResult, { chordMinor: 1500, scaleMinor: 2500 });

  // --- Test 5: weightedPickEar looks up the category-scoped key (statistical check) ---
  const pickResult = await page3.evaluate(() => {
    earAdaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'chord:Minor': { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let majorCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPickEar(['Major', 'Minor'], 'chord') === 'Major') majorCount++;
    }
    return majorCount;
  });
  checkTrue('weightedPickEar favors the slower ("Major") item well above uniform 50%', pickResult > 240, `Major picked ${pickResult}/400 times`);

  // --- Test 6: rendered Recognition Types / Focus on These show bare labels, not prefixed keys ---
  const renderResult = await page3.evaluate(() => {
    earAdaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'scale:Major': { ema: 1000, ema_slow: 1000, count: 5 },
    };
    const html = renderEarStats();
    return { html, majorRowCount: (html.match(/>Major</g) || []).length, hasPrefixedText: html.includes('chord:Major') || html.includes('scale:Major') };
  });
  check('Recognition Types shows two separate "Major" rows (chord + scale, not merged)', renderResult.majorRowCount, 2);
  checkTrue('no category-prefixed text ever appears in rendered HTML', !renderResult.hasPrefixedText, null);

  // --- Test 7: the critical startDrill regression -- data-type attribute must be the BARE label ---
  const drillAttr = await page3.evaluate(() => {
    earAdaptWeights.types = { 'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 } };
    document.getElementById('statsContent').innerHTML = renderEarStats();
    const btn = document.querySelector('.drill-btn[data-ear="true"]');
    return btn ? btn.getAttribute('data-type') : null;
  });
  check('the ear Drill button\'s data-type is the bare label ("Major"), not "chord:Major" -- startDrill() matches against EAR_CHORD_MAP\'s bare values and would silently no-op otherwise', drillAttr, 'Major');

  await page3.close();
  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-ear-stats-category-keys.cjs`
Expected: FAIL — `stripEarCategory` doesn't exist, `weightedPickEar`/`recordEarResult` don't accept a category parameter, no cleanup logic exists yet.

- [ ] **Step 3: Add the one-time cleanup to the `earAdaptWeights` init**

Current code (`script.js:630-633`):

```javascript
let earAdaptWeights = (() => {
  try { return JSON.parse(localStorage.getItem('mpr_weights_ear')) || { types: {} }; }
  catch (_) { return { types: {} }; }
})();
```

Replace with:

```javascript
let earAdaptWeights = (() => {
  let weights;
  try { weights = JSON.parse(localStorage.getItem('mpr_weights_ear')) || { types: {} }; }
  catch (_) { weights = { types: {} }; }
  // One-time cleanup: pre-fix data was keyed by bare label (e.g. 'Major'), shared across
  // intervals/chords/scales -- 'Major' the chord and 'Major' the scale silently merged into
  // one bucket. New keys are category-prefixed ('chord:Major'). Any bare (unprefixed) key
  // still present means this data predates the fix -- reset once; this never fires again
  // since every key written going forward is prefixed.
  const hasPreFixKeys = Object.keys(weights.types).some(k => !k.includes(':'));
  if (hasPreFixKeys) {
    weights.types = {};
    localStorage.setItem('mpr_weights_ear', JSON.stringify(weights));
  }
  return weights;
})();
```

- [ ] **Step 4: Add `stripEarCategory`, thread `category` through `weightedPickEar` and `recordEarResult`**

Current code (`script.js:1052-1082`):

```javascript
function saveEarAdaptWeights() {
  localStorage.setItem('mpr_weights_ear', JSON.stringify(earAdaptWeights));
}

function updateEarAdaptWeight(label, ms) {
  const g = earAdaptWeights.types;
  if (!g[label]) {
    g[label] = { ema: ms, ema_slow: ms, count: 1 };
  } else {
    g[label].ema      = 0.3  * ms + 0.7  * g[label].ema;
    g[label].ema_slow = 0.07 * ms + 0.93 * (g[label].ema_slow ?? g[label].ema);
    g[label].count    = Math.min(g[label].count + 1, 9999);
  }
}

function weightedPickEar(items) {
  const g      = earAdaptWeights.types;
  const emas   = items.map(item => { const e = g[item]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean   = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total  = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function recordEarResult(label, ms) {
  updateEarAdaptWeight(label, ms);
  saveEarAdaptWeights();
}
```

Replace with:

```javascript
function saveEarAdaptWeights() {
  localStorage.setItem('mpr_weights_ear', JSON.stringify(earAdaptWeights));
}

function stripEarCategory(key) {
  return key.replace(/^(interval|chord|scale):/, '');
}

function updateEarAdaptWeight(label, ms) {
  const g = earAdaptWeights.types;
  if (!g[label]) {
    g[label] = { ema: ms, ema_slow: ms, count: 1 };
  } else {
    g[label].ema      = 0.3  * ms + 0.7  * g[label].ema;
    g[label].ema_slow = 0.07 * ms + 0.93 * (g[label].ema_slow ?? g[label].ema);
    g[label].count    = Math.min(g[label].count + 1, 9999);
  }
}

function weightedPickEar(items, category) {
  const g      = earAdaptWeights.types;
  const emas   = items.map(item => { const e = g[`${category}:${item}`]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean   = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total  = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function recordEarResult(category, label, ms) {
  updateEarAdaptWeight(`${category}:${label}`, ms);
  saveEarAdaptWeights();
}
```

- [ ] **Step 5: Update the three `weightedPickEar` call sites**

Current code (`script.js:1138`, inside `genEarInterval`):
```javascript
  const correct     = weightedPickEar(pool);
```
Replace with:
```javascript
  const correct     = weightedPickEar(pool, 'interval');
```

Current code (`script.js:1154`, inside `genEarChord`):
```javascript
  const correct     = weightedPickEar(pool);
```
Replace with:
```javascript
  const correct     = weightedPickEar(pool, 'chord');
```

Current code (`script.js:1169`, inside `genEarScale`):
```javascript
  const correct     = weightedPickEar(pool);
```
Replace with:
```javascript
  const correct     = weightedPickEar(pool, 'scale');
```

(These three lines are textually identical before the edit — locate each by its surrounding function, not by a global find/replace, since a blind replace-all would only need one replacement anyway but the three functions must each get their own literal category string.)

- [ ] **Step 6: Update the two `recordEarResult` call sites**

Both occurrences (`script.js:1288` and `script.js:1374`) currently read:
```javascript
    recordEarResult(earCurrentPrompt.correct, recordMs);
```
Replace **both** with:
```javascript
    recordEarResult(earCurrentPrompt.type, earCurrentPrompt.correct, recordMs);
```

- [ ] **Step 7: Strip the category prefix in `buildEarSection`'s row template**

Current code (`script.js`, inside `renderEarStats()`'s nested `buildEarSection`):
```javascript
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${key}</span>
        ${barHtml}
```
Replace with:
```javascript
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${stripEarCategory(key)}</span>
        ${barHtml}
```

- [ ] **Step 8: Strip the category prefix in `earWeakSpotsHtml`'s row template (display name AND `data-type`)**

Current code (`script.js`, inside `renderEarStats()`):
```javascript
  const earWeakSpotsHtml = earWeakItems.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${earWeakItems.map(([k, e]) => `<div class="weak-spot-row">
      <span class="weak-spot-name">${k}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${k}" data-ear="true">Drill</button>
    </div>`).join('')}
  </div>` : '';
```
Replace with:
```javascript
  const earWeakSpotsHtml = earWeakItems.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${earWeakItems.map(([k, e]) => `<div class="weak-spot-row">
      <span class="weak-spot-name">${stripEarCategory(k)}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${stripEarCategory(k)}" data-ear="true">Drill</button>
    </div>`).join('')}
  </div>` : '';
```

**Do not skip the `data-type` change.** `startDrill()`'s ear branch (unchanged elsewhere) searches `EAR_INT_MAP`/`EAR_CHORD_MAP`/`EAR_SCALE_MAP` for a value matching `data-type` exactly. Those maps' values are bare labels (`'Major'`, `'Tritone'`, etc.) — never prefixed. Leaving `data-type="${k}"` un-stripped means the Drill button on the Ear tab silently does nothing (`if (!earTarget) return;`) for every weak-spot entry.

- [ ] **Step 9: Run test to verify it passes**

Run: `node test-ear-stats-category-keys.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 10: Commit**

```bash
git add script.js test-ear-stats-category-keys.cjs
git commit -m "Fix Ear Training chord/scale stat collision with category-prefixed keys"
```

---

### Task 2: Sort order accounts for sample size

**Files:**
- Modify: `script.js:931-966` (`buildSection`, nested inside `renderStats()`)
- Modify: `script.js` (`buildEarSection`, nested inside `renderEarStats()` — **post-Task-1 state**, already contains `stripEarCategory(key)` in its row template from Task 1 Step 7)
- Test: `test-stats-sort-order.cjs`

**Interfaces:**
- Consumes: `stripEarCategory` (Task 1) — already applied inside `buildEarSection`'s row template; this task does not touch that line, only the sort/grouping logic above it.
- Produces: nothing new — `buildSection`/`buildEarSection`'s external behavior (return value shape, when they return `''`) is unchanged; only row ordering within a non-empty section changes.

- [ ] **Step 1: Write the failing test**

Create `test-stats-sort-order.cjs`:

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

  // Playing tab: a "building" entry (count=2) has a WORSE (higher) EMA than a "confirmed"
  // entry (count=10) -- confirmed must still render first, building entries pushed below.
  const playingOrder = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: {
        'Diminished': { ema: 2600, ema_slow: 2600, count: 2 },  // building, slowest raw EMA
        'Dominant 7': { ema: 2200, ema_slow: 2200, count: 6 },  // confirmed
        'Major':      { ema: 1100, ema_slow: 1100, count: 20 }, // confirmed, fastest
      },
      combos: {},
      variations: {},
    };
    const html = renderStats();
    const order = [...html.matchAll(/<span class="stats-key">([^<]+)<\/span>/g)].map(m => m[1]);
    return order;
  });
  check('confirmed entries (count>=3) sort worst-to-best by speed, building entries come after regardless of raw EMA', playingOrder, ['Dominant 7', 'Major', 'Diminished']);

  // Ear tab: same principle, using category-prefixed keys (post Task 1).
  const earOrder = await page.evaluate(() => {
    earAdaptWeights = {
      types: {
        'chord:Diminished': { ema: 2600, ema_slow: 2600, count: 2 },
        'chord:Dominant 7': { ema: 2200, ema_slow: 2200, count: 6 },
        'chord:Major':      { ema: 1100, ema_slow: 1100, count: 20 },
      },
    };
    localStorage.setItem('mpr_daily', JSON.stringify([{ date: new Date().toISOString().slice(0,10), earAnswers: 5, earAvgMs: 1000 }]));
    const html = renderEarStats();
    return [...html.matchAll(/<span class="stats-key">([^<]+)<\/span>/g)].map(m => m[1]);
  });
  check('Ear tab: same confirmed-then-building ordering, with bare (stripped) labels', earOrder, ['Dominant 7', 'Major', 'Diminished']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-sort-order.cjs`
Expected: FAIL — `Diminished`/`chord:Diminished` currently sorts first (highest raw EMA), not last.

- [ ] **Step 3: Fix `buildSection`'s sort**

Current code (`script.js`, inside `renderStats()`):
```javascript
  function buildSection(entries, title) {
    if (!entries.length) return '';
    const sorted   = [...entries].sort(([, a], [, b]) => b.ema - a.ema);
    const withData = sorted.filter(([, e]) => e.count >= 3);
    const maxEma   = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma   = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta    = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;
```
Replace with:
```javascript
  function buildSection(entries, title) {
    if (!entries.length) return '';
    const confirmed = entries.filter(([, e]) => e.count >= 3).sort(([, a], [, b]) => b.ema - a.ema);
    const building  = entries.filter(([, e]) => e.count < 3).sort(([, a], [, b]) => b.count - a.count);
    const sorted    = [...confirmed, ...building];
    const withData  = confirmed;
    const maxEma    = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma    = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta     = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;
```

The rest of `buildSection` (the `rows = sorted.map(...)` block and the final `return`) is unchanged — `sorted` is still consumed the same way, just built differently.

- [ ] **Step 4: Fix `buildEarSection`'s sort (identical transform)**

Current code (`script.js`, inside `renderEarStats()` — this is the state after Task 1's Step 7 edit, note the `stripEarCategory(key)` already present later in the same function):
```javascript
  function buildEarSection(entries, title) {
    if (!entries.length) return '';
    const sorted   = [...entries].sort(([, a], [, b]) => b.ema - a.ema);
    const withData = sorted.filter(([, e]) => e.count >= 3);
    const maxEma   = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma   = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta    = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;
```
Replace with:
```javascript
  function buildEarSection(entries, title) {
    if (!entries.length) return '';
    const confirmed = entries.filter(([, e]) => e.count >= 3).sort(([, a], [, b]) => b.ema - a.ema);
    const building  = entries.filter(([, e]) => e.count < 3).sort(([, a], [, b]) => b.count - a.count);
    const sorted    = [...confirmed, ...building];
    const withData  = confirmed;
    const maxEma    = withData.length ? Math.max(...withData.map(([, e]) => e.ema)) : null;
    const minEma    = withData.length ? Math.min(...withData.map(([, e]) => e.ema)) : null;
    const delta     = (maxEma && minEma && maxEma !== minEma) ? maxEma - minEma : null;
```

The rest of `buildEarSection` (the `rows = sorted.map(...)` block, including the already-present `stripEarCategory(key)` call, and the final `return`) is unchanged.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-stats-sort-order.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js test-stats-sort-order.cjs
git commit -m "Sort mastery lists by confirmed-then-building, not raw EMA alone"
```

---

### Task 3: "Focus on These" — measured combos only

**Files:**
- Modify: `script.js:968-1012` (inside `renderStats()`: the `weakCombos`/`weakItems`/`usesCombos`/`weakSpotsHtml` computation)
- Test: `test-stats-focus-measured-only.cjs`

**Interfaces:**
- Consumes: nothing from Tasks 1-2.
- Produces: `weakSpotsHtml` — same variable name, still consumed by the `return` statement in `renderStats()` (Task 4 touches that `return` statement, but not this variable's name or its assignment location).

- [ ] **Step 1: Write the failing test**

Create `test-stats-focus-measured-only.cjs`:

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

  // Roots and types both have qualifying (count>=3) data, but NO combo has count>=3 yet --
  // previously this synthesized a cross-product estimate; now the panel must not render at all.
  const noComboResult = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 3000, ema_slow: 3000, count: 10 }, D: { ema: 1000, ema_slow: 1000, count: 10 } },
      types: { Major: { ema: 3000, ema_slow: 3000, count: 10 }, Minor: { ema: 1000, ema_slow: 1000, count: 10 } },
      combos: {},
      variations: {},
    };
    return renderStats();
  });
  checkTrue('no "Focus on these" panel when no combo has 3+ samples, even though roots/types do', !noComboResult.includes('Focus on these'), null);
  checkTrue('no synthesized cross-product entry (e.g. "C Major") appears anywhere', !noComboResult.includes('C Major'), null);

  // A real measured combo exists -- panel renders, using it.
  const withComboResult = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 3000, ema_slow: 3000, count: 10 } },
      types: { Major: { ema: 3000, ema_slow: 3000, count: 10 } },
      combos: { 'C|Major': { ema: 3200, ema_slow: 3200, count: 4 } },
      variations: {},
    };
    return renderStats();
  });
  checkTrue('"Focus on these" panel renders when a real combo has 3+ samples', withComboResult.includes('Focus on these'), null);
  checkTrue('the real combo is shown, root and type space-separated', withComboResult.includes('C Major'), null);
  checkTrue('the drill button is marked data-combo="true"', withComboResult.includes('data-combo="true"'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-focus-measured-only.cjs`
Expected: FAIL — the no-combo case currently synthesizes a cross-product "C Major" entry and renders the panel.

- [ ] **Step 3: Remove the cross-product fallback**

Current code (`script.js`, inside `renderStats()`):
```javascript
  // Prefer actual measured combos; fall back to cross-product estimate
  const comboEntries = Object.entries(adaptWeights.combos || {});
  const weakCombos   = comboEntries
    .filter(([, e]) => e.count >= 3)
    .sort(([, a], [, b]) => b.ema - a.ema)
    .slice(0, 3);

  let weakItems, usesCombos;
  if (weakCombos.length) {
    weakItems  = weakCombos;
    usesCombos = true;
  } else {
    // Estimate from slowest roots × slowest types using existing data
    const qualRoots = rootEntries.filter(([, e]) => e.count >= 3).sort(([, a], [, b]) => b.ema - a.ema);
    const qualTypes = typeEntries.filter(([, e]) => e.count >= 3).sort(([, a], [, b]) => b.ema - a.ema);
    if (qualRoots.length && qualTypes.length) {
      const rootMean = qualRoots.reduce((s, [, e]) => s + e.ema, 0) / qualRoots.length;
      const typeMean = qualTypes.reduce((s, [, e]) => s + e.ema, 0) / qualTypes.length;
      const cross = [];
      for (const [r, re] of qualRoots.slice(0, 5)) {
        for (const [t, te] of qualTypes.slice(0, 5)) {
          cross.push([r + '|' + t, {
            ema:   (re.ema + te.ema) / 2,
            count: 0,
            score: (re.ema / (rootMean || 1)) + (te.ema / (typeMean || 1)),
          }]);
        }
      }
      cross.sort(([, a], [, b]) => b.score - a.score);
      weakItems  = cross.slice(0, 3);
      usesCombos = true;
    } else {
      weakItems  = qualTypes.slice(0, 3);
      usesCombos = false;
    }
  }

  const weakSpotsHtml = weakItems.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${weakItems.map(([k, e]) => `<div class="weak-spot-row">
      <span class="weak-spot-name">${usesCombos ? k.replace('|', ' ') : k}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${k}" data-ear="false" data-combo="${usesCombos}">Drill</button>
    </div>`).join('')}
  </div>` : '';
```

Replace with:
```javascript
  const comboEntries = Object.entries(adaptWeights.combos || {});
  const weakCombos   = comboEntries
    .filter(([, e]) => e.count >= 3)
    .sort(([, a], [, b]) => b.ema - a.ema)
    .slice(0, 3);

  const weakSpotsHtml = weakCombos.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${weakCombos.map(([k, e]) => `<div class="weak-spot-row">
      <span class="weak-spot-name">${k.replace('|', ' ')}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${k}" data-ear="false" data-combo="true">Drill</button>
    </div>`).join('')}
  </div>` : '';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-stats-focus-measured-only.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-stats-focus-measured-only.cjs
git commit -m "Focus on These: only show measured combos, drop cross-product estimate"
```

---

### Task 4: Reorder sections, rename "Inversions" to "Voicings"

**Files:**
- Modify: `script.js:1014-1018` (the final `return` statement of `renderStats()`)
- Modify: `test-inversion-stats-display.cjs` (2 assertions reference the literal string "Inversions")
- Test: `test-stats-section-order.cjs`

**Interfaces:**
- Consumes: `weakSpotsHtml`, `calHtml`, `chartHtml`, `legendHtml`, `headerHtml`, `rootEntries`, `typeEntries` — all pre-existing variables from earlier in `renderStats()`, unchanged by Tasks 1-3 in name or type (string in all cases).
- Produces: nothing new — this only reorders how existing HTML strings are concatenated and changes one title string.

- [ ] **Step 1: Write the failing test**

Create `test-stats-section-order.cjs`:

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

  const result = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: { 'C|Major': { ema: 1200, ema_slow: 1200, count: 4 } },
      variations: { 'Root position': { ema: 900, ema_slow: 900, count: 5 } },
    };
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('mpr_daily', JSON.stringify([
      { date: today, answers: 5, avgMs: 1000, totalMs: 5000, firstTryCount: 3 },
      { date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), answers: 5, avgMs: 1000, totalMs: 5000, firstTryCount: 3 },
    ]));
    const html = renderStats();
    const markers = ['stats-header-row', 'weak-spots-panel', 'cal-section', 'stats-chart-wrap', 'stats-legend', '>Root Notes<', '>Types<', '>Voicings<'];
    return markers.map(m => html.indexOf(m));
  });

  const [header, weakSpots, calendar, chart, legend, roots, types, voicings] = result;
  checkTrue('all 8 expected sections are present', result.every(i => i !== -1), JSON.stringify(result));
  checkTrue('order: header, then Focus on These, then Calendar, then Chart, then Legend, then Root Notes, Types, Voicings',
    header < weakSpots && weakSpots < calendar && calendar < chart && chart < legend && legend < roots && roots < types && types < voicings, JSON.stringify(result));

  const noInversions = await page.evaluate(() => renderStats().includes('Inversions'));
  checkTrue('the section is titled "Voicings", not "Inversions"', !noInversions, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-section-order.cjs`
Expected: FAIL — current order is header/calendar/weak-spots/legend/chart, and the section is titled "Inversions".

- [ ] **Step 3: Reorder and rename**

Current code (`script.js`, end of `renderStats()`):
```javascript
  const calHtml = renderCalendar(log);
  return headerHtml + calHtml + weakSpotsHtml + legendHtml + chartHtml
    + buildSection(rootEntries, 'Root Notes')
    + buildSection(typeEntries, 'Types')
    + buildSection(Object.entries(adaptWeights.variations), 'Inversions');
```
Replace with:
```javascript
  const calHtml = renderCalendar(log);
  return headerHtml + weakSpotsHtml + calHtml + chartHtml + legendHtml
    + buildSection(rootEntries, 'Root Notes')
    + buildSection(typeEntries, 'Types')
    + buildSection(Object.entries(adaptWeights.variations), 'Voicings');
```

- [ ] **Step 4: Update the pre-existing test that asserts on "Inversions"**

In `test-inversion-stats-display.cjs`, change:
```javascript
  checkTrue('stats page shows an Inversions section', html.includes('Inversions'), null);
```
to:
```javascript
  checkTrue('stats page shows a Voicings section', html.includes('Voicings'), null);
```

And change:
```javascript
  checkTrue('no empty Inversions heading when there is no variation data yet', !emptyVariations.includes('Inversions'), null);
```
to:
```javascript
  checkTrue('no empty Voicings heading when there is no variation data yet', !emptyVariations.includes('Voicings'), null);
```

(The other two assertions in that file — `'the section lists Root position'` and `'the section lists 1st inversion'` — check for row *content*, not the section title, and are unaffected.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `node test-stats-section-order.cjs`
Expected: all `PASS`, `RESULT: PASS`

Run: `node test-inversion-stats-display.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js test-stats-section-order.cjs test-inversion-stats-display.cjs
git commit -m "Reorder stats popup sections, rename Inversions to Voicings"
```

---

### Task 5: Header tile — stacked equal-weight numbers

**Files:**
- Modify: `script.js:914-917` (the 6th header tile inside `renderStats()`'s `headerHtml`)
- Modify: `style.css` (add `.stats-header-num-sep`, after the existing `.stats-header-lbl` rule at line 2315-2320)
- Modify: `test-stats-header-display.cjs` (2 assertions check for the old "X min" text format)
- Test: `test-stats-header-tile.cjs`

**Interfaces:**
- Consumes: `todayPracticeMin`, `totalPracticeMin` — pre-existing variables computed earlier in `renderStats()`, unchanged by any prior task.
- Produces: nothing new — this is the last task in the plan.

- [ ] **Step 1: Write the failing test**

Create `test-stats-header-tile.cjs`:

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

  const result = await page.evaluate(() => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem('mpr_daily', JSON.stringify([
      { date: yesterday, answers: 4, avgMs: 2000, totalMs: 5 * 60000, firstTryCount: 2 },
      { date: today,     answers: 6, avgMs: 1500, totalMs: 12 * 60000, firstTryCount: 4 },
    ]));
    const html = renderStats();
    const hasSep = html.includes('<span class="stats-header-num-sep">/</span>');
    const hasNewLabel = html.includes('min today / 30d');
    return { html, hasSep, hasNewLabel };
  });
  checkTrue('rendered HTML contains today\'s minutes (12)', result.html.includes('>12'), null);
  checkTrue('rendered HTML contains the 30-day total minutes (17)', result.html.includes('/17<') || result.html.includes('/17 '), null);
  checkTrue('the tile uses the stats-header-num-sep separator element', result.hasSep, null);
  checkTrue('the tile label reads "min today / 30d"', result.hasNewLabel, null);
  checkTrue('the old crammed label format is gone', !result.html.includes('today · 17 min (30 days)'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stats-header-tile.cjs`
Expected: FAIL — the tile still renders the old `"12 min"` / `"today · 17 min (30 days)"` format, no `.stats-header-num-sep` element exists yet.

- [ ] **Step 3: Update the header tile markup**

Current code (`script.js`, inside `renderStats()`'s `headerHtml`):
```javascript
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayPracticeMin} min</span>
      <span class="stats-header-lbl">today · ${totalPracticeMin} min (30 days)</span>
    </div>
```
Replace with:
```javascript
    <div class="stats-header-stat">
      <span class="stats-header-num">${todayPracticeMin}<span class="stats-header-num-sep">/</span>${totalPracticeMin}</span>
      <span class="stats-header-lbl">min today / 30d</span>
    </div>
```

- [ ] **Step 4: Add the separator CSS**

Current code (`style.css:2315-2320`):
```css
.stats-header-lbl {
  font-size: 0.68rem;
  color: var(--text-dim);
  text-align: center;
  line-height: 1.2;
}
```
Replace with:
```css
.stats-header-lbl {
  font-size: 0.68rem;
  color: var(--text-dim);
  text-align: center;
  line-height: 1.2;
}

.stats-header-num-sep {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-dim);
  margin: 0 3px;
}
```

- [ ] **Step 5: Update the pre-existing test that asserts on the old "X min" format**

In `test-stats-header-display.cjs`, change:
```javascript
  // today = 12 min, 30-day total = 5 + 12 = 17 min
  checkTrue('header shows today\'s practice minutes (12 min)', html.includes('12 min'), null);
  checkTrue('header shows the 30-day practice total (17 min)', html.includes('17 min'), null);
```
to:
```javascript
  // today = 12 min, 30-day total = 5 + 12 = 17 min, shown as "12/17"
  checkTrue('header shows today\'s practice minutes (12)', html.includes('>12'), null);
  checkTrue('header shows the 30-day practice total (17)', html.includes('/17<'), null);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node test-stats-header-tile.cjs`
Expected: all `PASS`, `RESULT: PASS`

Run: `node test-stats-header-display.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-ear-stats-category-keys.cjs
node test-stats-sort-order.cjs
node test-stats-focus-measured-only.cjs
node test-stats-section-order.cjs
node test-stats-header-tile.cjs
node test-inversion-stats-display.cjs
node test-inversion-stats-tracking.cjs
node test-stats-header-display.cjs
```

Expected: `RESULT: PASS` on all eight. If any fail, stop and investigate before continuing — do not assume it's unrelated.

- [ ] **Step 8: Commit**

```bash
git add script.js style.css test-stats-header-tile.cjs test-stats-header-display.cjs
git commit -m "Header tile: stacked equal-weight today/30-day practice minutes"
```
