# Borrowed and Chromatic-Mediant Chord Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add support for borrowed and chromatic-mediant chords (♭II, ♭III, ♭VI, ♭VII, borrowed iv, and the "raised" mediants II/III/VI) to the Functional Harmony feature — 9 new standalone chords + 46 new progressions — plus 6 new Learning Path stages that teach them.

**Architecture:** Replace the diatonic-only roman-numeral resolver (`DIATONIC[mode].numerals.indexOf`) with a richer per-mode lookup table (`FUNCTIONAL_NUMERALS`) that also covers borrowed/mediant tokens. Fix a checkbox-gating rule that currently assumes "any single-chord pattern is always enabled" (true only for the 7 canonical diatonic numerals per mode) — this rule is duplicated in 4 places and all 4 need the same fix before new standalone chords can be added safely. Then add the new `FUNCTIONAL` data, checkboxes, and Learning Path stages, all following mechanisms and conventions already established by the prior two progression batches.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework), file:// page loads.

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`/`index.html`.
- All new pattern strings are character-exact: en-dash `–` (U+2013, not a hyphen) between chord steps, `♭` (U+266D) for flat numerals, `°` (U+00B0) for diminished.
- New content (all 9 standalone chords + all 46 progressions) gets checkboxes that are **unchecked by default** — same convention as the last two batches, so it doesn't dilute the existing random-practice pool for anyone not using the Learning Path.
- `♭II` is added to *both* `FUNCTIONAL.major` and `FUNCTIONAL.minor` (it's practiceable as a standalone chord in either key context), but it gets **one shared checkbox** (`data-pattern="♭II"`), not two — the existing architecture looks up checkboxes by `data-pattern` value with `document.querySelector` (first match only) everywhere, and the chord itself (1 semitone above tonic, Major quality) is pitch-identical regardless of mode, so one checkbox correctly governs both. Do not create a second `♭II` checkbox.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `checkTrue(label, condition, extra)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.
- Full new-content list (from the design spec, `docs/superpowers/specs/2026-07-09-borrowed-chords-progressions-design.md`):
  - Standalone (major, 8): `iv`, `♭II`, `♭III`, `♭VI`, `♭VII`, `II`, `III`, `VI`
  - Standalone (minor, 1): `♭II` (shares the major checkbox — see above)
  - Progressions (major, 45): `I–iv–I`, `I–♭VII–IV`, `I–♭III–IV`, `I–♭VI–IV`, `I–♭III`, `I–♭VI`, `I–♭VII`, `I–♭II`, `I–iv`, `♭III–I`, `♭VI–I`, `♭VII–I`, `♭II–I`, `I–♭III–I`, `I–♭VI–I`, `IV–♭VII–I`, `ii–♭VII–I`, `iv–♭VII–I`, `I–IV–♭VII`, `V–♭VI`, `V–♭III`, `vi–IV–I`, `V–ii`, `I–♭VI–♭VII–I`, `I–♭III–♭VI`, `I–iv–♭VII–I`, `I–♭III–♭VI–IV`, `I–♭VII–♭VI–V`, `I–ii–♭III–IV`, `I–iii–IV–iv`, `I–♭III–IV–iv`, `I–♭III–IV–V`, `I–vi–ii–♭II`, `I–♭II–vi`, `I–III–♭II–vi`, `I–♭II–IV–III`, `I–VI–ii–V`, `I–III–vi–II–ii–V–I`, `iii–VI–ii–V–I`, `vi–II–ii–V–I`, `I–III`, `I–VI`, `III–♭VI`, `I–III–vi–IV`, `I–III–♭VI–IV`
  - Progressions (minor, 1): `i–♭II–VII–i`

---

### Task 1: `FUNCTIONAL_NUMERALS` table and `getExpectedPCs()` resolver

