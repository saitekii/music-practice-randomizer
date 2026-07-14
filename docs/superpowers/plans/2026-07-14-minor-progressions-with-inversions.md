# Minor Progressions with Inversions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one new stage, `'Invert the Minor Progression'`, to the existing "Progressions, Inverted" phase, requiring a voice-led inversion for the minor progression `i–iv–V` — the final piece of the minor-progression initiative.

**Architecture:** Pure content/stage-data addition to `LEARNING_PATH`, plus one new lookup entry in the existing `PROGRESSION_INVERSIONS` table. `getRequiredBassPc()`, `checkMidi()`, and `getExpectedPCs()`'s `func` branch already handle any progression/inversion-label combination generically — no new logic, just data.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 1 new stage, `'Invert the Minor Progression'`: `cats: ['catFunctional']`, `notes: ['A']`, `chords: []`, `scales: []`, `progressions: ['i–iv–V']`, `requireProgressionInversions: true`, `timer: 'off'`.
- New `PROGRESSION_INVERSIONS['i–iv–V']` entry: `['Root position', '2nd inversion', '1st inversion']`.
- Placement: immediately after `'Four Chords, Inverted'` and before `'Two-Handed First Song'` — stays inside the existing "Progressions, Inverted" phase (no new phase). `LEARNING_PATH_PHASES`'s `'Progressions, Inverted'` entry's `count` goes from 3 to 4; `LEARNING_PATH_PHASES.length` itself is unaffected (stays 25).
- Zero new code beyond the stage object and the lookup-table entry: `getRequiredBassPc()`, `checkMidi()`, `getExpectedPCs()`, `genFunctional()` are untouched.
- The new stage line in `script.js` must match the file's established column-alignment convention exactly (measured from its 3 direct siblings, which have an extra `requireProgressionInversions:` field before `timer:`: `cats:` at char 147, `notes:` at 180, `chords:` at 253, `scales:` at 342, `progressions:` at 382, `requireProgressionInversions:` at 450, `timer:` at 486 — total line length 501 characters, matching sibling lines 277-278 exactly). This plan's Task 1 already contains the pre-formatted line; copy it exactly.
- This insertion sits inside an existing phase (no new `LEARNING_PATH_PHASES` entry), so **phase-level adjacency is not at risk** this round — only stage-level. The pre-flight grep for this plan found two real stage-level adjacency breaks, both involving `slice()`-based "count the stages between X and Y" checks rather than simple index-offset checks — see Task 2's file list.

---

## Task 1: Add the new stage and the PROGRESSION_INVERSIONS entry

