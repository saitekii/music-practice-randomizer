# Scale Practice Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Scale practice mode actually enforce playing a scale in order (tonic up to the octave and back down), reject wrong notes by resetting progress to the start, and show persistent visual feedback for what's been played correctly — replacing the current order-agnostic, wrong-note-blind, feedback-free checking.

**Architecture:** Scale prompts get a new ordered `seq` (pitch classes for the full up-and-down run) from `getExpectedPCs()`. Matching moves from `checkMidi()`'s debounced held-note-set check (built for simultaneous chords) into `onMidiMessage()`'s note-on handler, which sees each keypress as a discrete sequential event via a new `scaleCursor`/`scalePlayedNotes` pair of state variables. `updateKeyboard()` renders `scalePlayedNotes` as a persistent green highlight. The existing "Hear It" demo (also reused by the Ear Training scale quiz) is extended to play the same full up-and-down run it now requires.

**Tech Stack:** Vanilla JS (`script.js`, no build step, no modules — every function/variable is a global), CSS custom properties (`style.css`), Playwright for browser-driven tests (`.cjs` scripts, run with `node <script>.cjs`).

## Global Constraints

- Matching is pitch-class based (`note % 12`), not tied to absolute octave/register — consistent with every other prompt type in this app.
- A wrong note always resets progress to the very first note of the run, regardless of how far into the sequence the mistake happened. No partial credit, no nearest-boundary reset.
- Visual feedback is persistent-green-for-played, red-while-held-for-wrong, no forward-looking "next note" hint.
- Only the `scale` prompt type is touched. `note`/`chord`/`interval`/`octave`/`diatonic`/`func` prompt checking and visual feedback must be unaffected.
- Applies uniformly to every entry already in `SCALE_INTERVALS` (both minors, both pentatonics, all 7 modes) — no per-type special-casing, no Learning Path / stage-data changes.
- The "Hear It" demo must always play exactly what the learner is now required to play (the full up-and-down `seq`), including for the Ear Training scale-quiz reuse of the same `playPromptKey()` function.

---

## Task 1: Sequential scale matching, reset, and visual feedback

