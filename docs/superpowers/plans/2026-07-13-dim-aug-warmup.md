# Meet Diminished / Meet Augmented Warmup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the critique's "worst spike in the doc" — `Add Dim & Aug` currently introduces two brand-new chord qualities at full complexity (all 12 keys, inversions on, 10s timer) with zero warmup — by inserting two new single-key, untimed, root-position-only stages before it: `Meet Diminished`, then `Meet Augmented`.

**Architecture:** Pure data change to `LEARNING_PATH` (2 new stage objects inserted) and `LEARNING_PATH_PHASES` (one count bump, 8→10, on the existing `'Triad inversions'` entry) — no new phase, no code logic changes, no changes to the existing `Add Dim & Aug`/`Triad Mastery` stages.

**Tech Stack:** Vanilla JS (`script.js`), Playwright `.cjs` test scripts — per `CLAUDE.md`, no build step, no framework.

## Global Constraints

- Two separate stages, not one combined intro — Diminished and Augmented are introduced one fully absorbed before the next (an explicit, deliberate pedagogical choice made during brainstorming: these two triads are the pair a beginner is most likely to confuse with each other, unlike the Half-Dim/Dim7 precedent this session already shipped, which combined its two new qualities into one intro stage).
- Both new stages: C-only, no `inversions`, `timer: 'off'`.
- `'Meet Augmented'` is cumulative — it keeps `chordDiminished` from the previous stage, adding `chordAugmented` on top.
- No changes to `Add Dim & Aug` or `Triad Mastery` — this is a pure insertion between `All 12, Inverted` and `Add Dim & Aug`.
- New stage names (`'Meet Diminished'`, `'Meet Augmented'`) — verified against the live 134-stage array to have zero collisions.

---

### Task 1: Insert the two warmup stages