**Files:**
- Modify: `script.js:3476-3480` (add one new entry to the `PROGRESSION_INVERSIONS` object)
- Modify: `script.js:279` (insert 1 new stage object, immediately after the `'Four Chords, Inverted'` stage and before the existing `// ── Phase 6c: Two-Handed Progressions ──` comment)
- Modify: `script.js:399` (bump `'Progressions, Inverted'`'s `count` from 3 to 4)
- Test: `test-minor-progressions-with-inversions.cjs`

**Interfaces:**
- Produces: 1 new `LEARNING_PATH` stage object (`'Invert the Minor Progression'`), 1 new `PROGRESSION_INVERSIONS` key (`'i–iv–V'`). `LEARNING_PATH.length` becomes 151 (was 150); `LEARNING_PATH_PHASES.length` stays 25; the phase-count sum becomes 151.

- [ ] **Step 1: Write the failing test**

Create `test-minor-progressions-with-inversions.cjs`:

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // 1. The new stage exists, immediately after 'Four Chords, Inverted' and before
  // 'Two-Handed First Song'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Four Chords, Inverted');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfter: names[idx + 1],
      nextAfterThat: names[idx + 2],
    };
  });
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
  check("'Invert the Minor Progression' sits immediately after 'Four Chords, Inverted'", placement.nextAfter, 'Invert the Minor Progression');
  check("'Two-Handed First Song' sits immediately after 'Invert the Minor Progression'", placement.nextAfterThat, 'Two-Handed First Song');

  // 2. The stage's data: A-minor-only i-iv-V, required inversions on, no chords/scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Invert the Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, []);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('requireProgressionInversions', stageData.requireProgressionInversions, true);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES: 'Progressions, Inverted' count goes 3 -> 4; total phase count
  // (25) is unaffected since no new phase was added; sums still match.
  const phaseData = await page.evaluate(() => ({
    totalPhases: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    invertedCount: LEARNING_PATH_PHASES.find(p => p.name === 'Progressions, Inverted')?.count,
  }));
  check('LEARNING_PATH_PHASES stays at 25 entries (no new phase)', phaseData.totalPhases, 25);
  check('phase counts sum to 151', phaseData.phaseSum, 151);
  check("'Progressions, Inverted' count is now 4", phaseData.invertedCount, 4);

  // 4. applyStage() checks exactly the A root, exactly the i-iv-V pattern, requireInversions on,
  // no chords/scales categories, timer off. Root-note checkboxes are `<input data-note="A">`;
  // the pattern checkbox is `<input data-pattern="i–iv–V">` (a bare, non-mode-qualified string).
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Invert the Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      patternChecked: document.querySelector('input[data-pattern="i–iv–V"]')?.checked,
      requireInvChecked: document.getElementById('functionalRequireInversions').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Invert the Minor Progression') checks exactly the A root", applied.checkedNotes, ['A']);
  check('applyStage() checks the i-iv-V pattern', applied.patternChecked, true);
  check('applyStage() checks functionalRequireInversions', applied.requireInvChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. PROGRESSION_INVERSIONS['i-iv-V'] resolves to the correct required bass pitch class at
  // each step, verified for A minor AND a second root (E minor) to confirm the pattern isn't
  // A-specific: i/Root position -> tonic, iv/2nd inversion -> tonic (common tone),
  // V/1st inversion -> raised leading tone (a half-step below tonic).
  const bassPcs = await page.evaluate(() => {
    const forRoot = root => {
      applyStage(LEARNING_PATH.findIndex(s => s.name === 'Invert the Minor Progression'));
      const iBass  = getExpectedPCs(`func|${root}|minor|i–iv–V|0|`).requiredBassPc;
      const ivBass = getExpectedPCs(`func|${root}|minor|i–iv–V|1|`).requiredBassPc;
      const vBass  = getExpectedPCs(`func|${root}|minor|i–iv–V|2|`).requiredBassPc;
      return { iBass, ivBass, vBass };
    };
    return { A: forRoot('A'), E: forRoot('E') };
  });
  check('A minor: i requires bass A (9)', bassPcs.A.iBass, 9);
  check('A minor: iv (2nd inversion) requires bass A (9) -- common tone', bassPcs.A.ivBass, 9);
  check('A minor: V (1st inversion) requires bass G# (8) -- half-step below tonic', bassPcs.A.vBass, 8);
  check('E minor: i requires bass E (4)', bassPcs.E.iBass, 4);
  check('E minor: iv (2nd inversion) requires bass E (4) -- common tone', bassPcs.E.ivBass, 4);
  check('E minor: V (1st inversion) requires bass D# (3) -- half-step below tonic', bassPcs.E.vBass, 3);

  // 6. Live playthrough: the correct sequence of inversions advances the progression; a
  // right-notes-wrong-bass attempt on step 1 (iv) does not. MIDI note sets verified by hand:
  // i root position = A3,C4,E4 (57,60,64, bass=A/pc9); iv WRONG root-position attempt =
  // D4,F4,A4 (62,65,69, bass=D/pc2, not the required A); iv CORRECT 2nd inversion =
  // A4,D5,F5 (69,74,77, bass=A/pc9).
  const playthrough = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'func|A|minor|i–iv–V|0|';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([57, 60, 64]); // A3 C4 E4 -- i, root position, A in bass
    checkMidi();
    const step1Advanced = midiSuccessActive;

    currentPromptKey = 'func|A|minor|i–iv–V|1|';
    midiSuccessActive = false;
    heldNotes = new Set([62, 65, 69]); // D4 F4 A4 -- root position: D (62) is lowest, not the required 2nd-inversion bass (A)
    checkMidi();
    const wrongInversionRejected = !midiSuccessActive;

    heldNotes = new Set([69, 74, 77]); // A4 D5 F5 -- iv, 2nd inversion, A (69) is lowest -- correct
    checkMidi();
    const step2Advanced = midiSuccessActive;

    return { step1Advanced, wrongInversionRejected, step2Advanced };
  });
  check('step 1 (i, root position) advances the progression', playthrough.step1Advanced, true);
  check('step 2 wrong inversion (iv, root position) is rejected', playthrough.wrongInversionRejected, true);
  check('step 2 correct inversion (iv, 2nd inversion) advances the progression', playthrough.step2Advanced, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-minor-progressions-with-inversions.cjs`
Expected: multiple `FAIL` lines (the stage doesn't exist yet, `LEARNING_PATH.length` is still 150, `'Progressions, Inverted'`'s count is still 3, `PROGRESSION_INVERSIONS['i–iv–V']` is `undefined` so `getExpectedPCs()` calls involving it return `requiredBassPc: null` rather than the expected pitch classes). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the data changes**

In `script.js`, add one new entry to `PROGRESSION_INVERSIONS`:

Current (`script.js:3476-3480`):
```js
const PROGRESSION_INVERSIONS = {
  'I–IV–V':     ['Root position', '2nd inversion', '1st inversion'],
  'IV–V–I':     ['Root position', 'Root position', '2nd inversion'],
  'I–V–vi–IV':  ['Root position', '1st inversion', 'Root position', '1st inversion'],
};
```

New:
```js
const PROGRESSION_INVERSIONS = {
  'I–IV–V':     ['Root position', '2nd inversion', '1st inversion'],
  'IV–V–I':     ['Root position', 'Root position', '2nd inversion'],
  'I–V–vi–IV':  ['Root position', '1st inversion', 'Root position', '1st inversion'],
  'i–iv–V':     ['Root position', '2nd inversion', '1st inversion'],
};
```

In `script.js`, insert 1 new stage entry immediately after the `'Four Chords, Inverted'` stage (line 279) and before the existing `// ── Phase 6c: Two-Handed Progressions ──` comment (line 280):

Current (`script.js:279-280`):
```js
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 6c: Two-Handed Progressions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'Four Chords, Inverted',  hint: 'All four progressions now require their voice-led inversion',                                           cats: ['catFunctional'],         notes: ['C'],                                                            chords: [],                                                                              scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  { name: 'Invert the Minor Progression', hint: 'i–iv–V now requires its voice-led inversion too',                                                 cats: ['catFunctional'],         notes: ['A'],                                                            chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           requireProgressionInversions: true, timer: 'off' },
  // ── Phase 6c: Two-Handed Progressions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

The new stage line above is already formatted to match the file's column-alignment convention exactly (501 characters total, matching sibling lines 277-278 exactly). Copy it exactly as shown, character for character — do not reformat or re-wrap it.

In `script.js`, bump `'Progressions, Inverted'`'s `count` from 3 to 4 (line 399):

Current (`script.js:399`):
```js
  { name: 'Progressions, Inverted', count: 3 },
```

New:
```js
  { name: 'Progressions, Inverted', count: 4 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-minor-progressions-with-inversions.cjs`
Expected: `RESULT: PASS`, every `check()`/`checkTrue()` line shows `PASS`.

- [ ] **Step 5: Regression-check the two stage-range tests this insertion sits inside**

Run these two tests, which count stages in a range spanning this insertion point (both will show known, expected failures — Task 2's job, not this step's):

Run: `node test-progressions-inverted-learning-path.cjs`
Expected: mostly `PASS`, except known failures Task 2 will fix — the "exactly 3 new stages between Triad Mastery and Two-Handed First Song" count/names checks (now 4 stages, with the new one appended), the `'Progressions, Inverted' phase has count 3` check (now 4), and the stale 150-stage total. Confirm no *other*, unexpected failures.

Run: `node test-two-handed-progressions-learning-path.cjs`
Expected: mostly `PASS`, except known failures Task 2 will fix — the "exactly 3 new stages between Four Chords, Inverted and First Scale" count/names checks (now 4 stages, with the new one prepended), and the stale 150-stage total. Confirm no *other*, unexpected failures.

- [ ] **Step 6: Commit**

```bash
git add script.js test-minor-progressions-with-inversions.cjs
git commit -m "Add Invert the Minor Progression stage: i-iv-V now requires its voice-led inversion"
```

---

## Task 2: Fix the 2 real stage-range breaks and stale 150-stage assertions across the test suite

**Files:**
- Modify: `test-progressions-inverted-learning-path.cjs:33,34,42,44` (stage-range break, names list, stage count, phase-specific count)
- Modify: `test-two-handed-progressions-learning-path.cjs:29,30,38` (stage-range break, names list, stage count)
- Modify: `test-all-paths-popup-redesign.cjs:37,71`
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53`
- Modify: `test-audit-fixes-scales-phase.cjs:54`
- Modify: `test-dim-aug-warmup.cjs:39,40`
- Modify: `test-first-minor-progression.cjs:27,54`
- Modify: `test-first-progressions.cjs:47`
- Modify: `test-jazz-progressions-learning-path.cjs:79`
- Modify: `test-left-hand-learning-path.cjs:116`
- Modify: `test-left-hand-progressions.cjs:27,74`
- Modify: `test-left-hand-shape-warmup.cjs:93`
- Modify: `test-minor-progressions-in-new-keys.cjs:28,79`
- Modify: `test-progressions-in-new-keys.cjs:27,77`
- Modify: `test-secondary-dominant-learning-path.cjs:51`

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 151` (established in Task 1). `LEARNING_PATH_PHASES.length` stays 25 (no new phase this round) — no phase-count-total assertions need fixing anywhere in the suite this round, unlike every prior round in this series.

**Two lines are real content fixes, not just stale numbers** — both are `slice()`-based "count and list the stages between X and Y" checks, a different check style from the simple index-offset adjacency checks fixed in prior rounds:

1. `test-progressions-inverted-learning-path.cjs:33-34` — counted exactly 3 stages between `'Triad Mastery'` and `'Two-Handed First Song'` and listed them by name. Task 1's new stage now makes that 4, appended at the end of the list (it's the last of the "Progressions, Inverted" stages, immediately before "Two-Handed First Song").
2. `test-two-handed-progressions-learning-path.cjs:29-30` — counted exactly 3 stages between `'Four Chords, Inverted'` and `'First Scale'` and listed them by name. Task 1's new stage now makes that 4, prepended at the start of the list (it's the first stage after "Four Chords, Inverted", before the pre-existing "Two-Handed Progressions" phase begins).

Everything else in this task is pure mechanical fallout from Task 1 changing `LEARNING_PATH.length` (150→151) — including inside human-readable label strings, not just the numeric argument. `LEARNING_PATH_PHASES.length` itself did **not** change this round (no new phase), so unlike every prior round in this series, there is no `24`-vs-`25`-style total-phase-count fix needed anywhere.

- [ ] **Step 1: Confirm each line is genuinely stale or a real range break (not a further regression)**

Run each of the 15 affected test files and confirm every failure is exactly a `150`-vs-`151` mismatch, the `3`-vs-`4` `'Progressions, Inverted'` count, or one of the 2 named stage-range breaks, nothing else:

```bash
node test-progressions-inverted-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-minor-progressions-in-new-keys.cjs
node test-progressions-in-new-keys.cjs
node test-secondary-dominant-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines matching the categories above, and no `FAIL` line for any other reason. If any file fails for a different reason, STOP and report it — that would be a real regression, not fallout from this plan's known changes, and needs investigation before proceeding.

- [ ] **Step 2: Fix the 2 stage-range breaks first**

`test-progressions-inverted-learning-path.cjs`:

Current (lines 33-34):
```js
  check('exactly 3 new stages between Triad Mastery and Two-Handed First Song', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted']);
```
New:
```js
  check('exactly 4 stages between Triad Mastery and Two-Handed First Song', orderCheck.count, 4);
  check('the 4 stages are named and ordered correctly', orderCheck.names, ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted', 'Invert the Minor Progression']);
```

Current (line 44):
```js
  check('Progressions, Inverted phase has count 3', phaseData.invertedPhase?.count, 3);
```
New:
```js
  check('Progressions, Inverted phase has count 4', phaseData.invertedPhase?.count, 4);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 29-30):
```js
  check('exactly 3 new stages between Four Chords, Inverted and First Scale', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']);
```
New:
```js
  check('exactly 4 stages between Four Chords, Inverted and First Scale', orderCheck.count, 4);
  check('the 4 stages are named and ordered correctly', orderCheck.names, ['Invert the Minor Progression', 'Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']);
```

- [ ] **Step 3: Fix each stale count line**

`test-progressions-inverted-learning-path.cjs`:

Current (line 42):
```js
  check('LEARNING_PATH has 150 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (line 38):
```js
  check('LEARNING_PATH has 150 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
```

`test-all-paths-popup-redesign.cjs`:

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 150 stages', phaseData.stageCount, 150);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 151 stages', phaseData.stageCount, 151);
```

Current (line 71):
```js
  check('all 150 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 150);
```
New:
```js
  check('all 151 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 151);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 150 stages', data.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages', data.totalStages, 151);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 150 stages', data.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has the expected 151 stages', data.totalStages, 151);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-40):
```js
  check('LEARNING_PATH has 150 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
  check('LEARNING_PATH_PHASES sums to 151', phaseData.phaseSum, 151);
```

`test-first-minor-progression.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```

Current (line 54):
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```
New:
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 150 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', pathCheck.totalStages, 151);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 79):
```js
  check('LEARNING_PATH has 150 stages total', phaseCheck.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total', phaseCheck.totalStages, 151);
```

`test-left-hand-learning-path.cjs`:

Current (line 116):
```js
  check('LEARNING_PATH has 150 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseCheck.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseCheck.totalStages, 151);
```

`test-left-hand-progressions.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```

Current (line 74):
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```
New:
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 150 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', pathCheck.totalStages, 151);
```

`test-minor-progressions-in-new-keys.cjs`:

Current (line 28):
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```

Current (line 79):
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```
New:
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```

`test-progressions-in-new-keys.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```

Current (line 77):
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```
New:
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 51):
```js
  check('LEARNING_PATH has 150 stages total', phaseCheck.totalStages, 150);
```
New:
```js
  check('LEARNING_PATH has 151 stages total', phaseCheck.totalStages, 151);
```

- [ ] **Step 4: Run all 15 files again to verify they pass**

```bash
node test-progressions-inverted-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-minor-progressions-in-new-keys.cjs
node test-progressions-in-new-keys.cjs
node test-secondary-dominant-learning-path.cjs
```

Expected: every one prints `RESULT: PASS`.

- [ ] **Step 5: Confirm no other stale count or range-break references remain**

Run a repo-wide search to confirm no test file still hardcodes the old total, and re-check both stage-range boundaries fresh:

```bash
grep -rn "\b150\b" test-*.cjs
grep -rn "'Four Chords, Inverted'\|'Two-Handed First Song'" test-*.cjs
```

For the first command, exclude any hit that is clearly unrelated to `LEARNING_PATH` (e.g. a `waitForTimeout(150)` or an unrelated numeric comment — confirm by reading the line, don't just count matches). For the second command, confirm every remaining match either already reflects the new stage (`'Invert the Minor Progression'` correctly inserted into any list/slice logic) or is unaffected by this insertion (e.g. a lookup that doesn't depend on exact adjacency).

Expected: no unaddressed `LEARNING_PATH`-related `150` reference remains, and both stage-range checks (Step 2) are the only adjacency-sensitive logic touching this boundary, both already fixed.

- [ ] **Step 6: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-minor-progressions-with-inversions.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals/range checks in other files; it must not touch Task 1's stage data, the `PROGRESSION_INVERSIONS` entry, or its own test).

- [ ] **Step 7: Commit**

```bash
git add test-progressions-inverted-learning-path.cjs test-two-handed-progressions-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-minor-progression.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-progressions.cjs test-left-hand-shape-warmup.cjs test-minor-progressions-in-new-keys.cjs test-progressions-in-new-keys.cjs test-secondary-dominant-learning-path.cjs
git commit -m "Fix 2 stage-range breaks and stale 150-stage assertions after adding Invert the Minor Progression"
```