**Files:**
- Modify: `script.js:617` (state declaration)
- Modify: `script.js:2309`, `script.js:2318`, `script.js:2582`, `script.js:3960` (the 4 existing `scaleNotesPlayed.clear()` reset call sites)
- Modify: `script.js:3496-3501` (`getExpectedPCs()`'s `scale` branch)
- Modify: `script.js:3610-3617` (`onMidiMessage()`'s note-on branch)
- Modify: `script.js:3663-3720` (`checkMidi()` — remove the `scale` branch)
- Modify: `script.js:3822-3832` (`isNoteWrong()` — remove the `scale` case)
- Modify: `script.js:3834-3851` (`updateKeyboard()`)
- Modify: `style.css` (new `.scale-correct` rules, after the existing `.black-key.wrong` block around line 1529)
- Test: `test-scale-order-enforcement.cjs`

**Interfaces:**
- Produces: `scaleCursor` (number, module-level, index into the current scale prompt's `seq`), `scalePlayedNotes` (array of MIDI note numbers, module-level), `checkScaleStep(note)` (function, no return value), `completeScalePrompt()` (function, no return value). `getExpectedPCs()`'s `scale`-type return value changes shape from `{ type: 'scale', pcs: number[] }` to `{ type: 'scale', seq: number[] }` — `seq` has length `2N + 1` where `N` is the scale type's interval count (e.g. 15 for a 7-note scale, 11 for a 5-note pentatonic).
- Consumes: existing `heldNotes` (Set), `demoNotes` (Set), `keyElements` (Map), `midiSuccessActive`, `bandActive`, `promptHadWrongNote`, `triggerMidiSuccess()`, `triggerBandSuccess(expected)`, `SCALE_INTERVALS`, `NOTE_TO_PC`.

- [ ] **Step 1: Write the failing test**

Create `test-scale-order-enforcement.cjs`:

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

  // 1. Sequence shape: up the scale's intervals, repeat the root as the turnaround, then
  // the same intervals in reverse back to the root.
  const seqs = await page.evaluate(() => ({
    major:   getExpectedPCs('scale|C|Major').seq,
    majPent: getExpectedPCs('scale|C|Major pentatonic').seq,
  }));
  check('C Major seq is up + turnaround + down (15 steps)', seqs.major,
    [0, 2, 4, 5, 7, 9, 11, 0, 11, 9, 7, 5, 4, 2, 0]);
  check('C Major pentatonic seq is up + turnaround + down (11 steps)', seqs.majPent,
    [0, 2, 4, 7, 9, 0, 9, 7, 4, 2, 0]);

  // 2. Playing the full run in order, one note at a time (released between each, as on a
  // real keyboard), advances the cursor through every step and triggers success at the end.
  const playThrough = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    midiSuccessActive = false;
    const seq = getExpectedPCs(currentPromptKey).seq;
    for (let i = 0; i < seq.length; i++) {
      const midiNote = 60 + seq[i];
      onMidiMessage({ data: [0x90, midiNote, 100] });
      onMidiMessage({ data: [0x80, midiNote, 0] });
    }
    return { cursorAtEnd: scaleCursor, playedCount: scalePlayedNotes.length, success: midiSuccessActive };
  });
  check('cursor reaches the end of the sequence', playThrough.cursorAtEnd, 15);
  check('all 15 notes recorded as played', playThrough.playedCount, 15);
  check('success triggers on the final correct note', playThrough.success, true);

  // 3. A wrong note resets progress to the very start, no matter how far into the run it
  // happens -- check at the very first note, mid-ascent, the turnaround, and mid-descent.
  const resetPoints = await page.evaluate(() => {
    const seq = getExpectedPCs('scale|C|Major').seq; // [0,2,4,5,7,9,11,0,11,9,7,5,4,2,0]
    const wrongPcFor = correctPc => (correctPc + 1) % 12; // always a semitone off, never correct
    const results = [];
    for (const mistakeAt of [0, 5, 7, 10]) {
      currentPromptKey = 'scale|C|Major';
      scaleCursor = 0;
      scalePlayedNotes = [];
      midiSuccessActive = false;
      promptHadWrongNote = false;
      for (let i = 0; i < mistakeAt; i++) {
        const n = 60 + seq[i];
        onMidiMessage({ data: [0x90, n, 100] });
        onMidiMessage({ data: [0x80, n, 0] });
      }
      const cursorBeforeMistake = scaleCursor;
      const wrongNote = 60 + wrongPcFor(seq[mistakeAt]);
      onMidiMessage({ data: [0x90, wrongNote, 100] });
      results.push({
        mistakeAt,
        cursorBeforeMistake,
        cursorAfterMistake: scaleCursor,
        playedAfterMistake: scalePlayedNotes.length,
        wrongNoteFlagged: promptHadWrongNote,
      });
      onMidiMessage({ data: [0x80, wrongNote, 0] });
    }
    return results;
  });
  for (const r of resetPoints) {
    check(`mistake at step ${r.mistakeAt}: cursor was at ${r.mistakeAt} before the mistake`, r.cursorBeforeMistake, r.mistakeAt);
    check(`mistake at step ${r.mistakeAt}: cursor resets to 0`, r.cursorAfterMistake, 0);
    check(`mistake at step ${r.mistakeAt}: all recorded progress cleared`, r.playedAfterMistake, 0);
    check(`mistake at step ${r.mistakeAt}: promptHadWrongNote is set`, r.wrongNoteFlagged, true);
  }

  // 4. Visual feedback: correct notes stay green after release; a wrong note flashes red
  // while held; a reset wipes the earlier green highlights.
  const visuals = await page.evaluate(() => {
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    midiSuccessActive = false;
    onMidiMessage({ data: [0x90, 60, 100] }); // C -- correct
    const cWhileHeld = keyElements.get(60).className;
    onMidiMessage({ data: [0x80, 60, 0] });   // release C
    const cAfterRelease = keyElements.get(60).className;
    onMidiMessage({ data: [0x90, 63, 100] }); // D# -- wrong, expected D next
    const wrongWhileHeld = keyElements.get(63).className;
    onMidiMessage({ data: [0x80, 63, 0] });
    const cAfterReset = keyElements.get(60).className;
    return { cWhileHeld, cAfterRelease, wrongWhileHeld, cAfterReset };
  });
  check('correct note shows scale-correct while held', visuals.cWhileHeld.includes('scale-correct'), true);
  check('correct note stays scale-correct after release', visuals.cAfterRelease.includes('scale-correct'), true);
  check('wrong note shows wrong while held', visuals.wrongWhileHeld.includes('wrong'), true);
  check("a reset clears the earlier note's scale-correct class", visuals.cAfterReset.includes('scale-correct'), false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-scale-order-enforcement.cjs`
Expected: the scenario-1 `check()` lines print `FAIL` first (`getExpectedPCs('scale|C|Major').seq` is `undefined` on the current code, which still returns `pcs`, not `seq`), then the script throws a `TypeError` inside scenario 2's `page.evaluate()` (`seq.length` on `undefined`) and exits without printing `RESULT: PASS`/`RESULT: FAIL`. That thrown error, on top of the scenario-1 `FAIL` lines, is the expected failure signature for this step — confirm you see at least those `FAIL` lines before the crash; if the script fails before printing anything at all, stop and re-check `index.html`'s script loads before debugging further.

- [ ] **Step 3: Implement the sequential matching engine**

In `script.js`, replace the `scaleNotesPlayed` state declaration at line 617:

Current:
```js
let scaleNotesPlayed  = new Set();
```

New:
```js
let scaleCursor       = 0;
let scalePlayedNotes  = [];
```

Replace all 4 existing reset call sites (`goBack()` at line 2309, `showPrompt()` at line 2318, `advanceToNextPrompt()` at line 2582, `disableMidi()` at line 3960) — each currently reads:

```js
  scaleNotesPlayed.clear();
```

Replace each occurrence with:

```js
  scaleCursor = 0;
  scalePlayedNotes = [];
```

Replace `getExpectedPCs()`'s `scale` branch at lines 3496-3501:

Current:
```js
  if (type === 'scale') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = SCALE_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    return { type: 'scale', pcs: intervals.map(i => (rootPC + i) % 12) };
  }
```

New:
```js
  if (type === 'scale') {
    const rootPC    = (NOTE_TO_PC[parts[1]] ?? -1);
    const intervals = SCALE_INTERVALS[parts[2]];
    if (rootPC === -1 || !intervals) return null;
    const up  = intervals.map(i => (rootPC + i) % 12);
    const seq = [...up, up[0], ...[...up].reverse()];
    return { type: 'scale', seq };
  }
```

Replace `onMidiMessage()`'s note-on branch at lines 3610-3617:

Current:
```js
  if (cmd === 0x90 && velocity > 0) {
    heldNotes.add(note);
    sustainedNotes.delete(note);
    scaleNotesPlayed.add(note % 12);
    synthNoteOn(note, velocity);
    updateKeyboard();
    clearTimeout(midiCheckTimer);
    midiCheckTimer = setTimeout(checkMidi, 100);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
```

New:
```js
  if (cmd === 0x90 && velocity > 0) {
    heldNotes.add(note);
    sustainedNotes.delete(note);
    synthNoteOn(note, velocity);
    checkScaleStep(note);
    updateKeyboard();
    clearTimeout(midiCheckTimer);
    midiCheckTimer = setTimeout(checkMidi, 100);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
```

Immediately before `function checkMidi() {` (line 3663), insert two new functions:

```js
// Advances scaleCursor when `note`'s pitch class matches the next expected step in the
// current scale prompt's up-and-down sequence (built by getExpectedPCs()'s 'scale' branch);
// any other pitch class resets progress back to the very first note, regardless of how far
// into the run the mistake happened. No-op for any prompt type other than 'scale' -- safe to
// call unconditionally from onMidiMessage()'s note-on branch for every prompt type.
function checkScaleStep(note) {
  if (midiSuccessActive) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected || expected.type !== 'scale') return;

  if (note % 12 === expected.seq[scaleCursor]) {
    scaleCursor++;
    scalePlayedNotes.push(note);
    if (scaleCursor === expected.seq.length) completeScalePrompt();
  } else {
    scaleCursor = 0;
    scalePlayedNotes = [];
  }
}

// Mirrors checkMidi()'s matched-branch dispatch for the 'scale' type: scale prompts are
// never multi-chord progressions (getProgressionInfo() only recognizes 'func' keys), so
// there's no advanceProgressionStep() case to consider here.
function completeScalePrompt() {
  if (bandActive) {
    triggerBandSuccess(getExpectedPCs(currentPromptKey));
  } else {
    triggerMidiSuccess();
  }
}

```

Remove the `scale` branch from `checkMidi()` (currently lines 3697-3698):

Current:
```js
  } else if (expected.type === 'scale') {
    matched = expected.pcs.every(pc => scaleNotesPlayed.has(pc));
  } else if (expected.type === 'interval') {
```

New:
```js
  } else if (expected.type === 'interval') {
```

Remove the `scale` case from `isNoteWrong()` (lines 3822-3832):

Current:
```js
function isNoteWrong(pc, expected) {
  if (!expected) return false;
  switch (expected.type) {
    case 'note':     return pc !== expected.pc;
    case 'chord':    return !expected.pcs.includes(pc);
    case 'scale':    return !expected.pcs.includes(pc);
    case 'interval': return pc !== expected.rootPC && pc !== expected.targetPC;
    case 'octave':   return pc !== expected.rootPC;
    default:         return false;
  }
}
```

New:
```js
function isNoteWrong(pc, expected) {
  if (!expected) return false;
  switch (expected.type) {
    case 'note':     return pc !== expected.pc;
    case 'chord':    return !expected.pcs.includes(pc);
    case 'interval': return pc !== expected.rootPC && pc !== expected.targetPC;
    case 'octave':   return pc !== expected.rootPC;
    default:         return false;
  }
}
```

Replace `updateKeyboard()` (lines 3834-3851):

Current:
```js
function updateKeyboard() {
  const expected   = getExpectedPCs(currentPromptKey);
  const heldPCs    = new Set([...heldNotes].map(n => n % 12));
  const sortedHeld = [...heldNotes].sort((a, b) => a - b);
  const pcsSatisfied = expected?.type === 'chord' && expected.pcs.every(pc => heldPCs.has(pc));
  const wrongBass = expected?.type === 'chord' && expected.requiredBassPc != null
    && pcsSatisfied && sortedHeld.length > 0 && sortedHeld[0] % 12 !== expected.requiredBassPc;

  for (const [n, el] of keyElements) {
    const isHeld       = heldNotes.has(n) || demoNotes.has(n);
    const isWrong      = heldNotes.has(n) && isNoteWrong(n % 12, expected);
    const isBassTarget = wrongBass && heldNotes.has(n) && n % 12 === expected.requiredBassPc;
    if (isWrong) promptHadWrongNote = true;
    el.classList.toggle('active', isHeld && !isWrong);
    el.classList.toggle('wrong',  isWrong);
    el.classList.toggle('bass-target', isBassTarget);
  }
}
```

New:
```js
function updateKeyboard() {
  const expected   = getExpectedPCs(currentPromptKey);
  const heldPCs    = new Set([...heldNotes].map(n => n % 12));
  const sortedHeld = [...heldNotes].sort((a, b) => a - b);
  const pcsSatisfied = expected?.type === 'chord' && expected.pcs.every(pc => heldPCs.has(pc));
  const wrongBass = expected?.type === 'chord' && expected.requiredBassPc != null
    && pcsSatisfied && sortedHeld.length > 0 && sortedHeld[0] % 12 !== expected.requiredBassPc;
  const isScale = expected?.type === 'scale';

  for (const [n, el] of keyElements) {
    const isHeld         = heldNotes.has(n) || demoNotes.has(n);
    const isScaleCorrect = isScale && scalePlayedNotes.includes(n);
    const isWrong         = isScale
      ? heldNotes.has(n) && !isScaleCorrect
      : heldNotes.has(n) && isNoteWrong(n % 12, expected);
    const isBassTarget = wrongBass && heldNotes.has(n) && n % 12 === expected.requiredBassPc;
    if (isWrong) promptHadWrongNote = true;
    el.classList.toggle('active', isHeld && !isWrong && !isScaleCorrect);
    el.classList.toggle('wrong',  isWrong);
    el.classList.toggle('scale-correct', isScaleCorrect);
    el.classList.toggle('bass-target', isBassTarget);
  }
}
```

In `style.css`, immediately after the `.black-key.wrong` block (ends around line 1529, right before `.key-label`), insert:

```css
.white-key.scale-correct {
  background: linear-gradient(180deg, #22c55e 0%, #4ade80 60%, #86efac 100%);
  border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.55);
}

.black-key.scale-correct {
  background: linear-gradient(180deg, #15803d 0%, #22c55e 60%, #4ade80 100%);
  border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.65);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-scale-order-enforcement.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`.

- [ ] **Step 5: Regression-check the other prompt types**

Run the existing chord/MIDI test to confirm nothing outside the `scale` type broke:

Run: `node test-chord-inversion-check.cjs`
Expected: `RESULT: PASS` (unchanged from before this task — `chord`-type matching, `isNoteWrong`, and `updateKeyboard`'s bass-target rendering are untouched by this task's edits).

- [ ] **Step 6: Commit**

```bash
git add script.js style.css test-scale-order-enforcement.cjs
git commit -m "Enforce ordered up-and-down scale matching with wrong-note reset and persistent visual feedback"
```

---

## Task 2: Extend Hear It / Ear Training demo to play the full up-and-down run

**Files:**
- Modify: `script.js:3886-3897` (`playPromptKey()`'s `scale` branch)
- Test: `test-scale-hear-it-descending.cjs`

**Interfaces:**
- Consumes: `getExpectedPCs()`'s `scale`-type `{ type: 'scale', seq: number[] }` shape (produced in Task 1), existing `demoNotes` (Set), `synthNoteOn(note, velocity)`, `synthNoteOff(note)`, `updateKeyboard()`, the existing `gap(ms)` helper defined inside `playPromptKey()`.

- [ ] **Step 1: Write the failing test**

Create `test-scale-hear-it-descending.cjs`:

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

  // Record every note the demo actually plays, by wrapping synthNoteOn for the duration of
  // one playPromptKey() call.
  const notesPlayed = await page.evaluate(async () => {
    const seen = [];
    const original = synthNoteOn;
    synthNoteOn = async (n, v) => { seen.push(n); return original(n, v); };
    await playPromptKey('scale|C|Major', null);
    synthNoteOn = original;
    return seen;
  });
  check('Hear It plays the full up-and-down run (15 notes)', notesPlayed.length, 15);
  check('demo starts on the root', notesPlayed[0], 60);
  check('demo reaches the octave at the turnaround', notesPlayed[7], 72);
  check('demo ends back on the root', notesPlayed[notesPlayed.length - 1], 60);
  check('descending half mirrors the ascending half around the turnaround',
    notesPlayed.slice(8), [...notesPlayed.slice(0, 7)].reverse());

  // The Ear Training scale quiz reuses playPromptKey() with the same 'scale|root|type' key
  // shape (see genEarScale()'s playKey) -- confirm it isn't broken by this change.
  const earQuizNotes = await page.evaluate(async () => {
    const seen = [];
    const original = synthNoteOn;
    synthNoteOn = async (n, v) => { seen.push(n); return original(n, v); };
    await playPromptKey('scale|D|Natural minor', null);
    synthNoteOn = original;
    return seen.length;
  });
  check('Ear Training scale-quiz playback (D Natural minor) also plays the full run', earQuizNotes, 15);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node test-scale-hear-it-descending.cjs`
Expected: the script throws. This task runs after Task 1 is already committed, and Task 1 changed `getExpectedPCs()`'s `scale` branch to return `{ type: 'scale', seq }` with no `.pcs` field — the *old* `playPromptKey()` code being replaced in this task still reads `expected.pcs.map(...)`, so it throws a `TypeError` (`Cannot read properties of undefined (reading 'map')`) as soon as a scale demo is played, before any note is recorded. Confirm the failure is that `TypeError` (or `notesPlayed` ends up empty/the evaluate call rejects) — that confirms the old code path is what's being replaced, not a passing result.

- [ ] **Step 3: Implement the extended demo**

In `script.js`, replace `playPromptKey()`'s `scale` branch at lines 3886-3897:

Current:
```js
    } else if (expected.type === 'scale') {
      const notes = expected.pcs.map(pc => 60 + pc).sort((a, b) => a - b);
      notes.push(notes[0] + 12);
      for (const n of notes) {
        demoNotes.add(n);
        await synthNoteOn(n, 85);
        updateKeyboard();
        await gap(240);
      }
      await gap(700);
      for (const n of [...demoNotes]) { demoNotes.delete(n); synthNoteOff(n); }
      updateKeyboard();

    } else if (expected.type === 'interval' || expected.type === 'octave') {
```

New:
```js
    } else if (expected.type === 'scale') {
      // expected.seq is [...up, up[0], ...reverse(up)] in pitch classes (see getExpectedPCs()'s
      // 'scale' branch) -- the first half is the plain ascending intervals. Map that half to
      // absolute MIDI notes near middle C and re-sort (mirrors the existing chord-demo
      // convention above: naive "60 + pc" can wrap out of ascending order depending on the
      // root), then rebuild the same up + octave-turnaround + down shape in real registers so
      // the demo always matches exactly what's now required to play.
      const half   = (expected.seq.length - 1) / 2;
      const upMidi = expected.seq.slice(0, half).map(pc => 60 + pc).sort((a, b) => a - b);
      const notes  = [...upMidi, upMidi[0] + 12, ...[...upMidi].reverse()];
      for (const n of notes) {
        demoNotes.add(n);
        await synthNoteOn(n, 85);
        updateKeyboard();
        await gap(240);
      }
      await gap(700);
      for (const n of [...demoNotes]) { demoNotes.delete(n); synthNoteOff(n); }
      updateKeyboard();

    } else if (expected.type === 'interval' || expected.type === 'octave') {
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node test-scale-hear-it-descending.cjs`
Expected: `RESULT: PASS`, every `check()` line shows `PASS`. (This test takes a few real seconds to run — 15 notes × 240ms + a 700ms tail — that's expected, not a hang.)

- [ ] **Step 5: Regression-check Task 1's test still passes**

Run: `node test-scale-order-enforcement.cjs`
Expected: `RESULT: PASS` (Task 2 only touches `playPromptKey()`, which Task 1's matching/reset/visual-feedback logic doesn't call).

- [ ] **Step 6: Commit**

```bash
git add script.js test-scale-hear-it-descending.cjs
git commit -m "Extend Hear It / Ear Training scale demo to play the full up-and-down run"
```