**Files:**
- Modify: `script.js:253-254` (insert 2 new stages between `'All 12, Inverted'` and `'Add Dim & Aug'`)
- Modify: `script.js:374` (`LEARNING_PATH_PHASES`'s `'Triad inversions'` entry, count 8→10)
- Modify: `test-all-paths-popup-redesign.cjs:37,71` (134→136)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53` (134→136)
- Modify: `test-audit-fixes-scales-phase.cjs:54` (134→136)
- Modify: `test-first-progressions.cjs:47` (134→136)
- Modify: `test-jazz-progressions-learning-path.cjs:79` (134→136)
- Modify: `test-left-hand-learning-path.cjs:116` (134→136)
- Modify: `test-left-hand-shape-warmup.cjs:93` (134→136)
- Modify: `test-progressions-inverted-learning-path.cjs:42,43` (134→136)
- Modify: `test-secondary-dominant-learning-path.cjs:51` (134→136)
- Modify: `test-two-handed-progressions-learning-path.cjs:38,39` (134→136)
- Modify: `test-trim-phase6-inversions.cjs:39,42` ("Triad inversions" phase count 8→10)
- Test: `test-dim-aug-warmup.cjs` (new)

### Current code (script.js:253-254)

```javascript
  { name: 'All 12, Inverted',    hint: 'All 12 keys — Major and Minor, any inversion, 10 seconds',                                                cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '10' },
  { name: 'Add Dim & Aug',       hint: 'Diminished and Augmented triads added — all inversions, 10 seconds',                                      cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '10' },
```

### Current code (script.js:374)

```javascript
  { name: 'Triad inversions', count: 8 },
```

### Current code (test-trim-phase6-inversions.cjs:38-42)

```javascript
  const stageCount = await page.evaluate(() => LEARNING_PATH.filter(s => (s.chords || []).includes('inversions') || s.name.includes('Triad') || s.name.includes('Aug') || s.name.includes('Dim')).length);
  check('Triad inversions phase now has 8 stages (was 9)', stageCount, 8);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions').count);
  check('LEARNING_PATH_PHASES "Triad inversions" count is 8', phaseCount, 8);
```

- [ ] **Step 1: Write the failing test**

Create `test-dim-aug-warmup.cjs`:

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

  // --- The 2 new stages exist, in order, between All 12, Inverted and Add Dim & Aug ---
  const orderCheck = await page.evaluate(() => {
    const idxAllInv = LEARNING_PATH.findIndex(s => s.name === 'All 12, Inverted');
    const idxAddDimAug = LEARNING_PATH.findIndex(s => s.name === 'Add Dim & Aug');
    const between = LEARNING_PATH.slice(idxAllInv + 1, idxAddDimAug);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 2 new stages between All 12, Inverted and Add Dim & Aug', orderCheck.count, 2);
  check('the 2 stages are named and ordered correctly', orderCheck.names, ['Meet Diminished', 'Meet Augmented']);

  // --- Total stage count and Triad inversions phase count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    triadInversionsCount: LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions')?.count,
    totalPhases: LEARNING_PATH_PHASES.length,
  }));
  check('LEARNING_PATH has 136 stages total (134 + 2 new)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
  check('Triad inversions phase count is 10 (8 + 2 new)', phaseData.triadInversionsCount, 10);
  check('LEARNING_PATH_PHASES still has 21 entries (no new phase)', phaseData.totalPhases, 21);

  // --- applyStage() on each new stage: correct content, C-only, no inversions, untimed ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedChords] of [
      ['Meet Diminished', ['chordMajor', 'chordMinor', 'chordDiminished']],
      ['Meet Augmented', ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        cChecked: document.querySelector('input[data-note="C"]').checked,
        c2Checked: document.querySelector('input[data-note="C#"]').checked,
        inversionsChecked: document.getElementById('inversions').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        chordsChecked: expectedChords.every(c => document.getElementById(c).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Meet Diminished', 'Meet Augmented']) {
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves C# unchecked (C-only)`, !applyChecks[name].c2Checked, null);
    checkTrue(`applyStage() on ${name} leaves inversions unchecked`, !applyChecks[name].inversionsChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected chord types`, applyChecks[name].chordsChecked, null);
  }
  const meetAugAlsoCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Diminished');
    applyStage(idx);
    return document.getElementById('chordAugmented').checked;
  });
  check('Meet Diminished leaves chordAugmented unchecked (not yet introduced)', meetAugAlsoCheck, false);

  // --- Add Dim & Aug and Triad Mastery are unchanged ---
  const unchangedCheck = await page.evaluate(() => {
    const addDimAug = LEARNING_PATH.find(s => s.name === 'Add Dim & Aug');
    const triadMastery = LEARNING_PATH.find(s => s.name === 'Triad Mastery');
    return {
      addDimAugChords: addDimAug.chords,
      addDimAugTimer: addDimAug.timer,
      addDimAugNotes: addDimAug.notes,
      triadMasteryChords: triadMastery.chords,
    };
  });
  check('Add Dim & Aug chords unchanged', unchangedCheck.addDimAugChords, ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented', 'inversions']);
  check('Add Dim & Aug timer unchanged', unchangedCheck.addDimAugTimer, '10');
  check('Add Dim & Aug notes unchanged (all 12 keys)', unchangedCheck.addDimAugNotes.length, 12);
  check('Triad Mastery chords unchanged', unchangedCheck.triadMasteryChords, ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented', 'inversions']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-dim-aug-warmup.cjs
```

Expected: FAIL — no stages named `'Meet Diminished'`/`'Meet Augmented'` exist yet, `LEARNING_PATH.length` is 134 not 136.

- [ ] **Step 3: Insert the 2 new stages (script.js:253-254)**

Change:

```javascript
  { name: 'All 12, Inverted',    hint: 'All 12 keys — Major and Minor, any inversion, 10 seconds',                                                cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '10' },
  { name: 'Add Dim & Aug',       hint: 'Diminished and Augmented triads added — all inversions, 10 seconds',                                      cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '10' },
```

to:

```javascript
  { name: 'All 12, Inverted',    hint: 'All 12 keys — Major and Minor, any inversion, 10 seconds',                                                cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: [],                             timer: '10' },
  { name: 'Meet Diminished',     hint: 'Diminished triads — the tense, symmetric sound, root position only',                                      cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','chordMinor','chordDiminished'],                                   scales: [],                             timer: 'off' },
  { name: 'Meet Augmented',      hint: 'Augmented triads added — the other symmetric sound, still root position',                                 cats: ['catChords'],             notes: ['C'],                                                            chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented'],                  scales: [],                             timer: 'off' },
  { name: 'Add Dim & Aug',       hint: 'Diminished and Augmented triads added — all inversions, 10 seconds',                                      cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','inversions'],     scales: [],                             timer: '10' },
```

- [ ] **Step 4: Bump the `LEARNING_PATH_PHASES` count (script.js:374)**

Change:

```javascript
  { name: 'Triad inversions', count: 8 },
```

to:

```javascript
  { name: 'Triad inversions', count: 10 },
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
node test-dim-aug-warmup.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 6: Update the 12 stale count assertions across 11 files**

In `test-all-paths-popup-redesign.cjs`, change:

```javascript
  check('LEARNING_PATH.length matches the expected 134 stages', phaseData.stageCount, 134);
```

to:

```javascript
  check('LEARNING_PATH.length matches the expected 136 stages', phaseData.stageCount, 136);
```

and change:

```javascript
  check('all 134 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 134);
```

to:

```javascript
  check('all 136 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 136);
```

In `test-audit-fixes-extended-chords-phase.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages', data.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages', data.totalStages, 136);
```

In `test-audit-fixes-scales-phase.cjs`, change:

```javascript
  check('LEARNING_PATH has the expected 134 stages', data.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has the expected 136 stages', data.totalStages, 136);
```

In `test-first-progressions.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', pathCheck.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', pathCheck.totalStages, 136);
```

In `test-jazz-progressions-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total', phaseCheck.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total', phaseCheck.totalStages, 136);
```

In `test-left-hand-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', phaseCheck.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', phaseCheck.totalStages, 136);
```

In `test-left-hand-shape-warmup.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions)', pathCheck.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', pathCheck.totalStages, 136);
```

In `test-progressions-inverted-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total (128 + 3 new + 3 Two-Handed Progressions)', phaseData.totalStages, 134);
  check('LEARNING_PATH_PHASES sums to 134', phaseData.phaseSum, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
```

In `test-secondary-dominant-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total', phaseCheck.totalStages, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total', phaseCheck.totalStages, 136);
```

In `test-two-handed-progressions-learning-path.cjs`, change:

```javascript
  check('LEARNING_PATH has 134 stages total (131 + 3 new)', phaseData.totalStages, 134);
  check('LEARNING_PATH_PHASES sums to 134', phaseData.phaseSum, 134);
