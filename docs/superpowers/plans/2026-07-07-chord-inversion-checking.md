# Chord Inversion Checking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `checkMidi()` actually verify the bass note matches the displayed inversion (today it silently accepts any voicing), and show a live visual marker on the keyboard pointing at which held note needs to become the bass note when it doesn't.

**Architecture:** `getExpectedPCs()` gains a `requiredBassPc` field on chord expectations, computed only for 12 chord types where inversion has an unambiguous meaning. `checkMidi()` and `updateKeyboard()` both consume this field — the former to gate matching, the latter to render a new `bass-target` CSS class on the correct key.

**Tech Stack:** Vanilla JS, Playwright `.cjs` scripts (no test framework), plain CSS.

## Global Constraints

- No build step, no framework, no dependencies — plain edits to `script.js`/`style.css`.
- Bass-note checking applies ONLY to these 12 chord type labels: `Major`, `Minor`, `Diminished`, `Augmented`, `sus2`, `sus4`, `Major 7`, `Minor 7`, `Dominant 7`, `7sus4`, `Minor 7♭5`, `Diminished 7`. All other chord types (`Dominant 9`, `Major 9`, `Minor 9`, `Dominant 13`, `7♭9`, `7♯9`, `7♯11`) must keep today's exact behavior (pitch-class-only matching, no bass requirement, no marker) — their `requiredBassPc` must always resolve to `null`.
- `Root position` is a real requirement (root must be the bass note), not "no check" — only an empty inversion string (the `inversions` checkbox off) means "no check."
- No new settings/checkboxes, no changes to `LEARNING_PATH`, no changes to Diatonic Chords or Functional Harmony generators.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`.

---

### Task 1: Bass-note correctness check

**Files:**
- Modify: `script.js:33` (add a new constant after `SEVENTH_INVERSIONS`)
- Modify: `script.js:3150-3165` (`getExpectedPCs`'s `chord` branch, plus a new helper function placed just above it)
- Modify: `script.js:3256-3288` (`checkMidi`'s `chord` branch)
- Test: `test-chord-inversion-check.cjs`

**Interfaces:**
- Consumes: `TRIAD_INVERSIONS`, `SEVENTH_INVERSIONS` (`script.js:32-33`, unchanged), `CHORD_INTERVALS` (unchanged).
- Produces: `INVERTIBLE_CHORD_TYPES` (a `Set` of chord type label strings), `getRequiredBassPc(typeLabel, invLabel, pcs)` — returns a pitch class (0-11) or `null`. `getExpectedPCs()`'s chord-type return value gains a `requiredBassPc` field: `{ type: 'chord', pcs: [...], requiredBassPc: <pc>|null }`. Task 2 consumes this same field from `getExpectedPCs()`.

- [ ] **Step 1: Write the failing test**

Create `test-chord-inversion-check.cjs`:

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

  const shapes = await page.evaluate(() => ({
    firstInv:  getExpectedPCs('chord|C|Major|1st inversion').requiredBassPc,
    secondInv: getExpectedPCs('chord|C|Major|2nd inversion').requiredBassPc,
    rootPos:   getExpectedPCs('chord|C|Major|Root position').requiredBassPc,
    noInv:     getExpectedPCs('chord|C|Major|').requiredBassPc,
    dom9:      getExpectedPCs('chord|C|Dominant 9|1st inversion').requiredBassPc,
    maj7Third: getExpectedPCs('chord|C|Major 7|3rd inversion').requiredBassPc,
  }));
  check('C Major 1st inversion requires the 3rd (E, pc 4) in the bass', shapes.firstInv, 4);
  check('C Major 2nd inversion requires the 5th (G, pc 7) in the bass', shapes.secondInv, 7);
  check('C Major Root position requires the root (C, pc 0) in the bass', shapes.rootPos, 0);
  check('inversions off (empty label) -- no bass requirement', shapes.noInv, null);
  check('excluded chord type (Dominant 9) -- no bass requirement', shapes.dom9, null);
  check('C Major 7 3rd inversion requires the 7th (B, pc 11) in the bass', shapes.maj7Third, 11);

  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    const results = {};

    // Correct 1st-inversion voicing (E lowest) should match.
    currentPromptKey = 'chord|C|Major|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([64, 67, 72]); // E4, G4, C5 -- E is lowest
    checkMidi();
    results.correctInversionMatches = midiSuccessActive;

    // Right notes, wrong inversion (root C lowest) should NOT match.
    currentPromptKey = 'chord|C|Major|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- root position
    checkMidi();
    results.wrongInversionRejected = midiSuccessActive;

    // Excluded chord type (Dominant 9) -- any voicing with the right pcs still matches.
    currentPromptKey = 'chord|C|Dominant 9|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67, 70, 62]); // C E G Bb D -- root position voicing
    checkMidi();
    results.excludedTypeStillLenient = midiSuccessActive;

    return results;
  });
  check('correct inversion voicing matches', behavior.correctInversionMatches, true);
  check('right notes but wrong inversion does not match', behavior.wrongInversionRejected, false);
  check('excluded chord type (Dominant 9) stays lenient regardless of bass note', behavior.excludedTypeStillLenient, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-chord-inversion-check.cjs`
