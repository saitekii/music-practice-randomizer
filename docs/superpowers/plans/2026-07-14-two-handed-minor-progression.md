# Two-Handed Minor Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one new stage, `'Two-Handed Minor Progression'`, to the existing "Two-Handed Progressions" phase, combining left-hand voicing with required right-hand inversions for the minor progression `i–iv–V` — closing the last remaining asymmetry from the minor-progression initiative.

**Architecture:** Pure content/stage-data addition to `LEARNING_PATH`. No new lookup-table entries or generator logic needed — `PROGRESSION_INVERSIONS['i–iv–V']`, `progressionAllowsLeftHand()`, and `getExpectedPCs()`'s `func` branch's combined left-hand+inversion logic already handle this exact combination generically, verified live during brainstorming.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 1 new stage, `'Two-Handed Minor Progression'`: `cats: ['catFunctional']`, `notes: ['A']`, `chords: ['leftHandMode']`, `scales: []`, `progressions: ['i–iv–V']`, `requireProgressionInversions: true`, `timer: 'off'`.
- Placement: immediately after `'Four Chords, Two Hands'` and before `'First Scale'` — stays inside the existing "Two-Handed Progressions" phase (no new phase). `LEARNING_PATH_PHASES`'s `'Two-Handed Progressions'` count goes from 3 to 4; `LEARNING_PATH_PHASES.length` itself is unaffected (stays 25).
- Zero new code: no new `PROGRESSION_INVERSIONS` entry, no new eligibility logic, `getExpectedPCs()`/`checkMidi()`/`genFunctional()` are untouched.
- Verified live during brainstorming: with `leftHandMode` + `functionalRequireInversions` both on and only `i–iv–V` enabled, `getExpectedPCs()` produces, for A minor: step 0 (`i`, root position) `leftHandPcs=[9,4]` (root+5th, since the required bass already is the root); step 1 (`iv`, 2nd inversion) `leftHandPcs=[9,2]` (actual required bass A + chord root D); step 2 (`V`, 1st inversion) `leftHandPcs=[8,4]` (actual required bass G♯ + chord root E).
- The new stage line in `script.js` must match the file's established column-alignment convention exactly (fields at char columns cats:147, notes:180, chords:253, scales:342, progressions:382, requireProgressionInversions:450, timer:486, total line length 501 characters, matching sibling lines 282-283). This plan's Task 1 already contains the pre-formatted line; copy it exactly.
- This insertion sits inside an existing phase (no new `LEARNING_PATH_PHASES` entry), so phase-level adjacency is not at risk. The pre-flight grep for this plan found one real stage-level break — a `slice()`-based "count stages between X and Y" check whose range happens to span from a stage BEFORE this phase all the way to `'First Scale'`, so it picks up this insertion too even though the insertion is at the far end of that range. See Task 2's file list.

---

## Task 1: Add the new stage

