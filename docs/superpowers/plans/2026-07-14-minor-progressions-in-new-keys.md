# Minor Progressions in New Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new 5-stage Learning Path phase, "Minor Progressions in New Keys," ramping the minor progression `i–iv–V` through minor keys ordered by key-signature accidental count — the minor-key mirror of the existing "Progressions in New Keys" phase.

**Architecture:** Pure content/stage-data addition to the existing `LEARNING_PATH` and `LEARNING_PATH_PHASES` arrays in `script.js`. `genFunctional()` already resolves `i–iv–V` correctly for any root in minor mode — no new generator or matching logic needed, only 5 new stage entries.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- 5 new stages, `i–iv–V` held fixed throughout — only the `notes` field ramps per stage, ordered by *minor-key* signature accidental count (different from the major-key ordering used elsewhere — see the exact per-root table below).
- All 5 stages: `cats: ['catFunctional']`, `chords: []`, `scales: []`, `progressions: ['i–iv–V']`, `timer: 'off'`. No inversions, no left-hand mode.
- New phase name: `'Minor Progressions in New Keys'`, inserted immediately after `'First Song, All 12 Keys'` (end of "Progressions in New Keys") and before `'Left Hand Shape'` (start of "Left-Hand Voicing").
- Minor-key accidental counts (`NOTES`-array spellings): A=0, D=1♭, E=1♯, G=2♭, B=2♯, C=3♭, F♯=3♯, F=4♭, C♯=4♯, B♭=5♭, E♭=6♭, A♭=7♭.
- `notes` arrays are always listed in `NOTES` array positional order (`['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']`), matching the existing convention.
- Zero new code beyond stage data: `genFunctional()`, `applyStage()`, `checkMidi()` etc. are untouched.
- The new stage lines in `script.js` must match the file's established column-alignment convention exactly (fields padded to reach fixed columns: `cats:` at char 146, `notes:` at 179, `chords:` at 252, `scales:` at 341, `progressions:` at 381, `timer:` at 449 — measured from existing sibling stages, e.g. `script.js:226`). This plan's Task 1 already contains the pre-formatted lines (each exactly 464 characters); copy them exactly.
- This insertion sits between two other phases' boundaries that already have adjacency assertions elsewhere in the test suite, at **both** the stage level (`'First Song, All 12 Keys'` → `'Left Hand Shape'`) and the phase level (`'Progressions in New Keys'` → `'Left-Hand Voicing'`). Both categories were checked during plan-writing — see Task 2's file list, which includes real adjacency fixes, not just stale-count fixes.

---

## Task 1: Add the 5 new stages and the new phase entry

**Files:**
- Modify: `script.js:247` (insert 5 new stage objects + a new phase comment, immediately after the `'First Song, All 12 Keys'` stage and before the existing `// ── Phase 5b: Left-Hand Voicing ──` comment)
- Modify: `script.js:388-389` (insert one new `LEARNING_PATH_PHASES` entry between `'Progressions in New Keys'` and `'Left-Hand Voicing'`)
- Test: `test-minor-progressions-in-new-keys.cjs`

**Interfaces:**
- Produces: 5 new `LEARNING_PATH` stage objects (`'First Minor Progression, New Keys'`, `'First Minor Progression, More Keys'`, `'First Minor Progression, Even More Keys'`, `'First Minor Progression, Almost All Keys'`, `'First Minor Progression, All 12 Keys'`), 1 new `LEARNING_PATH_PHASES` entry (`{ name: 'Minor Progressions in New Keys', count: 5 }`). `LEARNING_PATH.length` becomes 150 (was 145); `LEARNING_PATH_PHASES.length` becomes 25 (was 24); the phase-count sum still equals 150.

- [ ] **Step 1: Write the failing test**

