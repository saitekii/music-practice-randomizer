# Adaptive Weights Category-Collision Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Playing tab's chord/scale "Major" data collision in `adaptWeights.types`/`adaptWeights.combos` (mirrors the already-shipped Ear Training fix), plus the `startDrill()`/`findPlayingDrillTarget()` routing quirks in both tabs that stem from the same root cause.

**Architecture:** Category-prefixed storage keys (`chord:Major`, `scale:Major`, `interval:Minor 2nd`) threaded through the write path (`recordAdaptiveResult`, `weightedPick`), the read/display path (`buildSection`, the weak-spots panels, `getStageMastery`), and the Drill-routing path (`findPlayingDrillTarget`, `startDrillCombo`, `startDrill`) — the identical pattern already proven for `earAdaptWeights.types` in the prior stats-popup-redesign round, applied to the Playing tab's `adaptWeights` and to `startDrill`'s ear branch (which the prior round left un-prefixed at the `data-type` boundary).

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No data reset. Old bare-label entries in `adaptWeights.types`/`.combos` are left alone — they simply stop being written to. `adaptWeights.roots` and `adaptWeights.variations` are untouched entirely (no category-collision problem there).
- A combo key is `root|` followed by the *same* category-prefixed string used in `types` (e.g. `C|chord:Major`) — not a separately-invented format.
- `stripEarCategory` is renamed to `stripTypeCategory` (shared by both tabs — identical `interval|chord|scale` vocabulary in both places). An unprefixed key passes through unchanged.
- `startDrill()`'s non-ear branch is dead code today (the only Playing-tab `.drill-btn`, in the weak-spots panel, always sets `data-combo="true"` and therefore always routes to `startDrillCombo` instead) — it is deleted, not kept-but-fixed.
- `getStageMastery()`'s chord/scale lookups (script.js:2879, 2884) must use the same prefixed key format as the write side, or every chord/scale-type Learning Path stage would silently show 0% mastered.

---

### Task 1: Storage layer — category-prefixed writes, shared strip helper