**Files:**
- Modify: `script.js:284` (insert 1 new stage object, immediately after the `'Four Chords, Two Hands'` stage and before the existing `// ── Phase 7: Major scales ──` comment)
- Modify: `script.js:401` (bump `'Two-Handed Progressions'`'s `count` from 3 to 4)
- Test: `test-two-handed-minor-progression.cjs`

**Interfaces:**
- Produces: 1 new `LEARNING_PATH` stage object (`'Two-Handed Minor Progression'`). `LEARNING_PATH.length` becomes 152 (was 151); `LEARNING_PATH_PHASES.length` stays 25; the phase-count sum becomes 152.

- [ ] **Step 1: Write the failing test**

Create `test-two-handed-minor-progression.cjs`:

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

  // 2. The stage's data: A-minor-only i-iv-V, left-hand mode on, required inversions on, no
  // scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Two-Handed Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, ['leftHandMode']);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('requireProgressionInversions', stageData.requireProgressionInversions, true);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES: 'Two-Handed Progressions' count goes 3 -> 4; total phase count
  // (25) is unaffected since no new phase was added; sums still match.
  const phaseData = await page.evaluate(() => ({
    totalPhases: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    twoHandedCount: LEARNING_PATH_PHASES.find(p => p.name === 'Two-Handed Progressions')?.count,
  }));
  check('LEARNING_PATH_PHASES stays at 25 entries (no new phase)', phaseData.totalPhases, 25);
  check('phase counts sum to 152', phaseData.phaseSum, 152);
  check("'Two-Handed Progressions' count is now 4", phaseData.twoHandedCount, 4);

  // 4. applyStage() checks exactly the A root, exactly the i-iv-V pattern, leftHandMode on,
  // requireInversions on, no scales, timer off.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Two-Handed Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      patternChecked: document.querySelector('input[data-pattern="i–iv–V"]')?.checked,
      leftHandChecked: document.getElementById('leftHandMode').checked,
      requireInvChecked: document.getElementById('functionalRequireInversions').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Two-Handed Minor Progression') checks exactly the A root", applied.checkedNotes, ['A']);
  check('applyStage() checks the i-iv-V pattern', applied.patternChecked, true);
  check('applyStage() checks leftHandMode', applied.leftHandChecked, true);
  check('applyStage() checks functionalRequireInversions', applied.requireInvChecked, true);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. getExpectedPCs() produces the correct leftHandPcs/rightHandPcs split at all 3 steps, for
  // A minor AND a second root (E minor) to confirm the pattern isn't A-specific.
  const handPcs = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'Two-Handed Minor Progression'));
    const forRoot = root => {
      const s0 = getExpectedPCs(`func|${root}|minor|i–iv–V|0|LH`);
      const s1 = getExpectedPCs(`func|${root}|minor|i–iv–V|1|LH`);
      const s2 = getExpectedPCs(`func|${root}|minor|i–iv–V|2|LH`);
      return {
        step0: { left: s0.leftHandPcs, right: s0.rightHandPcs },
        step1: { left: s1.leftHandPcs, right: s1.rightHandPcs },
        step2: { left: s2.leftHandPcs, right: s2.rightHandPcs },
      };
    };
    return { A: forRoot('A'), E: forRoot('E') };
  });
  check('A minor step 0 (i, root position): left hand root+5th (bass already is root)', handPcs.A.step0.left, [9, 4]);
  check('A minor step 0: right hand full triad', handPcs.A.step0.right, [9, 0, 4]);
  check('A minor step 1 (iv, 2nd inversion): left hand actual bass A + root D', handPcs.A.step1.left, [9, 2]);
  check('A minor step 1: right hand full triad', handPcs.A.step1.right, [2, 5, 9]);
  check('A minor step 2 (V, 1st inversion): left hand actual bass G# + root E', handPcs.A.step2.left, [8, 4]);
  check('A minor step 2: right hand full triad', handPcs.A.step2.right, [4, 8, 11]);
  check('E minor step 0 (i, root position): left hand root+5th', handPcs.E.step0.left, [4, 11]);
  check('E minor step 1 (iv, 2nd inversion): left hand actual bass', handPcs.E.step1.left, [4, 9]);
  check('E minor step 2 (V, 1st inversion): left hand actual bass', handPcs.E.step2.left, [3, 11]);

  // 6. Live playthrough: the correct two-handed voicing (left hand on the exact required pcs,
  // right hand on the full triad, any octave/order within each hand -- checkMidi() searches
  // every split point) advances through all 3 steps and completes on the last one. A plausible
  // wrong left-hand voicing (root+5th when a specific inversion's bass is required) is rejected.
  const playthrough = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'func|A|minor|i–iv–V|0|LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    // Step 0 (i, root position): left hand A3,E3 (57,52); right hand A4,C5,E5 (69,72,76).
    heldNotes = new Set([52, 57, 69, 72, 76]);
    checkMidi();
    const step0Advanced = midiSuccessActive;

    midiSuccessActive = false;
    // Step 1 (iv, 2nd inversion, required left hand = A+D): WRONG attempt -- left hand plays
    // D3,F3 instead, so no split of the held notes can put the required A pitch class into the
    // left-hand group while still leaving D,F,A covered on the right -- verified live during
    // planning that no split point satisfies both required sets simultaneously.
    heldNotes = new Set([50, 53, 74, 77, 81]); // D3,F3 left hand (wrong: missing the required A bass); D5,F5,A5 right hand
    checkMidi();
    const wrongVoicingRejected = !midiSuccessActive;

    midiSuccessActive = false;
    // Step 1 correct: left hand A3,D4 (57,62); right hand D5,F5,A5 (74,77,81).
    heldNotes = new Set([57, 62, 74, 77, 81]);
    checkMidi();
    const step1Advanced = midiSuccessActive;

    return { step0Advanced, wrongVoicingRejected, step1Advanced };
  });
  check('step 0 (i, root position) advances the progression', playthrough.step0Advanced, true);
  check('step 1 wrong voicing (missing the required bass note) is rejected', playthrough.wrongVoicingRejected, true);
  check('step 1 correct voicing (actual bass A + root D in left hand) advances the progression', playthrough.step1Advanced, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-two-handed-minor-progression.cjs`
Expected: multiple `FAIL` lines (the stage doesn't exist yet, `LEARNING_PATH.length` is still 151, `'Two-Handed Progressions'`'s count is still 3, `getExpectedPCs()` calls against the not-yet-enabled stage produce `undefined`/incorrect results). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the stage data**

In `script.js`, insert 1 new stage entry immediately after the `'Four Chords, Two Hands'` stage (line 284) and before the existing `// ── Phase 7: Major scales ──` comment (line 285):

Current (`script.js:284-285`):
```js
  { name: 'Four Chords, Two Hands',hint: 'All four chords, right hand inverted, left hand carrying the real bass line',                            cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'Four Chords, Two Hands',hint: 'All four chords, right hand inverted, left hand carrying the real bass line',                            cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV'],                     requireProgressionInversions: true, timer: 'off' },
  { name: 'Two-Handed Minor Progression', hint: 'Same two-handed voicing — now for i–iv–V in minor',                                               cats: ['catFunctional'],         notes: ['A'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['i–iv–V'],                                           requireProgressionInversions: true, timer: 'off' },
  // ── Phase 7: Major scales ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

The new stage line above is already formatted to match the file's column-alignment convention exactly (501 characters total, matching sibling lines 282-283 exactly). Copy it exactly as shown, character for character — do not reformat or re-wrap it.

In `script.js`, bump `'Two-Handed Progressions'`'s `count` from 3 to 4 (line 401):

Current (`script.js:401`):
```js
  { name: 'Two-Handed Progressions', count: 3 },
```

New:
```js
  { name: 'Two-Handed Progressions', count: 4 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-two-handed-minor-progression.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check the stage-range test this insertion sits inside**

Run this test, which counts stages in a range spanning this insertion point (it will show known, expected failures — Task 2's job, not this step's):

Run: `node test-two-handed-progressions-learning-path.cjs`
Expected: mostly `PASS`, except known failures Task 2 will fix — the "exactly 4 stages between Four Chords, Inverted and First Scale" count/names checks (now 5 stages, with the new one appended right before "First Scale"), the `'Two-Handed Progressions' phase has count 3` check (now 4), and the stale 151-stage total. Confirm no *other*, unexpected failures.

- [ ] **Step 6: Commit**

```bash
git add script.js test-two-handed-minor-progression.cjs
git commit -m "Add Two-Handed Minor Progression stage: left-hand voicing + required inversions for i-iv-V"
```

---

## Task 2: Fix the stage-range break and stale 151-stage assertions across the test suite

**Files:**
- Modify: `test-two-handed-progressions-learning-path.cjs:29,30,38,40` (stage-range break, names list, stage count, phase-specific count)
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
- Modify: `test-minor-progressions-with-inversions.cjs:32,54`
- Modify: `test-progressions-in-new-keys.cjs:27,77`
- Modify: `test-progressions-inverted-learning-path.cjs:42,43`
- Modify: `test-secondary-dominant-learning-path.cjs:51`

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 152` (established in Task 1). `LEARNING_PATH_PHASES.length` stays 25 (no new phase this round).

**One line is a real content fix, not just a stale number** — `test-two-handed-progressions-learning-path.cjs:29-30` is a `slice()`-based "count and list the stages between `'Four Chords, Inverted'` and `'First Scale'`" check. That range spans from a stage in the *previous* phase all the way to `'First Scale'`, so it already included the entire "Two-Handed Progressions" phase's stages, and Task 1's new stage — sitting at the very end of that range, right before `'First Scale'` — now falls inside it too. The count goes from 4 to 5, and `'Two-Handed Minor Progression'` gets appended at the end of the expected names list (it's the last stage before `'First Scale'`).

Everything else in this task is pure mechanical fallout from Task 1 changing `LEARNING_PATH.length` (151→152) and `'Two-Handed Progressions'`'s own `count` (3→4, both already scoped to the one file above) — including inside human-readable label strings, not just the numeric argument.

- [ ] **Step 1: Confirm each line is genuinely stale or the real range break (not a further regression)**

Run each of the 16 affected test files and confirm every failure is exactly a `151`-vs-`152` mismatch, the `3`-vs-`4` `'Two-Handed Progressions'` count, or the one named stage-range break, nothing else:

```bash
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
node test-minor-progressions-with-inversions.cjs
node test-progressions-in-new-keys.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines matching the categories above, and no `FAIL` line for any other reason. If any file fails for a different reason, STOP and report it — that would be a real regression, not fallout from this plan's known changes, and needs investigation before proceeding.

- [ ] **Step 2: Fix the stage-range break first**

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 29-30):
```js
  check('exactly 4 stages between Four Chords, Inverted and First Scale', orderCheck.count, 4);
  check('the 4 stages are named and ordered correctly', orderCheck.names, ['Invert the Minor Progression', 'Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']);
```
New:
```js
  check('exactly 5 stages between Four Chords, Inverted and First Scale', orderCheck.count, 5);
  check('the 5 stages are named and ordered correctly', orderCheck.names, ['Invert the Minor Progression', 'Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands', 'Two-Handed Minor Progression']);
```

Current (line 40):
```js
  check('Two-Handed Progressions phase has count 3', phaseData.newPhase?.count, 3);
```
New:
```js
  check('Two-Handed Progressions phase has count 4', phaseData.newPhase?.count, 4);
```

- [ ] **Step 3: Fix each stale count line**

`test-two-handed-progressions-learning-path.cjs`:

Current (line 38):
```js
  check('LEARNING_PATH has 151 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);
```

`test-all-paths-popup-redesign.cjs`:

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 151 stages', phaseData.stageCount, 151);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 152 stages', phaseData.stageCount, 152);
```

Current (line 71):
```js
  check('all 151 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 151);
```
New:
```js
  check('all 152 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 152);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 151 stages', data.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages', data.totalStages, 152);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 151 stages', data.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has the expected 152 stages', data.totalStages, 152);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-40):
```js
  check('LEARNING_PATH has 151 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
  check('LEARNING_PATH_PHASES sums to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);
  check('LEARNING_PATH_PHASES sums to 152', phaseData.phaseSum, 152);
```

`test-first-minor-progression.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
```

Current (line 54):
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('phase counts sum to 152', phaseData.phaseSum, 152);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 151 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', pathCheck.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', pathCheck.totalStages, 152);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 79):
```js
  check('LEARNING_PATH has 151 stages total', phaseCheck.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total', phaseCheck.totalStages, 152);
```

