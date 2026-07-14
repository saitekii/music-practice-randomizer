# Two-Handed Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine the existing Left-Hand mode with the just-shipped Progressions-with-Inversions phase — the right hand plays a progression's required inversion, the left hand plays the actual required bass note plus the chord's root — and add a new Learning Path phase that teaches it.

**Architecture:** Task 1 builds the mechanism (a helper restricting which progressions qualify, a `func`-type key format extension, and the `getExpectedPCs()`/`genFunctional()` changes) and is fully testable using the 3 already-registered progression strings directly via manual checkbox manipulation — no new stages needed. Task 2 adds the 3 new stages that turn it on.

**Tech Stack:** Vanilla JS (`script.js`), static HTML (`index.html` — no changes needed, reuses the existing `leftHandMode` checkbox), Playwright `.cjs` test scripts — per `CLAUDE.md`, no build step, no framework.

## Global Constraints

- Reuse the **existing** `leftHandMode` checkbox (`index.html:324`) — no new checkbox.
- Left-hand voicing per step, from the approved spec (do not deviate):

  | Progression | Step | Required bass | Chord root | Left hand |
  |---|---|---|---|---|
  | `I–IV–V` | I (root) | C(0) | C(0) | C,G → `[0,7]` |
  | `I–IV–V` | IV (2nd inv) | C(0) | F(5) | C,F → `[0,5]` |
  | `I–IV–V` | V (1st inv) | B(11) | G(7) | B,G → `[11,7]` |
  | `IV–V–I` | IV (root) | F(5) | F(5) | F,C → `[5,0]` |
  | `IV–V–I` | V (root) | G(7) | G(7) | G,D → `[7,2]` |
  | `IV–V–I` | I (2nd inv) | G(7) | C(0) | G,C → `[7,0]` |
  | `I–V–vi–IV` | I (root) | C(0) | C(0) | C,G → `[0,7]` |
  | `I–V–vi–IV` | V (1st inv) | B(11) | G(7) | B,G → `[11,7]` |
  | `I–V–vi–IV` | vi (root) | A(9) | A(9) | A,E → `[9,4]` |
  | `I–V–vi–IV` | IV (1st inv) | A(9) | F(5) | A,F → `[9,5]` |

  (pitch classes in parens; the rule is: `[requiredBassPc, chordRootPc]`, collapsing to `[chordRootPc, chordFifthPc]` whenever the required bass equals the root.)
- Right hand always plays the full chord (all 3 pitch classes) — unchanged from today's Left-Hand mode.
- When hand mode is active, `getExpectedPCs()` must return `requiredBassPc: null` — relying only on `leftHandPcs`/`rightHandPcs` hand-membership checking. This is load-bearing: setting both would let a user who plays the left hand's two notes in the "wrong" relative order spuriously fail, since `checkMidi()`'s match is `pcsMatch && bassMatch && handMatch`.
- No changes to `checkMidi()`, `updateKeyboard()`, `getRequiredBassPc()`, `applyStage()` — all already generalize correctly (`applyStage()` already handles `leftHandMode` via the existing `ALL_CHORDS` list, and `requireProgressionInversions` via the prior round's addition).
- New stage names (`'Two-Handed First Song'`, `'Two-Handed Turnaround'`, `'Four Chords, Two Hands'`) and phase name (`'Two-Handed Progressions'`) — verified against the live 131-stage/20-phase array to have zero collisions.

---

## Task 1: Two-handed progression checking mechanism

**Files:**
- Modify: `script.js` (insert `progressionAllowsLeftHand()` near `PROGRESSION_INVERSIONS`)
- Modify: `script.js:2131-2155` (`genFunctional()`)
- Modify: `script.js:3516-3525` (`getExpectedPCs()`'s `func` branch, the `if (entry)` block)
- Test: `test-two-handed-progressions.cjs` (new)

**Interfaces:**
- Produces: `progressionAllowsLeftHand(modeKey, pattern)` — returns `true` only if every numeral in `pattern` resolves (via `FUNCTIONAL_NUMERALS[modeKey]`) to a `'Major'` or `'Minor'` quality.
- Produces: `func`-type prompt keys gain a 6th segment: `func|note|mode|pattern|stepIndex|handMode` (`handMode` is `'LH'` or `''`, always present — mirrors the existing `chord|note|type|inv|handMode` shape). `advanceProgressionStep()` requires no changes — it already only mutates the step-index segment (`parts[4]`) and passes every other segment through unchanged via `parts.slice()`.
- Produces: `getExpectedPCs()`'s `func` branch now returns `{ type: 'chord', pcs, requiredBassPc: null, leftHandPcs, rightHandPcs }` when hand mode is active (instead of `{ type: 'chord', pcs, requiredBassPc }`).
- Consumes: `getRequiredBassPc()`, `PROGRESSION_INVERSIONS`, `FUNCTIONAL_NUMERALS`, `checked(id)` — all unchanged, read-only.

### Current code (script.js:2131-2155, `genFunctional()`)

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
  const invSuffix0 = progressionInversionSuffix(pattern, 0);

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]}${invSuffix0} (chord 1 of ${steps.length})` : `Play: ${pattern}${invSuffix0}`,
    key:   `func|${note}|${mode}|${pattern}|0`,
  };
}
```

