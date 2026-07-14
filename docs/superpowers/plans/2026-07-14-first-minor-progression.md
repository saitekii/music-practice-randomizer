# First Minor Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new single-stage Learning Path phase, "First Minor Progression," that introduces the learner's first minor-key chord progression (`i–iv–V` in A minor) much earlier than today — right after "Add timer pressure" and before "Accidentals one at a time."

**Architecture:** Pure content/stage-data addition to the existing `LEARNING_PATH` and `LEARNING_PATH_PHASES` arrays in `script.js`. `i–iv–V` already exists in `FUNCTIONAL.minor` and `genFunctional()` already resolves minor-mode numerals for any root — no new generator or matching logic needed, only one new stage entry.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 1 new stage, `'First Minor Progression'`: `cats: ['catFunctional']`, `notes: ['A']`, `chords: []`, `scales: []`, `progressions: ['i–iv–V']`, `timer: 'off'`. No other root notes, no other progression patterns.
- New phase name: `'First Minor Progression'` (a 1-stage phase, same name as its sole stage), inserted immediately after `'Faster Still'` (end of "Add timer pressure") and before `'Add F♯'` (start of "Accidentals one at a time").
- `notes`/`chords`/`scales`/`progressions` arrays are always listed in the codebase's established formatting conventions — a single-item array stays as-is (`['A']`, `['i–iv–V']`), no reordering needed since there's only one value in each.
- Zero new code: `genFunctional()`, `applyStage()`, `checkMidi()` etc. are untouched.
- The new stage's `line` in `script.js` must match the file's established column-alignment convention exactly (fields padded to reach fixed columns: `cats:` at char 146, `notes:` at 179, `chords:` at 252, `scales:` at 341, `progressions:` at 381, `timer:` at 449 — measured from existing sibling stages with a `progressions` field, e.g. `script.js:226`). Get this right on the first attempt — a prior round in this codebase needed a follow-up fix cycle for exactly this.

---

## Task 1: Add the new stage and phase entry

**Files:**
- Modify: `script.js:232` (insert 1 new stage object + a new phase comment, immediately after the `'Faster Still'` stage and before the existing `// ── Phase 5: Accidentals one at a time ──` comment)
- Modify: `script.js:379-380` (insert one new `LEARNING_PATH_PHASES` entry between `'Add timer pressure'` and `'Accidentals one at a time'`)
- Test: `test-first-minor-progression.cjs`

**Interfaces:**
- Produces: 1 new `LEARNING_PATH` stage object (`'First Minor Progression'`), 1 new `LEARNING_PATH_PHASES` entry (`{ name: 'First Minor Progression', count: 1 }`). `LEARNING_PATH.length` becomes 142 (was 141); `LEARNING_PATH_PHASES.length` becomes 23 (was 22); the phase-count sum still equals 142.

- [ ] **Step 1: Write the failing test**