**Files:**
- Modify: `script.js:780-791` (`weightedPick` — add `category` parameter)
- Modify: `script.js:2052`, `2084`, `2143` (the three `weightedPick(..., 'types')` call sites in `genChord`/`genScale`/`genInterval`)
- Modify: `script.js:1004-1031` (`recordAdaptiveResult` — prefix `types`/`combos` writes for chord/scale/interval)
- Modify: `script.js:1039-1041` (`stripEarCategory` → `stripTypeCategory`, pure rename)
- Modify: `script.js:1562`, `1581`, `1583` (the three existing `stripEarCategory` call sites — rename only, no behavior change; a later task changes line 1583's *behavior*, not this one)
- Test: `test-adaptive-weights-category-collision.cjs`

**Interfaces:**
- Consumes: nothing from other tasks (this is the first task).
- Produces: `weightedPick(items, dim, category)` — `category` is optional (`'interval'|'chord'|'scale'|undefined`), only meaningful for `dim === 'types'` calls. `stripTypeCategory(key)` — renamed from `stripEarCategory`, identical behavior (`key.replace(/^(interval|chord|scale):/, '')`). Later tasks (2, 3) consume both by these exact names.

- [ ] **Step 1: Write the failing test**

Create `test-adaptive-weights-category-collision.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{"adaptiveToggle":true}'));
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

  // Enable adaptive weighting toggle in the live DOM (addInitScript's localStorage seed isn't
  // read into a live checkbox state automatically -- set it directly).
  await page.evaluate(() => { document.getElementById('adaptiveToggle').checked = true; });

  // --- Chord and scale "Major" answers write to distinct keys, not merged ---
  const distinctKeys = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('chord|C|Major||', 1500);
    recordAdaptiveResult('scale|C|Major', 2500);
    return {
      typeKeys: Object.keys(adaptWeights.types).sort(),
      comboKeys: Object.keys(adaptWeights.combos).sort(),
      chordMajorEma: adaptWeights.types['chord:Major']?.ema,
      scaleMajorEma: adaptWeights.types['scale:Major']?.ema,
    };
  });
  check('adaptWeights.types has distinct chord:Major and scale:Major keys', distinctKeys.typeKeys, ['chord:Major', 'scale:Major']);
  check('adaptWeights.combos has distinct C|chord:Major and C|scale:Major keys', distinctKeys.comboKeys, ['C|chord:Major', 'C|scale:Major']);
  check('chord Major and scale Major keep distinct EMA values (not merged)', { chordMajorEma: distinctKeys.chordMajorEma, scaleMajorEma: distinctKeys.scaleMajorEma }, { chordMajorEma: 1500, scaleMajorEma: 2500 });

  // --- Interval answers are also category-prefixed ---
  const intervalResult = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('interval|Minor 2nd|C|above', 1800);
    return Object.keys(adaptWeights.types);
  });
  check('interval answers write to a category-prefixed key', intervalResult, ['interval:Minor 2nd']);

  // --- Root-note weighting (no category) is completely unaffected ---
  const rootsUnaffected = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('note|C', 1200);
    return Object.keys(adaptWeights.roots);
  });
  check('root-note answers still write a bare (unprefixed) key', rootsUnaffected, ['C']);

  // --- weightedPick reads back the category-scoped key (statistical trial) ---
  const pickResult = await page.evaluate(() => {
    adaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'chord:Minor': { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let majorCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPick(['Major', 'Minor'], 'types', 'chord') === 'Major') majorCount++;
    }
    return majorCount;
  });
  checkTrue('weightedPick favors the slower ("Major") item well above uniform 50%', pickResult > 240, `Major picked ${pickResult}/400 times`);

  // --- weightedPick without a category (roots dim) is unaffected ---
  const rootsPickResult = await page.evaluate(() => {
    adaptWeights.roots = {
      C: { ema: 3000, ema_slow: 3000, count: 5 },
      D: { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let cCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPick(['C', 'D'], 'roots') === 'C') cCount++;
    }
    return cCount;
  });
  checkTrue('weightedPick with no category still works for roots dim', rootsPickResult > 240, `C picked ${rootsPickResult}/400 times`);

  // --- stripTypeCategory rename: existing Ear Training rendering still works ---
  const earRenderStillWorks = await page.evaluate(() => {
    earAdaptWeights.types = { 'chord:Major': { ema: 1000, ema_slow: 1000, count: 5 } };
    const html = renderEarStats();
    return { hasStrippedLabel: html.includes('>Major<'), hasPrefixedText: html.includes('chord:Major') };
  });
  checkTrue('post-rename, Ear Training still renders the stripped label', earRenderStillWorks.hasStrippedLabel, null);
  checkTrue('post-rename, no raw prefixed text leaks into Ear Training HTML', !earRenderStillWorks.hasPrefixedText, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-adaptive-weights-category-collision.cjs`
Expected: FAIL — `recordAdaptiveResult` still writes bare `'Major'` for both chord and scale (colliding), `weightedPick` doesn't accept a third argument yet, `stripEarCategory`/`stripTypeCategory` naming mismatch.

- [ ] **Step 3: Add the `category` parameter to `weightedPick`**

Current code (`script.js:780-791`):

```javascript
function weightedPick(items, dim) {
  if (!adaptiveOn() || items.length <= 1) return pick(items);
  const g = adaptWeights[dim];
  const emas = items.map(item => { const e = g[item]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
```

Replace with:

```javascript
function weightedPick(items, dim, category) {
  if (!adaptiveOn() || items.length <= 1) return pick(items);
  const g = adaptWeights[dim];
  const emas = items.map(item => { const e = g[category ? `${category}:${item}` : item]; return (e && e.count >= 3) ? e.ema : null; });
  const withData = emas.filter(v => v !== null);
  const mean = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : null;
  const weights = emas.map(v => (mean && v) ? Math.max(0.5, Math.min(3.0, v / mean)) : 1.0);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
```

- [ ] **Step 4: Update the three `weightedPick(..., 'types')` call sites**

In `genChord()` (`script.js:2052`), change:
```javascript
  const typeLabel = weightedPick(types.map(t => t.label), 'types');
```
to:
```javascript
  const typeLabel = weightedPick(types.map(t => t.label), 'types', 'chord');
```

In `genScale()` (`script.js:2084`), change:
```javascript
    label = weightedPick(allLabels, 'types');
```
to:
```javascript
    label = weightedPick(allLabels, 'types', 'scale');
```

In `genInterval()` (`script.js:2143`), change:
```javascript
  const intLabel = weightedPick(types.map(i => i.label), 'types');
```
to:
```javascript
  const intLabel = weightedPick(types.map(i => i.label), 'types', 'interval');
```

- [ ] **Step 5: Prefix `recordAdaptiveResult`'s `types`/`combos` writes**

Current code (`script.js:1004-1031`, full function):

```javascript
function recordAdaptiveResult(key, ms) {
  if (!adaptiveOn()) return;
  const parts = key.split('|');
  const type  = parts[0];
  if      (type === 'note')     { updateAdaptWeight('roots', parts[1], ms); }
  else if (type === 'chord')    {
    if (parts[4] === 'LH') {
      // Left-Hand mode answers are a different skill (two-handed coordination, not
      // single-hand chord recognition) -- keep them out of the shared roots/types/combos
      // stats entirely, so practicing e.g. F minor with Left-Hand mode on can't skew the
      // normal single-hand F minor stat. They still get their own "Left Hand" stat.
      updateAdaptWeight('variations', 'Left Hand', ms);
    } else {
      updateAdaptWeight('roots', parts[1], ms);
      updateAdaptWeight('types', parts[2], ms);
      updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms);
      if (parts[3]) updateAdaptWeight('variations', parts[3], ms);
    }
  }
  else if (type === 'scale')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', parts[2], ms); updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms); }
  else if (type === 'interval') { updateAdaptWeight('roots', parts[2], ms); updateAdaptWeight('types', parts[1], ms); }
  else if (type === 'func')     {
    updateAdaptWeight('roots', parts[1], ms);
    if (parts[3] && parts[3].includes('–')) updateAdaptWeight('variations', parts[3], ms);
  }
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
    if (parts[4] === 'LH') {
      // Left-Hand mode answers are a different skill (two-handed coordination, not
      // single-hand chord recognition) -- keep them out of the shared roots/types/combos
      // stats entirely, so practicing e.g. F minor with Left-Hand mode on can't skew the
      // normal single-hand F minor stat. They still get their own "Left Hand" stat.
      updateAdaptWeight('variations', 'Left Hand', ms);
    } else {
      updateAdaptWeight('roots', parts[1], ms);
      updateAdaptWeight('types', `chord:${parts[2]}`, ms);
      updateAdaptWeight('combos', `${parts[1]}|chord:${parts[2]}`, ms);
      if (parts[3]) updateAdaptWeight('variations', parts[3], ms);
    }
  }
  else if (type === 'scale')    { updateAdaptWeight('roots', parts[1], ms); updateAdaptWeight('types', `scale:${parts[2]}`, ms); updateAdaptWeight('combos', `${parts[1]}|scale:${parts[2]}`, ms); }
  else if (type === 'interval') { updateAdaptWeight('roots', parts[2], ms); updateAdaptWeight('types', `interval:${parts[1]}`, ms); }
  else if (type === 'func')     {
    updateAdaptWeight('roots', parts[1], ms);
    if (parts[3] && parts[3].includes('–')) updateAdaptWeight('variations', parts[3], ms);
  }
  saveAdaptWeights();
  updateMasteryUI();
}
```

- [ ] **Step 6: Rename `stripEarCategory` to `stripTypeCategory`**

Current code (`script.js:1039-1041`):

```javascript
function stripEarCategory(key) {
  return key.replace(/^(interval|chord|scale):/, '');
}
```

Replace with:

```javascript
function stripTypeCategory(key) {
  return key.replace(/^(interval|chord|scale):/, '');
}
```

- [ ] **Step 7: Update the three existing `stripEarCategory` call sites to the new name**

In `buildEarSection`'s row template (`script.js:1562`), change:
```javascript
        <span class="stats-key">${stripEarCategory(key)}</span>
```
to:
```javascript
        <span class="stats-key">${stripTypeCategory(key)}</span>
```

In `earWeakSpotsHtml`'s row template (`script.js:1581`), change:
```javascript
      <span class="weak-spot-name">${stripEarCategory(k)}</span>
```
to:
```javascript
      <span class="weak-spot-name">${stripTypeCategory(k)}</span>
```

In `earWeakSpotsHtml`'s row template (`script.js:1583`), change:
```javascript
      <button class="drill-btn" data-type="${stripEarCategory(k)}" data-ear="true">Drill</button>
```
to:
```javascript
      <button class="drill-btn" data-type="${stripTypeCategory(k)}" data-ear="true">Drill</button>
```

(This third call site's *behavior* is intentionally unchanged in this task — it's a pure rename. Task 3 changes this specific line's behavior from stripped to raw.)

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-adaptive-weights-category-collision.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 9: Commit**

```bash
git add script.js test-adaptive-weights-category-collision.cjs
git commit -m "Prefix adaptWeights.types/combos writes by category, rename stripEarCategory"
```

---

### Task 2: Playing tab — display, mastery tracking, and combo Drill routing

**Files:**
- Modify: `script.js:943-980` (`buildSection` — strip category prefix for display)
- Modify: `script.js:988-995` (the Playing-tab weak-spots panel — parse combo key for display, keep raw for `data-type`)
- Modify: `script.js:2876-2885` (`getStageMastery` — prefix chord/scale lookup keys)
- Modify: `script.js:2923-2954` (`findPlayingDrillTarget` rewrite, `startDrillCombo` update)
- Test: `test-playing-tab-category-collision.cjs`

**Interfaces:**
- Consumes: `stripTypeCategory` (Task 1). Combo keys are `root|category:type` (Task 1's write-side format).
- Produces: `findPlayingDrillTarget(label, category)` — `category` is now a **required** second parameter; the function dispatches directly instead of guessing. Task 3 does not call this function (it has its own, separate ear-side dispatch), so no cross-task interface dependency there.

**Note on a temporarily-unreachable mismatch:** after this task, `startDrill()`'s still-unmodified non-ear branch (script.js:2972, deleted in Task 3) calls `findPlayingDrillTarget(typeLabel)` with only one argument — `category` will be `undefined`, so the rewritten function's dispatch will always fall through to `return null`. This is harmless: that branch has no live caller (confirmed — the only Playing-tab `.drill-btn` always sets `data-combo="true"`, routing to `startDrillCombo` instead), and Task 3 deletes the branch entirely. No test exercises it.

- [ ] **Step 1: Write the failing test**

Create `test-playing-tab-category-collision.cjs`:

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

  // --- buildSection (Types) shows two separate "Major" rows, chord and scale, not merged ---
  const typesRowCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: { 'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 }, 'scale:Major': { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {},
    };
    const html = renderStats();
    return { majorRowCount: (html.match(/>Major</g) || []).length, hasPrefixedText: html.includes('chord:Major') || html.includes('scale:Major') };
  });
  check('Types section shows two separate "Major" rows (chord + scale)', typesRowCheck.majorRowCount, 2);
  checkTrue('no category-prefixed text leaks into rendered HTML', !typesRowCheck.hasPrefixedText, null);

  // --- Weak-spots panel: display name is stripped, data-type keeps the raw category-prefixed combo key ---
  const weakSpotCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: {},
      combos: { 'C|chord:Major': { ema: 3200, ema_slow: 3200, count: 4 } },
      variations: {},
    };
    document.getElementById('statsContent').innerHTML = renderStats();
    const row = document.querySelector('.weak-spot-name');
    const btn = document.querySelector('.drill-btn[data-combo="true"]');
    return { displayName: row ? row.textContent : null, dataType: btn ? btn.getAttribute('data-type') : null };
  });
  check('weak-spot display name strips the category prefix ("C Major", not "C chord:Major")', weakSpotCheck.displayName, 'C Major');
  check('weak-spot Drill button data-type keeps the raw combo key (needed by startDrillCombo)', weakSpotCheck.dataType, 'C|chord:Major');

  // --- getStageMastery reads back the prefixed key correctly, chord and scale mastery stay independent ---
  const masteryCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 10 } },
      types: { 'chord:Major': { ema: 1000, ema_slow: 1000, count: 10 } }, // fast + confirmed -> "mastered"
      combos: {},
      variations: {},
    };
    document.getElementById('adaptiveToggle').checked = true;
    // Minimal stand-in stage: a chord-Major-only stage vs. a scale-Major-only stage.
    const chordStage = { chords: ['chordMajor'], scales: [], progressions: [], cats: ['catChords'], notes: ['C'], timer: 'off' };
    const scaleStage = { chords: [], scales: ['scaleMajor'], progressions: [], cats: ['catScales'], notes: ['C'], timer: 'off' };
    const origPath = LEARNING_PATH.slice();
    LEARNING_PATH.length = 0;
    LEARNING_PATH.push(chordStage, scaleStage);
    const chordMastery = getStageMastery(0);
    const scaleMastery = getStageMastery(1);
    LEARNING_PATH.length = 0;
    LEARNING_PATH.push(...origPath);
    return { chordReady: chordMastery?.ready, scaleReady: scaleMastery?.ready };
  });
  check('a stage using chord Major reports it mastered from chord-side data', masteryCheck.chordReady, true);
  check('a stage using scale Major does NOT report mastery from unrelated chord-side data (proves independence)', masteryCheck.scaleReady, false);

  // --- findPlayingDrillTarget dispatches by category, no more guessing ---
  const targetCheck = await page.evaluate(() => ({
    chord: findPlayingDrillTarget('Major', 'chord'),
    scale: findPlayingDrillTarget('Major', 'scale'),
  }));
  check('findPlayingDrillTarget("Major", "chord") resolves to the chord category', targetCheck.chord, { cat: 'catChords', id: 'chordMajor' });
  check('findPlayingDrillTarget("Major", "scale") resolves to the scale category (not chord)', targetCheck.scale, { cat: 'catScales', id: 'scaleMajor' });

  // --- startDrillCombo end-to-end: a scale-Major combo correctly checks the SCALE category, not chord ---
  const drillComboCheck = await page.evaluate(() => {
    document.getElementById('catChords').checked = false;
    document.getElementById('catScales').checked = false;
    startDrillCombo('C|scale:Major');
    return {
      catScalesChecked: document.getElementById('catScales').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      scaleMajorChecked: document.getElementById('scaleMajor').checked,
    };
  });
  check('startDrillCombo on a scale-Major combo checks catScales, not catChords', { catScalesChecked: drillComboCheck.catScalesChecked, catChordsChecked: drillComboCheck.catChordsChecked }, { catScalesChecked: true, catChordsChecked: false });
  checkTrue('the specific scaleMajor checkbox is checked', drillComboCheck.scaleMajorChecked, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-playing-tab-category-collision.cjs`
Expected: FAIL — `buildSection` doesn't strip category prefixes yet, the weak-spots panel still uses `k.replace('|', ' ')`, `getStageMastery` still looks up bare labels, `findPlayingDrillTarget` doesn't accept a category argument yet.

- [ ] **Step 3: Strip the category prefix in `buildSection`'s row template**

Current code (`script.js`, inside `renderStats()`'s nested `buildSection`):
```javascript
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${key}</span>
        ${barHtml}
```
Replace with:
```javascript
      return `<div class="stats-row${hasData ? '' : ' dim-row'}">
        <span class="stats-key">${stripTypeCategory(key)}</span>
        ${barHtml}
```

(This is safe for all three of `buildSection`'s callers — Root Notes and Voicings entries are never category-prefixed, so `stripTypeCategory` is a no-op on them.)

- [ ] **Step 4: Fix the weak-spots panel's display name, keep `data-type` raw**

Current code (`script.js`, inside `renderStats()`):
```javascript
  const weakSpotsHtml = weakCombos.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${weakCombos.map(([k, e]) => `<div class="weak-spot-row">
      <span class="weak-spot-name">${k.replace('|', ' ')}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${k}" data-ear="false" data-combo="true">Drill</button>
    </div>`).join('')}
  </div>` : '';
```
Replace with:
```javascript
  const weakSpotsHtml = weakCombos.length ? `<div class="weak-spots-panel">
    <h3 class="stats-section-title">Focus on these</h3>
    ${weakCombos.map(([k, e]) => {
      const pipe = k.indexOf('|');
      const displayName = `${k.slice(0, pipe)} ${stripTypeCategory(k.slice(pipe + 1))}`;
      return `<div class="weak-spot-row">
      <span class="weak-spot-name">${displayName}</span>
      <span class="weak-spot-time">${(e.ema / 1000).toFixed(1)}s avg</span>
      <button class="drill-btn" data-type="${k}" data-ear="false" data-combo="true">Drill</button>
    </div>`;
    }).join('')}
  </div>` : '';
```

- [ ] **Step 5: Prefix `getStageMastery`'s chord/scale lookup keys**

Current code (`script.js:2876-2885`):
```javascript
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
```
Replace with:
```javascript
    (stage.chords || []).forEach(id => {
      if (id === 'inversions') return;
      const ct = CHORD_TYPES.find(c => c.id === id);
      if (ct) items.push({ dim: 'types', key: `chord:${ct.label}` });
    });
  }
  (stage.scales || []).forEach(id => {
    const st = SCALE_TYPES.find(s => s.id === id);
    if (st && st.label) items.push({ dim: 'types', key: `scale:${st.label}` });
  });
```

- [ ] **Step 6: Rewrite `findPlayingDrillTarget` to dispatch by category**

Current code (`script.js:2923-2932`):
```javascript
function findPlayingDrillTarget(label) {
  const chord = CHORD_TYPES.find(c => c.label === label);
  if (chord) return { cat: 'catChords', id: chord.id };
  const scale = SCALE_TYPES.find(s => s.label === label);
  if (scale) return { cat: 'catScales', id: scale.id };
  if (MODES.includes(label)) return { cat: 'catScales', id: 'scaleModes' };
  const interval = INTERVALS.find(i => i.label === label);
  if (interval) return { cat: 'catIntervals', id: interval.id };
  return null;
}
```
Replace with:
```javascript
function findPlayingDrillTarget(label, category) {
  if (category === 'chord') {
    const chord = CHORD_TYPES.find(c => c.label === label);
    return chord ? { cat: 'catChords', id: chord.id } : null;
  }
  if (category === 'scale') {
    const scale = SCALE_TYPES.find(s => s.label === label);
    if (scale) return { cat: 'catScales', id: scale.id };
    if (MODES.includes(label)) return { cat: 'catScales', id: 'scaleModes' };
    return null;
  }
  if (category === 'interval') {
    const interval = INTERVALS.find(i => i.label === label);
    return interval ? { cat: 'catIntervals', id: interval.id } : null;
  }
  return null;
}
```

- [ ] **Step 7: Update `startDrillCombo` to parse category from the combo key**

Current code (`script.js:2934-2954`):
```javascript
function startDrillCombo(comboKey) {
  saveSettings();
  statsModal.classList.add('hidden');
  const pipe      = comboKey.indexOf('|');
  const root      = comboKey.slice(0, pipe);
  const typeLabel = comboKey.slice(pipe + 1);
  const target    = findPlayingDrillTarget(typeLabel);
  if (!target) return;
  ALL_PLAY_CATS.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  document.getElementById(target.cat).checked = true;
  document.getElementById(target.id).checked  = true;
  document.querySelectorAll('input[data-note]').forEach(el => { el.checked = false; });
  const rootEl = document.querySelector(`input[data-note="${root}"]`);
  if (rootEl) rootEl.checked = true;
  syncUI();
  drillActive = true;
  drillIsEar  = false;
  document.getElementById('drillLabel').textContent = `Drilling: ${root} ${typeLabel}`;
  document.getElementById('drillBanner').classList.remove('hidden');
  showPrompt();
}
```
Replace with:
```javascript
function startDrillCombo(comboKey) {
  saveSettings();
  statsModal.classList.add('hidden');
  const pipe         = comboKey.indexOf('|');
  const root         = comboKey.slice(0, pipe);
  const categoryType = comboKey.slice(pipe + 1);
  const colonIdx     = categoryType.indexOf(':');
  const category      = categoryType.slice(0, colonIdx);
  const typeLabel      = categoryType.slice(colonIdx + 1);
  const target        = findPlayingDrillTarget(typeLabel, category);
  if (!target) return;
  ALL_PLAY_CATS.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  document.getElementById(target.cat).checked = true;
  document.getElementById(target.id).checked  = true;
  document.querySelectorAll('input[data-note]').forEach(el => { el.checked = false; });
  const rootEl = document.querySelector(`input[data-note="${root}"]`);
  if (rootEl) rootEl.checked = true;
  syncUI();
  drillActive = true;
  drillIsEar  = false;
  document.getElementById('drillLabel').textContent = `Drilling: ${root} ${typeLabel}`;
  document.getElementById('drillBanner').classList.remove('hidden');
  showPrompt();
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-playing-tab-category-collision.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 9: Commit**

```bash
git add script.js test-playing-tab-category-collision.cjs
git commit -m "Fix Playing-tab category collision: display, mastery tracking, combo Drill routing"
```

---

### Task 3: Ear tab — category-aware startDrill, remove dead code

**Files:**
- Modify: `script.js:1583` (`earWeakSpotsHtml`'s `data-type` — revert from stripped to raw category-prefixed key)
- Modify: `script.js:2956-2990` (`startDrill` — category-aware ear branch, non-ear branch removed)
- Test: `test-ear-drill-routing.cjs`

**Interfaces:**
- Consumes: `stripTypeCategory` (Task 1). `findPlayingDrillTarget(label, category)` (Task 2) — NOT called by this task; the ear branch has its own, separate category dispatch using `EAR_INT_MAP`/`EAR_CHORD_MAP`/`EAR_SCALE_MAP`.
- Produces: nothing — this is the last task in the plan.

- [ ] **Step 1: Write the failing test**

Create `test-ear-drill-routing.cjs`:

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

  // --- earWeakSpotsHtml: display name stripped, data-type now raw ---
  const renderCheck = await page.evaluate(() => {
    earAdaptWeights.types = { 'scale:Major': { ema: 3000, ema_slow: 3000, count: 5 } };
    document.getElementById('statsContent').innerHTML = renderEarStats();
    const row = document.querySelector('.weak-spot-name');
    const btn = document.querySelector('.drill-btn[data-ear="true"]');
    return { displayName: row ? row.textContent : null, dataType: btn ? btn.getAttribute('data-type') : null };
  });
  check('displayed weak-spot name is stripped ("Major")', renderCheck.displayName, 'Major');
  check('Drill button data-type is now the raw category-prefixed key ("scale:Major")', renderCheck.dataType, 'scale:Major');

  // --- The actual bug from the original report: a scale-Major weak spot must drill SCALE, not chord ---
  const drillCheck = await page.evaluate(() => {
    document.getElementById('earCatChords').checked = false;
    document.getElementById('earCatScales').checked = false;
    startDrill('scale:Major', true);
    return {
      earCatScalesChecked: document.getElementById('earCatScales').checked,
      earCatChordsChecked: document.getElementById('earCatChords').checked,
      drillLabel: document.getElementById('drillLabel').textContent,
    };
  });
  check('startDrill("scale:Major", true) checks earCatScales, not earCatChords (the original bug)', { earCatScalesChecked: drillCheck.earCatScalesChecked, earCatChordsChecked: drillCheck.earCatChordsChecked }, { earCatScalesChecked: true, earCatChordsChecked: false });
  check('the drill label shows the stripped label, not the raw prefixed key', drillCheck.drillLabel, 'Drilling: Major');

  // --- A chord-Major weak spot still correctly drills chord ---
  const chordDrillCheck = await page.evaluate(() => {
    document.getElementById('earCatChords').checked = false;
    document.getElementById('earCatScales').checked = false;
    startDrill('chord:Major', true);
    return {
      earCatChordsChecked: document.getElementById('earCatChords').checked,
      earCatScalesChecked: document.getElementById('earCatScales').checked,
    };
  });
  check('startDrill("chord:Major", true) checks earCatChords, not earCatScales', chordDrillCheck, { earCatChordsChecked: true, earCatScalesChecked: false });

  // --- An interval weak spot still routes correctly ---
  const intervalDrillCheck = await page.evaluate(() => {
    document.getElementById('earCatIntervals').checked = false;
    startDrill('interval:Tritone', true);
    return document.getElementById('earCatIntervals').checked;
  });
  checkTrue('startDrill("interval:Tritone", true) checks earCatIntervals', intervalDrillCheck, null);

  // --- isEar=false is now a guaranteed no-op (dead branch removed) ---
  const noOpCheck = await page.evaluate(() => {
    const before = drillActive;
    startDrill('Major', false);
    return { drillActiveUnchanged: drillActive === before };
  });
  checkTrue('startDrill(label, false) is a safe no-op (dead branch removed)', noOpCheck.drillActiveUnchanged, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-ear-drill-routing.cjs`
Expected: FAIL — `earWeakSpotsHtml` still strips `data-type`, `startDrill`'s ear branch still scans the three `EAR_*_MAP` tables in order (so `'scale:Major'` matches nothing and the drill silently fails), the non-ear branch still exists.

- [ ] **Step 3: Revert `earWeakSpotsHtml`'s `data-type` to the raw key**

Current code (`script.js:1583`, post-Task-1 state):
```javascript
      <button class="drill-btn" data-type="${stripTypeCategory(k)}" data-ear="true">Drill</button>
```
Replace with:
```javascript
      <button class="drill-btn" data-type="${k}" data-ear="true">Drill</button>
```

- [ ] **Step 4: Rewrite `startDrill` — category-aware ear branch, non-ear branch removed**

Current code (`script.js:2956-2990`, full function):
```javascript
function startDrill(typeLabel, isEar) {
  saveSettings();
  statsModal.classList.add('hidden');

  if (isEar) {
    let earTarget = null;
    for (const [id, lbl] of Object.entries(EAR_INT_MAP))   { if (lbl === typeLabel) { earTarget = { cat: 'earCatIntervals', ids: Object.keys(EAR_INT_MAP)   }; break; } }
    if (!earTarget) for (const [id, lbl] of Object.entries(EAR_CHORD_MAP)) { if (lbl === typeLabel) { earTarget = { cat: 'earCatChords', ids: Object.keys(EAR_CHORD_MAP) }; break; } }
    if (!earTarget) for (const [id, lbl] of Object.entries(EAR_SCALE_MAP)) { if (lbl === typeLabel) { earTarget = { cat: 'earCatScales', ids: Object.keys(EAR_SCALE_MAP) }; break; } }
    if (!earTarget) return;
    ALL_EAR_CATS.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
    document.getElementById(earTarget.cat).checked = true;
    earTarget.ids.forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
    drillIsEar = true;
    document.getElementById('tabEar')?.click();
  } else {
    const target = findPlayingDrillTarget(typeLabel);
    if (!target) return;
    ALL_PLAY_CATS.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
    document.getElementById(target.cat).checked = true;
    document.getElementById(target.id).checked  = true;
    if (target.cat === 'catIntervals') {
      document.getElementById('intDirUp').checked   = true;
      document.getElementById('intDirDown').checked = true;
    }
    drillIsEar = false;
  }

  syncUI();
  drillActive = true;
  document.getElementById('drillLabel').textContent = `Drilling: ${typeLabel}`;
  document.getElementById('drillBanner').classList.remove('hidden');
  if (drillIsEar) setTimeout(() => showEarPrompt(), 100);
  else showPrompt();
}
```
Replace with:
```javascript
function startDrill(rawLabel, isEar) {
  if (!isEar) return;
  saveSettings();
  statsModal.classList.add('hidden');

  const colonIdx  = rawLabel.indexOf(':');
  const category  = rawLabel.slice(0, colonIdx);
  const typeLabel = rawLabel.slice(colonIdx + 1);

  let earTarget = null;
  if      (category === 'interval') earTarget = { cat: 'earCatIntervals', ids: Object.keys(EAR_INT_MAP) };
  else if (category === 'chord')    earTarget = { cat: 'earCatChords',    ids: Object.keys(EAR_CHORD_MAP) };
  else if (category === 'scale')    earTarget = { cat: 'earCatScales',    ids: Object.keys(EAR_SCALE_MAP) };
  if (!earTarget) return;
  ALL_EAR_CATS.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  document.getElementById(earTarget.cat).checked = true;
  earTarget.ids.forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });
  drillIsEar = true;
  document.getElementById('tabEar')?.click();

  syncUI();
  drillActive = true;
  document.getElementById('drillLabel').textContent = `Drilling: ${typeLabel}`;
  document.getElementById('drillBanner').classList.remove('hidden');
  setTimeout(() => showEarPrompt(), 100);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-ear-drill-routing.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Run the full regression sweep**

```bash
node test-adaptive-weights-category-collision.cjs
node test-playing-tab-category-collision.cjs
node test-ear-drill-routing.cjs
node test-ear-stats-category-keys.cjs
node test-stats-sort-order.cjs
node test-stats-focus-measured-only.cjs
node test-stats-section-order.cjs
node test-stats-header-tile.cjs
node test-inversion-stats-display.cjs
node test-inversion-stats-tracking.cjs
node test-stats-header-display.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-mode-check.cjs
node test-learning-stage-persistence.cjs
```

Expected: `RESULT: PASS` on all fourteen. (The last three cover Left-Hand mode and Learning Path stage persistence — neither touched by this plan, but both exercise `adaptWeights`/`getStageMastery` adjacent code paths, worth confirming unaffected.) If any fail, stop and investigate before continuing — do not assume it's a pre-existing/unrelated failure without checking.

- [ ] **Step 7: Commit**

```bash
git add script.js test-ear-drill-routing.cjs
git commit -m "Fix Ear Training startDrill category routing, remove dead Playing-tab branch"
```