Create `test-minor-progressions-in-new-keys.cjs`:

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

  // 1. The 5 new stages exist, in order, immediately between 'First Song, All 12 Keys' and
  // 'Left Hand Shape'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const allTwelveIdx = names.indexOf('First Song, All 12 Keys');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(allTwelveIdx + 1, allTwelveIdx + 6),
      nextAfter: names[allTwelveIdx + 6],
    };
  });
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
  check("the 5 new stages sit immediately after 'First Song, All 12 Keys', in order", placement.between, [
    'First Minor Progression, New Keys',
    'First Minor Progression, More Keys',
    'First Minor Progression, Even More Keys',
    'First Minor Progression, Almost All Keys',
    'First Minor Progression, All 12 Keys',
  ]);
  check("'Left Hand Shape' immediately follows the 5 new stages", placement.nextAfter, 'Left Hand Shape');

  // 2. Each stage's data: fixed i-iv-V, no chords/scales, no timer, and the exact cumulative
  // root-note set per stage (in NOTES array order).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      newKeys:   byName('First Minor Progression, New Keys'),
      moreKeys:  byName('First Minor Progression, More Keys'),
      evenMore:  byName('First Minor Progression, Even More Keys'),
      almostAll: byName('First Minor Progression, Almost All Keys'),
      all12:     byName('First Minor Progression, All 12 Keys'),
    };
  });
  const expectedCommon = { cats: ['catFunctional'], chords: [], scales: [], progressions: ['i–iv–V'], timer: 'off' };
  check('First Minor Progression, New Keys roots', stageData.newKeys.notes, ['D', 'E', 'A']);
  check('First Minor Progression, More Keys roots', stageData.moreKeys.notes, ['D', 'E', 'G', 'A', 'B']);
  check('First Minor Progression, Even More Keys roots', stageData.evenMore.notes, ['C', 'D', 'E', 'F#', 'G', 'A', 'B']);
  check('First Minor Progression, Almost All Keys roots', stageData.almostAll.notes,
    ['C', 'C#', 'D', 'E', 'F', 'F#', 'G', 'A', 'B']);
  check('First Minor Progression, All 12 Keys roots', stageData.all12.notes,
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
    const idx = names.indexOf('Minor Progressions in New Keys');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 25 entries', phaseData.totalPhases, 25);
  check('phase counts sum to 150', phaseData.phaseSum, 150);
  check("new phase's count is 5", phaseData.newPhaseCount, 5);
  check("new phase sits right after 'Progressions in New Keys'", phaseData.prevPhase, 'Progressions in New Keys');
  check("new phase sits right before 'Left-Hand Voicing'", phaseData.nextPhase, 'Left-Hand Voicing');

  // 4. applyStage() on one of the ramped stages sets exactly its cumulative root-note set and
  // nothing else. Root-note checkboxes are `<input type="checkbox" data-note="D">` etc
  // (index.html:552-563).
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression, Even More Keys');
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
  check("applyStage('First Minor Progression, Even More Keys') checks exactly its 7 cumulative roots",
    applied.checkedNotes, ['C', 'D', 'E', 'F#', 'G', 'A', 'B']);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with a multi-root pool active, genFunctional() produces
  // prompts rooted on more than one key, all in minor mode, all i-iv-V.
  const liveGen = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression, Even More Keys');
    applyStage(idx);
    const roots = new Set(), modes = new Set(), patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (prompt) {
        const parts = prompt.key.split('|');
        roots.add(parts[1]);
        modes.add(parts[2]);
        patterns.add(parts[3]);
      }
    }
    return { roots: [...roots].sort(), modes: [...modes], patterns: [...patterns] };
  });
  check('genFunctional() produces prompts rooted on more than just one key across 200 tries',
    liveGen.roots.length > 1, true);
  check('every generated root is in the stage\'s enabled set', liveGen.roots.every(r =>
    ['C', 'D', 'E', 'F#', 'G', 'A', 'B'].includes(r)), true);
  check('every generated prompt is in minor mode', liveGen.modes, ['minor']);
  check('every generated prompt is i-iv-V', liveGen.patterns, ['i–iv–V']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-minor-progressions-in-new-keys.cjs`
Expected: multiple `FAIL` lines (the 5 stages don't exist yet, `LEARNING_PATH.length` is still 145, `LEARNING_PATH_PHASES.length` is still 24, `applyStage()` on a nonexistent stage index throws or behaves unexpectedly). Confirm you see `FAIL` output, not a silent pass.

- [ ] **Step 3: Implement the stage data**

In `script.js`, insert 5 new stage entries and a new phase comment immediately after the `'First Song, All 12 Keys'` stage (line 247) and before the existing `// ── Phase 5b: Left-Hand Voicing ──` comment (line 248):

Current (`script.js:247-248`):
```js
  { name: 'First Song, All 12 Keys', hint: 'Remaining keys — all 12 roots now, same I–IV–V',                                                      cats: ['catFunctional'],         notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           timer: 'off' },
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

New:
```js
  { name: 'First Song, All 12 Keys', hint: 'Remaining keys — all 12 roots now, same I–IV–V',                                                      cats: ['catFunctional'],         notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: [],                             progressions: ['I–IV–V'],                                           timer: 'off' },
  // ── Phase 5a-2: Minor Progressions in New Keys ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  { name: 'First Minor Progression, New Keys', hint: 'i–iv–V in keys with 0–1 accidentals — D, E, A',                                             cats: ['catFunctional'],         notes: ['D','E','A'],                                                    chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  { name: 'First Minor Progression, More Keys', hint: 'Add G and B — 2 accidentals',                                                              cats: ['catFunctional'],         notes: ['D','E','G','A','B'],                                            chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  { name: 'First Minor Progression, Even More Keys', hint: 'Add C and F♯ — 3 accidentals',                                                        cats: ['catFunctional'],         notes: ['C','D','E','F#','G','A','B'],                                   chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  { name: 'First Minor Progression, Almost All Keys', hint: 'Add F and C♯ — 4 accidentals',                                                       cats: ['catFunctional'],         notes: ['C','C#','D','E','F','F#','G','A','B'],                          chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  { name: 'First Minor Progression, All 12 Keys', hint: 'Remaining keys — all 12 roots now, same i–iv–V',                                         cats: ['catFunctional'],         notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                              scales: [],                             progressions: ['i–iv–V'],                                           timer: 'off' },
  // ── Phase 5b: Left-Hand Voicing ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

The 5 new stage lines above are already formatted to match the file's column-alignment convention exactly (each is 464 characters total, matching sibling line 226's length exactly). Copy them exactly as shown, character for character — do not reformat or re-wrap them.

