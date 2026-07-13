# Left-Hand Shape Warmup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Left Hand Shape" warmup stage to the Learning Path, immediately before "Meet Left Hand," that isolates the root+5th shape as its own practiceable chord type — no two-handed coordination required yet.

**Architecture:** A new, ordinary `CHORD_TYPES` entry (`Root + 5th`, intervals `[0, 7]`) reuses the existing, **unmodified** chord-checking path in `checkMidi()`/`getExpectedPCs()` — no Left-Hand-mode flag, no register enforcement, no new code in the checking logic at all. One new Learning Path stage practices only this chord type at C, untimed.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No changes to `checkMidi()`, `getExpectedPCs()`'s chord-matching logic, or any Left-Hand-mode code — this ships entirely as new chord-type data plus one new stage.
- `Root + 5th` is NOT added to `INVERTIBLE_CHORD_TYPES` (a two-note voicing has no meaningful inversion) and gets no `JAZZ_SYMBOLS` entry (falls back to the plain `"${note} Root + 5th"` display).
- The new checkbox (`chordRoot5`) is unchecked by default, matching the "Jazz Extensions" section's existing convention for non-core chord types.
- `LEARNING_PATH` grows from 124 to 125 stages; the `Left-Hand Voicing` phase count goes from 5 to 6.

---

### Task 1: Root + 5th chord type and the Left Hand Shape stage

**Files:**
- Modify: `script.js:9-30` (`CHORD_TYPES` — add the new entry)
- Modify: `script.js:155-175` (`CHORD_INTERVALS` — add the new entry)
- Modify: `script.js:234-235` (`LEARNING_PATH` — insert the new stage before `"Meet Left Hand"`)
- Modify: `script.js:357` (`LEARNING_PATH_PHASES` — bump the `Left-Hand Voicing` count)
- Modify: `index.html:319-320` (add the new checkbox to the Chords settings panel)
- Test: `test-left-hand-shape-warmup.cjs`

**Interfaces:**
- Consumes: nothing from other tasks (this is the only task in the plan).
- Produces: nothing consumed elsewhere — this is a self-contained, additive feature.

- [ ] **Step 1: Write the failing test**

