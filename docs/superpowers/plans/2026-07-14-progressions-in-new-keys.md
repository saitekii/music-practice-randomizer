# Progressions in New Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new 5-stage Learning Path phase, "Progressions in New Keys", that gives learners practice playing `I–IV–V` in keys beyond C — ramping through increasing key-signature accidental counts — right after the Accidentals phase.

**Architecture:** Pure content/stage-data addition to the existing `LEARNING_PATH` and `LEARNING_PATH_PHASES` arrays in `script.js`. `genFunctional()` already resolves progressions relative to whatever root is picked from the enabled `notes` checkboxes, so no new generator or matching logic is needed — only new stage entries.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 5 new stages, `I–IV–V` held fixed throughout — only the `notes` field ramps per stage, in increasing key-signature-accidental-count order.
- All 5 stages: `cats: ['catFunctional']`, `chords: []`, `scales: []`, `progressions: ['I–IV–V']`, `timer: 'off'`. No inversions, no left-hand mode.
- New phase name: `'Progressions in New Keys'`, inserted immediately after `'Speed Up'` (end of the Accidentals phase) and before `'Left Hand Shape'` (start of the Left-Hand Voicing phase).
- `notes` arrays are always listed in `NOTES` array positional order (`['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']`), matching the existing convention used by every other stage in the file — not insertion order.
- Zero new code beyond stage data: `genFunctional()`, `applyStage()`, `checkMidi()` etc. are untouched.

---

## Task 1: Add the 5 new stages and the new phase entry

**Files:**
- Modify: `script.js:239` (insert 5 new stage objects + a new phase comment, immediately after the `'Speed Up'` stage and before the existing `// ── Phase 5b: Left-Hand Voicing ──` comment)
- Modify: `script.js:374-375` (insert one new `LEARNING_PATH_PHASES` entry between `'Accidentals one at a time'` and `'Left-Hand Voicing'`)
- Test: `test-progressions-in-new-keys.cjs`

**Interfaces:**
- Produces: 5 new `LEARNING_PATH` stage objects (`'First Song, New Keys'`, `'First Song, More Keys'`, `'First Song, Even More Keys'`, `'First Song, Almost All Keys'`, `'First Song, All 12 Keys'`), 1 new `LEARNING_PATH_PHASES` entry (`{ name: 'Progressions in New Keys', count: 5 }`). `LEARNING_PATH.length` becomes 141 (was 136); `LEARNING_PATH_PHASES.length` becomes 22 (was 21); the phase-count sum still equals 141.

- [ ] **Step 1: Write the failing test**

Create `test-progressions-in-new-keys.cjs`:

```js
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

  // 1. The 5 new stages exist, in order, immediately between 'Speed Up' and 'Left Hand Shape'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const speedUpIdx = names.indexOf('Speed Up');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(speedUpIdx + 1, speedUpIdx + 6),
      nextAfter: names[speedUpIdx + 6],
    };
  });
  check('LEARNING_PATH grows to 141 stages', placement.totalStages, 141);
  check('the 5 new stages sit immediately after Speed Up, in order', placement.between, [
    'First Song, New Keys',
    'First Song, More Keys',
    'First Song, Even More Keys',
    'First Song, Almost All Keys',
    'First Song, All 12 Keys',
  ]);
  check("Left Hand Shape immediately follows the 5 new stages", placement.nextAfter, 'Left Hand Shape');

  // 2. Each stage's data: fixed I-IV-V, no chords/scales, no timer, and the exact cumulative
  // root-note set per stage (in NOTES array order, matching every other stage in the file).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      newKeys:      byName('First Song, New Keys'),
      moreKeys:     byName('First Song, More Keys'),
      evenMore:     byName('First Song, Even More Keys'),
      almostAll:    byName('First Song, Almost All Keys'),
      all12:        byName('First Song, All 12 Keys'),
    };
  });
  const expectedCommon = { cats: ['catFunctional'], chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' };
  check('First Song, New Keys roots', stageData.newKeys.notes, ['C', 'F', 'G']);
  check('First Song, More Keys roots', stageData.moreKeys.notes, ['C', 'D', 'F', 'G', 'Bb']);
  check('First Song, Even More Keys roots', stageData.evenMore.notes, ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']);
  check('First Song, Almost All Keys roots', stageData.almostAll.notes, ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb']);
  check('First Song, All 12 Keys roots', stageData.all12.notes,
    ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
  for (const [label, stage] of Object.entries(stageData)) {
    check(`${label}: cats/chords/scales/progressions/timer`, {
      cats: stage.cats, chords: stage.chords, scales: stage.scales,
      progressions: stage.progressions, timer: stage.timer,
    }, expectedCommon);
  }

  // 3. LEARNING_PATH_PHASES gains exactly one new entry, in the right place, and the phase
  // counts still sum to the total stage count.
  const phaseData = await page.evaluate(() => {
    const names = LEARNING_PATH_PHASES.map(p => p.name);
    const idx = names.indexOf('Progressions in New Keys');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 22 entries', phaseData.totalPhases, 22);
  check('phase counts sum to 141', phaseData.phaseSum, 141);
  check("new phase's count is 5", phaseData.newPhaseCount, 5);
  check("new phase sits right after 'Accidentals one at a time'", phaseData.prevPhase, 'Accidentals one at a time');
  check("new phase sits right before 'Left-Hand Voicing'", phaseData.nextPhase, 'Left-Hand Voicing');

  // 4. applyStage() on one of the ramped stages sets exactly its cumulative root-note set and
  // nothing else (no chords, no scales, correct category state). Root-note checkboxes are
  // `<input type="checkbox" data-note="C">` etc (index.html:552-563) -- select by that attribute,
  // not by a guessed id, since there's no per-note id in the markup.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Song, Even More Keys');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      catFunctionalChecked: document.getElementById('catFunctional').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('First Song, Even More Keys') checks exactly its 7 cumulative roots",
    applied.checkedNotes, ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with a non-C-only root pool active (via the 'First Song,
  // Even More Keys' stage), genFunctional() can actually produce a non-C-rooted I-IV-V prompt --
  // not just that the checkbox data looks right.
  const liveGen = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Song, Even More Keys');
    applyStage(idx);
    const roots = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (prompt) {
        const root = prompt.key.split('|')[1];
        roots.add(root);
      }
    }
    return [...roots].sort();
  });
  check('genFunctional() produces prompts rooted on more than just C across 200 tries',
    liveGen.length > 1, true);
  check('every generated root is in the stage\'s enabled set', liveGen.every(r =>
    ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'].includes(r)), true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-progressions-in-new-keys.cjs`