**Files:**
- Modify: `script.js:120-123` (insert new const after `FUNCTIONAL`)
- Modify: `script.js:3391-3412` (`getExpectedPCs()`'s `func` branch)
- Test: `test-borrowed-numerals-resolution.cjs`

**Interfaces:**
- Produces: `const FUNCTIONAL_NUMERALS = { major: {...}, minor: {...} }`, each mode mapping numeral string → `[offsetSemitones, qualityString]`, where `qualityString` is a key into the existing `CHORD_INTERVALS` map (e.g. `'Major'`, `'Minor'`, `'Diminished'`). Consumed by `getExpectedPCs()` only in this task; Task 3's new `FUNCTIONAL` entries rely on this table existing and being correct.

- [ ] **Step 1: Write the failing test**

Create `test-borrowed-numerals-resolution.cjs`:

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

  const result = await page.evaluate(() => {
    const pcs = (key) => {
      const r = getExpectedPCs(key);
      return r ? [...r.pcs].sort((a, b) => a - b) : null;
    };
    return {
      flatVII:     pcs('func|C|Major|♭VII|0'),
      flatIII:     pcs('func|C|Major|♭III|0'),
      flatVI:      pcs('func|C|Major|♭VI|0'),
      flatII:      pcs('func|C|Major|♭II|0'),
      borrowedIv:  pcs('func|C|Major|iv|0'),
      raisedII:    pcs('func|C|Major|II|0'),
      raisedIII:   pcs('func|C|Major|III|0'),
      raisedVI:    pcs('func|C|Major|VI|0'),
      minorFlatII: pcs('func|C|minor|♭II|0'),
      majorII:     pcs('func|C|Major|ii|0'),
      majorVii:    pcs('func|C|Major|vii°|0'),
      minorIII:    pcs('func|C|minor|III|0'),
      minorVhack:  pcs('func|C|minor|V|0'),
      unknown:     pcs('func|C|Major|ZZZ|0'),
    };
  });

  check('♭VII in C major resolves to Bb major',                result.flatVII,     [2, 5, 10]);
  check('♭III in C major resolves to Eb major',                result.flatIII,     [3, 7, 10]);
  check('♭VI in C major resolves to Ab major',                 result.flatVI,      [0, 3, 8]);
  check('♭II in C major resolves to Db major',                 result.flatII,      [1, 5, 8]);
  check('borrowed iv in C major resolves to F minor',          result.borrowedIv,  [0, 5, 8]);
  check('raised II in C major resolves to D major',            result.raisedII,    [2, 6, 9]);
  check('raised III in C major resolves to E major',           result.raisedIII,   [4, 8, 11]);
  check('raised VI in C major resolves to A major',            result.raisedVI,    [1, 4, 9]);
  check('♭II in C minor resolves to Db major (Neapolitan)',    result.minorFlatII, [1, 5, 8]);
  check('regression: ii in C major still resolves to D minor', result.majorII,     [2, 5, 9]);
  check('regression: vii° in C major still resolves to B dim', result.majorVii,    [2, 5, 11]);
  check('regression: III in C minor still resolves to Eb major', result.minorIII,  [3, 7, 10]);
  check('regression: V-in-minor hack still resolves to G major', result.minorVhack, [2, 7, 11]);
  check('unknown numeral returns null',                         result.unknown,    null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-borrowed-numerals-resolution.cjs`
Expected: FAIL on every "resolves to" check for the new numerals (`♭VII`, `♭III`, `♭VI`, `♭II`, `iv`, `II`, `III`, `VI`, minor `♭II`) — the current code has no way to resolve them and returns `null`. The regression checks (`ii`, `vii°`, minor `III`, minor `V` hack, `unknown`) already PASS since that logic is untouched so far.

- [ ] **Step 3: Add the `FUNCTIONAL_NUMERALS` table**

Current code (`script.js:120-123`):

```javascript
const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'],
};
```

Insert immediately after (do not modify `FUNCTIONAL` itself in this task):

```javascript
// Numeral -> [semitone offset from tonic, CHORD_INTERVALS quality key].
// Covers the 7 canonical diatonic degrees per mode (same values DIATONIC already
// has) plus borrowed/chromatic-mediant tokens that aren't diatonic to either mode.
const FUNCTIONAL_NUMERALS = {
  major: {
    'I': [0, 'Major'], 'ii': [2, 'Minor'], 'iii': [4, 'Minor'], 'IV': [5, 'Major'],
    'V': [7, 'Major'], 'vi': [9, 'Minor'], 'vii°': [11, 'Diminished'],
    'iv': [5, 'Minor'], '♭II': [1, 'Major'], '♭III': [3, 'Major'],
    '♭VI': [8, 'Major'], '♭VII': [10, 'Major'],
    'II': [2, 'Major'], 'III': [4, 'Major'], 'VI': [9, 'Major'],
  },
  minor: {
    'i': [0, 'Minor'], 'ii°': [2, 'Diminished'], 'III': [3, 'Major'], 'iv': [5, 'Minor'],
    'v': [7, 'Minor'], 'V': [7, 'Major'], 'VI': [8, 'Major'], 'VII': [10, 'Major'],
    '♭II': [1, 'Major'],
  },
};
```

- [ ] **Step 4: Rewrite the `func` branch of `getExpectedPCs()`**

Current code (`script.js:3391-3412`):

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const data    = DIATONIC[modeKey];
    let degree    = data.numerals.indexOf(numeral);
    let quality;
    if (degree === -1) {
      if (numeral === 'V' && modeKey === 'minor') { degree = 4; quality = 'Major'; }
      else return null;
    } else {
      quality = data.qualities[degree];
    }
    const chordRootPC = (rootIdx + data.intervals[degree]) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }
```

Replace with:

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    const entry   = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (rootIdx === -1 || !entry) return null;
    const [offset, quality] = entry;
    const chordRootPC = (rootIdx + offset) % 12;
    const intervals   = CHORD_INTERVALS[quality];
    if (!intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (chordRootPC + i) % 12) };
  }