### Current code (script.js:3506-3525, inside `getExpectedPCs()`'s `func` branch)

```javascript
  if (type === 'func') {
    const fullPattern = parts[3];
    const steps       = fullPattern.split('–');
    const stepIndex   = parseInt(parts[4]) || 0;
    const numeral     = steps[stepIndex];
    if (!numeral) return null;
    const rootIdx = (NOTE_TO_PC[parts[1]] ?? -1);
    const modeKey = parts[2] === 'Major' ? 'major' : 'minor';
    if (rootIdx === -1) return null;
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      const pcs = intervals.map(i => (chordRootPC + i) % 12);
      const invLabel = PROGRESSION_INVERSIONS[fullPattern]?.[stepIndex];
      const requiredBassPc = checked('functionalRequireInversions') ? getRequiredBassPc(quality, invLabel, pcs) : null;
      return { type: 'chord', pcs, requiredBassPc };
    }
```

### Current code (script.js, `PROGRESSION_INVERSIONS`/`progressionInversionSuffix()` through `getExpectedPCs()`'s start)

```javascript
const PROGRESSION_INVERSIONS = {
  'I–IV–V':     ['Root position', '2nd inversion', '1st inversion'],
  'IV–V–I':     ['Root position', 'Root position', '2nd inversion'],
  'I–V–vi–IV':  ['Root position', '1st inversion', 'Root position', '1st inversion'],
};

// Builds the " (2nd inversion)"-style suffix for a progression step's display text.
// Returns '' when the toggle is off or the pattern/step has no registered label --
// safe to call unconditionally from both genFunctional() and advanceProgressionStep().
function progressionInversionSuffix(pattern, stepIndex) {
  if (!checked('functionalRequireInversions')) return '';
  const label = PROGRESSION_INVERSIONS[pattern]?.[stepIndex];
  return label ? ` (${label})` : '';
}

function getExpectedPCs(key) {
```

- [ ] **Step 1: Write the failing test**

