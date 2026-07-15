# Relative-Pair Generation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `genChord()`/`genScale()` so that Learning Path stages claiming "relative pair" framing (root note + its relative major/minor partner) actually only ever generate valid pairs, not the full unconstrained Cartesian product of root × quality.

**Architecture:** Two new opt-in checkboxes (`chordPairedRelativeKeys`, `scalePairedRelativeKeys`), a pure music-theory pairing helper (`relativeMinorOf`/`relativeMajorOf`/`pickPairedRoot`) shared by both generators, and stage-data fields (`pairedChords`/`pairedScales`) set by `applyStage()` on exactly the 5 stages that need it. No changes to any other generator, no changes to how non-paired stages behave.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Playwright for testing. Learning Path stage-line edits should follow the `learning-path-stages` skill's column-alignment discipline — already applied below (a new column family, verified live against the actual file content, not estimated).

## Global Constraints

- The pairing formula is pure computation (`(NOTES.indexOf(root) + 9) % 12` for relative minor, `+3` for relative major) — no lookup table. Verified live against all 12 roots and against the "More Minors" 6-root case (must reproduce exactly `{C,F,G}` major candidates / `{D,E,A}` minor candidates, matching that stage's own hint text) before this plan was written.
- Exact stage mapping, no deviation: `pairedChords: true` on `First Minor` and `More Minors` only; `pairedScales: true` on `Meet the Scales`, `Scales, 0–1 Accidentals`, `Scales, 2 Accidentals`, and `Scales, 3 Accidentals` only. `All Natural Minor`, `Scales, All 12 Keys`, and `Scale Timer` are explicitly NOT paired (unchanged, absent field) — they're meant to be full-fluency stages by that point in each ramp, matching the existing (already-correct) intent of `All Natural Minor`.
- The new stage-line column alignment (a NEW family — `pairedChords`/`pairedScales` didn't exist before this plan) was computed by taking each stage's exact existing prefix (through `scales: [...]`) verbatim and unchanged, then recomputing only the new field's column and the shifted `timer:` column from the longest content within each specific sub-family. Use the exact lines given below — do not regenerate them from a formula, and do not reuse column numbers from any other family in the file.
- `pickPairedRoot()` returning `null` (degenerate case: pairing checkbox on, but only one quality actually enabled) must fall back to the existing unconstrained selection — never return "no prompt."
- Root selection among valid paired candidates still uses `weightedPick(candidates, 'roots')` (preserves adaptive-weighting-aware root choice); only the quality/type selection is overridden by the pairing coin-flip.

---

### Task 1: Pairing helpers, generator changes, checkboxes, stage mapping

**Files:**
- Modify: `script.js` (`relativeMinorOf()`/`relativeMajorOf()`/`pickPairedRoot()` — new; `genChord()`; `genScale()`; `applyStage()`; `saveSettings()`'s `ids` array; the 5 stage-line updates: `First Minor`, `More Minors`, `Meet the Scales`, `Scales, 0–1 Accidentals`, `Scales, 2 Accidentals`, `Scales, 3 Accidentals`)
- Modify: `index.html` (2 new checkboxes: `chordPairedRelativeKeys` in the Chords panel, `scalePairedRelativeKeys` in the Scales panel)
- Create: `test-relative-pair-generation-fix.cjs`

**Interfaces:**
- Produces: `relativeMinorOf(majorRoot)` — string in, string out (e.g. `'C'` → `'A'`). `relativeMajorOf(minorRoot)` — inverse. `pickPairedRoot(notes)` — array of enabled root strings in, returns `{ root, isMajor }` or `null`.

- [ ] **Step 1: Write the failing test**

Create `test-relative-pair-generation-fix.cjs`:

```js
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

  // --- relativeMinorOf / relativeMajorOf are correct for all 12 roots ---
  const relPairs = await page.evaluate(() => {
    const NOTES_LOCAL = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    return NOTES_LOCAL.map(m => [m, relativeMinorOf(m)]);
  });
  check('relativeMinorOf() matches the known-correct table for all 12 roots', relPairs, [
    ['C','A'], ['C#','Bb'], ['D','B'], ['Eb','C'], ['E','C#'], ['F','D'],
    ['F#','Eb'], ['G','E'], ['Ab','F'], ['A','F#'], ['Bb','G'], ['B','Ab'],
  ]);

  // --- pickPairedRoot: the "More Minors" 6-root case reproduces its own hint text exactly ---
  const moreMinorsCandidates = await page.evaluate(() => {
    const notes = ['C','D','E','F','G','A'];
    const majorCandidates = notes.filter(n => notes.includes(relativeMinorOf(n)));
    const minorCandidates = notes.filter(n => notes.includes(relativeMajorOf(n)));
    return { majorCandidates: majorCandidates.sort(), minorCandidates: minorCandidates.sort() };
  });
  check('"More Minors" root set: major candidates are exactly C/F/G', moreMinorsCandidates.majorCandidates, ['C','F','G']);
  check('"More Minors" root set: minor candidates are exactly A/D/E', moreMinorsCandidates.minorCandidates, ['A','D','E']);

  // --- Meet the Scales: with pairing on and only {C,A} enabled, 200 generated prompts
  // never produce a mismatched combination (C Minor or A Major) ---
  const meetTheScales = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet the Scales');
    applyStage(idx);
    const results = new Set();
    for (let i = 0; i < 200; i++) {
      const p = genScale();
      if (p) results.add(p.line1);
    }
    return [...results].sort();
  });
  check('200 generated prompts on "Meet the Scales" only ever produce C Major or A Natural minor', meetTheScales, ['A Natural minor', 'C Major']);

  // --- applyStage() sets pairedScales/pairedChords per the stage mapping ---
  const stageFlags = await page.evaluate(() => {
    const byName = n => {
      applyStage(LEARNING_PATH.findIndex(s => s.name === n));
      return {
        chords: document.getElementById('chordPairedRelativeKeys').checked,
        scales: document.getElementById('scalePairedRelativeKeys').checked,
      };
    };
    return {
      firstMinor: byName('First Minor'),
      moreMinors: byName('More Minors'),
      allNaturalMinor: byName('All Natural Minor'),
      meetTheScales: byName('Meet the Scales'),
      scales2Acc: byName('Scales, 2 Accidentals'),
      allTwelveKeys: byName('Scales, All 12 Keys'),
      scaleTimer: byName('Scale Timer'),
    };
  });
  check('First Minor: chordPairedRelativeKeys on', stageFlags.firstMinor.chords, true);
  check('More Minors: chordPairedRelativeKeys on', stageFlags.moreMinors.chords, true);
  check('All Natural Minor: chordPairedRelativeKeys off', stageFlags.allNaturalMinor.chords, false);
  check('Meet the Scales: scalePairedRelativeKeys on', stageFlags.meetTheScales.scales, true);
  check('Scales, 2 Accidentals: scalePairedRelativeKeys on', stageFlags.scales2Acc.scales, true);
  check('Scales, All 12 Keys: scalePairedRelativeKeys off', stageFlags.allTwelveKeys.scales, false);
  check('Scale Timer: scalePairedRelativeKeys off', stageFlags.scaleTimer.scales, false);

  // --- Regression: with the checkbox OFF, genChord()/genScale() are unconstrained (unchanged) ---
  const unpaired = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'All Natural Minor'));
    const results = new Set();
    for (let i = 0; i < 300; i++) {
      const p = genChord();
      if (p) results.add(p.line1.split(' ')[1]); // just the quality
    }
    return [...results].sort();
  });
  checkTrue('with pairing off, both Major and Minor still appear across 300 samples (unconstrained, unchanged)', unpaired.includes('Major') && unpaired.includes('Minor'), unpaired.join(', '));

  // --- Degenerate case: pairing checkbox on, but only one quality enabled -> falls back, still produces prompts ---
  const degenerate = await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('chordPairedRelativeKeys').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.getElementById('chordMinor').checked = false;
    document.querySelectorAll('input[data-note]').forEach(el => el.checked = (el.dataset.note === 'C'));
    const p = genChord();
    return p ? p.line1 : null;
  });
  checkTrue('degenerate case (pairing on, only one quality enabled) still produces a prompt via fallback', degenerate !== null, degenerate);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-relative-pair-generation-fix.cjs`
Expected: FAIL — `relativeMinorOf` is not defined yet; every subsequent check that depends on it also fails or errors.

- [ ] **Step 3: Add the pairing helpers**

In `script.js`, find `function genChord() {` (currently script.js:2110). Immediately **before** that line, insert:

```js
function relativeMinorOf(majorRoot) {
  return NOTES[(NOTES.indexOf(majorRoot) + 9) % 12];
}
function relativeMajorOf(minorRoot) {
  return NOTES[(NOTES.indexOf(minorRoot) + 3) % 12];
}

// Picks { root, isMajor } such that root's relative partner (the other quality)
// is ALSO currently enabled -- so a paired-mode prompt can never mismatch a root
// with a quality it wasn't meant to appear with (e.g. "C Minor" when only C and A
// are enabled, which should only ever produce C Major / A Natural minor).
// Returns null if pairing isn't possible (e.g. only one quality has any candidates).
function pickPairedRoot(notes) {
  const majorCandidates = notes.filter(n => notes.includes(relativeMinorOf(n)));
  const minorCandidates = notes.filter(n => notes.includes(relativeMajorOf(n)));
  if (!majorCandidates.length && !minorCandidates.length) return null;
  const useMajor = minorCandidates.length === 0 || (majorCandidates.length > 0 && Math.random() < 0.5);
  return useMajor
    ? { root: weightedPick(majorCandidates, 'roots'), isMajor: true }
    : { root: weightedPick(minorCandidates, 'roots'), isMajor: false };
}

```

- [ ] **Step 4: Update `genChord()`**

The current function (script.js, now shifted down by Step 3's insertion) reads:

```js
function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const typeLabel = weightedPick(types.map(t => t.label), 'types', 'chord');
  const type      = types.find(t => t.label === typeLabel) || pick(types);
  const note      = weightedPick(notes, 'roots');
```

Change it to (adds a paired-mode short-circuit before the existing selection; everything after this block, using `type`/`note`, is unchanged):

```js
function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const hasMajor = types.some(t => t.label === 'Major');
  const hasMinor = types.some(t => t.label === 'Minor');
  const paired   = checked('chordPairedRelativeKeys') && hasMajor && hasMinor ? pickPairedRoot(notes) : null;

  let typeLabel, note;
  if (paired) {
    typeLabel = paired.isMajor ? 'Major' : 'Minor';
    note      = paired.root;
  } else {
    typeLabel = weightedPick(types.map(t => t.label), 'types', 'chord');
    note      = weightedPick(notes, 'roots');
  }
  const type = types.find(t => t.label === typeLabel) || pick(types);
```

- [ ] **Step 5: Update `genScale()`**

The current function reads:

```js
function genScale() {
  const types = SCALE_TYPES.filter(s => checked(s.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  let label;
  if (adaptiveOn()) {
    const allLabels = types.flatMap(t => t.label === null ? MODES : [t.label]);
    label = weightedPick(allLabels, 'types', 'scale');
  } else {
    const type = pick(types);
    label = type.label === null ? pick(MODES) : type.label;
  }
  const note = weightedPick(notes, 'roots');

  return {
    line1: `${note} ${label}`,
    line2: '',
    key:   `scale|${note}|${label}`,
  };
}
```

Change it to (adds the same paired-mode short-circuit ahead of the existing adaptive/non-adaptive branches; the existing branches and the return statement are otherwise unchanged):

```js
function genScale() {
  const types = SCALE_TYPES.filter(s => checked(s.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const hasMajor = types.some(t => t.id === 'scaleMajor');
  const hasMinor = types.some(t => t.id === 'scaleNatMinor');
  const paired   = checked('scalePairedRelativeKeys') && hasMajor && hasMinor ? pickPairedRoot(notes) : null;

  let label, note;
  if (paired) {
    label = paired.isMajor ? 'Major' : 'Natural minor';
    note  = paired.root;
  } else if (adaptiveOn()) {
    const allLabels = types.flatMap(t => t.label === null ? MODES : [t.label]);
    label = weightedPick(allLabels, 'types', 'scale');
    note  = weightedPick(notes, 'roots');
  } else {
    const type = pick(types);
    label = type.label === null ? pick(MODES) : type.label;
    note  = weightedPick(notes, 'roots');
  }

  return {
    line1: `${note} ${label}`,
    line2: '',
    key:   `scale|${note}|${label}`,
  };
}
```

- [ ] **Step 6: Add the two new checkboxes to `applyStage()`'s special handling**

The current code (script.js, near the existing `functionalRequireInversions` handling) reads:

```js
  const elReqInv = document.getElementById('functionalRequireInversions');
  if (elReqInv) elReqInv.checked = !!stage.requireProgressionInversions;
```

Change it to (adds the same pattern for the two new fields, right after):

```js
  const elReqInv = document.getElementById('functionalRequireInversions');
  if (elReqInv) elReqInv.checked = !!stage.requireProgressionInversions;

  const elPairedChords = document.getElementById('chordPairedRelativeKeys');
  if (elPairedChords) elPairedChords.checked = !!stage.pairedChords;
  const elPairedScales = document.getElementById('scalePairedRelativeKeys');
  if (elPairedScales) elPairedScales.checked = !!stage.pairedScales;
```

- [ ] **Step 7: Add the two new checkbox IDs to `saveSettings()`'s `ids` array**

The current array (script.js:2686-2701) reads:

```js
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
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals', 'functionalRequireInversions',
  ];
```

Change it to (adds the two new checkbox IDs; every existing entry is unchanged):

```js
  const ids = [
    'catNotes',
    'catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7',
    'chordSus2', 'chordSus4', 'chord7sus4',
    'chordDom9', 'chordMaj9', 'chordMin9', 'chordDom13',
    'chord7b9', 'chord7s9', 'chord7s11', 'chordHalfDim', 'chordDim7',
    'inversions', 'jazzSymbols', 'leftHandMode', 'chordPairedRelativeKeys',
    'scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor',
    'scaleMajPent', 'scaleMinPent', 'scaleModes', 'scalePairedRelativeKeys',
    'intMin2', 'intMaj2', 'intMin3', 'intMaj3', 'intPerf4', 'intTT',
    'intPerf5', 'intMin6', 'intMaj6', 'intMin7', 'intMaj7', 'intOct',
    'intDirUp', 'intDirDown',
    'adaptiveToggle', 'bandModeToggle', 'functionalRandomNumerals', 'functionalRequireInversions',
  ];
```

- [ ] **Step 8: Add the two new checkboxes to `index.html`**

The current Chords panel's "Display" section (index.html:321-324) reads:

```html
                <div class="option-divider">Display</div>
                <label class="inversion-toggle"><input type="checkbox" id="jazzSymbols"> Jazz lead sheet symbols</label>
                <label class="inversion-toggle" id="inversionsRow" title="Combines with Left-Hand mode in a future update"><input type="checkbox" id="inversions"> Enable Inversions</label>
                <label class="inversion-toggle"><input type="checkbox" id="leftHandMode"> Left-Hand mode (Major/Minor, root position)</label>
```

Change it to:

```html
                <div class="option-divider">Display</div>
                <label class="inversion-toggle"><input type="checkbox" id="jazzSymbols"> Jazz lead sheet symbols</label>
                <label class="inversion-toggle" id="inversionsRow" title="Combines with Left-Hand mode in a future update"><input type="checkbox" id="inversions"> Enable Inversions</label>
                <label class="inversion-toggle"><input type="checkbox" id="leftHandMode"> Left-Hand mode (Major/Minor, root position)</label>
                <label class="inversion-toggle"><input type="checkbox" id="chordPairedRelativeKeys"> Relative pairs only (Major root pairs with its relative Minor)</label>
```

The current Scales panel (index.html:332-340) reads:

```html
              <div class="category-options" id="scalesOptions" role="group" aria-label="Scale types">
                <label><input type="checkbox" id="scaleMajor" checked> Major</label>
                <label><input type="checkbox" id="scaleNatMinor" checked> Natural minor</label>
                <label><input type="checkbox" id="scaleHarmMinor" checked> Harmonic minor</label>
                <label><input type="checkbox" id="scaleMelMinor" checked> Melodic minor</label>
                <label><input type="checkbox" id="scaleMajPent" checked> Major pentatonic</label>
                <label><input type="checkbox" id="scaleMinPent" checked> Minor pentatonic</label>
                <label><input type="checkbox" id="scaleModes" checked> Modes</label>
              </div>
```

Change it to:

```html
              <div class="category-options" id="scalesOptions" role="group" aria-label="Scale types">
                <label><input type="checkbox" id="scaleMajor" checked> Major</label>
                <label><input type="checkbox" id="scaleNatMinor" checked> Natural minor</label>
                <label><input type="checkbox" id="scaleHarmMinor" checked> Harmonic minor</label>
                <label><input type="checkbox" id="scaleMelMinor" checked> Melodic minor</label>
                <label><input type="checkbox" id="scaleMajPent" checked> Major pentatonic</label>
                <label><input type="checkbox" id="scaleMinPent" checked> Minor pentatonic</label>
                <label><input type="checkbox" id="scaleModes" checked> Modes</label>
                <div class="option-divider">Display</div>
                <label><input type="checkbox" id="scalePairedRelativeKeys"> Relative pairs only (Major root pairs with its relative Minor)</label>
              </div>
```

- [ ] **Step 9: Update the 5 stage lines**

These exact lines were pre-computed against the live file's actual current content, preserving every existing character up through `scales: [...],` verbatim, with only the new field and the shifted `timer:` column recalculated. Do not retype or reformat them.

The current line for `First Minor` (script.js:222) reads:

```js
  { name: 'First Minor',         hint: 'C + A — a relative pair (Major and Minor)',                                                               cats: ['catChords'],             notes: ['C','A'],                                                        chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
```

Change it to:

```js
  { name: 'First Minor',         hint: 'C + A — a relative pair (Major and Minor)',                                                               cats: ['catChords'],             notes: ['C','A'],                                                        chords: ['chordMajor','chordMinor'],                                                     scales: [], pairedChords: true, timer: 'off' },
```

The current line for `More Minors` (script.js:223) reads:

```js
  { name: 'More Minors',         hint: 'Six chords: C/G/F Major + A/E/D Minor',                                                                   cats: ['catChords'],             notes: ['C','D','E','F','G','A'],                                        chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: 'off' },
```

Change it to:

```js
  { name: 'More Minors',         hint: 'Six chords: C/G/F Major + A/E/D Minor',                                                                   cats: ['catChords'],             notes: ['C','D','E','F','G','A'],                                        chords: ['chordMajor','chordMinor'],                                                     scales: [], pairedChords: true, timer: 'off' },
```

The current line for `Meet the Scales` (script.js:243) reads:

```js
  { name: 'Meet the Scales', hint: 'C Major + A Minor — a relative pair, no timer, take your time',                                               cats: ['catScales'],             notes: ['C','A'],                                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
```

Change it to:

```js
  { name: 'Meet the Scales', hint: 'C Major + A Minor — a relative pair, no timer, take your time',                                               cats: ['catScales'],             notes: ['C','A'],                                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], pairedScales: true, timer: 'off' },
```

The current line for `Scales, 0–1 Accidentals` (script.js:244) reads:

```js
  { name: 'Scales, 0–1 Accidentals', hint: 'Major + Minor scales in keys with 0–1 accidentals — C, F, G major / A, D, E minor',                   cats: ['catScales'],             notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
```

Change it to:

```js
  { name: 'Scales, 0–1 Accidentals', hint: 'Major + Minor scales in keys with 0–1 accidentals — C, F, G major / A, D, E minor',                   cats: ['catScales'],             notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], pairedScales: true, timer: 'off' },
```

The current line for `Scales, 2 Accidentals` (script.js:245) reads:

```js
  { name: 'Scales, 2 Accidentals', hint: 'Add D and B♭ major, G and B minor — 2 accidentals',                                                     cats: ['catScales'],             notes: ['C','D','E','F','G','A','Bb','B'],                               chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
```

Change it to:

```js
  { name: 'Scales, 2 Accidentals', hint: 'Add D and B♭ major, G and B minor — 2 accidentals',                                                     cats: ['catScales'],             notes: ['C','D','E','F','G','A','Bb','B'],                               chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], pairedScales: true, timer: 'off' },
```

The current line for `Scales, 3 Accidentals` (script.js:246) reads:

```js
  { name: 'Scales, 3 Accidentals', hint: 'Add A and E♭ major, C and F♯ minor — 3 accidentals',                                                    cats: ['catScales'],             notes: ['C','D','Eb','E','F','F#','G','A','Bb','B'],                     chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
```

Change it to:

```js
  { name: 'Scales, 3 Accidentals', hint: 'Add A and E♭ major, C and F♯ minor — 3 accidentals',                                                    cats: ['catScales'],             notes: ['C','D','Eb','E','F','F#','G','A','Bb','B'],                     chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], pairedScales: true, timer: 'off' },
```

- [ ] **Step 10: Run test to verify it passes**

Run: `node test-relative-pair-generation-fix.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 11: Run a regression sample**

```bash
node test-first-minor-progression.cjs
node test-scales-ramp-reorder.cjs
node test-all-paths-popup-redesign.cjs
```

Expected: `RESULT: PASS` for all three — confirms `LEARNING_PATH.length`/`LEARNING_PATH_PHASES` sums are unaffected (this task adds fields to existing stages, doesn't insert/delete any), and the Learning Path stage list itself renders unchanged.

- [ ] **Step 12: Commit**

```bash
git add script.js index.html test-relative-pair-generation-fix.cjs
git commit -m "Fix relative-pair generation: genChord()/genScale() no longer produce mismatched root/quality combinations on paired stages"
```