```

This is a drop-in replacement: the 7 diatonic entries per mode keep the exact offsets/qualities `DIATONIC` already had, and the old `numeral === 'V' && modeKey === 'minor'` special case is now just the `'V': [7, 'Major']` table entry in `FUNCTIONAL_NUMERALS.minor`. `DIATONIC` itself is untouched (still used by `genDiatonic()`).

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-borrowed-numerals-resolution.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js test-borrowed-numerals-resolution.cjs
git commit -m "Add FUNCTIONAL_NUMERALS table for borrowed/mediant chord resolution"
```

---

### Task 2: Fix checkbox-gating to only bypass canonical diatonic numerals

**Files:**
- Modify: `script.js:2072-2078` (`enabledProgressions()`, add `checkboxGatedPatterns()` before it)
- Modify: `script.js:2601` (`saveSettings()`)
- Modify: `script.js:2643` (`loadSettings()`)
- Modify: `script.js:2783` (`applyStage()`)
- Test: `test-borrowed-checkbox-gating.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL`, `DIATONIC` (both already exist).
- Produces: `function checkboxGatedPatterns()` returning `string[]` — every `FUNCTIONAL.major`/`.minor` pattern that needs a checkbox (i.e. is not one of the 7 canonical diatonic numerals for its mode). Task 3 and Task 4 don't call this directly, but rely on `enabledProgressions()`, `saveSettings()`, `loadSettings()`, and `applyStage()` correctly gating the new standalone chords they add.

**Why this task exists:** `enabledProgressions()` currently treats any pattern *without* a `–` as never filtered (`if (!pattern.includes('–')) return true`). That was correct when the only single-chord entries were the 14 canonical diatonic numerals (7 per mode), which should always be available. But `saveSettings()`, `loadSettings()`, and `applyStage()` each independently rebuild the same kind of list (`ALL_PROGRESSIONS = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'))`) to know which patterns have a checkbox to save/load/apply. If Task 3's new standalone borrowed chords (`♭VII`, `iv`, etc. — no dash) are added without fixing all four call sites, they'd get checkboxes in the UI that silently don't persist across reloads, don't respond to `applyStage()`, and — worse — `enabledProgressions()` would treat them as *always enabled* regardless of their checkbox, making them playable from the very first `'Functional Harmony — C'` beginner stage. This is the same class of bug the prior Learning Path audit found and fixed for progressions themselves.

- [ ] **Step 1: Write the failing test**

Create `test-borrowed-checkbox-gating.cjs`:

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
    const majorDiatonic = ['I','ii','iii','IV','V','vi','vii°'];
    const minorDiatonic = ['i','ii°','III','iv','V','VI','VII'];
    return { noneGated: [...majorDiatonic, ...minorDiatonic].every(p => !gated.includes(p)) };
  });
  checkTrue('the 14 canonical diatonic numerals are never in checkboxGatedPatterns()', canonical.noneGated, null);

  const existingProgressions = await page.evaluate(() =>
    ['ii–V–I', 'I–IV–V', 'i–iv–V'].every(p => checkboxGatedPatterns().includes(p))
  );
  checkTrue('existing multi-chord progressions are still gated (unchanged behavior)', existingProgressions, null);

  // Simulate a non-canonical bare (no dash) single-chord pattern, since real content
  // like this doesn't exist until Task 3. This is the exact bug this task fixes: the
  // old "no dash = never filtered" rule would have made this always-enabled.
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
  checkTrue('enabledProgressions() excludes it while unchecked (the bug this task fixes)', fakeEntry.excludedWhenUnchecked, null);

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

  const appliedByStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx); // progressions: [] — should NOT include 'ZZZ'
    return document.querySelector('input[data-pattern="ZZZ"]').checked;
  });
  check('applyStage() uses checkboxGatedPatterns() and unchecks ZZZ (not in the stage\'s list)', appliedByStage, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-borrowed-checkbox-gating.cjs`
Expected: throws — `checkboxGatedPatterns is not defined` (the function doesn't exist yet). This is the expected failure mode for this step.

- [ ] **Step 3: Add `checkboxGatedPatterns()` and fix `enabledProgressions()`**

Current code (`script.js:2072-2078`):

```javascript
function enabledProgressions(mode) {
  return FUNCTIONAL[mode].filter(pattern => {
    if (!pattern.includes('–')) return true; // single-chord numerals are never filtered
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return el ? el.checked : true;
  });
}
```

Replace with:

```javascript
function checkboxGatedPatterns() {
  return [
    ...FUNCTIONAL.major.filter(p => !DIATONIC.major.numerals.includes(p)),
    ...FUNCTIONAL.minor.filter(p => !DIATONIC.minor.numerals.includes(p)),
  ];
}

function enabledProgressions(mode) {
  return FUNCTIONAL[mode].filter(pattern => {
    if (DIATONIC[mode].numerals.includes(pattern)) return true; // canonical diatonic numerals are never filtered
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return el ? el.checked : true;
  });
}
```

- [ ] **Step 4: Fix `saveSettings()`**

Current code (`script.js:2601`):

```javascript
  const ALL_PROGRESSIONS = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));
