# Left-Hand Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Left-Hand mode for Major/Minor chords — left hand plays root+5th below middle C, right hand plays the full chord at/above middle C — with a data model shaped so future inversions/extensions can plug into the same mechanism without another key-format change.

**Architecture:** The chord prompt key gains a 5th segment for hand-mode, independent of the existing inversion segment. `getExpectedPCs()` and `checkMidi()` each get one additive branch for the register-based two-hand check, layered on top of (not replacing) the existing pitch-class/bass-note checks. Stats reuse the `adaptWeights.variations` bucket built in the immediately-prior feature. A new checkbox in the Chords options disables the existing `inversions` checkbox while active, since the two don't combine yet.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`/`index.html`/`style.css`.
- Left-Hand mode only applies when the randomly-picked chord type is **Major or Minor**. If any other enabled chord type is picked while Left-Hand mode is checked, that prompt falls back to normal single-hand practice (including normal inversion behavior for that prompt, if `inversions` happens to be checked).
- Prompt key format: `chord|${note}|${type.label}|${inv}|${handMode}` — `handMode` is `'LH'` or `''`. This 5th segment is always present (never conditionally omitted), for every chord prompt, not just Left-Hand ones.
- When Left-Hand mode applies to a prompt, `inv` is always forced to `''` in that same key — the `inversions` checkbox is disabled in the UI while Left-Hand mode is checked (see Task 2), so this should already hold, but `genChord()` must not depend on the UI disabling alone.
- Left hand = root + 5th (`[pcs[0], pcs[2]]`), right hand = the full chord (`pcs`) — valid because `pcs[2]` is the 5th for both Major (`[0,4,7]`) and Minor (`[0,3,7]`).
- Register split: MIDI note 60 (middle C) and above counts as right hand; below 60 counts as left hand.
- Left-Hand-mode answers are recorded into the existing `adaptWeights.variations` bucket under the label `'Left Hand'`, using the existing `updateAdaptWeight()` — no new bucket, no changes to `updateAdaptWeight` itself.
- Scoped to the plain Chords generator (`genChord()`) only — no changes to Diatonic Chords, Functional Harmony, or `LEARNING_PATH`.
- No new visual "wrong hand" marker this pass — existing red wrong-note highlighting (pitch-class-based, unaffected by register) is the only feedback; a two-hand answer with correct pitch classes but wrong register simply doesn't register as correct yet.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Data model and correctness check