Create `test-two-handed-progressions.cjs`:

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

  // --- Toggle both on: leftHandPcs/rightHandPcs match the design table exactly,
  //     at C, for every step of all 3 progressions. requiredBassPc must be null. ---
  const cChecks = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    const get = (pattern, step) => getExpectedPCs(`func|C|Major|${pattern}|${step}|LH`);
    return {
      iivv0: get('I–IV–V', 0), iivv1: get('I–IV–V', 1), iivv2: get('I–IV–V', 2),
      ivvi0: get('IV–V–I', 0), ivvi1: get('IV–V–I', 1), ivvi2: get('IV–V–I', 2),
      ivvi_iv0: get('I–V–vi–IV', 0), ivvi_iv1: get('I–V–vi–IV', 1), ivvi_iv2: get('I–V–vi–IV', 2), ivvi_iv3: get('I–V–vi–IV', 3),
    };
  });
  check('I–IV–V step 0: leftHandPcs [0,7], rightHandPcs [0,4,7]', [cChecks.iivv0.leftHandPcs, cChecks.iivv0.rightHandPcs], [[0, 7], [0, 4, 7]]);
  check('I–IV–V step 0: requiredBassPc is null', cChecks.iivv0.requiredBassPc, null);
  check('I–IV–V step 1 (IV, 2nd inv): leftHandPcs [0,5], rightHandPcs [5,9,0]', [cChecks.iivv1.leftHandPcs, cChecks.iivv1.rightHandPcs], [[0, 5], [5, 9, 0]]);
  check('I–IV–V step 2 (V, 1st inv): leftHandPcs [11,7], rightHandPcs [7,11,2]', [cChecks.iivv2.leftHandPcs, cChecks.iivv2.rightHandPcs], [[11, 7], [7, 11, 2]]);
  check('IV–V–I step 0: leftHandPcs [5,0], rightHandPcs [5,9,0]', [cChecks.ivvi0.leftHandPcs, cChecks.ivvi0.rightHandPcs], [[5, 0], [5, 9, 0]]);
  check('IV–V–I step 1: leftHandPcs [7,2], rightHandPcs [7,11,2]', [cChecks.ivvi1.leftHandPcs, cChecks.ivvi1.rightHandPcs], [[7, 2], [7, 11, 2]]);
  check('IV–V–I step 2 (I, 2nd inv): leftHandPcs [7,0], rightHandPcs [0,4,7]', [cChecks.ivvi2.leftHandPcs, cChecks.ivvi2.rightHandPcs], [[7, 0], [0, 4, 7]]);
  check('I–V–vi–IV step 0: leftHandPcs [0,7]', cChecks.ivvi_iv0.leftHandPcs, [0, 7]);
  check('I–V–vi–IV step 1 (V, 1st inv): leftHandPcs [11,7]', cChecks.ivvi_iv1.leftHandPcs, [11, 7]);
  check('I–V–vi–IV step 2 (vi, root): leftHandPcs [9,4], rightHandPcs [9,0,4]', [cChecks.ivvi_iv2.leftHandPcs, cChecks.ivvi_iv2.rightHandPcs], [[9, 4], [9, 0, 4]]);
  check('I–V–vi–IV step 3 (IV, 1st inv): leftHandPcs [9,5]', cChecks.ivvi_iv3.leftHandPcs, [9, 5]);

  // --- Transposition check: same progression at D confirms it's not hardcoded to C. ---
  const dChecks = await page.evaluate(() => ({
    step0: getExpectedPCs('func|D|Major|I–IV–V|0|LH'),
    step1: getExpectedPCs('func|D|Major|I–IV–V|1|LH'),
    step2: getExpectedPCs('func|D|Major|I–IV–V|2|LH'),
  }));
  check('I–IV–V (D) step 0: leftHandPcs [2,9]', dChecks.step0.leftHandPcs, [2, 9]);
  check('I–IV–V (D) step 1: leftHandPcs [2,7]', dChecks.step1.leftHandPcs, [2, 7]);
  check('I–IV–V (D) step 2: leftHandPcs [1,9]', dChecks.step2.leftHandPcs, [1, 9]);

  // --- handMode !== 'LH': no leftHandPcs/rightHandPcs, requiredBassPc still populated
  //     (today's existing single-hand behavior, completely unaffected). ---
  const noHandModeCheck = await page.evaluate(() => getExpectedPCs('func|C|Major|I–IV–V|1|'));
  check('non-LH key: no leftHandPcs', noHandModeCheck.leftHandPcs, undefined);
  check('non-LH key: requiredBassPc is the plain single-hand value (0, C)', noHandModeCheck.requiredBassPc, 0);

  // --- genFunctional() builds a 6-segment key with handMode='LH' when both toggles are on
  //     and the pool is restricted to one of the 3 registered progressions. ---
  const genCheck = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === 'I–IV–V');
    });
    const prompt = genFunctional();
    return prompt.key.split('|');
  });
  check('genFunctional() key has 6 segments with handMode LH', genCheck, ['func', 'C', 'Major', 'I–IV–V', '0', 'LH']);

  // --- genFunctional() with leftHandMode off: handMode segment is empty. ---
  const genOffCheck = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = false;
    const prompt = genFunctional();
    return prompt.key.split('|')[5];
  });
  check('genFunctional() key has empty handMode when leftHandMode is off', genOffCheck, '');

  // --- checkMidi() end-to-end: correct two-hand voicing advances; left-hand notes in the
  //     "wrong" relative order still advances (proves the conflict-avoidance actually
  //     works, not just the happy path); wrong notes do not advance. ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|1|LH'; // IV, 2nd inversion: LH=[C,F], RH=[F,A,C]
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;

    // Wrong: right hand has the right pitch classes but bass is missing from the left hand.
    heldNotes = new Set([65, 69, 72]); // F4 A4 C5 only -- no left-hand notes at all
    updateKeyboard();
    checkMidi();
    const afterWrong = currentPromptKey;

    // Correct, but left hand's two notes voiced in "wrong" relative order (F below C).
    heldNotes = new Set([41, 48, 65, 69, 72]); // F2 C3 (left, F lower than C) + F4 A4 C5 (right)
    updateKeyboard();
    checkMidi();
    const afterCorrectReorderedLeftHand = currentPromptKey;

    return { afterWrong, afterCorrectReorderedLeftHand };
  });
  check('missing left hand does not advance the prompt', midiCheck.afterWrong, 'func|C|Major|I–IV–V|1|LH');
  check('correct two-hand voicing (left hand notes in either relative order) advances to step 2', midiCheck.afterCorrectReorderedLeftHand, 'func|C|Major|I–IV–V|2|LH');

  // --- Regression: existing Phase 7 (single-chord Left-Hand) and Phase 9 (single-hand
  //     Progressions-with-Inversions) stages are unaffected by each other's mechanism. ---
  const regressionCheck = await page.evaluate(() => {
    const idxPhase7 = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    applyStage(idxPhase7);
    const phase7RequireInv = document.getElementById('functionalRequireInversions').checked;

    const idxPhase9 = LEARNING_PATH.findIndex(s => s.name === 'Invert Your First Song');
    applyStage(idxPhase9);
    const phase9LeftHand = document.getElementById('leftHandMode').checked;

    return { phase7RequireInv, phase9LeftHand };
  });
  check('applyStage() on a Phase 7 (single-chord LH) stage leaves functionalRequireInversions unchecked', regressionCheck.phase7RequireInv, false);
  check('applyStage() on a Phase 9 (single-hand inversions) stage leaves leftHandMode unchecked', regressionCheck.phase9LeftHand, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-two-handed-progressions.cjs
```

Expected: FAIL — `getExpectedPCs()` calls with a 6-segment key don't return `leftHandPcs`/`rightHandPcs` yet (the `func` branch doesn't read `parts[5]`), and `genFunctional()`'s key only has 5 segments.

- [ ] **Step 3: Add `progressionAllowsLeftHand()` to `script.js`**

Insert immediately after `progressionInversionSuffix()`'s closing brace (still before `function getExpectedPCs(key) {`):

```javascript
// Confirms every numeral in a progression resolves to a plain Major or Minor triad --
// mirrors genChord()'s existing Left-Hand-mode restriction (type.label === 'Major' ||
// type.label === 'Minor'). Guards against a future progression built from a quality this
// two-hand voicing scheme was never designed for (e.g. a borrowed or diminished numeral)
// silently combining with hand mode.
function progressionAllowsLeftHand(modeKey, pattern) {
  return pattern.split('–').every(numeral => {
    const entry = FUNCTIONAL_NUMERALS[modeKey]?.[numeral];
    return entry && (entry[1] === 'Major' || entry[1] === 'Minor');
  });
}
```

- [ ] **Step 4: Update `getExpectedPCs()`'s `func` branch (script.js:3516-3525)**

Change:

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      const pcs = intervals.map(i => (chordRootPC + i) % 12);
      const invLabel = PROGRESSION_INVERSIONS[fullPattern]?.[stepIndex];
      const requiredBassPc = checked('functionalRequireInversions') ? getRequiredBassPc(quality, invLabel, pcs) : null;
      return { type: 'chord', pcs, requiredBassPc };
    }
```

to:

```javascript
    const entry = FUNCTIONAL_NUMERALS[modeKey][numeral];
    if (entry) {
      const [offset, quality] = entry;
      const chordRootPC = (rootIdx + offset) % 12;
      const intervals   = CHORD_INTERVALS[quality];
      if (!intervals) return null;
      const pcs = intervals.map(i => (chordRootPC + i) % 12);
      const invLabel = PROGRESSION_INVERSIONS[fullPattern]?.[stepIndex];
      const handMode = parts[5];
      if (handMode === 'LH' && (quality === 'Major' || quality === 'Minor')) {
        const bassPc = checked('functionalRequireInversions') ? getRequiredBassPc(quality, invLabel, pcs) : null;
        const leftHandPcs = (bassPc != null && bassPc !== pcs[0]) ? [bassPc, pcs[0]] : [pcs[0], pcs[2]];
        return { type: 'chord', pcs, requiredBassPc: null, leftHandPcs, rightHandPcs: pcs };
      }
      const requiredBassPc = checked('functionalRequireInversions') ? getRequiredBassPc(quality, invLabel, pcs) : null;
      return { type: 'chord', pcs, requiredBassPc };
    }
```

- [ ] **Step 5: Update `genFunctional()` (script.js:2131-2155)**

Replace the block shown above with:

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
  const invSuffix0 = progressionInversionSuffix(pattern, 0);
  const modeKey = mode === 'Major' ? 'major' : 'minor';
  const handMode = checked('leftHandMode') && progressionAllowsLeftHand(modeKey, pattern) ? 'LH' : '';

  return {
    line1: `Key: ${note} ${mode}`,
    line2: steps.length > 1 ? `Play: ${steps[0]}${invSuffix0} (chord 1 of ${steps.length})` : `Play: ${pattern}${invSuffix0}`,
    key:   `func|${note}|${mode}|${pattern}|0|${handMode}`,
  };
}
```

- [ ] **Step 6: Run the test, verify it passes**

```bash
node test-two-handed-progressions.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 7: Run the broader Functional Harmony and Left-Hand regression sweep**

```bash
node test-progressions-with-inversions.cjs
node test-progressions-inverted-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-chord-progressions.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all print `RESULT: PASS` (none of these generate a 6-segment key today, so `parts[5]` reads as `undefined` for them, never equal to `'LH'` — the new branch never triggers for existing content).

- [ ] **Step 8: Commit**

```bash
git add script.js test-two-handed-progressions.cjs
git commit -m "Add two-handed progression checking mechanism

Combines the existing Left-Hand mode with Progressions-with-Inversions:
the left hand now plays the actual required bass note (plus the chord's
root) instead of a fixed root, so a two-handed progression genuinely
enforces its right-hand inversion instead of the combined-hands bass
check just always seeing the left hand's fixed root. Reuses the
existing leftHandMode checkbox and getRequiredBassPc() unchanged;
checkMidi()/updateKeyboard() need zero changes since they already read
leftHandPcs/rightHandPcs generically. requiredBassPc is explicitly set
to null in hand mode to avoid a real conflict with checkMidi()'s
combined pcsMatch && bassMatch && handMatch logic (a user voicing the
left hand's two notes in either relative order must still pass)."
```

---

## Task 2: "Two-Handed Progressions" Learning Path phase

**Files:**
- Modify: `script.js:259-260` (insert 3 new stages between `'Four Chords, Inverted'` and the Phase 7 boundary comment)
- Modify: `script.js:371` (insert new `LEARNING_PATH_PHASES` entry between `'Progressions, Inverted'` and `'Major scales'`)
- Modify: `test-all-paths-popup-redesign.cjs:35,37,71` (20→21, 131→134, 131→134)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53` (131→134)
- Modify: `test-audit-fixes-scales-phase.cjs:54` (131→134)
- Modify: `test-first-progressions.cjs:47` (131→134)
- Modify: `test-jazz-progressions-learning-path.cjs:77,79` (20→21, 131→134)
- Modify: `test-left-hand-learning-path.cjs:114,116` (20→21, 131→134)
- Modify: `test-left-hand-shape-warmup.cjs:93` (131→134)
- Modify: `test-progressions-inverted-learning-path.cjs:41,42` (131→134, both lines)
- Modify: `test-secondary-dominant-learning-path.cjs:49,51` (20→21, 131→134)
- Test: `test-two-handed-progressions-learning-path.cjs` (new)

**Interfaces:**
- Consumes: `leftHandMode` (existing checkbox, script.js — already generically handled by `applyStage()`'s `ALL_CHORDS` list), `requireProgressionInversions` stage field (Task 1's prior-round predecessor, already generically handled by `applyStage()`).
- Consumes: `PROGRESSION_INVERSIONS`, `progressionAllowsLeftHand()` (Task 1) — must already have entries/pass for all 3 progressions these stages use (confirmed in Task 1's Global Constraints table).

### Current code (script.js:257-261)

```javascript
  { name: 'Invert the Turnaround',  hint: 'Add IV–V–I, voiced for a smooth bass line between chords',                                              cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I'],                                  requireProgressionInversions: true, timer: 'off' },
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
```

### Current code (script.js:362-383, `LEARNING_PATH_PHASES`)

```javascript
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'First Progressions', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Triad inversions', count: 8 },
  { name: 'Progressions, Inverted', count: 3 },
  { name: 'Major scales', count: 4 },
  { name: 'Combine chords + scales', count: 3 },
  { name: 'Seventh chords — root position', count: 4 },
  { name: 'Seventh chord inversions', count: 5 },
  { name: 'Full Foundation', count: 1 },
  { name: 'Scales beyond natural minor', count: 15 },
  { name: 'Enharmonic spellings', count: 3 },
  { name: 'Extended chords', count: 12 },
  { name: 'Functional harmony', count: 26 },
  { name: 'Interval reading', count: 7 },
  { name: 'Diatonic chords', count: 5 },
];
```

- [ ] **Step 1: Write the failing test**

Create `test-two-handed-progressions-learning-path.cjs`:

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

  // --- The 3 new stages exist, immediately after Four Chords, Inverted and before First Scale ---
  const orderCheck = await page.evaluate(() => {
    const idxFourInv    = LEARNING_PATH.findIndex(s => s.name === 'Four Chords, Inverted');
    const idxFirstScale = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const between = LEARNING_PATH.slice(idxFourInv + 1, idxFirstScale);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 3 new stages between Four Chords, Inverted and First Scale', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']);

  // --- Total stage count and the new phase's count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    newPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Two-Handed Progressions'),
  }));
  check('LEARNING_PATH has 134 stages total (131 + 3 new)', phaseData.totalStages, 134);
  check('LEARNING_PATH_PHASES sums to 134', phaseData.phaseSum, 134);
  check('Two-Handed Progressions phase has count 3', phaseData.newPhase?.count, 3);

  // --- applyStage() on each new stage: cumulative progressions, leftHandMode on,
  //     requireProgressionInversions on, C-only, untimed. ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedProgressions] of [
      ['Two-Handed First Song', ['I–IV–V']],
      ['Two-Handed Turnaround', ['I–IV–V', 'IV–V–I']],
      ['Four Chords, Two Hands', ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        leftHandChecked: document.getElementById('leftHandMode').checked,
        requireInvChecked: document.getElementById('functionalRequireInversions').checked,
        cChecked: document.querySelector('input[data-note="C"]').checked,
        dChecked: document.querySelector('input[data-note="D"]').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        progressionsChecked: expectedProgressions.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']) {
    checkTrue(`applyStage() on ${name} checks leftHandMode`, applyChecks[name].leftHandChecked, null);
    checkTrue(`applyStage() on ${name} checks functionalRequireInversions`, applyChecks[name].requireInvChecked, null);
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves D unchecked (C-only)`, !applyChecks[name].dChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected progressions`, applyChecks[name].progressionsChecked, null);
  }

  // --- End-to-end sanity: Two-Handed First Song actually produces a 6-segment
  //     LH-mode key with the correct left-hand voicing for step 1 (IV, 2nd inversion). ---
  const e2eCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Two-Handed First Song');
    applyStage(idx);
    return getExpectedPCs('func|C|Major|I–IV–V|1|LH').leftHandPcs;
  });
  check('Two-Handed First Song: step 1 (IV) left hand is [C,F] via the registered voicing', e2eCheck, [0, 5]);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-two-handed-progressions-learning-path.cjs
