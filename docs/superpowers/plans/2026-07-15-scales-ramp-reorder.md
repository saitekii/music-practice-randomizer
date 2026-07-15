# Major & Minor Scales Ramp Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the existing "Major scales" phase (4 stages, major-only, thinly ramped, positioned very late in the Learning Path) and replace it with a new "Major & Minor Scales" phase (6 stages, both scale types together as relative-key pairs, ramped by key-signature accidental count) inserted right after "Accidentals one at a time."

**Architecture:** Pure `LEARNING_PATH`/`LEARNING_PATH_PHASES` data changes in `script.js` — no new code in `getExpectedPCs()`, `genScale()`, or `applyStage()` (all already generalize correctly to whatever `notes`/`scales` a stage specifies). This is the first round in this project's history that both inserts new stages AND deletes existing ones in the same change, so the regression sweep (Task 2) is wider than usual: it must catch both insertion-boundary and deletion-boundary fallout, including one entire test file that becomes obsolete because it tests content being deleted.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Playwright for testing (`.cjs` only).

## Global Constraints

- Exact new phase content, in order: `Meet the Scales` → `Scales, 0–1 Accidentals` → `Scales, 2 Accidentals` → `Scales, 3 Accidentals` → `Scales, All 12 Keys` → `Scale Timer` (6 stages — NOT 7; combining major+minor buckets reaches full 12-note coverage one ramp step earlier than either scale type alone, verified during spec self-review — do not add a 7th "all 12" stage before the timer stage, `Scales, All 12 Keys` already has all 12 notes).
- Each new stage: `cats: ['catScales']`, `chords: []`, `scales: ['scaleMajor','scaleNatMinor']`. Exact `notes` per stage and exact `timer` per stage are given verbatim in Task 1 below — use them exactly, do not recompute.
- Placement: the new phase is inserted immediately after `Speed Up` (the last stage of `Accidentals one at a time`) and immediately before `First Song, New Keys` (the first stage of `Progressions in New Keys`).
- The OLD `Major scales` phase (4 stages: `First Scale`, `All Natural Scales`, `Scale Timer`, `All 12 Scales`) is deleted entirely, along with its `LEARNING_PATH_PHASES` entry — not kept, not duplicated.
- `Add Minor Scale` (in the unchanged-position `Combine chords + scales` phase) is NOT deleted — only its `hint` text changes; `notes`/`chords`/`scales`/`timer` stay exactly as they are today.
- `LEARNING_PATH_PHASES.length` stays 25 (one phase removed, one added). New phase entry name is exactly `'Major & Minor Scales'` with `count: 6`.
- Net stage count: 152 → 154.
- All new/modified stage lines must match the file's established column-alignment convention exactly: `cats:` at column 146, `notes:` at 179, `chords:` at 252, `scales:` at 341, `timer:` at 381 (0-indexed character offsets) — every line below has already been generated and verified against these exact columns; copy them verbatim, do not retype or reformat them.
- Test files must be `.cjs`, use the `chromium.launch()` + `page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'))` pre-seed pattern, and the `check()`/`checkTrue()` + `RESULT: PASS`/`RESULT: FAIL` convention used by every other test file in this repo.

---

### Task 1: Reorder the LEARNING_PATH scales content