```

Replace with:

```javascript
  const ALL_PROGRESSIONS = checkboxGatedPatterns();
```

- [ ] **Step 5: Fix `loadSettings()`**

Current code (`script.js:2643`):

```javascript
      const allProgressions = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));
```

Replace with:

```javascript
      const allProgressions = checkboxGatedPatterns();
```

- [ ] **Step 6: Fix `applyStage()`**

Current code (`script.js:2783`):

```javascript
  const ALL_PROGRESSIONS = [...FUNCTIONAL.major, ...FUNCTIONAL.minor].filter(p => p.includes('–'));
```

Replace with:

```javascript
  const ALL_PROGRESSIONS = checkboxGatedPatterns();
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-borrowed-checkbox-gating.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Run the existing progression regression tests**

```bash
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-progression-curriculum-fix.cjs
```

Expected: `RESULT: PASS` on all four — this confirms the gating fix doesn't change behavior for any of the 26 existing progressions or the 12-stage curriculum that teaches them.

- [ ] **Step 9: Commit**

```bash
git add script.js test-borrowed-checkbox-gating.cjs
git commit -m "Fix checkbox-gating to bypass only canonical diatonic numerals, not any dash-free pattern"
```

---

### Task 3: Add the 55 new `FUNCTIONAL` entries and their checkboxes

**Files:**
- Modify: `script.js:120-123` (`FUNCTIONAL.major`/`.minor` — note: line numbers shifted by the `FUNCTIONAL_NUMERALS` insertion in Task 1; re-locate by content, the `const FUNCTIONAL = {` line, before editing)
- Modify: `index.html:346-375` (`functionalOptions` panel — append new checkboxes before the closing `</div>` that was at line 375)
- Test: `test-borrowed-chords-content.cjs`

**Interfaces:**
- Consumes: `FUNCTIONAL_NUMERALS` (Task 1), `checkboxGatedPatterns()`/fixed `enabledProgressions()` (Task 2).
- Produces: the final `FUNCTIONAL.major` (79 entries) and `FUNCTIONAL.minor` (16 entries) arrays and their checkboxes. Task 4's Learning Path stages reference these pattern strings by exact name.

- [ ] **Step 1: Write the failing test**