In `script.js`, insert one new `LEARNING_PATH_PHASES` entry between `'Progressions in New Keys'` and `'Left-Hand Voicing'` (currently lines 388-389):

Current (`script.js:388-389`):
```js
  { name: 'Progressions in New Keys', count: 5 },
  { name: 'Left-Hand Voicing', count: 6 },
```

New:
```js
  { name: 'Progressions in New Keys', count: 5 },
  { name: 'Minor Progressions in New Keys', count: 5 },
  { name: 'Left-Hand Voicing', count: 6 },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-minor-progressions-in-new-keys.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check adjacent Learning Path tests**

Run these two tests, which touch the exact boundary this task's insertion sits inside (both will show known, expected failures — Task 2's job, not this step's):

Run: `node test-progressions-in-new-keys.cjs`
Expected: mostly `PASS`, except 2 known failures Task 2 will fix — a stale stage-adjacency check (`"Left Hand Shape immediately follows the 5 new stages"`, line 35) and a stale phase-adjacency check (`"new phase sits right before 'Left-Hand Voicing'"`, line 80). Confirm no *other*, unexpected failures.

Run: `node test-left-hand-learning-path.cjs`
Expected: mostly `PASS`, except 2 more known failures Task 2 will fix — a stale stage-adjacency check (`afterProgressionsInNewKeys`, line 25/33) and a stale phase-adjacency check (`"Left-Hand Voicing" sits right after "Progressions in New Keys"`, line 112). Confirm no *other*, unexpected failures.

- [ ] **Step 6: Commit**

```bash
git add script.js test-minor-progressions-in-new-keys.cjs
git commit -m "Add Minor Progressions in New Keys phase: i-iv-V ramped through minor-key-signature accidental count"
```

---

## Task 2: Fix 4 real adjacency breaks and stale 145-stage / 24-phase assertions across the test suite

**Files:**
- Modify: `test-progressions-in-new-keys.cjs:35` (stage-adjacency fix) and `:27,77` (stage/phase count) and `:80` (phase-adjacency fix)
- Modify: `test-left-hand-learning-path.cjs:25,33` (stage-adjacency fix) and `:112` (phase-adjacency fix) and `:114,116` (phase/stage count)
- Modify: `test-all-paths-popup-redesign.cjs:35,37,69,70,71,112` (phase count, stage count)
- Modify: `test-audit-fixes-extended-chords-phase.cjs:53` (stage count)
- Modify: `test-audit-fixes-scales-phase.cjs:54` (stage count)
- Modify: `test-dim-aug-warmup.cjs:39,40,42` (stage count, phase count)
- Modify: `test-first-minor-progression.cjs:27,53,54` (stage count, phase count)
- Modify: `test-first-progressions.cjs:47` (stage count)
- Modify: `test-jazz-progressions-learning-path.cjs:77,79` (phase count, stage count)
- Modify: `test-left-hand-progressions.cjs:27,73,74` (stage count, phase count)
- Modify: `test-left-hand-shape-warmup.cjs:93` (stage count)
- Modify: `test-progressions-inverted-learning-path.cjs:42,43` (stage count, phase count)
- Modify: `test-secondary-dominant-learning-path.cjs:49,51` (phase count, stage count)
- Modify: `test-two-handed-progressions-learning-path.cjs:38,39` (stage count, phase count)

**Interfaces:**
- Consumes: `LEARNING_PATH.length === 150` and `LEARNING_PATH_PHASES.length === 25` (established in Task 1).

Most of this task is mechanical fallout from Task 1 changing the live stage/phase counts (145→150, 24→25). **Four lines are real adjacency fixes, not just stale numbers** — Task 1's insertion sits directly inside a boundary that two other files already had hardcoded adjacency assertions on, at both the stage and phase level:

1. `test-progressions-in-new-keys.cjs:35` — asserted `'Left Hand Shape'` immediately follows the 5 "Progressions in New Keys" stages. Now `'First Minor Progression, New Keys'` (Task 1's first stage) does instead.
2. `test-progressions-in-new-keys.cjs:80` — asserted the `'Progressions in New Keys'` phase sits immediately before `'Left-Hand Voicing'`. Now `'Minor Progressions in New Keys'` (Task 1's new phase) sits immediately after it instead.
3. `test-left-hand-learning-path.cjs:25,33` — asserted the stage immediately before `'Left Hand Shape'` is `'First Song, All 12 Keys'`. Now it's `'First Minor Progression, All 12 Keys'` (Task 1's last stage) instead.
4. `test-left-hand-learning-path.cjs:112` — asserted the `'Left-Hand Voicing'` phase sits immediately after the `'Progressions in New Keys'` phase. Now `'Minor Progressions in New Keys'` sits between them, so `'Left-Hand Voicing'` sits immediately after *that* phase instead.

**Two lines elsewhere in the suite must NOT be touched** (pre-existing, unrelated) — `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76` both assert `'Functional harmony phase count is 26 (22 + 4 new stages)'`, the internal stage count of the "Functional harmony" phase itself, not the total phase count. Leave both alone.

- [ ] **Step 1: Confirm each line is genuinely stale or a real adjacency break (not a further regression)**

Run each of the 14 affected test files and confirm every failure is exactly a `145`-vs-`150`, `24`-vs-`25`, or one of the 4 named adjacency mismatches, nothing else:

```bash
node test-progressions-in-new-keys.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: each prints one or more `FAIL` lines matching the categories above, and no `FAIL` line for any other reason. If any file fails for a different reason, STOP and report it — that would be a real regression, not fallout from this plan's known changes, and needs investigation before proceeding.