```

Expected: FAIL — no stages named `'Two-Handed First Song'` etc. exist yet, `LEARNING_PATH.length` is 131 not 134.

- [ ] **Step 3: Insert the 3 new stages (script.js:259-260)**

Change:

```javascript
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

to:

```javascript
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 6c: Two-Handed Progressions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Two-Handed First Song', hint: 'Right hand plays the required inversion, left hand plays the actual bass note',                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V'],                                           requireProgressionInversions: true, timer: 'off' },
  { name: 'Two-Handed Turnaround', hint: 'Add IV–V–I — same two-handed voicing across a new progression',                                          cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I'],                                  requireProgressionInversions: true, timer: 'off' },
  { name: 'Four Chords, Two Hands',hint: 'All four chords, right hand inverted, left hand carrying the real bass line',                            cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 4: Insert the new `LEARNING_PATH_PHASES` entry (script.js:362-383)**

Change:

```javascript
  { name: 'Triad inversions', count: 8 },
  { name: 'Progressions, Inverted', count: 3 },
  { name: 'Major scales', count: 4 },
```

to:

```javascript
  { name: 'Triad inversions', count: 8 },
  { name: 'Progressions, Inverted', count: 3 },
  { name: 'Two-Handed Progressions', count: 3 },
  { name: 'Major scales', count: 4 },
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
node test-two-handed-progressions-learning-path.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 6: Update the stale stage-count and phase-count assertions**