Create `test-first-minor-progression.cjs`:

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

  // 1. The new stage exists, in the right place, immediately between 'Faster Still' and 'Add F♯'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const fasterStillIdx = names.indexOf('Faster Still');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfterFasterStill: names[fasterStillIdx + 1],
      nextAfterThat: names[fasterStillIdx + 2],
    };
  });
  check('LEARNING_PATH grows to 142 stages', placement.totalStages, 142);
  check("'First Minor Progression' sits immediately after 'Faster Still'", placement.nextAfterFasterStill, 'First Minor Progression');
  check("'Add F♯' sits immediately after 'First Minor Progression'", placement.nextAfterThat, 'Add F♯');

  // 2. The stage's data: exactly the A-minor-only i-iv-V content, no chords/scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'First Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, []);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES gains exactly one new entry, in the right place, and the phase
  // counts still sum to the total stage count.
  const phaseData = await page.evaluate(() => {
    const names = LEARNING_PATH_PHASES.map(p => p.name);
    const idx = names.indexOf('First Minor Progression');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 23 entries', phaseData.totalPhases, 23);
  check('phase counts sum to 142', phaseData.phaseSum, 142);
  check("new phase's count is 1", phaseData.newPhaseCount, 1);
  check("new phase sits right after 'Add timer pressure'", phaseData.prevPhase, 'Add timer pressure');
  check("new phase sits right before 'Accidentals one at a time'", phaseData.nextPhase, 'Accidentals one at a time');

  // 4. applyStage() sets exactly the A root-note checkbox and exactly the i-iv-V pattern
  // checkbox, nothing else. Root-note checkboxes are `<input type="checkbox" data-note="A">`
  // (index.html:552-563); the i-iv-V progression checkbox is `<input data-pattern="i–iv–V">`
  // (index.html:376) -- a bare, non-mode-qualified pattern string, since it's a multi-chord
  // progression, not one of the 7 canonical single-numeral entries that get a "minor:" prefix.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    const checkedPattern = document.querySelector('input[data-pattern="i–iv–V"]')?.checked;
    return {
      checkedNotes,
      checkedPattern,
      catFunctionalChecked: document.getElementById('catFunctional').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('First Minor Progression') checks exactly the A root note", applied.checkedNotes, ['A']);
  check('applyStage() checks the i–iv–V pattern checkbox', applied.checkedPattern, true);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with the stage applied, genFunctional() produces only
  // 'func|A|minor|i–iv–V|0|' -- never a major-mode prompt, never a different minor numeral.
  const liveGen = await page.evaluate(() => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      const prompt = genFunctional();
      if (prompt) keys.add(prompt.key);
    }
    return [...keys];
  });
  check('genFunctional() produces only the A minor i-iv-V prompt across 100 tries', liveGen, ['func|A|minor|i–iv–V|0|']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-first-minor-progression.cjs`
Expected: multiple `FAIL` lines (the stage doesn't exist yet, `LEARNING_PATH.length` is still 141, `LEARNING_PATH_PHASES.length` is still 22, `applyStage()` on a nonexistent stage index throws or behaves unexpectedly). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the stage data**

In `script.js`, insert 1 new stage entry and a new phase comment immediately after the `'Faster Still'` stage (line 232) and before the existing `// ── Phase 5: Accidentals one at a time ──` comment (line 233):

Current (`script.js:232-233`):
```js
  { name: 'Faster Still',        hint: '5 seconds',                                                                                               cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5: Accidentals one at a time ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'Faster Still',        hint: '5 seconds',                                                                                               cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 4b: First Minor Progression ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Minor Progression', hint: 'First minor-key progression — i–iv–V in A minor, the minor analog of I–IV–V',                         cats: ['catFunctional'],         notes: ['A'],                                                            chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  // ── Phase 5: Accidentals one at a time ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

The new stage line above is already formatted to match the file's column-alignment convention exactly (`cats:` at column 146, `notes:` at 179, `chords:` at 252, `scales:` at 341, `progressions:` at 381, `timer:` at 449 — verify by comparing its total length, 464 characters, to line 226's, also 464 characters). Copy it exactly as shown, character for character — do not reformat or re-wrap it.

In `script.js`, insert one new `LEARNING_PATH_PHASES` entry between `'Add timer pressure'` and `'Accidentals one at a time'` (currently lines 379-380):

Current (`script.js:379-380`):
```js
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
```

New:
```js
  { name: 'Add timer pressure', count: 3 },
  { name: 'First Minor Progression', count: 1 },
  { name: 'Accidentals one at a time', count: 6 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-first-minor-progression.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check adjacent Learning Path tests**

Run these existing tests, which touch nearby stages or `applyStage()`/`genFunctional()` generally, to confirm nothing adjacent broke:

Run: `node test-first-progressions.cjs`
Expected: `RESULT: PASS` except for its own stale total-stage-count assertion (141→142, fixed in Task 2, not this step) — confirm no *other*, unexpected failures. This file's phase-adjacency check (`"First Progressions" sits right before "Add timer pressure"`) is unaffected by this task's insertion point (which is after "Add timer pressure", not before it) and must still pass.

- [ ] **Step 6: Commit**

```bash
git add script.js test-first-minor-progression.cjs
git commit -m "Add First Minor Progression phase: introduce i-iv-V in A minor early in the Learning Path"
```

---

## Task 2: Fix stale 141-stage / 22-phase assertions across the test suite

**Files:**
- Modify: `test-all-paths-popup-redesign.cjs:37,71` (stage count) and `:35,69,70,112` (phase count)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53` (stage count)
- Modify: `test-audit-fixes-scales-phase.cjs:54` (stage count)
- Modify: `test-dim-aug-warmup.cjs:39,40` (stage count) and `:42` (phase count)
- Modify: `test-first-progressions.cjs:47` (stage count)
- Modify: `test-jazz-progressions-learning-path.cjs:79` (stage count) and `:77` (phase count)
- Modify: `test-left-hand-learning-path.cjs:116` (stage count) and `:114` (phase count)
- Modify: `test-left-hand-shape-warmup.cjs:93` (stage count)
- Modify: `test-progressions-in-new-keys.cjs:27,77` (stage count) and `:76` (phase count)
- Modify: `test-progressions-inverted-learning-path.cjs:42,43` (stage count)
- Modify: `test-secondary-dominant-learning-path.cjs:51` (stage count) and `:49` (phase count)
- Modify: `test-two-handed-progressions-learning-path.cjs:38,39` (stage count)

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 142` and `LEARNING_PATH_PHASES.length === 23` (established in Task 1).

This task is pure mechanical fallout from Task 1 changing the live stage/phase counts — every one of these lines is an existing, already-passing test whose hardcoded expected number (141 stages / 22 phases) is now stale. No new test scenarios, no behavior changes — just updating stale literals to match the new totals (141→142, 22→23), including inside the human-readable label strings, not just the numeric assertion argument.

**Two lines do NOT need changing, despite containing the number 22** — `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76` both assert `'Functional harmony phase count is 26 (22 + 4 new stages)'` — this `22`/`26` is the *internal stage count of the "Functional harmony" phase itself* (an unrelated field, `phaseCheck.functionalHarmonyCount`), not the *total number of phases* in `LEARNING_PATH_PHASES`. Do not touch either of these two lines.

- [ ] **Step 1: Confirm each line is genuinely stale (not a real regression)**

Run each of the 12 affected test files and confirm every failure is exactly a `141`-vs-`142` or `22`-vs-`23` mismatch, nothing else:

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-in-new-keys.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines whose "got X, expected 141/22" (or vice versa) confirms a stale count, and no `FAIL` line for any other reason (in particular, no adjacency-assertion failures — this insertion point has no existing adjacency assertions referencing `'Faster Still'` or `'Add F♯'` anywhere in the test suite, confirmed by a repo-wide grep before this plan was written). If any file fails for a different reason, STOP and report it — that would be a real regression, not stale-count fallout, and needs investigation before proceeding.

- [ ] **Step 2: Fix each stale line**

`test-all-paths-popup-redesign.cjs`:

Current (line 35):
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseData.phaseCount, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseData.phaseCount, 23);
```

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 141 stages', phaseData.stageCount, 141);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 142 stages', phaseData.stageCount, 142);
```

Current (lines 69-71):
```js
  check('22 phase headers rendered', groupedView.headerCount, 22);
  check('22 phase bodies rendered', groupedView.bodyCount, 22);
  check('all 141 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 141);
```
New:
```js
  check('23 phase headers rendered', groupedView.headerCount, 23);
  check('23 phase bodies rendered', groupedView.bodyCount, 23);
  check('all 142 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 142);
```

Current (line 112):
```js
  check('clearing search restores the 22 phase headers', clearedView, 22);
```
New:
```js
  check('clearing search restores the 23 phase headers', clearedView, 23);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 141 stages', data.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages', data.totalStages, 142);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 141 stages', data.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has the expected 142 stages', data.totalStages, 142);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-40):
```js
  check('LEARNING_PATH has 141 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```

Current (line 42):
```js
  check('LEARNING_PATH_PHASES has 22 entries (21 + Progressions in New Keys)', phaseData.totalPhases, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES has 23 entries (21 + Progressions in New Keys + First Minor Progression)', phaseData.totalPhases, 23);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 141 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', pathCheck.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', pathCheck.totalStages, 142);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 77):
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseCheck.phaseCount, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseCheck.phaseCount, 23);
```

Current (line 79):
```js
  check('LEARNING_PATH has 141 stages total', phaseCheck.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total', phaseCheck.totalStages, 142);
```

`test-left-hand-learning-path.cjs`:

Current (line 114):
```js
  check('LEARNING_PATH_PHASES has 22 entries total', phaseCheck.phaseNames.length, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES has 23 entries total', phaseCheck.phaseNames.length, 23);
```

Current (line 116):
```js
  check('LEARNING_PATH has 141 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseCheck.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseCheck.totalStages, 142);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 141 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', pathCheck.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', pathCheck.totalStages, 142);
```

`test-progressions-in-new-keys.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 141 stages', placement.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH grows to 142 stages', placement.totalStages, 142);
```

Current (line 76):
```js
  check('LEARNING_PATH_PHASES grows to 22 entries', phaseData.totalPhases, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES grows to 23 entries', phaseData.totalPhases, 23);
```

Current (line 77):
```js
  check('phase counts sum to 141', phaseData.phaseSum, 141);
```
New:
```js
  check('phase counts sum to 142', phaseData.phaseSum, 142);
```

`test-progressions-inverted-learning-path.cjs`:

Current (lines 42-43):
```js
  check('LEARNING_PATH has 141 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 49):
```js
  check('LEARNING_PATH_PHASES has 22 entries', phaseCheck.phaseCount, 22);
```
New:
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseCheck.phaseCount, 23);
```

Current (line 51):
```js
  check('LEARNING_PATH has 141 stages total', phaseCheck.totalStages, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total', phaseCheck.totalStages, 142);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 38-39):
```js
  check('LEARNING_PATH has 141 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys)', phaseData.totalStages, 141);
  check('LEARNING_PATH_PHASES sums to 141', phaseData.phaseSum, 141);
```
New:
```js
  check('LEARNING_PATH has 142 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```

- [ ] **Step 3: Run all 12 files again to verify they pass**

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-in-new-keys.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: every one prints `RESULT: PASS`.

- [ ] **Step 4: Confirm no other stale count references remain**

Run a repo-wide search to confirm no test file still hardcodes the old totals anywhere this task's file list might have missed:

```bash
grep -rn "\b141\b" test-*.cjs
grep -rln "LEARNING_PATH_PHASES" test-*.cjs
```

For the second command, manually check each matching file's `22`-valued assertions against whether they reference `LEARNING_PATH_PHASES.length`/a total phase count (must become `23`) versus an unrelated field like `functionalHarmonyCount` that only coincidentally equals 22 (leave untouched — see this task's note above about `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76`).

Expected: the first command returns no matches. If either command finds a remaining stale total-phase-count match not in this task's file list, fix it the same way (stale total → 142, stale phase count → 23) before proceeding.

- [ ] **Step 5: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-first-minor-progression.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals in other files; it must not touch Task 1's stage data or its own test).

- [ ] **Step 6: Commit**

```bash
git add test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-shape-warmup.cjs test-progressions-in-new-keys.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs
git commit -m "Fix stale 141-stage/22-phase assertions after adding First Minor Progression"
```