**Files:**
- Modify: `script.js:241-242` (insert new phase comment + 6 stages, between `Speed Up` and the `Progressions in New Keys` phase comment)
- Modify: `script.js:285-291` (delete the old `Major scales` phase comment + its 4 stages)
- Modify: `script.js:294` (retext `Add Minor Scale`'s hint only)
- Modify: `script.js:395-403` (in `LEARNING_PATH_PHASES`: remove the `Major scales` entry, insert the new `Major & Minor Scales` entry between `Accidentals one at a time` and `Progressions in New Keys`)
- Create: `test-scales-ramp-reorder.cjs`

**Interfaces:**
- Consumes: nothing new — `applyStage()`, `getExpectedPCs()`, `genScale()` are all unchanged and already handle arbitrary `notes`/`scales` combinations generically.
- Produces: nothing new for later tasks to consume — this task's only deliverable is the reordered data plus its own test. Task 2 depends on this task's exact new stage/phase names and positions (given in this brief) to fix the regression fallout, but does not call any new function.

- [ ] **Step 1: Write the failing test**

Create `test-scales-ramp-reorder.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
  });
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

  // --- Placement: new phase sits immediately after Speed Up, before First Song, New Keys ---
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Speed Up');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(idx + 1, idx + 7),
      nextAfterThat: names[idx + 7],
    };
  });
  check('LEARNING_PATH has 154 stages total (152 - 4 deleted + 6 new)', placement.totalStages, 154);
  check('the 6 new stages sit immediately after Speed Up, in order', placement.between, [
    'Meet the Scales',
    'Scales, 0–1 Accidentals',
    'Scales, 2 Accidentals',
    'Scales, 3 Accidentals',
    'Scales, All 12 Keys',
    'Scale Timer',
  ]);
  check("'First Song, New Keys' sits immediately after the new phase", placement.nextAfterThat, 'First Song, New Keys');

  // --- Old Major scales phase and its 4 stages no longer exist anywhere ---
  const oldContentGone = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    return {
      firstScaleGone: !names.includes('First Scale'),
      allNaturalScalesGone: !names.includes('All Natural Scales'),
      oldScaleTimerGone: !names.includes('Scale Timer') || names.filter(n => n === 'Scale Timer').length === 1, // new phase reuses this exact name once
      all12ScalesGone: !names.includes('All 12 Scales'),
      oldPhaseGone: !LEARNING_PATH_PHASES.some(p => p.name === 'Major scales'),
    };
  });
  checkTrue("'First Scale' no longer exists", oldContentGone.firstScaleGone, null);
  checkTrue("'All Natural Scales' no longer exists", oldContentGone.allNaturalScalesGone, null);
  checkTrue("'Scale Timer' exists exactly once (only the new phase's own stage, not a leftover)", oldContentGone.oldScaleTimerGone, null);
  checkTrue("'All 12 Scales' no longer exists", oldContentGone.all12ScalesGone, null);
  checkTrue("the old 'Major scales' LEARNING_PATH_PHASES entry no longer exists", oldContentGone.oldPhaseGone, null);

  // --- 'Two-Handed Minor Progression' (old neighbor of the deleted phase) is now immediately followed by 'Mix Chords + Scales' ---
  const deletionBoundary = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Two-Handed Minor Progression');
    return names[idx + 1];
  });
  check("'Mix Chords + Scales' now sits immediately after 'Two-Handed Minor Progression'", deletionBoundary, 'Mix Chords + Scales');

  // --- Exact field values for all 6 new stages ---
  const stageData = await page.evaluate(() => {
    const byName = n => LEARNING_PATH.find(s => s.name === n);
    return {
      meet:    byName('Meet the Scales'),
      b1:      byName('Scales, 0–1 Accidentals'),
      b2:      byName('Scales, 2 Accidentals'),
      b3:      byName('Scales, 3 Accidentals'),
      all12:   byName('Scales, All 12 Keys'),
      timerSt: byName('Scale Timer'),
    };
  });
  check('Meet the Scales notes', stageData.meet.notes, ['C','A']);
  check('Meet the Scales scales', stageData.meet.scales, ['scaleMajor','scaleNatMinor']);
  check('Meet the Scales timer', stageData.meet.timer, 'off');
  check('Meet the Scales chords', stageData.meet.chords, []);
  check('Meet the Scales cats', stageData.meet.cats, ['catScales']);

  check('Scales, 0–1 Accidentals notes', stageData.b1.notes, ['C','D','E','F','G','A']);
  check('Scales, 0–1 Accidentals scales', stageData.b1.scales, ['scaleMajor','scaleNatMinor']);
  check('Scales, 0–1 Accidentals timer', stageData.b1.timer, 'off');

  check('Scales, 2 Accidentals notes', stageData.b2.notes, ['C','D','E','F','G','A','Bb','B']);
  check('Scales, 2 Accidentals timer', stageData.b2.timer, 'off');

  check('Scales, 3 Accidentals notes', stageData.b3.notes, ['C','D','Eb','E','F','F#','G','A','Bb','B']);
  check('Scales, 3 Accidentals timer', stageData.b3.timer, 'off');

  check('Scales, All 12 Keys notes', stageData.all12.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Scales, All 12 Keys timer', stageData.all12.timer, 'off');

  check('Scale Timer notes', stageData.timerSt.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Scale Timer scales', stageData.timerSt.scales, ['scaleMajor','scaleNatMinor']);
  check('Scale Timer timer', stageData.timerSt.timer, '15');

  // --- Add Minor Scale: only the hint changed, everything else identical to before ---
  const addMinorScale = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Add Minor Scale'));
  check('Add Minor Scale hint is updated', addMinorScale.hint, 'Minor scale (already familiar) now combined with chords too');
  check('Add Minor Scale notes unchanged', addMinorScale.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Add Minor Scale chords unchanged', addMinorScale.chords, ['chordMajor','chordMinor','inversions']);
  check('Add Minor Scale scales unchanged', addMinorScale.scales, ['scaleMajor','scaleNatMinor']);
  check('Add Minor Scale timer unchanged', addMinorScale.timer, '10');

  // --- LEARNING_PATH_PHASES: length stays 25, sums to 154, new entry has count 6 ---
  const phaseData = await page.evaluate(() => ({
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    newPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Major & Minor Scales'),
  }));
  check('LEARNING_PATH_PHASES.length stays 25', phaseData.phaseCount, 25);
  check('LEARNING_PATH_PHASES sums to 154', phaseData.phaseSum, 154);
  checkTrue("'Major & Minor Scales' phase entry exists", !!phaseData.newPhase, null);
  check("'Major & Minor Scales' count is 6", phaseData.newPhase?.count, 6);

  // --- applyStage() spot check: 'Scales, 2 Accidentals' checks exactly the right roots/scales/timer ---
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Scales, 2 Accidentals');
    applyStage(idx);
    const checkedNotes = [...document.querySelectorAll('input[data-note]')].filter(el => el.checked).map(el => el.dataset.note);
    return {
      checkedNotes: checkedNotes.sort(),
      scaleMajorChecked: document.getElementById('scaleMajor').checked,
      scaleNatMinorChecked: document.getElementById('scaleNatMinor').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      timerOffChecked: document.querySelector('input[name="timer"][value="off"]')?.checked,
    };
  });
  check("applyStage('Scales, 2 Accidentals') checks exactly C,D,E,F,G,A,Bb,B", applied.checkedNotes, ['A','B','Bb','C','D','E','F','G'].sort());
  checkTrue('applyStage() checks scaleMajor', applied.scaleMajorChecked, null);
  checkTrue('applyStage() checks scaleNatMinor', applied.scaleNatMinorChecked, null);
  checkTrue('applyStage() checks catScales', applied.catScalesChecked, null);
  checkTrue('applyStage() leaves catChords unchecked', !applied.catChordsChecked, null);
  checkTrue('applyStage() selects the off timer radio (stage timer is "off")', applied.timerOffChecked, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-scales-ramp-reorder.cjs`
Expected: FAIL — every check fails since none of the new stages exist yet and the old ones are still present.

- [ ] **Step 3: Insert the new phase (comment + 6 stages)**

In `script.js`, the current text (lines 241-243) reads:

```js
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5a: Progressions in New Keys ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Song, New Keys', hint: 'I–IV–V in keys with 0–1 accidentals — C, F, G',                                                          cats: ['catFunctional'],         notes: ['C','F','G'],                                                    chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           timer: 'off' },
```

Change it to (inserts the new phase comment + 6 stages between `Speed Up` and the `Phase 5a` comment — copy these lines exactly, they are already column-aligned, do not retype or reformat):

```js
  { name: 'Speed Up',            hint: 'All 12 keys, Major + Minor root position — 5 seconds',                                                    cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor'],                                                     scales: [],                             timer: '5'  },
  // ── Phase 5d: Major & Minor Scales ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet the Scales', hint: 'C Major + A Minor — a relative pair, no timer, take your time',                                               cats: ['catScales'],             notes: ['C','A'],                                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Scales, 0–1 Accidentals', hint: 'Major + Minor scales in keys with 0–1 accidentals — C, F, G major / A, D, E minor',                   cats: ['catScales'],             notes: ['C','D','E','F','G','A'],                                        chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Scales, 2 Accidentals', hint: 'Add D and B♭ major, G and B minor — 2 accidentals',                                                     cats: ['catScales'],             notes: ['C','D','E','F','G','A','Bb','B'],                               chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Scales, 3 Accidentals', hint: 'Add A and E♭ major, C and F♯ minor — 3 accidentals',                                                    cats: ['catScales'],             notes: ['C','D','Eb','E','F','F#','G','A','Bb','B'],                     chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Scales, All 12 Keys', hint: 'Remaining keys — all 12 roots now, Major and Natural Minor together',                                     cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Scale Timer', hint: 'All 12 keys, both scale types — 15 seconds',                                                                      cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: ['scaleMajor','scaleNatMinor'], timer: '15' },
  // ── Phase 5a: Progressions in New Keys ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Song, New Keys', hint: 'I–IV–V in keys with 0–1 accidentals — C, F, G',                                                          cats: ['catFunctional'],         notes: ['C','F','G'],                                                    chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           timer: 'off' },
```

(The new phase comment is labeled `Phase 5d` — a cosmetic, non-binding label following this file's existing convention of letter-suffixing sub-phases inserted under an existing numbered phase, e.g. `5a`, `5a-2`, `5b`, `5c` already exist under `Phase 5: Accidentals one at a time`. This comment is not read by any code or asserted on by any test — it's purely descriptive.)

- [ ] **Step 4: Delete the old "Major scales" phase (comment + 4 stages)**

The current text (lines 285-291) reads:

```js
  { name: 'Two-Handed Minor Progression', hint: 'Same two-handed voicing — now for i–iv–V in minor',                                               cats: ['catFunctional'],         notes: ['A'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['i–iv–V'],                                           requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Scale',         hint: 'C Major scale — no timer, take your time',                                                                cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'All Natural Scales',  hint: 'Major scale across all seven natural notes',                                                              cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: 'off' },
  { name: 'Scale Timer',         hint: 'Natural keys, 15 seconds',                                                                                cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                              scales: ['scaleMajor'],                 timer: '15' },
  { name: 'All 12 Scales',       hint: 'Every key, 15 seconds',                                                                                   cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: ['scaleMajor'],                 timer: '15' },
  // ── Phase 8: Combine chords + scales (inversions carry forward) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

Change it to (deletes the `Phase 7: Major scales` comment and its 4 stages entirely — `Two-Handed Minor Progression` is now immediately followed by the `Phase 8` comment and `Mix Chords + Scales`):

```js
  { name: 'Two-Handed Minor Progression', hint: 'Same two-handed voicing — now for i–iv–V in minor',                                               cats: ['catFunctional'],         notes: ['A'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['i–iv–V'],                                           requireProgressionInversions: true, timer: 'off' },
  // ── Phase 8: Combine chords + scales (inversions carry forward) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 5: Update `Add Minor Scale`'s hint text**

The current line (line 294, after Step 4's deletion this is now several lines earlier in the file — search for it by content, not by the old line number) reads:

```js
  { name: 'Add Minor Scale',     hint: 'Natural Minor scale added to the mix',                                                                    cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

Change it to (only the hint text and its trailing padding differ — every other field is byte-identical):

```js
  { name: 'Add Minor Scale',     hint: 'Minor scale (already familiar) now combined with chords too',                                             cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','inversions'],                                        scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

- [ ] **Step 6: Update `LEARNING_PATH_PHASES`**

The current text (lines 395-403) reads:

```js
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Progressions in New Keys', count: 5 },
  { name: 'Minor Progressions in New Keys', count: 5 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Left-Hand Progressions', count: 3 },
  { name: 'Triad inversions', count: 10 },
  { name: 'Progressions, Inverted', count: 4 },
  { name: 'Two-Handed Progressions', count: 4 },
  { name: 'Major scales', count: 4 },
```

Change it to (inserts the new phase entry right after `Accidentals one at a time`, removes the old `Major scales` entry from its old position):

```js
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Major & Minor Scales', count: 6 },
  { name: 'Progressions in New Keys', count: 5 },
  { name: 'Minor Progressions in New Keys', count: 5 },
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Left-Hand Progressions', count: 3 },
  { name: 'Triad inversions', count: 10 },
  { name: 'Progressions, Inverted', count: 4 },
  { name: 'Two-Handed Progressions', count: 4 },
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-scales-ramp-reorder.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 8: Commit**

```bash
git add script.js test-scales-ramp-reorder.cjs
git commit -m "Reorder scales content: delete late major-only ramp, add earlier combined Major & Minor Scales phase"
```

---

### Task 2: Fix regression fallout across the test suite

**Files:**
- Modify (structural + mechanical fix): `test-progressions-in-new-keys.cjs`
- Modify (structural + mechanical fix): `test-two-handed-minor-progression.cjs`
- Modify (structural + mechanical fix): `test-two-handed-progressions-learning-path.cjs`
- Delete: `test-trim-phase7-scales.cjs` (tests the exact 4 stages and the exact phase that Task 1 deleted — nothing in this file can pass anymore, and nothing in it is worth preserving, since it was itself testing a since-superseded trim of the now-fully-deleted phase)
- Modify (mechanical fix only — literal `152` → `154` in both the numeric assertion argument and any label-string text mentioning "152"): `test-all-paths-popup-redesign.cjs`, `test-audit-fixes-extended-chords-phase.cjs`, `test-audit-fixes-scales-phase.cjs`, `test-dim-aug-warmup.cjs`, `test-first-minor-progression.cjs`, `test-first-progressions.cjs`, `test-jazz-progressions-learning-path.cjs`, `test-left-hand-learning-path.cjs`, `test-left-hand-progressions.cjs`, `test-left-hand-shape-warmup.cjs`, `test-minor-progressions-in-new-keys.cjs`, `test-minor-progressions-with-inversions.cjs`, `test-progressions-inverted-learning-path.cjs`, `test-secondary-dominant-learning-path.cjs`

**Interfaces:**
- Consumes: the exact new stage/phase names from Task 1 (`Meet the Scales`, `Scales, 0–1 Accidentals`, `Scales, 2 Accidentals`, `Scales, 3 Accidentals`, `Scales, All 12 Keys`, `Scale Timer`, `Major & Minor Scales`) and confirmation that `Mix Chords + Scales` is now the immediate successor of `Two-Handed Minor Progression`.
- Produces: nothing for later tasks — this is the final task in the plan.

- [ ] **Step 1: Fix `test-progressions-in-new-keys.cjs` (real content fix — the insertion boundary moved)**

The current text (lines 17-25) reads:

```js
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
```

Change it to (the 5 progression stages no longer sit immediately after `Speed Up` — the 6 new scale stages from Task 1 now sit between them; both the slice range and the comment need updating):

```js
  // 1. The 5 new stages exist, in order, immediately after the new "Major & Minor Scales" phase (6 stages) that now sits between 'Speed Up' and here.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const speedUpIdx = names.indexOf('Speed Up');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(speedUpIdx + 7, speedUpIdx + 12),
      nextAfter: names[speedUpIdx + 12],
    };
  });
```

Then, on line 27, change `check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);` to `check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);`.

Then, on line 77, change `check('phase counts sum to 152', phaseData.phaseSum, 152);` to `check('phase counts sum to 154', phaseData.phaseSum, 154);`.

- [ ] **Step 2: Fix `test-two-handed-minor-progression.cjs` (real content fix — deletion boundary)**

The current text (lines 17-29) reads:

```js
  // 1. The new stage exists, immediately after 'Four Chords, Two Hands' and before 'First Scale'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Four Chords, Two Hands');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfter: names[idx + 1],
      nextAfterThat: names[idx + 2],
    };
  });
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
  check("'Two-Handed Minor Progression' sits immediately after 'Four Chords, Two Hands'", placement.nextAfter, 'Two-Handed Minor Progression');
  check("'First Scale' sits immediately after 'Two-Handed Minor Progression'", placement.nextAfterThat, 'First Scale');