In `test-all-paths-popup-redesign.cjs`, change:

```javascript
  check('LEARNING_PATH_PHASES has 20 entries', phaseData.phaseCount, 20);
```

to:

```javascript
  check('LEARNING_PATH_PHASES has 21 entries', phaseData.phaseCount, 21);
```

and change:

```javascript
  check('LEARNING_PATH.length matches the expected 131 stages', phaseData.stageCount, 131);
```

to:

```javascript
  check('LEARNING_PATH.length matches the expected 134 stages', phaseData.stageCount, 134);
```

and change:

```javascript
  check('all 131 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 131);
```

to:

```javascript
  check('all 134 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 134);
```

In `test-audit-fixes-extended-chords-phase.cjs`, change:

```javascript
  check('LEARNING_PATH has 131 stages', data.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH has 134 stages', data.totalStages, 134);
```

In `test-audit-fixes-scales-phase.cjs`, change:

```javascript
  check('LEARNING_PATH has the expected 131 stages', data.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH has the expected 134 stages', data.totalStages, 134);
```

In `test-first-progressions.cjs`, change:

```javascript
  check('LEARNING_PATH has 131 stages total (125 + 3 First Progressions + 3 Progressions Inverted)', pathCheck.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH has 134 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', pathCheck.totalStages, 134);
```