Expected: multiple `FAIL` lines (the 5 stages don't exist yet, `LEARNING_PATH.length` is still 136, `LEARNING_PATH_PHASES.length` is still 21, `applyStage()` on a nonexistent stage index throws or behaves unexpectedly). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the stage data**

In `script.js`, insert 5 new stage entries and a new phase comment immediately after the `'Speed Up'` stage (line 239) and before the existing `// ── Phase 5b: Left-Hand Voicing ──` comment (line 240):

Current (`script.js:239-240`):
```js
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5c: Progressions in New Keys ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Song, New Keys',        hint: 'I–IV–V in keys with 0–1 accidentals — C, F, G',            cats: ['catFunctional'], notes: ['C','F','G'],                                        chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' },
  { name: 'First Song, More Keys',       hint: 'Add D and B♭ — 2 accidentals',                             cats: ['catFunctional'], notes: ['C','D','F','G','Bb'],                               chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' },
  { name: 'First Song, Even More Keys',  hint: 'Add A and E♭ — 3 accidentals',                             cats: ['catFunctional'], notes: ['C','D','Eb','F','G','A','Bb'],                      chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' },
  { name: 'First Song, Almost All Keys', hint: 'Add E and A♭ — 4 accidentals',                             cats: ['catFunctional'], notes: ['C','D','Eb','E','F','G','Ab','A','Bb'],             chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' },
  { name: 'First Song, All 12 Keys',     hint: 'Remaining keys — all 12 roots now, same I–IV–V',           cats: ['catFunctional'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' },
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

In `script.js`, insert one new `LEARNING_PATH_PHASES` entry between `'Accidentals one at a time'` and `'Left-Hand Voicing'` (currently lines 374-375):

Current (`script.js:374-375`):
```js
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Left-Hand Voicing', count: 6 },
```

New:
```js
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Progressions in New Keys', count: 5 },
  { name: 'Left-Hand Voicing', count: 6 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-progressions-in-new-keys.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check adjacent Learning Path tests**

Run these existing tests, which touch the Accidentals / Left-Hand Voicing boundary or `applyStage()` generally, to confirm nothing adjacent broke (their stage-count assertions will legitimately go stale here — that's expected and gets fixed in Task 2, not this step; just confirm no *new*, unexpected failures beyond the known stale counts):

Run: `node test-left-hand-mode-check.cjs`
Expected: `RESULT: PASS` (this test doesn't assert total stage/phase counts, only `leftHandMode` checkbox behavior — should be unaffected).

- [ ] **Step 6: Commit**

```bash
git add script.js test-progressions-in-new-keys.cjs
git commit -m "Add Progressions in New Keys phase: I-IV-V ramped through increasingly accidental-heavy key signatures"
```

---

## Task 2: Fix stale 136-stage / 21-phase assertions across the test suite

**Files:**
- Modify: `test-all-paths-popup-redesign.cjs:35,37,69,70,71,112`
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53`
- Modify: `test-audit-fixes-scales-phase.cjs:54`
- Modify: `test-dim-aug-warmup.cjs:39,40,42`
- Modify: `test-first-progressions.cjs:47`
- Modify: `test-jazz-progressions-learning-path.cjs:77,79`
- Modify: `test-left-hand-learning-path.cjs:114,116`
- Modify: `test-left-hand-shape-warmup.cjs:93`
- Modify: `test-progressions-inverted-learning-path.cjs:42,43`
- Modify: `test-secondary-dominant-learning-path.cjs:49,51`
- Modify: `test-two-handed-progressions-learning-path.cjs:38,39`

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 141` and `LEARNING_PATH_PHASES.length === 22` (established in Task 1).

This task is pure mechanical fallout from Task 1 changing the live stage/phase counts — every one of these lines is an existing, already-passing test whose hardcoded expected number (136 stages / 21 phases) is now stale. No new test scenarios, no behavior changes — just updating stale literals to match the new totals (136→141, 21→22), including inside the human-readable label strings, not just the numeric assertion argument.

- [ ] **Step 1: Confirm each line is genuinely stale (not a real regression)**

Run each of the 11 affected test files and confirm every failure is exactly a `136`-vs-`141` or `21`-vs-`22` mismatch, nothing else:

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines whose "got X, expected 136/21" (or vice versa) confirms a stale count, and no `FAIL` line for any other reason. If any file fails for a different reason, STOP and report it — that would be a real regression, not stale-count fallout, and needs investigation before proceeding.

- [ ] **Step 2: Fix each stale line**

`test-all-paths-popup-redesign.cjs`:

Current (line 35):
```js
  check('LEARNING_PATH_PHASES has 21 entries', phaseData.phaseCount, 21);
```
New:
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseData.phaseCount, 22);
```

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 136 stages', phaseData.stageCount, 136);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 141 stages', phaseData.stageCount, 141);
```

Current (lines 69-71):
```js
  check('21 phase headers rendered', groupedView.headerCount, 21);
  check('21 phase bodies rendered', groupedView.bodyCount, 21);
  check('all 136 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 136);
```
New:
```js
  check('22 phase headers rendered', groupedView.headerCount, 22);
  check('22 phase bodies rendered', groupedView.bodyCount, 22);
  check('all 141 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 141);
```

Current (line 112):
```js
  check('clearing search restores the 21 phase headers', clearedView, 21);
```
New:
```js
  check('clearing search restores the 22 phase headers', clearedView, 22);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 136 stages', data.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages', data.totalStages, 141);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 136 stages', data.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has the expected 141 stages', data.totalStages, 141);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-42):
```js
  check('LEARNING_PATH has 136 stages total (134 + 2 new)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```

Current (line 42):
```js
  check('LEARNING_PATH_PHASES still has 21 entries (no new phase)', phaseData.totalPhases, 21);
```
New:
```js
  check('LEARNING_PATH_PHASES has 22 entries (21 + Progressions in New Keys)', phaseData.totalPhases, 22);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 136 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', pathCheck.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', pathCheck.totalStages, 141);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 77):
```js
  check('LEARNING_PATH_PHASES has 21 entries', phaseCheck.phaseCount, 21);
```
New:
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseCheck.phaseCount, 22);
```

Current (line 79):
```js
  check('LEARNING_PATH has 136 stages total', phaseCheck.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total', phaseCheck.totalStages, 141);
```

`test-left-hand-learning-path.cjs`:

Current (line 114):
```js
  check('LEARNING_PATH_PHASES has 21 entries total', phaseCheck.phaseNames.length, 21);
```
New:
```js
  check('LEARNING_PATH_PHASES has 22 entries total', phaseCheck.phaseNames.length, 22);
```

Current (line 116):
```js
  check('LEARNING_PATH has 136 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', phaseCheck.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseCheck.totalStages, 141);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 136 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', pathCheck.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', pathCheck.totalStages, 141);
```

`test-progressions-inverted-learning-path.cjs`:

Current (lines 42-43):
```js
  check('LEARNING_PATH has 136 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 49):
```js
  check('LEARNING_PATH_PHASES has 21 entries', phaseCheck.phaseCount, 21);
```
New:
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseCheck.phaseCount, 22);
```

Current (line 51):
```js
  check('LEARNING_PATH has 136 stages total', phaseCheck.totalStages, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total', phaseCheck.totalStages, 141);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 38-39):
```js
  check('LEARNING_PATH has 136 stages total (131 + 3 new + 2 Dim/Aug warmup)', phaseData.totalStages, 136);
  check('LEARNING_PATH_PHASES sums to 136', phaseData.phaseSum, 136);
```
New:
```js
  check('LEARNING_PATH has 141 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```

- [ ] **Step 3: Run all 11 files again to verify they pass**

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: every one prints `RESULT: PASS`.

- [ ] **Step 4: Confirm no other stale count references remain**

Run a repo-wide search to confirm no test file still hardcodes the old totals anywhere this task's file list might have missed:

```bash
grep -rn "\b136\b" test-*.cjs
grep -rln "LEARNING_PATH_PHASES" test-*.cjs | xargs grep -n "\b21\b"
```

Expected: both commands return no matches (every `136`/phase-count-`21` reference has been updated). If either command finds a remaining match not in this task's file list, fix it the same way (stale total → 141, stale phase count → 22) before proceeding.

- [ ] **Step 5: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-progressions-in-new-keys.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals in other files; it must not touch Task 1's stage data or its own test).

- [ ] **Step 6: Commit**

```bash
git add test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-shape-warmup.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs
git commit -m "Fix stale 136-stage/21-phase assertions after adding Progressions in New Keys"
```