- [ ] **Step 2: Fix the 4 adjacency lines first**

`test-progressions-in-new-keys.cjs`:

Current (line 35):
```js
  check("Left Hand Shape immediately follows the 5 new stages", placement.nextAfter, 'Left Hand Shape');
```
New:
```js
  check("First Minor Progression, New Keys immediately follows the 5 new stages", placement.nextAfter, 'First Minor Progression, New Keys');
```

Current (line 80):
```js
  check("new phase sits right before 'Left-Hand Voicing'", phaseData.nextPhase, 'Left-Hand Voicing');
```
New:
```js
  check("new phase sits right before 'Minor Progressions in New Keys'", phaseData.nextPhase, 'Minor Progressions in New Keys');
```

`test-left-hand-learning-path.cjs`:

Current (line 25):
```js
      afterProgressionsInNewKeys: LEARNING_PATH[idx - 1]?.name === 'First Song, All 12 Keys',
```
New:
```js
      afterMinorProgressionsInNewKeys: LEARNING_PATH[idx - 1]?.name === 'First Minor Progression, All 12 Keys',
```

Current (line 33):
```js
  checkTrue('the 6 stages of Left-Hand Voicing start right after "Progressions in New Keys" (Speed Up, then the new phase, then Left-Hand Voicing)', stageData.afterProgressionsInNewKeys, JSON.stringify(stageData.names));
```
New:
```js
  checkTrue('the 6 stages of Left-Hand Voicing start right after "Minor Progressions in New Keys"', stageData.afterMinorProgressionsInNewKeys, JSON.stringify(stageData.names));
```