Create `test-borrowed-chords-content.cjs`:

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

  const NEW_MAJOR_STANDALONE = ['iv','♭II','♭III','♭VI','♭VII','II','III','VI'];
  const NEW_MAJOR_PROGRESSIONS = ['I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV'];
  const NEW_MINOR_STANDALONE = ['♭II'];
  const NEW_MINOR_PROGRESSIONS = ['i–♭II–VII–i'];

  const dataCheck = await page.evaluate(([major, minor]) => ({
    majorHasAll: major.every(p => FUNCTIONAL.major.includes(p)),
    minorHasAll: minor.every(p => FUNCTIONAL.minor.includes(p)),
    majorCount: FUNCTIONAL.major.length,
    minorCount: FUNCTIONAL.minor.length,
  }), [[...NEW_MAJOR_STANDALONE, ...NEW_MAJOR_PROGRESSIONS], [...NEW_MINOR_STANDALONE, ...NEW_MINOR_PROGRESSIONS]]);
  checkTrue('FUNCTIONAL.major contains all 53 new major entries', dataCheck.majorHasAll, null);
  checkTrue('FUNCTIONAL.minor contains all 2 new minor entries', dataCheck.minorHasAll, null);
  check('FUNCTIONAL.major has 79 entries total (26 existing + 53 new)', dataCheck.majorCount, 79);
  check('FUNCTIONAL.minor has 16 entries total (14 existing + 2 new)', dataCheck.minorCount, 16);

  const allNewPatterns = [...NEW_MAJOR_STANDALONE, ...NEW_MAJOR_PROGRESSIONS, ...NEW_MINOR_PROGRESSIONS]; // minor ♭II shares the major ♭II checkbox, not counted twice
  const checkboxCheck = await page.evaluate((patterns) =>
    patterns.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    }), allNewPatterns);
  checkTrue('all 54 new checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 54 new checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const singleFlatIICheckboxCount = await page.evaluate(() => document.querySelectorAll('input[data-pattern="♭II"]').length);
  check('♭II has exactly one shared checkbox (not one per mode)', singleFlatIICheckboxCount, 1);

  const originalCheck = await page.evaluate(() => {
    const original = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V',
      'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi',
      'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'];
    return original.map(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked);
  });
  checkTrue('all 26 existing progression checkboxes are unaffected', originalCheck.every((c, i) => c === (i < 8)), JSON.stringify(originalCheck));

  // Integration: enabledProgressions() correctly gates a real new standalone chord.
  const gatingIntegration = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('♭VII');
    document.querySelector('input[data-pattern="♭VII"]').checked = true;
    const after = enabledProgressions('major').includes('♭VII');
    document.querySelector('input[data-pattern="♭VII"]').checked = false; // reset
    return { before, after };
  });
  check('♭VII is excluded from enabledProgressions() by default (unchecked)', gatingIntegration.before, false);
  check('♭VII is included in enabledProgressions() once checked', gatingIntegration.after, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-borrowed-chords-content.cjs`
Expected: FAIL on every check involving the new entries and checkboxes (none of it exists yet).

- [ ] **Step 3: Update `FUNCTIONAL`**

Find the `const FUNCTIONAL = {` block in `script.js` (Task 1 inserted `FUNCTIONAL_NUMERALS` right after it, so it's still the same block, just followed by more code now). Current:

```javascript
const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'],
};
```

Replace with:

```javascript
const FUNCTIONAL = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°', 'ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'iv', '♭II', '♭III', '♭VI', '♭VII', 'II', 'III', 'VI', 'I–iv–I', 'I–♭VII–IV', 'I–♭III–IV', 'I–♭VI–IV', 'I–♭III', 'I–♭VI', 'I–♭VII', 'I–♭II', 'I–iv', '♭III–I', '♭VI–I', '♭VII–I', '♭II–I', 'I–♭III–I', 'I–♭VI–I', 'IV–♭VII–I', 'ii–♭VII–I', 'iv–♭VII–I', 'I–IV–♭VII', 'V–♭VI', 'V–♭III', 'vi–IV–I', 'V–ii', 'I–♭VI–♭VII–I', 'I–♭III–♭VI', 'I–iv–♭VII–I', 'I–♭III–♭VI–IV', 'I–♭VII–♭VI–V', 'I–ii–♭III–IV', 'I–iii–IV–iv', 'I–♭III–IV–iv', 'I–♭III–IV–V', 'I–vi–ii–♭II', 'I–♭II–vi', 'I–III–♭II–vi', 'I–♭II–IV–III', 'I–VI–ii–V', 'I–III–vi–II–ii–V–I', 'iii–VI–ii–V–I', 'vi–II–ii–V–I', 'I–III', 'I–VI', 'III–♭VI', 'I–III–vi–IV', 'I–III–♭VI–IV'],
  minor: ['i', 'ii°', 'III', 'iv', 'V', 'VI', 'VII', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI', '♭II', 'i–♭II–VII–i'],
};
```

- [ ] **Step 4: Add the new checkboxes to `index.html`**

Current code (`index.html:370-375`, the end of the existing checkbox list):

```html
                <label><input type="checkbox" data-pattern="vi–V–I–IV"> vi–V–I–IV</label>
                <label><input type="checkbox" data-pattern="i–VII–VI–V"> i–VII–VI–V</label>
                <label><input type="checkbox" data-pattern="i–iv–VI–V"> i–iv–VI–V</label>
                <label><input type="checkbox" data-pattern="i–VI–iv–V"> i–VI–iv–V</label>
                <label><input type="checkbox" data-pattern="i–III–VII–VI"> i–III–VII–VI</label>
              </div>
