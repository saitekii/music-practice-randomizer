# Left-Hand Progressions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new 3-stage Learning Path phase, "Left-Hand Progressions," that gives learners practice playing progressions (the 3 existing major progressions plus the minor `i–iv–V`) with two-handed voicing (root+5th in the left hand), ramping through keys, right after "Left-Hand Voicing."

**Architecture:** Pure content/stage-data addition to the existing `LEARNING_PATH` and `LEARNING_PATH_PHASES` arrays in `script.js`. `genFunctional()`'s existing mode-eligibility logic and the `func` branch's left-hand fallback (root+5th whenever `functionalRequireInversions` is off) already generalize correctly across a mixed major/minor progression list — no new generator or matching logic needed, only 3 new stage entries.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 3 new stages, all sharing one key ramp: `Meet Left-Hand Progressions` (C only) → `Left-Hand Progressions, Nat. Keys` (7 naturals) → `Left-Hand Progressions, All 12` (all 12 keys).
- All 3 stages: `cats: ['catFunctional']`, `chords: ['leftHandMode']`, `scales: []`, `progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']` (unchanged across all 3 — 3 major progressions plus the minor one, all present from stage 1), no `requireProgressionInversions` field, `timer: 'off'` throughout.
- New phase name: `'Left-Hand Progressions'`, inserted immediately after `'Left Hand, All 12'` (end of "Left-Hand Voicing") and before `'Meet Inversions'` (start of "Triad inversions").
- `notes` arrays are always listed in `NOTES` array positional order (`['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']`), matching the existing convention used by every other stage in the file.
- Zero new code: `genFunctional()`, `applyStage()`, `checkMidi()`, `progressionAllowsLeftHand()` etc. are untouched.
- The new stage lines in `script.js` must match the file's established column-alignment convention exactly (fields padded to reach fixed columns: `cats:` at char 146, `notes:` at 179, `chords:` at 252, `scales:` at 341, `progressions:` at 381, `timer:` at 449 — measured from existing sibling stages, e.g. `script.js:226`). Get this right on the first attempt — this plan's Task 1 already contains the pre-formatted lines; copy them exactly.

---

## Task 1: Add the 3 new stages and the new phase entry

**Files:**
- Modify: `script.js:254` (insert 3 new stage objects + a new phase comment, immediately after the `'Left Hand, All 12'` stage and before the existing `// ── Phase 6: Triad inversions ──` comment)
- Modify: `script.js:385-386` (insert one new `LEARNING_PATH_PHASES` entry between `'Left-Hand Voicing'` and `'Triad inversions'`)
- Test: `test-left-hand-progressions.cjs`

**Interfaces:**
- Produces: 3 new `LEARNING_PATH` stage objects (`'Meet Left-Hand Progressions'`, `'Left-Hand Progressions, Nat. Keys'`, `'Left-Hand Progressions, All 12'`), 1 new `LEARNING_PATH_PHASES` entry (`{ name: 'Left-Hand Progressions', count: 3 }`). `LEARNING_PATH.length` becomes 145 (was 142); `LEARNING_PATH_PHASES.length` becomes 24 (was 23); the phase-count sum still equals 145.

- [ ] **Step 1: Write the failing test**