Current (line 112):
```js
  check('"Left-Hand Voicing" sits right after "Progressions in New Keys"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') - 1], 'Progressions in New Keys');
```
New:
```js
  check('"Left-Hand Voicing" sits right after "Minor Progressions in New Keys"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') - 1], 'Minor Progressions in New Keys');
```

- [ ] **Step 3: Fix each stale count line**

`test-progressions-in-new-keys.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```

Current (line 77):
```js
  check('phase counts sum to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```

`test-left-hand-learning-path.cjs`:

Current (line 114):
```js
  check('LEARNING_PATH_PHASES has 24 entries total', phaseCheck.phaseNames.length, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES has 25 entries total', phaseCheck.phaseNames.length, 25);
```

Current (line 116):
```js
  check('LEARNING_PATH has 145 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseCheck.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseCheck.totalStages, 150);
```

`test-all-paths-popup-redesign.cjs`:

Current (line 35):
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseData.phaseCount, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES has 25 entries', phaseData.phaseCount, 25);
```

Current (line 37):
```js
  check('LEARNING_PATH.length matches the expected 145 stages', phaseData.stageCount, 145);
```
New:
```js
  check('LEARNING_PATH.length matches the expected 150 stages', phaseData.stageCount, 150);
```

Current (lines 69-71):
```js
  check('24 phase headers rendered', groupedView.headerCount, 24);
  check('24 phase bodies rendered', groupedView.bodyCount, 24);
  check('all 145 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 145);
```
New:
```js
  check('25 phase headers rendered', groupedView.headerCount, 25);
  check('25 phase bodies rendered', groupedView.bodyCount, 25);
  check('all 150 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 150);
```

Current (line 112):
```js
  check('clearing search restores the 24 phase headers', clearedView, 24);
```
New:
```js
  check('clearing search restores the 25 phase headers', clearedView, 25);
```

`test-audit-fixes-extended-chords-phase.cjs`:

Current (line 53):
```js
  check('LEARNING_PATH has 145 stages', data.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages', data.totalStages, 150);
```

`test-audit-fixes-scales-phase.cjs`:

Current (line 54):
```js
  check('LEARNING_PATH has the expected 145 stages', data.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has the expected 150 stages', data.totalStages, 150);
```

`test-dim-aug-warmup.cjs`:

Current (lines 39-40):
```js
  check('LEARNING_PATH has 145 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
```

Current (line 42):
```js
  check('LEARNING_PATH_PHASES has 24 entries (21 + Progressions in New Keys + First Minor Progression + Left-Hand Progressions)', phaseData.totalPhases, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES has 25 entries (21 + Progressions in New Keys + First Minor Progression + Left-Hand Progressions + Minor Progressions in New Keys)', phaseData.totalPhases, 25);
```

`test-first-minor-progression.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```

Current (line 53):
```js
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES grows to 25 entries', phaseData.totalPhases, 25);
```

Current (line 54):
```js
  check('phase counts sum to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```

`test-first-progressions.cjs`:

Current (line 47):
```js
  check('LEARNING_PATH has 145 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', pathCheck.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);
```

`test-jazz-progressions-learning-path.cjs`:

Current (line 77):
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseCheck.phaseCount, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES has 25 entries', phaseCheck.phaseCount, 25);
```

Current (line 79):
```js
  check('LEARNING_PATH has 145 stages total', phaseCheck.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total', phaseCheck.totalStages, 150);
```

`test-left-hand-progressions.cjs`:

Current (line 27):
```js
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH grows to 150 stages', placement.totalStages, 150);
```

Current (lines 73-74):
```js
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
  check('phase counts sum to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('LEARNING_PATH_PHASES grows to 25 entries', phaseData.totalPhases, 25);
  check('phase counts sum to 150', phaseData.phaseSum, 150);
```

`test-left-hand-shape-warmup.cjs`:

Current (line 93):
```js
  check('LEARNING_PATH has 145 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', pathCheck.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);
```

`test-progressions-inverted-learning-path.cjs`:

Current (lines 42-43):
```js
  check('LEARNING_PATH has 145 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
```

`test-secondary-dominant-learning-path.cjs`:

Current (line 49):
```js
  check('LEARNING_PATH_PHASES has 24 entries', phaseCheck.phaseCount, 24);
```
New:
```js
  check('LEARNING_PATH_PHASES has 25 entries', phaseCheck.phaseCount, 25);
```

Current (line 51):
```js
  check('LEARNING_PATH has 145 stages total', phaseCheck.totalStages, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total', phaseCheck.totalStages, 150);
```

`test-two-handed-progressions-learning-path.cjs`:

Current (lines 38-39):
```js
  check('LEARNING_PATH has 145 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
```
New:
```js
  check('LEARNING_PATH has 150 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
```

- [ ] **Step 4: Run all 14 files again to verify they pass**

```bash
node test-progressions-in-new-keys.cjs
node test-left-hand-learning-path.cjs
node test-all-paths-popup-redesign.cjs
node test-audit-fixes-extended-chords-phase.cjs
node test-audit-fixes-scales-phase.cjs
node test-dim-aug-warmup.cjs
node test-first-minor-progression.cjs
node test-first-progressions.cjs
node test-jazz-progressions-learning-path.cjs
node test-left-hand-progressions.cjs
node test-left-hand-shape-warmup.cjs
node test-progressions-inverted-learning-path.cjs
node test-secondary-dominant-learning-path.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: every one prints `RESULT: PASS`.

- [ ] **Step 5: Confirm no other stale count or adjacency references remain**

Run a repo-wide search to confirm no test file still hardcodes the old totals, and re-check both adjacency boundaries fresh:

```bash
grep -rn "\b145\b" test-*.cjs
grep -rln "LEARNING_PATH_PHASES" test-*.cjs
grep -rn "'First Song, All 12 Keys'\|'Left Hand Shape'" test-*.cjs
grep -rn "'Progressions in New Keys'\|'Left-Hand Voicing'" test-*.cjs
```

For the second command, manually check each matching file's `24`-valued assertions against whether they reference `LEARNING_PATH_PHASES.length`/a total phase count (must become `25`) versus an unrelated field like `functionalHarmonyCount` (leave untouched — see this task's note above about `test-borrowed-chords-learning-path.cjs:81` and `test-jazz-progressions-learning-path.cjs:76`). For the third and fourth commands, confirm every remaining match is either already-fixed (references `'First Minor Progression, ...'`/`'Minor Progressions in New Keys'` correctly) or is a same-phase internal lookup unaffected by this insertion (e.g. `test-left-hand-shape-warmup.cjs`'s `LEARNING_PATH[idx+1]` check, which looks *within* the Left-Hand Voicing phase, not across this insertion's boundary).

Expected: the first command returns no matches. If any command finds a remaining stale or broken adjacency match not already covered by this task, fix it the same way before proceeding.

- [ ] **Step 6: Run Task 1's own test once more to confirm no cross-contamination**

Run: `node test-minor-progressions-in-new-keys.cjs`
Expected: `RESULT: PASS` (this task only edits assertion literals/adjacency checks in other files; it must not touch Task 1's stage data or its own test).

- [ ] **Step 7: Commit**

```bash
git add test-progressions-in-new-keys.cjs test-left-hand-learning-path.cjs test-all-paths-popup-redesign.cjs test-audit-fixes-extended-chords-phase.cjs test-audit-fixes-scales-phase.cjs test-dim-aug-warmup.cjs test-first-minor-progression.cjs test-first-progressions.cjs test-jazz-progressions-learning-path.cjs test-left-hand-progressions.cjs test-left-hand-shape-warmup.cjs test-progressions-inverted-learning-path.cjs test-secondary-dominant-learning-path.cjs test-two-handed-progressions-learning-path.cjs
git commit -m "Fix 4 adjacency breaks and stale 145-stage/24-phase assertions after adding Minor Progressions in New Keys"
```