```

Replace with:

```html
                <label><input type="checkbox" data-pattern="vi–V–I–IV"> vi–V–I–IV</label>
                <label><input type="checkbox" data-pattern="i–VII–VI–V"> i–VII–VI–V</label>
                <label><input type="checkbox" data-pattern="i–iv–VI–V"> i–iv–VI–V</label>
                <label><input type="checkbox" data-pattern="i–VI–iv–V"> i–VI–iv–V</label>
                <label><input type="checkbox" data-pattern="i–III–VII–VI"> i–III–VII–VI</label>
                <div class="option-divider">Borrowed Chords</div>
                <label><input type="checkbox" data-pattern="iv"> iv</label>
                <label><input type="checkbox" data-pattern="♭II"> ♭II</label>
                <label><input type="checkbox" data-pattern="♭III"> ♭III</label>
                <label><input type="checkbox" data-pattern="♭VI"> ♭VI</label>
                <label><input type="checkbox" data-pattern="♭VII"> ♭VII</label>
                <label><input type="checkbox" data-pattern="II"> II</label>
                <label><input type="checkbox" data-pattern="III"> III</label>
                <label><input type="checkbox" data-pattern="VI"> VI</label>
                <div class="option-divider">Single Borrowed Chord</div>
                <label><input type="checkbox" data-pattern="I–iv–I"> I–iv–I</label>
                <label><input type="checkbox" data-pattern="I–♭VII–IV"> I–♭VII–IV</label>
                <label><input type="checkbox" data-pattern="I–♭III–IV"> I–♭III–IV</label>
                <label><input type="checkbox" data-pattern="I–♭VI–IV"> I–♭VI–IV</label>
                <label><input type="checkbox" data-pattern="I–♭III"> I–♭III</label>
                <label><input type="checkbox" data-pattern="I–♭VI"> I–♭VI</label>
                <label><input type="checkbox" data-pattern="I–♭VII"> I–♭VII</label>
                <label><input type="checkbox" data-pattern="I–♭II"> I–♭II</label>
                <label><input type="checkbox" data-pattern="I–iv"> I–iv</label>
                <label><input type="checkbox" data-pattern="♭III–I"> ♭III–I</label>
                <label><input type="checkbox" data-pattern="♭VI–I"> ♭VI–I</label>
                <label><input type="checkbox" data-pattern="♭VII–I"> ♭VII–I</label>
                <label><input type="checkbox" data-pattern="♭II–I"> ♭II–I</label>
                <label><input type="checkbox" data-pattern="I–♭III–I"> I–♭III–I</label>
                <label><input type="checkbox" data-pattern="I–♭VI–I"> I–♭VI–I</label>
                <label><input type="checkbox" data-pattern="IV–♭VII–I"> IV–♭VII–I</label>
                <label><input type="checkbox" data-pattern="ii–♭VII–I"> ii–♭VII–I</label>
                <label><input type="checkbox" data-pattern="iv–♭VII–I"> iv–♭VII–I</label>
                <label><input type="checkbox" data-pattern="I–IV–♭VII"> I–IV–♭VII</label>
                <label><input type="checkbox" data-pattern="V–♭VI"> V–♭VI</label>
                <label><input type="checkbox" data-pattern="V–♭III"> V–♭III</label>
                <label><input type="checkbox" data-pattern="vi–IV–I"> vi–IV–I</label>
                <label><input type="checkbox" data-pattern="V–ii"> V–ii</label>
                <div class="option-divider">Combining Borrowed Chords</div>
                <label><input type="checkbox" data-pattern="I–♭VI–♭VII–I"> I–♭VI–♭VII–I</label>
                <label><input type="checkbox" data-pattern="I–♭III–♭VI"> I–♭III–♭VI</label>
                <label><input type="checkbox" data-pattern="I–iv–♭VII–I"> I–iv–♭VII–I</label>
                <label><input type="checkbox" data-pattern="I–♭III–♭VI–IV"> I–♭III–♭VI–IV</label>
                <label><input type="checkbox" data-pattern="I–♭VII–♭VI–V"> I–♭VII–♭VI–V</label>
                <label><input type="checkbox" data-pattern="I–ii–♭III–IV"> I–ii–♭III–IV</label>
                <label><input type="checkbox" data-pattern="I–iii–IV–iv"> I–iii–IV–iv</label>
                <label><input type="checkbox" data-pattern="I–♭III–IV–iv"> I–♭III–IV–iv</label>
                <label><input type="checkbox" data-pattern="I–♭III–IV–V"> I–♭III–IV–V</label>
                <label><input type="checkbox" data-pattern="I–vi–ii–♭II"> I–vi–ii–♭II</label>
                <label><input type="checkbox" data-pattern="I–♭II–vi"> I–♭II–vi</label>
                <label><input type="checkbox" data-pattern="I–III–♭II–vi"> I–III–♭II–vi</label>
                <label><input type="checkbox" data-pattern="I–♭II–IV–III"> I–♭II–IV–III</label>
                <div class="option-divider">Raised Mediants</div>
                <label><input type="checkbox" data-pattern="I–VI–ii–V"> I–VI–ii–V</label>
                <label><input type="checkbox" data-pattern="I–III–vi–II–ii–V–I"> I–III–vi–II–ii–V–I</label>
                <label><input type="checkbox" data-pattern="iii–VI–ii–V–I"> iii–VI–ii–V–I</label>
                <label><input type="checkbox" data-pattern="vi–II–ii–V–I"> vi–II–ii–V–I</label>
                <label><input type="checkbox" data-pattern="I–III"> I–III</label>
                <label><input type="checkbox" data-pattern="I–VI"> I–VI</label>
                <label><input type="checkbox" data-pattern="III–♭VI"> III–♭VI</label>
                <label><input type="checkbox" data-pattern="I–III–vi–IV"> I–III–vi–IV</label>
                <label><input type="checkbox" data-pattern="I–III–♭VI–IV"> I–III–♭VI–IV</label>
                <div class="option-divider">Minor — ♭II</div>
                <label><input type="checkbox" data-pattern="i–♭II–VII–i"> i–♭II–VII–i</label>
              </div>