In `test-jazz-progressions-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH_PHASES has 20 entries', phaseCheck.phaseCount, 20);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 131 stages total', phaseCheck.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH_PHASES has 21 entries', phaseCheck.phaseCount, 21);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 134 stages total', phaseCheck.totalStages, 134);
```

In `test-left-hand-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH_PHASES has 20 entries total', phaseCheck.phaseNames.length, 20);
```

to:

```javascript
  check('LEARNING_PATH_PHASES has 21 entries total', phaseCheck.phaseNames.length, 21);
```

and change:

```javascript
  check('LEARNING_PATH has 131 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted)', phaseCheck.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH has 134 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', phaseCheck.totalStages, 134);
```

In `test-left-hand-shape-warmup.cjs`, change:

```javascript
  check('LEARNING_PATH has 131 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted)', pathCheck.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH has 134 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', pathCheck.totalStages, 134);
```

In `test-progressions-inverted-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 131 stages total (128 + 3 new)', phaseData.totalStages, 131);
  check('LEARNING_PATH_PHASES sums to 131', phaseData.phaseSum, 131);
```

to:

```javascript
  check('LEARNING_PATH has 134 stages total (128 + 3 new + 3 Two-Handed Progressions)', phaseData.totalStages, 134);
  check('LEARNING_PATH_PHASES sums to 134', phaseData.phaseSum, 134);
```