Create `test-left-hand-shape-warmup.cjs`:

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

  // --- getExpectedPCs resolves the new chord type correctly, no Left-Hand fields ---
  const resolveCheck = await page.evaluate(() => getExpectedPCs('chord|C|Root + 5th||'));
  check('Root + 5th resolves to pitch classes [0, 7]', resolveCheck.pcs, [0, 7]);
  checkTrue('no requiredBassPc (not an invertible chord)', resolveCheck.requiredBassPc == null, null);
  checkTrue('no leftHandPcs/rightHandPcs (not a Left-Hand-mode prompt)', !resolveCheck.leftHandPcs && !resolveCheck.rightHandPcs, null);

  // --- not invertible ---
  const invertible = await page.evaluate(() => INVERTIBLE_CHORD_TYPES.has('Root + 5th'));
  check('Root + 5th is not in INVERTIBLE_CHORD_TYPES', invertible, false);

  // --- checkbox exists, unchecked by default ---
  const checkboxCheck = await page.evaluate(() => {
    const el = document.getElementById('chordRoot5');
    return { exists: !!el, checked: el ? el.checked : null };
  });
  checkTrue('chordRoot5 checkbox exists', checkboxCheck.exists, null);
  check('chordRoot5 checkbox is unchecked by default', checkboxCheck.checked, false);

  // --- end-to-end MIDI check: no register enforcement, unlike Left-Hand mode ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;

    // Root + 5th played entirely ABOVE middle C -- must still match, since there's no
    // hand-split/register requirement for this chord type (unlike Left-Hand mode's LH check).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([72, 79]); // C5, G5 -- both above middle C
    checkMidi();
    const aboveMiddleCMatches = midiSuccessActive;

    // Same shape, entirely BELOW middle C -- must also match (no register requirement at all).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([48, 55]); // C3, G3 -- both below middle C
    checkMidi();
    const belowMiddleCMatches = midiSuccessActive;

    // Missing the 5th -- must NOT match (still requires both pitch classes).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60]); // C4 only
    checkMidi();
    const missingFifthDoesNotMatch = midiSuccessActive;

    return { aboveMiddleCMatches, belowMiddleCMatches, missingFifthDoesNotMatch };
  });
  checkTrue('root+5th played entirely above middle C matches (no register enforcement)', midiCheck.aboveMiddleCMatches, null);
  checkTrue('root+5th played entirely below middle C also matches (no register enforcement)', midiCheck.belowMiddleCMatches, null);
  checkTrue('root alone (missing the 5th) does not match', !midiCheck.missingFifthDoesNotMatch, null);

  // --- LEARNING_PATH structure ---
  const pathCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left Hand Shape');
    const stage = LEARNING_PATH[idx];
    return {
      idx,
      nextName: LEARNING_PATH[idx + 1]?.name,
      chords: stage?.chords,
      notes: stage?.notes,
      timer: stage?.timer,
      totalStages: LEARNING_PATH.length,
    };
  });
  checkTrue('"Left Hand Shape" exists in LEARNING_PATH', pathCheck.idx !== -1, null);
  check('"Meet Left Hand" immediately follows "Left Hand Shape"', pathCheck.nextName, 'Meet Left Hand');
  check('"Left Hand Shape" practices only chordRoot5', pathCheck.chords, ['chordRoot5']);
  check('"Left Hand Shape" is C only', pathCheck.notes, ['C']);
  check('"Left Hand Shape" is untimed', pathCheck.timer, 'off');
  check('LEARNING_PATH has 125 stages total (124 + 1 new)', pathCheck.totalStages, 125);

  // --- phase count ---
  const phaseCheck = await page.evaluate(() => ({
    leftHandVoicingCount: LEARNING_PATH_PHASES.find(p => p.name === 'Left-Hand Voicing').count,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Left-Hand Voicing phase count is 6 (5 + 1 new)', phaseCheck.leftHandVoicingCount, 6);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);

  // --- applyStage() correctness ---
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left Hand Shape');
    applyStage(idx);
    return {
      chordRoot5Checked: document.getElementById('chordRoot5').checked,
      leftHandModeChecked: document.getElementById('leftHandMode').checked,
      chordMajorChecked: document.getElementById('chordMajor').checked,
    };
  });
  check('applyStage() checks chordRoot5', applyCheck.chordRoot5Checked, true);
  check('applyStage() leaves leftHandMode unchecked', applyCheck.leftHandModeChecked, false);
  check('applyStage() leaves chordMajor unchecked', applyCheck.chordMajorChecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-left-hand-shape-warmup.cjs`
Expected: FAIL — `getExpectedPCs('chord|C|Root + 5th||')` returns `null` (no such chord type exists yet), `chordRoot5` checkbox doesn't exist, `"Left Hand Shape"` isn't in `LEARNING_PATH`.

- [ ] **Step 3: Add the `Root + 5th` chord type**

Current code (`script.js:9-30`, showing the tail of the array):

```javascript
  { id: 'chordHalfDim', label: 'Minor 7♭5',    seventh: true,  formula: '1 – ♭3 – ♭5 – ♭7'              },
  { id: 'chordDim7',    label: 'Diminished 7', seventh: true,  formula: '1 – ♭3 – ♭5 – ♭♭7'             },
];
```

Replace with:

```javascript
  { id: 'chordHalfDim', label: 'Minor 7♭5',    seventh: true,  formula: '1 – ♭3 – ♭5 – ♭7'              },
  { id: 'chordDim7',    label: 'Diminished 7', seventh: true,  formula: '1 – ♭3 – ♭5 – ♭♭7'             },
  { id: 'chordRoot5',   label: 'Root + 5th',   seventh: false, formula: '1 – 5'                         },
];
```

- [ ] **Step 4: Add the `Root + 5th` interval formula**

Current code (`script.js:155-175`, showing the tail of the table):

```javascript
  '7♭9':          [0, 1, 4, 7, 10],
  '7♯9':          [0, 3, 4, 7, 10],
  '7♯11':         [0, 4, 6, 7, 10],
  'Minor 7♭5':    [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
};
```

Replace with:

```javascript
  '7♭9':          [0, 1, 4, 7, 10],
  '7♯9':          [0, 3, 4, 7, 10],
  '7♯11':         [0, 4, 6, 7, 10],
  'Minor 7♭5':    [0, 3, 6, 10],
  'Diminished 7': [0, 3, 6, 9],
  'Root + 5th':   [0, 7],
};
```

- [ ] **Step 5: Add the checkbox**

Current code (`index.html:319-320`):

```html
                <label><input type="checkbox" id="chordDim7"> Diminished 7</label>
                <div class="option-divider">Display</div>