`test-left-hand-learning-path.cjs`:

Current (line 116):
```js
  check('LEARNING_PATH has 151 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseCheck.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseCheck.totalStages, 152);
```

`test-left-hand-progressions.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
```

Current (line 74):
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('phase counts sum to 152', phaseData.phaseSum, 152);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 151 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', pathCheck.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', pathCheck.totalStages, 152);
```

`test-minor-progressions-in-new-keys.cjs`:

Current (line 28):
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
```

Current (line 79):
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('phase counts sum to 152', phaseData.phaseSum, 152);
```

`test-minor-progressions-with-inversions.cjs`:

Current (line 32):
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
```

Current (line 54):
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('phase counts sum to 152', phaseData.phaseSum, 152);
```

`test-progressions-in-new-keys.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
```

Current (line 77):
```js
  check('phase counts sum to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('phase counts sum to 152', phaseData.phaseSum, 152);
```

`test-progressions-inverted-learning-path.cjs`:

Current (lines 42-43):
```js
  check('LEARNING_PATH has 151 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression)', phaseData.totalStages, 151);
  check('LEARNING_PATH_PHASES sums to 151', phaseData.phaseSum, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys + 1 Invert the Minor Progression + 1 Two-Handed Minor Progression)', phaseData.totalStages, 152);
  check('LEARNING_PATH_PHASES sums to 152', phaseData.phaseSum, 152);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 51):