In `test-secondary-dominant-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH_PHASES has 20 entries', phaseCheck.phaseCount, 20);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 131 stages total', phaseCheck.totalStages, 131);
```

to:

```javascript
  check('LEARNING_PATH_PHASES has 21 entries', phaseCheck.phaseCount, 21);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 134 stages total', phaseCheck.totalStages, 134);
```

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-two-handed-progressions-learning-path.cjs
node test-two-handed-progressions.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-progression-learning-path.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all print `RESULT: PASS`.

- [ ] **Step 8: Commit**

```bash
git add script.js test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-shape-warmup.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs
git commit -m "Add Two-Handed Progressions Learning Path phase

3 new cumulative stages right after Progressions, Inverted, reusing the
same 3 progressions a third time -- root position (First Progressions),
single-hand inversions (Progressions, Inverted), now two-handed
inversions here, with the left hand carrying the real voice-led bass
line instead of a fixed root. LEARNING_PATH: 131 -> 134 stages,
20 -> 21 phases."
```

---

## Final Verification

```bash
node test-two-handed-progressions.cjs
node test-two-handed-progressions-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-progression-learning-path.cjs
node test-borrowed-checkbox-gating.cjs
node test-progression-filtering.cjs
node test-progression-curriculum-fix.cjs
node test-chord-progressions.cjs
node test-functional-harmony-bug-fix.cjs
node test-random-numerals-drill.cjs
node test-scales-recurrence-fix.cjs
node test-progressions-with-inversions.cjs
```

Expected: all `RESULT: PASS`, zero failures.

After this ships, update `docs/learning-path-design.md` (add the new Phase 10 entry — renumbering everything from old-Phase-10 "Major scales" onward by +1 again, same as the previous round — with its stage table and reasoning) and the `learning-path-audit.md`/`progressions-with-inversions.md` memory entries — controller follow-up, not part of this plan's tasks, matching how documentation updates were handled after every prior round.