Create `test-left-hand-progressions.cjs`:

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

  // 1. The 3 new stages exist, in order, immediately between 'Left Hand, All 12' and 'Meet Inversions'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const allTwelveIdx = names.indexOf('Left Hand, All 12');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(allTwelveIdx + 1, allTwelveIdx + 4),
      nextAfter: names[allTwelveIdx + 4],
    };
  });
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
  check('the 3 new stages sit immediately after Left Hand, All 12, in order', placement.between, [
    'Meet Left-Hand Progressions',
    'Left-Hand Progressions, Nat. Keys',
    'Left-Hand Progressions, All 12',
  ]);
  check("'Meet Inversions' immediately follows the 3 new stages", placement.nextAfter, 'Meet Inversions');

  // 2. Each stage's data: fixed 4-progression content, left-hand mode, no scales, no timer, and
  // the exact cumulative root-note set per stage (in NOTES array order).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      meetLHP:  byName('Meet Left-Hand Progressions'),
      natKeys:  byName('Left-Hand Progressions, Nat. Keys'),
      all12:    byName('Left-Hand Progressions, All 12'),
    };
  });
  const expectedCommon = {
    cats: ['catFunctional'], chords: ['leftHandMode'], scales: [],
    progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'], timer: 'off',
  };
  check('Meet Left-Hand Progressions roots', stageData.meetLHP.notes, ['C']);
  check('Left-Hand Progressions, Nat. Keys roots', stageData.natKeys.notes, ['C','D','E','F','G','A','B']);
  check('Left-Hand Progressions, All 12 roots', stageData.all12.notes,
    ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
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
    const idx = names.indexOf('Left-Hand Progressions');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
  check('phase counts sum to 145', phaseData.phaseSum, 145);
  check("new phase's count is 3", phaseData.newPhaseCount, 3);
  check("new phase sits right after 'Left-Hand Voicing'", phaseData.prevPhase, 'Left-Hand Voicing');
  check("new phase sits right before 'Triad inversions'", phaseData.nextPhase, 'Triad inversions');

  // 4. applyStage() on the first stage sets exactly its root, exactly the 4 progression
  // checkboxes, leftHandMode on, no scales/inversions-required. Root-note checkboxes are
  // `<input data-note="C">`; progression checkboxes are `<input data-pattern="...">`.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left-Hand Progressions');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    const checkedPatterns = ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']
      .filter(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked);
    return {
      checkedNotes,
      checkedPatterns,
      leftHandChecked: document.getElementById('leftHandMode').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      requireInversionsChecked: document.getElementById('functionalRequireInversions')?.checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Meet Left-Hand Progressions') checks exactly the C root", applied.checkedNotes, ['C']);
  check('applyStage() checks exactly the 4 progression patterns', applied.checkedPatterns,
    ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']);
  check('applyStage() checks leftHandMode', applied.leftHandChecked, true);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() leaves functionalRequireInversions off', applied.requireInversionsChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check at the C-only stage: genFunctional() mixes Major and minor
  // modes, all 4 patterns appear, hand-mode is always 'LH'.
  const liveGenC = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left-Hand Progressions');
    applyStage(idx);
    const modes = new Set(), patterns = new Set(), handModes = new Set();
    for (let i = 0; i < 300; i++) {
      const p = genFunctional();
      if (p) {
        const parts = p.key.split('|');
        modes.add(parts[2]);
        patterns.add(parts[3]);
        handModes.add(parts[5]);
      }
    }
    return { modes: [...modes].sort(), patterns: [...patterns].sort(), handModes: [...handModes] };
  });
  check('both Major and minor modes appear', liveGenC.modes, ['Major', 'minor']);
  check('all 4 progression patterns appear', liveGenC.patterns,
    ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'].sort());
  check('hand mode is always LH', liveGenC.handModes, ['LH']);

  // 6. Live-generation check at the All-12 stage: minor-mode prompts appear rooted on more than
  // just C/A, proving the shared root pool genuinely extends minor coverage across the ramp.
  const liveGenAll12 = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left-Hand Progressions, All 12');
    applyStage(idx);
    const minorRoots = new Set();
    for (let i = 0; i < 400; i++) {
      const p = genFunctional();
      if (p) {
        const parts = p.key.split('|');
        if (parts[2] === 'minor') minorRoots.add(parts[1]);
      }
    }
    return [...minorRoots].sort();
  });
  check('minor prompts at the All-12 stage cover more than just C and A',
    liveGenAll12.length > 2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-left-hand-progressions.cjs`
Expected: multiple `FAIL` lines (the 3 stages don't exist yet, `LEARNING_PATH.length` is still 142, `LEARNING_PATH_PHASES.length` is still 23, `applyStage()` on a nonexistent stage index throws or behaves unexpectedly). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the stage data**

In `script.js`, insert 3 new stage entries and a new phase comment immediately after the `'Left Hand, All 12'` stage (line 254) and before the existing `// ── Phase 6: Triad inversions ──` comment (line 255):

Current (`script.js:254-255`):
```js
  { name: 'Left Hand, All 12',   hint: 'Every key — two-handed Major and Minor voicings, 10 seconds',                                               cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','leftHandMode'],                                      scales: [],                             timer: '10' },
  // ── Phase 6: Triad inversions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'Left Hand, All 12',   hint: 'Every key — two-handed Major and Minor voicings, 10 seconds',                                               cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','leftHandMode'],                                      scales: [],                             timer: '10' },
  // ── Phase 5c: Left-Hand Progressions ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'Meet Left-Hand Progressions', hint: 'Progressions with two-handed voicing — root+5th in the left hand, full chords in the right',      cats: ['catFunctional'],         notes: ['C'],                                                            chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'],             timer: 'off' },
  { name: 'Left-Hand Progressions, Nat. Keys', hint: 'Same two-handed progressions — all seven natural keys',                                     cats: ['catFunctional'],         notes: ['C','D','E','F','G','A','B'],                                    chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'],             timer: 'off' },
  { name: 'Left-Hand Progressions, All 12', hint: 'Every key now — two-handed voicing across major and minor progressions',                       cats: ['catFunctional'],         notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['leftHandMode'],                                                                scales: [],                             progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'],             timer: 'off' },
  // ── Phase 6: Triad inversions ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

The 3 new stage lines above are already formatted to match the file's column-alignment convention exactly (each is 464 characters total, matching sibling line 226's length exactly). Copy them exactly as shown, character for character — do not reformat or re-wrap them.

In `script.js`, insert one new `LEARNING_PATH_PHASES` entry between `'Left-Hand Voicing'` and `'Triad inversions'` (currently lines 385-386):

Current (`script.js:385-386`):
```js
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Triad inversions', count: 10 },
```

New:
```js
  { name: 'Left-Hand Voicing', count: 6 },
  { name: 'Left-Hand Progressions', count: 3 },
  { name: 'Triad inversions', count: 10 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-left-hand-progressions.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check the adjacent Left-Hand Voicing test**

Run: `node test-left-hand-learning-path.cjs`
Expected: mostly `PASS`, except for three *known, expected* failures that Task 2 will fix (a stale `beforeMeetInversions` stage-adjacency check at line 26/34, a stale phase-adjacency check at line 113, and the stale 142/23 totals at lines 114/116) — confirm no *other*, unexpected failures beyond those three.

- [ ] **Step 6: Commit**

```bash
git add script.js test-left-hand-progressions.cjs
git commit -m "Add Left-Hand Progressions phase: two-handed voicing across major and minor progressions, ramped by key"
```

---

## Task 2: Fix stale 142-stage / 23-phase assertions and one adjacency check across the test suite

**Files:**
- Modify: `test-all-paths-popup-redesign.cjs:35,37,69,70,71,112` (phase count and stage count)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53` (stage count)
- Modify: `test-audit-fixes-scales-phase.cjs:54` (stage count)
- Modify: `test-dim-aug-warmup.cjs:39,40,42` (stage count, phase count)
- Modify: `test-first-minor-progression.cjs:27,53,54` (stage count, phase count)
- Modify: `test-first-progressions.cjs:47` (stage count)
- Modify: `test-jazz-progressions-learning-path.cjs:77,79` (phase count, stage count)
- Modify: `test-left-hand-learning-path.cjs:26,34,113,114,116` (two adjacency checks **and** phase/stage count)
- Modify: `test-left-hand-shape-warmup.cjs:93` (stage count)
- Modify: `test-progressions-in-new-keys.cjs:27,76,77` (stage count, phase count)
- Modify: `test-progressions-inverted-learning-path.cjs:42,43` (stage count, phase count)
- Modify: `test-secondary-dominant-learning-path.cjs:49,51` (phase count, stage count)
- Modify: `test-two-handed-progressions-learning-path.cjs:38,39` (stage count, phase count)

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 145` and `LEARNING_PATH_PHASES.length === 24` (established in Task 1).

This task is almost entirely mechanical fallout from Task 1 changing the live stage/phase counts (142→145, 23→24) — every count-related line is an existing, already-passing test whose hardcoded expected number is now stale, including inside the human-readable label strings, not just the numeric assertion argument. **Two lines are real adjacency fixes, not just stale numbers**, both in `test-left-hand-learning-path.cjs`:
1. It asserted that `'Meet Inversions'` sits exactly 6 stages after `'Left Hand Shape'` (the whole Left-Hand Voicing phase's length) — Task 1's 3 new stages now sit in between, so `'Meet Left-Hand Progressions'` (not `'Meet Inversions'`) is what's actually 6 stages after `'Left Hand Shape'` now.
2. It asserted that the `'Left-Hand Voicing'` *phase* sits immediately before the `'Triad inversions'` *phase* — Task 1's new `'Left-Hand Progressions'` phase now sits between them, so `'Left-Hand Voicing'` is immediately followed by `'Left-Hand Progressions'`, not `'Triad inversions'`, at the phase level too.

**Two `test-*.cjs` lines elsewhere in the suite mention "22" but must NOT be touched** (pre-existing, unrelated to any of this session's stage-count changes) — `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76` both assert `'Functional harmony phase count is 26 (22 + 4 new stages)'`, which is the *internal stage count of the "Functional harmony" phase itself*, not the total phase count. Leave both alone.

- [ ] **Step 1: Confirm each line is genuinely stale (not a further regression)**

Run each of the 13 affected test files and confirm every failure is exactly a `142`-vs-`145`, `23`-vs-`24`, or the one named adjacency mismatch, nothing else:

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-in-new-keys.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines whose "got X, expected 142/145" (or `23`/`24`), plus `test-left-hand-learning-path.cjs` additionally showing two more `FAIL` lines: `'"Meet Inversions" immediately follows the 6 Left-Hand Voicing stages'` and `'"Left-Hand Voicing" sits right before "Triad inversions"'` — and no `FAIL` line for any other reason. If any file fails for a different reason, STOP and report it — that would be a real regression, not fallout from this plan's known changes, and needs investigation before proceeding.

- [ ] **Step 2: Fix the adjacency check first**

`test-left-hand-learning-path.cjs`:

Current (lines 25-26):
```js
      afterProgressionsInNewKeys: LEARNING_PATH[idx - 1]?.name === 'First Song, All 12 Keys',
      beforeMeetInversions: LEARNING_PATH[idx + 6]?.name === 'Meet Inversions',
```
New:
```js
      afterProgressionsInNewKeys: LEARNING_PATH[idx - 1]?.name === 'First Song, All 12 Keys',
      beforeLeftHandProgressions: LEARNING_PATH[idx + 6]?.name === 'Meet Left-Hand Progressions',
```

Current (line 34):
```js
  checkTrue('"Meet Inversions" immediately follows the 6 Left-Hand Voicing stages', stageData.beforeMeetInversions, null);
```
New:
```js
  checkTrue('"Meet Left-Hand Progressions" immediately follows the 6 Left-Hand Voicing stages', stageData.beforeLeftHandProgressions, null);
```

Current (line 113):
```js
  check('"Left-Hand Voicing" sits right before "Triad inversions"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') + 1], 'Triad inversions');
```
New:
```js
  check('"Left-Hand Voicing" sits right before "Left-Hand Progressions"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') + 1], 'Left-Hand Progressions');
```

- [ ] **Step 3: Fix each stale count line**

`test-all-paths-popup-redesign.cjs`:

Current (line 35):
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseData.phaseCount, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseData.phaseCount, 24);
```

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 142 stages', phaseData.stageCount, 142);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 145 stages', phaseData.stageCount, 145);
```

Current (lines 69-71):
```js
  check('23 phase headers rendered', groupedView.headerCount, 23);
  check('23 phase bodies rendered', groupedView.bodyCount, 23);
  check('all 142 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 142);
```
New:
```js
  check('24 phase headers rendered', groupedView.headerCount, 24);
  check('24 phase bodies rendered', groupedView.bodyCount, 24);
  check('all 145 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 145);
```

Current (line 112):
```js
  check('clearing search restores the 23 phase headers', clearedView, 23);
```
New:
```js
  check('clearing search restores the 24 phase headers', clearedView, 24);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 142 stages', data.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages', data.totalStages, 145);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 142 stages', data.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has the expected 145 stages', data.totalStages, 145);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-40):
```js
  check('LEARNING_PATH has 142 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```

Current (line 42):
```js
  check('LEARNING_PATH_PHASES has 23 entries (21 + Progressions in New Keys + First Minor Progression)', phaseData.totalPhases, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES has 24 entries (21 + Progressions in New Keys + First Minor Progression + Left-Hand Progressions)', phaseData.totalPhases, 24);
```

`test-first-minor-progression.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 142 stages', placement.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
```

Current (line 53):
```js
  check('LEARNING_PATH_PHASES grows to 23 entries', phaseData.totalPhases, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
```

Current (line 54):
```js
  check('phase counts sum to 142', phaseData.phaseSum, 142);
```
New:
```js
  check('phase counts sum to 145', phaseData.phaseSum, 145);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 142 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', pathCheck.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', pathCheck.totalStages, 145);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 77):
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseCheck.phaseCount, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseCheck.phaseCount, 24);
```

Current (line 79):
```js
  check('LEARNING_PATH has 142 stages total', phaseCheck.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total', phaseCheck.totalStages, 145);
```

`test-left-hand-learning-path.cjs` (count lines, after Step 2's adjacency fix already applied):

Current (line 114):
```js
  check('LEARNING_PATH_PHASES has 23 entries total', phaseCheck.phaseNames.length, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES has 24 entries total', phaseCheck.phaseNames.length, 24);
```

Current (line 116):
```js
  check('LEARNING_PATH has 142 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseCheck.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseCheck.totalStages, 145);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 142 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', pathCheck.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', pathCheck.totalStages, 145);
```

`test-progressions-in-new-keys.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 142 stages', placement.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
```

Current (line 76):
```js
  check('LEARNING_PATH_PHASES grows to 23 entries', phaseData.totalPhases, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
```

Current (line 77):
```js
  check('phase counts sum to 142', phaseData.phaseSum, 142);
```
New:
```js
  check('phase counts sum to 145', phaseData.phaseSum, 145);
```

`test-progressions-inverted-learning-path.cjs`:

Current (lines 42-43):
```js
  check('LEARNING_PATH has 142 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 49):
```js
  check('LEARNING_PATH_PHASES has 23 entries', phaseCheck.phaseCount, 23);
```
New:
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseCheck.phaseCount, 24);
```

Current (line 51):
```js
  check('LEARNING_PATH has 142 stages total', phaseCheck.totalStages, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total', phaseCheck.totalStages, 145);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 38-39):
```js
  check('LEARNING_PATH has 142 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression)', phaseData.totalStages, 142);
  check('LEARNING_PATH_PHASES sums to 142', phaseData.phaseSum, 142);
```
New:
```js
  check('LEARNING_PATH has 145 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```

- [ ] **Step 4: Run all 13 files again to verify they pass**

```bash
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
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

- [ ] **Step 5: Confirm no other stale count references remain**

Run a repo-wide search to confirm no test file still hardcodes the old totals anywhere this task's file list might have missed:

```bash
grep -rn "\b142\b" test-*.cjs
grep -rln "LEARNING_PATH_PHASES" test-*.cjs
```

For the second command, manually check each matching file's `23`-valued assertions against whether they reference `LEARNING_PATH_PHASES.length`/a total phase count (must become `24`) versus an unrelated field like `functionalHarmonyCount` that only coincidentally equals a different number (leave untouched — see this task's note above about `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76`, both of which reference `26 (22 + 4 new stages)`, not a total-phase-count `23`).

Expected: the first command returns no matches. If either command finds a remaining stale total-phase-count match not in this task's file list, fix it the same way (stale total → 145, stale phase count → 24) before proceeding.

- [ ] **Step 6: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-left-hand-progressions.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals in other files; it must not touch Task 1's stage data or its own test).

- [ ] **Step 7: Commit**

```bash
git add test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-minor-progression.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-learning-path.cjs test-left-hand-shape-warmup.cjs test-progressions-in-new-keys.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs
git commit -m "Fix stale 142-stage/23-phase assertions and one adjacency check after adding Left-Hand Progressions"
```