**Files:**
- Modify: `script.js:1962-1986` (`genChord`)
- Modify: `script.js:3198-3204` (`getExpectedPCs`'s chord branch)
- Modify: `script.js:3305-3312` (`checkMidi`'s chord branch)
- Modify: `script.js:941-946` (`recordAdaptiveResult`'s chord branch)
- Test: `test-left-hand-mode-check.cjs`

**Interfaces:**
- Consumes: `getRequiredBassPc` (unchanged), `updateAdaptWeight` (unchanged), `TRIAD_INVERSIONS`/`SEVENTH_INVERSIONS` (unchanged), `checked(id)` (unchanged, reads a checkbox's `.checked` state by element id).
- Produces: chord prompt keys now have 5 pipe-separated segments (`chord|note|type|inv|handMode`). `getExpectedPCs()`'s chord return value gains `leftHandPcs`/`rightHandPcs` (arrays of pitch classes, only present when `handMode === 'LH'`). Task 2 does not depend on any new function here — it only adds a checkbox and disables another one.

- [ ] **Step 1: Write the failing test**

Create `test-left-hand-mode-check.cjs`:

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

  const genResult = await page.evaluate(() => {
    document.querySelectorAll('#chordsOptions input[type="checkbox"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('chordMajor').checked = true;
    document.getElementById('leftHandMode').checked = true;
    const prompt = genChord();
    return { key: prompt.key, line2: prompt.line2 };
  });
  check('genChord() with Left-Hand mode on and only Major enabled produces a 5-segment LH key', genResult.key, 'chord|C|Major||LH');
  check('genChord() shows a left-hand hint instead of an inversion label', genResult.line2, 'Left hand: root + 5th');

  const fallbackResult = await page.evaluate(() => {
    document.querySelectorAll('#chordsOptions input[type="checkbox"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('chordDom7').checked = true; // not Major/Minor -- Left-Hand mode should not apply
    document.getElementById('leftHandMode').checked = true;
    const prompt = genChord();
    return { key: prompt.key };
  });
  check('genChord() falls back to normal (non-LH) key for a non-Major/Minor type even with Left-Hand mode checked', fallbackResult.key, 'chord|C|Dominant 7||');

  const shapes = await page.evaluate(() => ({
    lhExpected:  getExpectedPCs('chord|C|Major||LH'),
    normalExpected: getExpectedPCs('chord|C|Major||'),
  }));
  check('LH-mode expectation has leftHandPcs = root + 5th (C, G)', JSON.stringify(shapes.lhExpected.leftHandPcs), JSON.stringify([0, 7]));
  check('LH-mode expectation has rightHandPcs = full chord (C, E, G)', JSON.stringify(shapes.lhExpected.rightHandPcs), JSON.stringify([0, 4, 7]));
  check('non-LH expectation has no leftHandPcs field', 'leftHandPcs' in shapes.normalExpected, false);

  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    const results = {};

    // Correct two-hand voicing: C+G below middle C (left hand), C+E+G at/above middle C (right hand).
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([48, 55, 60, 64, 67]); // C3, G3 (left) + C4, E4, G4 (right)
    checkMidi();
    results.correctTwoHandVoicingMatches = midiSuccessActive;

    // Right pitch classes overall, but everything played in one hand's register (all above middle C).
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- nothing below middle C
    checkMidi();
    results.rightNotesWrongRegisterDoesNotMatch = midiSuccessActive;

    // Recording: a correct LH answer should land in adaptWeights.variations under 'Left Hand'.
    adaptWeights.variations = {};
    document.getElementById('adaptiveToggle').checked = true;
    recordAdaptiveResult('chord|C|Major||LH', 1000);
    results.leftHandCount = adaptWeights.variations['Left Hand']?.count;

    return results;
  });
  check('correct two-hand voicing (right notes, right registers) matches', behavior.correctTwoHandVoicingMatches, true);
  check('right pitch classes but wrong register does NOT match', behavior.rightNotesWrongRegisterDoesNotMatch, false);
  check('a correct Left-Hand answer is tracked in adaptWeights.variations under "Left Hand"', behavior.leftHandCount, 1);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-left-hand-mode-check.cjs`
Expected: FAIL on every check — `leftHandMode` checkbox doesn't exist yet (so `document.getElementById('leftHandMode').checked = true` throws inside `page.evaluate`, causing those blocks to reject), and none of the new fields/behavior exist yet.

- [ ] **Step 3: Update `genChord`**

Current code (`script.js:1962-1986`):

```javascript
function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const typeLabel = weightedPick(types.map(t => t.label), 'types');
  const type      = types.find(t => t.label === typeLabel) || pick(types);
  const note      = weightedPick(notes, 'roots');
  const useInv = checked('inversions');
  const inv    = useInv ? pick(type.seventh ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS) : '';

  let display;
  if (checked('jazzSymbols') && JAZZ_SYMBOLS[type.id]) {
    const sym = pick(JAZZ_SYMBOLS[type.id]);
    display = `${note}${sym}`;
  } else {
    display = `${note} ${type.label}`;
  }

  return {
    line1: display,
    line2: inv,
    key:   `chord|${note}|${type.label}|${inv}`,
  };
}
```

Replace with:

```javascript
function genChord() {
  const types = CHORD_TYPES.filter(c => checked(c.id));
  const notes = enabledNotes();
  if (!types.length || !notes.length) return null;

  const typeLabel = weightedPick(types.map(t => t.label), 'types');
  const type      = types.find(t => t.label === typeLabel) || pick(types);
  const note      = weightedPick(notes, 'roots');

  const useLeftHand = checked('leftHandMode') && (type.label === 'Major' || type.label === 'Minor');
  const useInv = !useLeftHand && checked('inversions');
  const inv      = useInv ? pick(type.seventh ? SEVENTH_INVERSIONS : TRIAD_INVERSIONS) : '';
  const handMode = useLeftHand ? 'LH' : '';

  let display;
  if (checked('jazzSymbols') && JAZZ_SYMBOLS[type.id]) {
    const sym = pick(JAZZ_SYMBOLS[type.id]);
    display = `${note}${sym}`;
  } else {
    display = `${note} ${type.label}`;
  }

  return {
    line1: display,
    line2: useLeftHand ? 'Left hand: root + 5th' : inv,
    key:   `chord|${note}|${type.label}|${inv}|${handMode}`,
  };
}
```

Note: when `leftHandMode` is checked but the picked type isn't Major/Minor, `useLeftHand` is `false`, so `useInv` falls back to `checked('inversions')` exactly as it did before this change — matching the plan's fallback requirement.

- [ ] **Step 4: Update `getExpectedPCs`'s chord branch**

Current code (`script.js:3198-3204`):

```javascript
  if (type === 'chord') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    const pcs = intervals.map(i => (rootPC + i) % 12);
    return { type: 'chord', pcs, requiredBassPc: getRequiredBassPc(parts[2], parts[3], pcs) };
  }
```

Replace with:

```javascript
  if (type === 'chord') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    const pcs = intervals.map(i => (rootPC + i) % 12);
    const result = { type: 'chord', pcs, requiredBassPc: getRequiredBassPc(parts[2], parts[3], pcs) };
    if (parts[4] === 'LH') {
      result.leftHandPcs  = [pcs[0], pcs[2]];
      result.rightHandPcs = pcs;
    }
    return result;
  }
```

- [ ] **Step 5: Update `checkMidi`'s chord branch**

Current code (`script.js:3305-3312`):

```javascript
  } else if (expected.type === 'chord') {
    const pcsMatch = expected.pcs.every(pc => heldPCs.has(pc));
    let bassMatch = true;
    if (expected.requiredBassPc != null) {
      const sortedHeld = [...heldNotes].sort((a, b) => a - b);
      bassMatch = sortedHeld.length > 0 && sortedHeld[0] % 12 === expected.requiredBassPc;
    }
    matched = pcsMatch && bassMatch;
```

Replace with:

```javascript
  } else if (expected.type === 'chord') {
    const pcsMatch = expected.pcs.every(pc => heldPCs.has(pc));
    let bassMatch = true;
    if (expected.requiredBassPc != null) {
      const sortedHeld = [...heldNotes].sort((a, b) => a - b);
      bassMatch = sortedHeld.length > 0 && sortedHeld[0] % 12 === expected.requiredBassPc;
    }
    let handMatch = true;
    if (expected.leftHandPcs) {
      const leftHeld  = [...heldNotes].filter(n => n < 60).map(n => n % 12);
      const rightHeld = [...heldNotes].filter(n => n >= 60).map(n => n % 12);
      handMatch = expected.leftHandPcs.every(pc => leftHeld.includes(pc))
        && expected.rightHandPcs.every(pc => rightHeld.includes(pc));
    }
    matched = pcsMatch && bassMatch && handMatch;
```

- [ ] **Step 6: Update `recordAdaptiveResult`'s chord branch**

Current code (`script.js:941-946`):

```javascript
  else if (type === 'chord')    {
    updateAdaptWeight('roots', parts[1], ms);
    updateAdaptWeight('types', parts[2], ms);
    updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms);
    if (parts[3]) updateAdaptWeight('variations', parts[3], ms);
  }