```

to:

```javascript
  check('LEARNING_PATH has 136 stages total (131 + 3 new + 2 Dim/Aug warmup)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
```

In `test-trim-phase6-inversions.cjs`, change:

```javascript
  check('Triad inversions phase now has 8 stages (was 9)', stageCount, 8);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions').count);
  check('LEARNING_PATH_PHASES "Triad inversions" count is 8', phaseCount, 8);
```

to:

```javascript
  check('Triad inversions phase now has 10 stages (was 9, +1 audit trim, +2 Dim/Aug warmup)', stageCount, 10);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions').count);
  check('LEARNING_PATH_PHASES "Triad inversions" count is 10', phaseCount, 10);
```

- [ ] **Step 7: Run the full regression sweep**

```bash
node test-dim-aug-warmup.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
node test-trim-phase6-inversions.cjs
node test-two-handed-progressions.cjs
node test-progression-learning-path.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all print `RESULT: PASS`.

- [ ] **Step 8: Commit**

```bash
git add script.js test-dim-aug-warmup.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-shape-warmup.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs test-trim-phase6-inversions.cjs
git commit -m "Add Meet Diminished / Meet Augmented warmup before Add Dim & Aug

Add Dim & Aug previously introduced two brand-new chord qualities at
full complexity (all 12 keys, inversions on, 10s timer) simultaneously
-- the critique's 'worst spike in the doc.' Two new stages give each
quality its own single-key, untimed, root-position-only intro first,
introduced separately (not combined into one intro stage, unlike the
Half-Dim/Dim7 precedent) since diminished and augmented triads are the
pair a beginner is most likely to confuse with each other. Add Dim &
Aug and Triad Mastery are unchanged -- Add Dim & Aug now serves as the
'combine with inversions + all keys' step rather than a first exposure.
LEARNING_PATH: 134 -> 136 stages, Triad inversions phase 8 -> 10."
```

---

## Final Verification

```bash
node test-dim-aug-warmup.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
node test-trim-phase6-inversions.cjs
node test-two-handed-progressions.cjs
node test-progression-learning-path.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all `RESULT: PASS`, zero failures.

After this ships, update `docs/learning-path-design.md` (Phase 8's stage table and reasoning, mark this open issue resolved in the summary) and the `learning-path-audit.md` memory entry — controller follow-up, not part of this plan's task, matching every prior round.