Expected: FAIL on every `requiredBassPc` check (the field doesn't exist yet, so all four are `undefined`, not the expected numbers/`null`) and FAIL on `wrongInversionRejected` (currently matches when it shouldn't).

- [ ] **Step 3: Add `INVERTIBLE_CHORD_TYPES`**

In `script.js`, right after `SEVENTH_INVERSIONS` (`script.js:33`):

```javascript
const TRIAD_INVERSIONS   = ['Root position', '1st inversion', '2nd inversion'];
const SEVENTH_INVERSIONS = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];
const INVERTIBLE_CHORD_TYPES = new Set([
  'Major', 'Minor', 'Diminished', 'Augmented', 'sus2', 'sus4',
  'Major 7', 'Minor 7', 'Dominant 7', '7sus4', 'Minor 7♭5', 'Diminished 7',
]);
```

- [ ] **Step 4: Add `getRequiredBassPc` and use it in `getExpectedPCs`**

Current code (`script.js:3160-3165`):

```javascript
  if (type === 'chord') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'chord', pcs: intervals.map(i => (rootPC + i) % 12) };
  }
```

Replace with (add the helper function just above `getExpectedPCs`, then update the `chord` branch):

```javascript
// TRIAD_INVERSIONS is a strict prefix of SEVENTH_INVERSIONS (same first 3 labels),
// so looking the label up in SEVENTH_INVERSIONS always gives the right index for
// both triads and seventh chords -- no need to separately branch on chord size.
function getRequiredBassPc(typeLabel, invLabel, pcs) {
  if (!invLabel || !INVERTIBLE_CHORD_TYPES.has(typeLabel)) return null;
  const idx = SEVENTH_INVERSIONS.indexOf(invLabel);
  return idx === -1 ? null : (pcs[idx] ?? null);
}

function getExpectedPCs(key) {
  if (!key) return null;
  const parts = key.split('|');
  const type  = parts[0];

  if (type === 'note') {
    const pc = (NOTE_TO_PC[parts[1]] ?? -1);
    return pc === -1 ? null : { type: 'note', pc };
  }

  if (type === 'chord') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = CHORD_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    const pcs = intervals.map(i => (rootPC + i) % 12);
    return { type: 'chord', pcs, requiredBassPc: getRequiredBassPc(parts[2], parts[3], pcs) };
  }
```

(Only the `note` and `chord` branches are shown above for context — the rest of `getExpectedPCs` below the `chord` branch, i.e. `scale`/`interval`/`diatonic`/`func`, is unchanged.)

- [ ] **Step 5: Add the bass check to `checkMidi`**

Current code (`script.js:3266-3267`):

```javascript
  } else if (expected.type === 'chord') {
    matched = expected.pcs.every(pc => heldPCs.has(pc));
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
    matched = pcsMatch && bassMatch;
```

(This is inside the existing `if (expected.type === 'note') { ... } else if (expected.type === 'chord') { ... } else if ...` chain in `checkMidi` — only this one branch changes.)

- [ ] **Step 6: Run test to verify it passes**