```

Note: the minor `♭II` standalone chord uses the same `data-pattern="♭II"` checkbox already added under "Borrowed Chords" above — do not add a second one (see Global Constraints). None of the new `<input>` elements have a `checked` attribute, matching the "unchecked by default" rule.

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-borrowed-chords-content.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Commit**

```bash
git add script.js index.html test-borrowed-chords-content.cjs
git commit -m "Add 55 borrowed/chromatic-mediant chord progressions with checkboxes"
```

---

### Task 4: 6 new Learning Path stages

**Files:**
- Modify: `script.js` (`LEARNING_PATH` — insert 6 stages between `'Progressions, Add E'` and `'Functional, Nat. Keys'`, currently at lines 290-291 but re-locate by content since Tasks 1-3 shifted line numbers)
- Modify: `script.js:330` (`LEARNING_PATH_PHASES`, bump `'Functional harmony'` count)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53`
- Modify: `test-audit-fixes-scales-phase.cjs:54`
- Modify: `test-all-paths-popup-redesign.cjs:37,71`
- Test: `test-borrowed-chords-learning-path.cjs`

**Interfaces:**
- Consumes: the 55 new `FUNCTIONAL` entries (Task 3), `applyStage()`/`getStageMastery()` (unchanged mechanism, Task 2 only fixed their `ALL_PROGRESSIONS` source).
- Produces: nothing other tasks depend on — this is the last task.

- [ ] **Step 1: Write the failing test**

Create `test-borrowed-chords-learning-path.cjs`:

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
    const stages = LEARNING_PATH.slice(idx, idx + 6);
    return {
      idx,
      afterAddE: LEARNING_PATH[idx - 1]?.name === 'Progressions, Add E',
      beforeNatKeys: LEARNING_PATH[idx + 6]?.name === 'Functional, Nat. Keys',
      names: stages.map(s => s.name),
      counts: stages.map(s => (s.progressions || []).length),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 6 new stages start right after "Progressions, Add E"', stageData.afterAddE, JSON.stringify(stageData.names));
  checkTrue('"Functional, Nat. Keys" immediately follows the 6 new stages', stageData.beforeNatKeys, null);
  check('stage names in order', stageData.names, [
    'Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords',
    'Raised Mediants', 'Minor Borrowed — ♭II', 'Borrowed Content, Two Keys',
  ]);
  check('cumulative progression counts', stageData.counts, [34, 57, 70, 79, 81, 81]);
  check('all 6 stages are timer off', stageData.timers, ['off','off','off','off','off','off']);
  check('stages 1-5 are C only', stageData.notes.slice(0, 5), [['C'],['C'],['C'],['C'],['C']]);
  check('stage 6 is C and G', stageData.notes[5], ['C', 'G']);

  const contentSpotCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    const [intro, single, combo, mediants, minor, twoKeys] = LEARNING_PATH.slice(idx, idx + 6);
    return {
      introHasStandalones: ['iv','♭II','♭III','♭VI','♭VII','II','III','VI'].every(p => intro.progressions.includes(p)),
      singleHasNewOnes: ['I–♭VII–IV','vi–IV–I','V–ii'].every(p => single.progressions.includes(p)),
      singleLacksCombo: !single.progressions.includes('I–♭VI–♭VII–I'), // belongs to stage 3
      comboHasNewOnes: ['I–♭VI–♭VII–I','I–vi–ii–♭II'].every(p => combo.progressions.includes(p)),
      mediantsHasNewOnes: ['I–VI–ii–V','I–III–vi–II–ii–V–I'].every(p => mediants.progressions.includes(p)),
      minorHasNewOnes: ['♭II','i–♭II–VII–i'].every(p => minor.progressions.includes(p)),
      twoKeysMatchesMinorContent: JSON.stringify([...twoKeys.progressions].sort()) === JSON.stringify([...minor.progressions].sort()),
    };
  });
  checkTrue('stage 1 has the 8 standalone borrowed chords', contentSpotCheck.introHasStandalones, null);
  checkTrue('stage 2 has its new single-borrowed-chord progressions', contentSpotCheck.singleHasNewOnes, null);
  checkTrue('stage 2 does not yet have stage-3-only combos', contentSpotCheck.singleLacksCombo, null);
  checkTrue('stage 3 has its new two-borrowed-chord combos', contentSpotCheck.comboHasNewOnes, null);
  checkTrue('stage 4 has its new raised-mediant progressions', contentSpotCheck.mediantsHasNewOnes, null);
  checkTrue('stage 5 has the new minor content', contentSpotCheck.minorHasNewOnes, null);
  checkTrue('stage 6 has the same progression list as stage 5 (only the key changed)', contentSpotCheck.twoKeysMatchesMinorContent, null);

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
  check('Functional harmony phase count is now 28 (22 + 6 new stages)', phaseCheck.functionalHarmonyCount, 28);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 125 stages total (119 + 6 new)', phaseCheck.totalStages, 125);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-borrowed-chords-learning-path.cjs`