```

Change it to (`'First Scale'` no longer exists — Task 1 deleted it; `'Mix Chords + Scales'` is now the immediate successor):

```js
  // 1. The new stage exists, immediately after 'Four Chords, Two Hands' and before 'Mix Chords + Scales'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Four Chords, Two Hands');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfter: names[idx + 1],
      nextAfterThat: names[idx + 2],
    };
  });
  check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);
  check("'Two-Handed Minor Progression' sits immediately after 'Four Chords, Two Hands'", placement.nextAfter, 'Two-Handed Minor Progression');
  check("'Mix Chords + Scales' sits immediately after 'Two-Handed Minor Progression'", placement.nextAfterThat, 'Mix Chords + Scales');
```

Then, on line 50, change `check('phase counts sum to 152', phaseData.phaseSum, 152);` to `check('phase counts sum to 154', phaseData.phaseSum, 154);`.

- [ ] **Step 3: Fix `test-two-handed-progressions-learning-path.cjs` (real content fix — deletion boundary)**

The current text (lines 22-30) reads:

```js
  // --- The 3 new stages exist, immediately after Four Chords, Inverted and before First Scale ---
  const orderCheck = await page.evaluate(() => {
    const idxFourInv    = LEARNING_PATH.findIndex(s => s.name === 'Four Chords, Inverted');
    const idxFirstScale = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const between = LEARNING_PATH.slice(idxFourInv + 1, idxFirstScale);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 5 stages between Four Chords, Inverted and First Scale', orderCheck.count, 5);
  check('the 5 stages are named and ordered correctly', orderCheck.names, ['Invert the Minor Progression', 'Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands', 'Two-Handed Minor Progression']);
```

Change it to (`'First Scale'` no longer exists; the boundary is now `'Mix Chords + Scales'`, and the 5 stages in between are unchanged):

```js
  // --- The 3 new stages exist, immediately after Four Chords, Inverted and before Mix Chords + Scales ---
  const orderCheck = await page.evaluate(() => {
    const idxFourInv   = LEARNING_PATH.findIndex(s => s.name === 'Four Chords, Inverted');
    const idxMixChords = LEARNING_PATH.findIndex(s => s.name === 'Mix Chords + Scales');
    const between = LEARNING_PATH.slice(idxFourInv + 1, idxMixChords);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 5 stages between Four Chords, Inverted and Mix Chords + Scales', orderCheck.count, 5);
  check('the 5 stages are named and ordered correctly', orderCheck.names, ['Invert the Minor Progression', 'Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands', 'Two-Handed Minor Progression']);
```

Then, on lines 38-39, change:
```js
  check('LEARNING_PATH has 152 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);
  check('LEARNING_PATH_PHASES sums to 152', phaseData.phaseSum, 152);
```
to:
```js
  check('LEARNING_PATH has 154 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression + 6 Major & Minor Scales - 4 old Major scales)', phaseData.totalStages, 154);
  check('LEARNING_PATH_PHASES sums to 154', phaseData.phaseSum, 154);
```

- [ ] **Step 4: Delete the now-obsolete test file**

```bash
git rm test-trim-phase7-scales.cjs
```

This file tested the old `Major scales` phase's stage count (4, "was 7" — itself a record of a historical trim) and `applyStage()` behavior on `First Scale`/`All Natural Scales`. Every stage and phase name it references was deleted in Task 1. Nothing in this file can be fixed forward — it is testing content that no longer exists.

- [ ] **Step 5: Mechanical `152` → `154` fixes across the remaining 13 files**

For each file below, change every occurrence of the literal `152` to `154` — both the numeric second argument to `check(...)` and any label-string text that mentions "152" (e.g. `'LEARNING_PATH has 152 stages total'` → `'LEARNING_PATH has 154 stages total'`). Do not change any other part of these lines.

- `test-all-paths-popup-redesign.cjs:37` — `check('LEARNING_PATH.length matches the expected 152 stages', phaseData.stageCount, 152);` → `check('LEARNING_PATH.length matches the expected 154 stages', phaseData.stageCount, 154);`
- `test-all-paths-popup-redesign.cjs:71` — `check('all 152 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 152);` → `check('all 154 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 154);`
- `test-audit-fixes-extended-chords-phase.cjs:53` — `check('LEARNING_PATH has 152 stages', data.totalStages, 152);` → `check('LEARNING_PATH has 154 stages', data.totalStages, 154);`
- `test-audit-fixes-scales-phase.cjs:54` — `check('LEARNING_PATH has the expected 152 stages', data.totalStages, 152);` → `check('LEARNING_PATH has the expected 154 stages', data.totalStages, 154);`
- `test-dim-aug-warmup.cjs:39` — `check('LEARNING_PATH has 152 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);` → same text with `152`→`154` in both places.
- `test-dim-aug-warmup.cjs:40` — `check('LEARNING_PATH_PHASES sums to 152', phaseData.phaseSum, 152);` → `check('LEARNING_PATH_PHASES sums to 154', phaseData.phaseSum, 154);`
- `test-first-minor-progression.cjs:27` — `check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);` → `check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);`
- `test-first-minor-progression.cjs:54` — `check('phase counts sum to 152', phaseData.phaseSum, 152);` → `check('phase counts sum to 154', phaseData.phaseSum, 154);`
- `test-first-progressions.cjs:47` — `check('LEARNING_PATH has 152 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', pathCheck.totalStages, 152);` → same text with `152`→`154` in both places.
- `test-jazz-progressions-learning-path.cjs:79` — `check('LEARNING_PATH has 152 stages total', phaseCheck.totalStages, 152);` → `check('LEARNING_PATH has 154 stages total', phaseCheck.totalStages, 154);`
- `test-left-hand-learning-path.cjs:116` — `check('LEARNING_PATH has 152 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseCheck.totalStages, 152);` → same text with `152`→`154` in both places.
- `test-left-hand-progressions.cjs:27` — `check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);` → `check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);`
- `test-left-hand-progressions.cjs:74` — `check('phase counts sum to 152', phaseData.phaseSum, 152);` → `check('phase counts sum to 154', phaseData.phaseSum, 154);`
- `test-left-hand-shape-warmup.cjs:93` — `check('LEARNING_PATH has 152 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', pathCheck.totalStages, 152);` → same text with `152`→`154` in both places.
- `test-minor-progressions-in-new-keys.cjs:28` — `check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);` → `check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);`
- `test-minor-progressions-in-new-keys.cjs:79` — `check('phase counts sum to 152', phaseData.phaseSum, 152);` → `check('phase counts sum to 154', phaseData.phaseSum, 154);`
- `test-minor-progressions-with-inversions.cjs:32` — `check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);` → `check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);`
- `test-minor-progressions-with-inversions.cjs:54` — `check('phase counts sum to 152', phaseData.phaseSum, 152);` → `check('phase counts sum to 154', phaseData.phaseSum, 154);`
- `test-progressions-inverted-learning-path.cjs:42` — `check('LEARNING_PATH has 152 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);` → same text with `152`→`154` in both places.
- `test-progressions-inverted-learning-path.cjs:43` — `check('LEARNING_PATH_PHASES sums to 152', phaseData.phaseSum, 152);` → `check('LEARNING_PATH_PHASES sums to 154', phaseData.phaseSum, 154);`
- `test-secondary-dominant-learning-path.cjs:51` — `check('LEARNING_PATH has 152 stages total', phaseCheck.totalStages, 152);` → `check('LEARNING_PATH has 154 stages total', phaseCheck.totalStages, 154);`

- [ ] **Step 6: Run the full test suite**

Run: `node run-all-tests.cjs`
Expected: every file shows `PASS` (a single pre-existing flaky file, `test-synth-pluck-karplus.cjs`, may occasionally fail under load and is unrelated to this change — if you see exactly that one file fail and nothing else, that's an acceptable, already-known flake, not a blocker; if anything else fails, investigate).

- [ ] **Step 7: Commit**

```bash
git add test-progressions-in-new-keys.cjs test-two-handed-minor-progression.cjs test-two-handed-progressions-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-minor-progression.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-progressions.cjs test-left-hand-shape-warmup.cjs test-minor-progressions-in-new-keys.cjs test-minor-progressions-with-inversions.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs
git rm test-trim-phase7-scales.cjs
git commit -m "Fix stage-count and adjacency fallout from the scales ramp reorder"
```
