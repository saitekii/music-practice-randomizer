# Scales Recurrence Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Learning Path's biggest untracked retention gap — harmonic minor, melodic minor, both pentatonics, and modes (Phase 14 content) are never referenced by any stage after Phase 14, including the path's two later "everything" checkpoint stages — by widening those two checkpoints' `scales` field to include all 7 scale types.

**Architecture:** Pure data change to 2 existing `LEARNING_PATH` stage objects in `script.js` — no new stages, no `LEARNING_PATH_PHASES` count change, no stage reordering.

**Tech Stack:** Vanilla JS (`script.js`), Playwright `.cjs` test scripts — per `CLAUDE.md`, no build step, no framework.

## Global Constraints

- No new `LEARNING_PATH` entries and no `LEARNING_PATH_PHASES` count changes — this is a widening of an already-enabled category (`scales`) on 2 existing stages, not a new stage.
- Hint text on both stages stays unchanged (verified: neither hint currently enumerates specific scale types, so widening the actual `scales` array doesn't make either hint inaccurate).
- Intervals (the second half of the original "advanced content never recurs" finding) are explicitly out of scope for this plan — deferred as a separate future build.

---

### Task 1: Widen `scales` field on both capstone stages

**Files:**
- Modify: `script.js:310` (`'All Extensions, All Keys'` stage)
- Modify: `script.js:351` (`'Full Theory Workout'` stage)
- Test: `test-scales-recurrence-fix.cjs` (new)

**Interfaces:**
- Consumes: `SCALE_TYPES` (script.js:62-70) — the 7 scale-type ids (`scaleMajor`, `scaleNatMinor`, `scaleHarmMinor`, `scaleMelMinor`, `scaleMajPent`, `scaleMinPent`, `scaleModes`), read-only, not modified by this task.
- Consumes: `applyStage(idx)` (script.js:2824+) — already correctly iterates `ALL_SCALES = SCALE_TYPES.map(s => s.id)` and checks exactly `stage.scales` for each; requires zero code changes since it already generalizes to any scale list.
- Consumes: `genScale()` (script.js:2089-2109) — already reads scale-type eligibility purely from checkbox state via `checked(s.id)`; requires zero code changes.

#### Current code (script.js:310)

```javascript
  { name: 'All Extensions, All Keys', hint: 'Every chord type — triads, sevenths, sus, 9ths, 13ths, alterations — 10 seconds',                     cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','chordMaj7','chordMin7','chordDom7','chordSus2','chordSus4','chord7sus4','chordDom9','chordMaj9','chordMin9','chordDom13','chord7b9','chord7s9','chord7s11','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

#### Current code (script.js:351)

```javascript
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
```

- [ ] **Step 1: Write the failing test**

Create `test-scales-recurrence-fix.cjs`:

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

  const ALL_7_SCALES = ['scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor', 'scaleMajPent', 'scaleMinPent', 'scaleModes'];

  // --- Data check: both stages list all 7 scale types ---
  const dataCheck = await page.evaluate(([all7]) => {
    const ext = LEARNING_PATH.find(s => s.name === 'All Extensions, All Keys');
    const full = LEARNING_PATH.find(s => s.name === 'Full Theory Workout');
    return {
      extScales: ext ? ext.scales.slice().sort() : null,
      fullScales: full ? full.scales.slice().sort() : null,
      all7Sorted: all7.slice().sort(),
    };
  }, [ALL_7_SCALES]);
  check('All Extensions, All Keys lists all 7 scale types', dataCheck.extScales, dataCheck.all7Sorted);
  check('Full Theory Workout lists all 7 scale types', dataCheck.fullScales, dataCheck.all7Sorted);

  // --- applyStage() checks all 7 scale checkboxes for each stage ---
  const applyCheck = await page.evaluate(([all7]) => {
    const results = {};
    for (const name of ['All Extensions, All Keys', 'Full Theory Workout']) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = all7.every(id => document.getElementById(id).checked === true);
    }
    return results;
  }, [ALL_7_SCALES]);
  checkTrue('applyStage() on All Extensions, All Keys checks all 7 scale checkboxes', applyCheck['All Extensions, All Keys'], null);
  checkTrue('applyStage() on Full Theory Workout checks all 7 scale checkboxes', applyCheck['Full Theory Workout'], null);

  // --- Live-generation sanity check: genScale() can actually produce every scale
  //     family once one of these stages is applied, not just that the checkbox
  //     array contains the right strings. ---
  const genCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Full Theory Workout');
    applyStage(idx);
    document.getElementById('adaptiveToggle').checked = false; // deterministic uniform picks
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });

    const labels = new Set();
    for (let i = 0; i < 300; i++) {
      const prompt = genScale();
      if (!prompt) continue;
      labels.add(prompt.line1.split(' ').slice(1).join(' ')); // "C Harmonic minor" -> "Harmonic minor"
    }
    return [...labels];
  });
  const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
  checkTrue('genScale() produces Major', genCheck.includes('Major'), `labels=${JSON.stringify(genCheck)}`);
  checkTrue('genScale() produces Natural minor', genCheck.includes('Natural minor'), null);
  checkTrue('genScale() produces Harmonic minor', genCheck.includes('Harmonic minor'), null);
  checkTrue('genScale() produces Melodic minor', genCheck.includes('Melodic minor'), null);
  checkTrue('genScale() produces Major pentatonic', genCheck.includes('Major pentatonic'), null);
  checkTrue('genScale() produces Minor pentatonic', genCheck.includes('Minor pentatonic'), null);
  checkTrue('genScale() produces at least one mode', genCheck.some(l => MODE_NAMES.includes(l)), `labels=${JSON.stringify(genCheck)}`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node test-scales-recurrence-fix.cjs
```

Expected: FAIL — both `dataCheck` assertions fail (each stage's `scales` array has only 2 entries, not 7), and consequently the `applyCheck`/`genCheck` assertions fail too since the checkboxes never get checked for the missing 5 scale types.

- [ ] **Step 3: Widen `scales` on `'All Extensions, All Keys'` (script.js:310)**

Change:

```javascript
  { name: 'All Extensions, All Keys', hint: 'Every chord type — triads, sevenths, sus, 9ths, 13ths, alterations — 10 seconds',                     cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','chordMaj7','chordMin7','chordDom7','chordSus2','chordSus4','chord7sus4','chordDom9','chordMaj9','chordMin9','chordDom13','chord7b9','chord7s9','chord7s11','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

to:

```javascript
  { name: 'All Extensions, All Keys', hint: 'Every chord type — triads, sevenths, sus, 9ths, 13ths, alterations — 10 seconds',                     cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordDiminished','chordAugmented','chordMaj7','chordMin7','chordDom7','chordSus2','chordSus4','chord7sus4','chordDom9','chordMaj9','chordMin9','chordDom13','chord7b9','chord7s9','chord7s11','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'], timer: '10' },
```

- [ ] **Step 4: Widen `scales` on `'Full Theory Workout'` (script.js:351)**

Change:

```javascript
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
```

to:

```javascript
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
```

- [ ] **Step 5: Run the test, verify it passes**

```bash
node test-scales-recurrence-fix.cjs
```

Expected: `RESULT: PASS`.

- [ ] **Step 6: Run the broader Learning Path regression sweep**

```bash
node test-all-paths-popup-redesign.cjs
node test-progression-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-first-progressions.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all print `RESULT: PASS` (these assert stage-count/phase-count/adjacency invariants that this task's data-only change to 2 existing stages' `scales` field must not affect).

- [ ] **Step 7: Commit**

```bash
git add script.js test-scales-recurrence-fix.cjs
git commit -m "Widen scales field on both Learning Path capstone stages

Harmonic minor, melodic minor, both pentatonics, and modes (taught in
Phase 14) were never referenced by any stage after Phase 14, including
the path's two later 'everything' checkpoints -- both capped scales at
Major/Natural minor only, the exact content Phase 9 already taught.
Widened All Extensions, All Keys and Full Theory Workout to include all
7 scale types. Pure data change: no new stages, no LEARNING_PATH_PHASES
count change. applyStage()/genScale() already generalize correctly to
any scales list, so no other code changes were needed."
```

---

## Final Verification

```bash
node test-scales-recurrence-fix.cjs
node test-all-paths-popup-redesign.cjs
node test-progression-learning-path.cjs
node test-left-hand-learning-path.cjs
node test-first-progressions.cjs
node test-functional-harmony-bug-fix.cjs
```

Expected: all `RESULT: PASS`, zero failures.

After this ships, update `docs/learning-path-design.md` (refresh the `Content` column for both stages in the Phase 16 and Phase 19 tables, move this item from the second-critique-round open-issues list to a "Resolved" note with the date) and the `learning-path-audit.md` memory entry — these are controller follow-up steps, not part of this plan's tasks, matching how documentation updates were handled after every prior round this session.