Expected: FAIL — `LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro')` returns `-1`, cascading into failures on every subsequent check.

- [ ] **Step 3: Insert the 6 new stages**

Find the two adjacent stages in `LEARNING_PATH` (currently at lines 290-291, but re-locate by content — Tasks 1-3 will have shifted line numbers):

```javascript
  { name: 'Progressions, Add E',        hint: 'C, D, E, F, G, A — one key short of all naturals',                                                  cats: ['catFunctional'], notes: ['C','D','E','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

Insert 6 new stages between them (leave both existing lines exactly as they are):

```javascript
  { name: 'Progressions, Add E',        hint: 'C, D, E, F, G, A — one key short of all naturals',                                                  cats: ['catFunctional'], notes: ['C','D','E','F','G','A'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'], timer: 'off' },
  { name: 'Borrowed Chords — Intro',          hint: 'Eight chords borrowed from outside the key — play each on its own before combining them',       cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI'], timer: 'off' },
  { name: 'Single Borrowed Chord Progressions',hint: 'Each of these progressions uses exactly one borrowed chord',                                    cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii'], timer: 'off' },
  { name: 'Combining Borrowed Chords',        hint: 'Now two borrowed chords appear in the same progression',                                        cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III'], timer: 'off' },
  { name: 'Raised Mediants',                  hint: 'A different kind of borrowed chord — major triads on scale degrees that are normally minor',      cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV'], timer: 'off' },
  { name: 'Minor Borrowed — ♭II',             hint: 'The Neapolitan chord in a minor key — same borrowed relationship, different tonic mode',          cats: ['catFunctional'], notes: ['C'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Borrowed Content, Two Keys',       hint: 'Everything so far — now in C and G',                                                             cats: ['catFunctional'], notes: ['C','G'], chords: [], scales: [], progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI','iv','♭II','♭III','♭VI','♭VII','II','III','VI','I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV','♭II','i–♭II–VII–i'], timer: 'off' },
  { name: 'Functional, Nat. Keys',    hint: 'Major and minor keys across all seven natural roots',                                                  cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: [],                                       timer: 'off' },
```

- [ ] **Step 4: Bump the `LEARNING_PATH_PHASES` count**

Current code (`script.js:330`, may have shifted — re-locate by content):

```javascript
  { name: 'Functional harmony', count: 22 },
```

Replace with:

```javascript
  { name: 'Functional harmony', count: 28 },
```

- [ ] **Step 5: Update the 3 stale hardcoded stage-count assertions**

These three tests hardcode `LEARNING_PATH.length === 119`, which becomes `125` after this task's 6 new stages (this is the same kind of maintenance the prior Learning Path audit did — see commit `85176a9`, "Fix stale stage-count assertions after Learning Path audit fixes").

In `test-audit-fixes-extended-chords-phase.cjs:53`, change:

```javascript
  check('LEARNING_PATH has 119 stages (116 + 3 new)', data.totalStages, 119);
```

to:

```javascript
  check('LEARNING_PATH has 125 stages (119 + 6 new)', data.totalStages, 125);
```

In `test-audit-fixes-scales-phase.cjs:54`, change:

```javascript
  check('LEARNING_PATH has the expected 119 stages', data.totalStages, 119);
```

to:

```javascript
  check('LEARNING_PATH has the expected 125 stages', data.totalStages, 125);
```

In `test-all-paths-popup-redesign.cjs`, change both occurrences (line 37 and line 71):

```javascript
  check('LEARNING_PATH.length matches the expected 119 stages', phaseData.stageCount, 119);
```

to:

```javascript
  check('LEARNING_PATH.length matches the expected 125 stages', phaseData.stageCount, 125);
```

and:

```javascript
  check('all 119 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 119);
```

to:

```javascript
  check('all 125 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 125);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-borrowed-chords-learning-path.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-borrowed-numerals-resolution.cjs
node test-borrowed-checkbox-gating.cjs
node test-borrowed-chords-content.cjs
node test-borrowed-chords-learning-path.cjs
node test-progression-filtering.cjs
node test-progression-learning-path.cjs
node test-more-progressions.cjs
node test-progression-curriculum-fix.cjs
node test-chord-progressions.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-all-paths-popup-redesign.cjs
```

Expected: `RESULT: PASS` on all twelve.

- [ ] **Step 8: Commit**

```bash
git add script.js test-borrowed-chords-learning-path.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-all-paths-popup-redesign.cjs
git commit -m "Add 6 Learning Path stages teaching borrowed and chromatic-mediant chords"
```