```

Replace with:

```javascript
  else if (type === 'chord')    {
    updateAdaptWeight('roots', parts[1], ms);
    updateAdaptWeight('types', parts[2], ms);
    updateAdaptWeight('combos', parts[1] + '|' + parts[2], ms);
    if (parts[3]) updateAdaptWeight('variations', parts[3], ms);
    if (parts[4] === 'LH') updateAdaptWeight('variations', 'Left Hand', ms);
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-left-hand-mode-check.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Commit**

```bash
git add script.js test-left-hand-mode-check.cjs
git commit -m "Add Left-Hand mode data model and register-based correctness check"
```

---

### Task 2: UI checkbox and settings persistence

**Files:**
- Modify: `index.html` (Chords category options, near the existing `inversions`/`jazzSymbols` checkboxes)
- Modify: `script.js:2510-2518` (`saveSettings`'s ids list)
- Modify: `script.js:2575-2585` (`syncUI`)
- Modify: `style.css` (new scoped rule for the disabled inversions row)
- Test: `test-left-hand-mode-ui.cjs`

**Interfaces:**
- Consumes: `genChord()`'s reliance on `checked('leftHandMode')` (Task 1, already wired — this task only needs the checkbox to exist in the DOM for that call to do anything meaningful), `checked(id)` (unchanged).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-left-hand-mode-ui.cjs`:

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

  const exists = await page.evaluate(() => document.getElementById('leftHandMode') !== null);
  check('leftHandMode checkbox exists', exists, true);

  const disableBehavior = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    syncUI();
    const disabledWhileOn = {
      inversionsInputDisabled: document.getElementById('inversions').disabled,
      rowHasDisabledClass: document.getElementById('inversionsRow').classList.contains('disabled'),
    };
    document.getElementById('leftHandMode').checked = false;
    syncUI();
    const enabledWhileOff = {
      inversionsInputDisabled: document.getElementById('inversions').disabled,
      rowHasDisabledClass: document.getElementById('inversionsRow').classList.contains('disabled'),
    };
    return { disabledWhileOn, enabledWhileOff };
  });
  check('inversions input is disabled while Left-Hand mode is on', disableBehavior.disabledWhileOn.inversionsInputDisabled, true);
  check('inversions row has the disabled class while Left-Hand mode is on', disableBehavior.disabledWhileOn.rowHasDisabledClass, true);
  check('inversions input is re-enabled once Left-Hand mode is off', disableBehavior.enabledWhileOff.inversionsInputDisabled, false);
  check('inversions row loses the disabled class once Left-Hand mode is off', disableBehavior.enabledWhileOff.rowHasDisabledClass, false);

  const persistence = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    saveSettings();
    document.getElementById('leftHandMode').checked = false;
    loadSettings();
    return document.getElementById('leftHandMode').checked;
  });
  check('leftHandMode checkbox state persists through save/load', persistence, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-left-hand-mode-ui.cjs`
Expected: FAIL on `exists` (the checkbox doesn't exist in `index.html` yet), and the remaining checks fail or throw since they depend on the element existing.

- [ ] **Step 3: Add the checkbox to `index.html`**

Current code (in the Chords category options, next to the existing `inversions`/`jazzSymbols` checkboxes):

```html
                <label class="inversion-toggle"><input type="checkbox" id="jazzSymbols"> Jazz lead sheet symbols</label>
                <label class="inversion-toggle"><input type="checkbox" id="inversions"> Enable Inversions</label>
```

Replace with:

```html
                <label class="inversion-toggle"><input type="checkbox" id="jazzSymbols"> Jazz lead sheet symbols</label>
                <label class="inversion-toggle" id="inversionsRow" title="Combines with Left-Hand mode in a future update"><input type="checkbox" id="inversions"> Enable Inversions</label>
                <label class="inversion-toggle"><input type="checkbox" id="leftHandMode"> Left-Hand mode (Major/Minor, root position)</label>
```

- [ ] **Step 4: Add `leftHandMode` to `saveSettings`'s ids list**

Current code (`script.js:2510-2518`):

```javascript
  const ids = [
    'catNotes',
    'catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7',
    'chordSus2', 'chordSus4', 'chord7sus4',
    'chordDom9', 'chordMaj9', 'chordMin9', 'chordDom13',
    'chord7b9', 'chord7s9', 'chord7s11', 'chordHalfDim', 'chordDim7',
    'inversions', 'jazzSymbols',
```

Replace with:

```javascript
  const ids = [
    'catNotes',
    'catChords', 'catScales', 'catFunctional', 'catIntervals', 'catDiatonic',
    'chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented',
    'chordMaj7', 'chordMin7', 'chordDom7',
    'chordSus2', 'chordSus4', 'chord7sus4',
    'chordDom9', 'chordMaj9', 'chordMin9', 'chordDom13',
    'chord7b9', 'chord7s9', 'chord7s11', 'chordHalfDim', 'chordDim7',
    'inversions', 'jazzSymbols', 'leftHandMode',
```

Note: `loadSettings()` already restores every id present in the saved `checks` object generically (`Object.entries(s.checks).forEach(([id, val]) => { ... })`) — no separate change is needed there.

- [ ] **Step 5: Update `syncUI` to disable the inversions row**

Current code (`script.js:2575-2585`):

```javascript
function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('intervalsOptions').classList.toggle('disabled', !checked('catIntervals'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));

  const mode = getTimerMode();
  customTimer.disabled = mode !== 'custom';
  customTimerRow.classList.toggle('hidden', mode !== 'custom');
  metroPanel.classList.toggle('hidden', mode !== 'metronome');
}
```

Replace with:

```javascript
function syncUI() {
  document.getElementById('chordsOptions').classList.toggle('disabled', !checked('catChords'));
  document.getElementById('scalesOptions').classList.toggle('disabled', !checked('catScales'));
  document.getElementById('intervalsOptions').classList.toggle('disabled', !checked('catIntervals'));
  document.getElementById('diatonicOptions').classList.toggle('disabled', !checked('catDiatonic'));

  const leftHandOn = checked('leftHandMode');
  document.getElementById('inversions').disabled = leftHandOn;
  document.getElementById('inversionsRow').classList.toggle('disabled', leftHandOn);

  const mode = getTimerMode();
  customTimer.disabled = mode !== 'custom';
  customTimerRow.classList.toggle('hidden', mode !== 'custom');
  metroPanel.classList.toggle('hidden', mode !== 'metronome');
}
```

- [ ] **Step 6: Add the CSS rule for the disabled row**

In `style.css`, add this rule near the existing `.category-options.disabled` rule (`style.css:726-729`):

```css
.inversion-toggle.disabled {
  opacity: 0.3;
  pointer-events: none;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-left-hand-mode-ui.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 8: Run the full regression sweep**

```bash
node test-left-hand-mode-check.cjs
node test-left-hand-mode-ui.cjs
node test-inversion-stats-tracking.cjs
node test-inversion-stats-display.cjs
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
```

Expected: `RESULT: PASS` on all eight. The `test-inversion-*`, `test-chord-inversion-*`, and `test-band-*` tests are included because they all construct or parse chord prompt keys, call `recordAdaptiveResult`/`checkMidi`, or call `syncUI` as part of their existing scenarios — this confirms the new 5th key segment and the new `syncUI` logic don't break any of them (none of their existing keys include a Left-Hand segment, so `parts[4]` is simply `undefined` for them, which is falsy and behaves exactly like the empty-string case).

- [ ] **Step 9: Commit**

```bash
git add index.html script.js style.css test-left-hand-mode-ui.cjs
git commit -m "Add Left-Hand mode checkbox, settings persistence, and inversions-disable UI"
```