```

Replace with:

```html
                <label><input type="checkbox" id="chordDim7"> Diminished 7</label>
                <label><input type="checkbox" id="chordRoot5"> Root + 5th</label>
                <div class="option-divider">Display</div>
```

- [ ] **Step 6: Insert the "Left Hand Shape" stage**

Current code (`script.js:234-235`):

```javascript
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Left Hand',      hint: 'Left hand plays root + 5th below middle C, right hand plays the full chord — two hands, one chord',        cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','leftHandMode'],                                                   scales: [],                             timer: 'off' },
```

Replace with:

```javascript
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Left Hand Shape',     hint: 'Just the left-hand shape by itself — root and 5th, no right hand yet',                                     cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordRoot5'],                                                                  scales: [],                             timer: 'off' },
  { name: 'Meet Left Hand',      hint: 'Left hand plays root + 5th below middle C, right hand plays the full chord — two hands, one chord',        cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','leftHandMode'],                                                   scales: [],                             timer: 'off' },
```

- [ ] **Step 7: Bump the `Left-Hand Voicing` phase count**

Current code (`script.js:357`):

```javascript
  { name: 'Left-Hand Voicing', count: 5 },
```

Replace with:

```javascript
  { name: 'Left-Hand Voicing', count: 6 },
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-left-hand-shape-warmup.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 9: Update the two pre-existing tests with hardcoded stage-count assertions**

In `test-left-hand-learning-path.cjs`, change:
```javascript
  check('LEARNING_PATH has 124 stages total (120 + 4 new jazz-extended progression stages)', phaseCheck.totalStages, 124);
```
to:
```javascript
  check('LEARNING_PATH has 125 stages total (124 + 1 new Left Hand Shape stage)', phaseCheck.totalStages, 125);
```

In `test-all-paths-popup-redesign.cjs`, change:
```javascript
  check('LEARNING_PATH.length matches the expected 124 stages', phaseData.stageCount, 124);
```
to:
```javascript
  check('LEARNING_PATH.length matches the expected 125 stages', phaseData.stageCount, 125);
```

And change:
```javascript
  check('all 124 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 124);
```
to:
```javascript
  check('all 125 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 125);
```

- [ ] **Step 10: Run the full regression sweep**

```bash
node test-left-hand-shape-warmup.cjs
node test-left-hand-mode-check.cjs
node test-left-hand-learning-path.cjs
node test-learning-stage-persistence.cjs
node test-all-paths-popup-redesign.cjs
node test-adaptive-weights-category-collision.cjs
node test-playing-tab-category-collision.cjs
```

Expected: `RESULT: PASS` on all seven. If any fails, stop and investigate — do not assume it's unrelated without checking.

- [ ] **Step 11: Commit**

```bash
git add script.js index.html test-left-hand-shape-warmup.cjs test-left-hand-learning-path.cjs test-all-paths-popup-redesign.cjs
git commit -m "Add Left Hand Shape warmup stage before Meet Left Hand"
```