Run: `node test-chord-inversion-check.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 7: Commit**

```bash
git add script.js test-chord-inversion-check.cjs
git commit -m "Check the bass note matches the displayed chord inversion"
```

---

### Task 2: Visual bass-note marker + regression sweep

**Files:**
- Modify: `script.js:3402-3410` (`updateKeyboard`)
- Modify: `style.css` (add a new `.piano-key.bass-target` rule near the existing `.piano-key`/`.white-key.active`/`.black-key.active` rules around `style.css:1424-1493`)
- Test: `test-chord-inversion-marker.cjs`

**Interfaces:**
- Consumes: `getExpectedPCs()`'s `requiredBassPc` field (Task 1), `keyElements` (`script.js:522`, a `Map<midiNoteNumber, HTMLElement>`, unchanged), `heldNotes`/`demoNotes` (unchanged), `isNoteWrong` (unchanged).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-chord-inversion-marker.cjs`:

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

  const wrongVoicing = await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|1st inversion';
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- root position, wrong for "1st inversion"
    updateKeyboard();
    return {
      eIsMarked: keyElements.get(64).classList.contains('bass-target'), // E should be marked
      cIsMarked: keyElements.get(60).classList.contains('bass-target'), // C (current lowest) should not be
      eIsActive: keyElements.get(64).classList.contains('active'),      // still shown as a correct note too
    };
  });
  check('wrong inversion: the correct bass key (E) is marked bass-target', wrongVoicing.eIsMarked, true);
  check('wrong inversion: the currently-lowest key (C) is not marked', wrongVoicing.cIsMarked, false);
  check('marked key is still shown active (correct pitch class) alongside the marker', wrongVoicing.eIsActive, true);

  const correctVoicing = await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|1st inversion';
    heldNotes = new Set([64, 67, 72]); // E4, G4, C5 -- correct 1st inversion, E is lowest
    updateKeyboard();
    return {
      eIsMarked: keyElements.get(64).classList.contains('bass-target'),
    };
  });
  check('correct inversion: no bass-target marker once the bass note is right', correctVoicing.eIsMarked, false);

  const noInversionRequested = await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|'; // inversions checkbox off -- no bass requirement at all
    heldNotes = new Set([60, 64, 67]);   // root position
    updateKeyboard();
    return {
      anyMarked: [...keyElements.values()].some(el => el.classList.contains('bass-target')),
    };
  });
  check('inversions off: no bass-target marker ever appears', noInversionRequested.anyMarked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-chord-inversion-marker.cjs`
Expected: FAIL on the `eIsMarked`/`bass-target` checks (the class doesn't exist yet, so `classList.contains('bass-target')` is always `false`, but the first check expects `true`).

- [ ] **Step 3: Update `updateKeyboard`**

Current code (`script.js:3402-3410`):

```javascript
function updateKeyboard() {
  const expected = getExpectedPCs(currentPromptKey);
  for (const [n, el] of keyElements) {
    const isHeld  = heldNotes.has(n) || demoNotes.has(n);
    const isWrong = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
  }
}
```

Replace with:

```javascript
function updateKeyboard() {
  const expected   = getExpectedPCs(currentPromptKey);
  const heldPCs    = new Set([...heldNotes].map(n => n % 12));
  const sortedHeld = [...heldNotes].sort((a, b) => a - b);
  const pcsSatisfied = expected?.type === 'chord' && expected.pcs.every(pc => heldPCs.has(pc));
  const wrongBass = expected?.type === 'chord' && expected.requiredBassPc != null
    && pcsSatisfied && sortedHeld.length > 0 && sortedHeld[0] % 12 !== expected.requiredBassPc;

  for (const [n, el] of keyElements) {
    const isHeld       = heldNotes.has(n) || demoNotes.has(n);
    const isWrong      = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    const isBassTarget = wrongBass && heldNotes.has(n) && n % 12 === expected.requiredBassPc;
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
    el.classList.toggle('bass-target', isBassTarget);
  }
}
```

- [ ] **Step 4: Add the `.bass-target` CSS rule**

In `style.css`, right after the `.black-key.active` rule (`style.css:1485-1492`, right before `.white-key.wrong`):

```css
.piano-key.bass-target::after {
  content: '';
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 7px solid #ffb020;
  filter: drop-shadow(0 0 4px rgba(255, 176, 32, 0.8));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-chord-inversion-marker.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 6: Run the full regression sweep**

```bash
node test-chord-inversion-check.cjs
node test-chord-inversion-marker.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-scheduler-core.cjs
node test-band-scheduler-catchup.cjs
node test-band-e2e.cjs
```

Expected: `RESULT: PASS` on all seven. The `test-band-*` tests are included because they all call `checkMidi()`/`getExpectedPCs()` as part of simulating correct answers — this confirms the new bass-note check doesn't break any of them (none of these tests enable the `inversions` checkbox, so `requiredBassPc` is `null` for all of them and the new condition is a no-op).

- [ ] **Step 7: Commit**

```bash
git add script.js style.css test-chord-inversion-marker.cjs
git commit -m "Add live visual marker for the correct bass note on wrong-inversion voicings"
```