```js
  check('LEARNING_PATH has 151 stages total', phaseCheck.totalStages, 151);
```
New:
```js
  check('LEARNING_PATH has 152 stages total', phaseCheck.totalStages, 152);
```

- [ ] **Step 4: Run all 16 files again to verify they pass**

```bash
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
node test-minor-progressions-with-inversions.cjs
node test-progressions-in-new-keys.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
```

Expected: every one prints `RESULT: PASS`.

- [ ] **Step 5: Confirm no other stale count or range-break references remain**

Run a repo-wide search to confirm no test file still hardcodes the old total, and re-check the stage-range boundary fresh:

```bash
grep -rn "\b151\b" test-*.cjs
grep -rn "'Four Chords, Two Hands'\|'First Scale'" test-*.cjs
```

For the first command, exclude any hit that is clearly unrelated to `LEARNING_PATH` (e.g. a `waitForTimeout(151)` or an unrelated numeric comment — confirm by reading the line). For the second command, confirm every remaining match either already reflects the new stage correctly, or is unaffected (e.g. `test-trim-phase7-scales.cjs`'s checks, which measure `LEARNING_PATH[idx+1]` after `'First Scale'` or an index-difference entirely within the "Major scales" phase — both are unaffected by an insertion before `'First Scale'`, since a uniform index shift cancels out of a difference).

Expected: no unaddressed `LEARNING_PATH`-related `151` reference remains, and the one stage-range check (Step 2) is the only adjacency-sensitive logic touching this boundary that needed fixing.

- [ ] **Step 6: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-two-handed-minor-progression.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals/range checks in other files; it must not touch Task 1's stage data or its own test).

- [ ] **Step 7: Commit**

```bash
git add test-two-handed-progressions-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-minor-progression.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-progressions.cjs test-left-hand-shape-warmup.cjs test-minor-progressions-in-new-keys.cjs test-minor-progressions-with-inversions.cjs test-progressions-in-new-keys.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs
git commit -m "Fix stage-range break and stale 151-stage assertions after adding Two-Handed Minor Progression"
```
