# Scale Duplicate Note-On Retrigger Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `checkScaleStep()` so a MIDI keyboard that sends a duplicate note-on event for a single physical key press doesn't fail scale practice entirely — the duplicate should be silently ignored, not treated as the next (mismatched) step.

**Architecture:** A single guard clause added to `checkScaleStep()`, checked before the existing match/mismatch logic. No changes to `onMidiMessage()`, `getExpectedPCs()`, or any other function.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Playwright for testing.

## Global Constraints

- The guard only suppresses a note whose pitch class matches `expected.seq[scaleCursor - 1]` (the step *just* correctly played) — it must NOT suppress a note matching any *earlier* step further back in the sequence, which should still fail normally.
- The guard must not affect `scaleCursor === 0` (the very first note of an attempt) — verified this needs no special handling, since `expected.seq[-1]` is `undefined` in JavaScript and no real note's pitch class (0-11) can ever equal `undefined`.
- This fix was verified by hand against a real user's browser-console diagnostic trace (a MIDI keyboard double-firing every note-on) before this plan was written — the fix must be tested against that exact duplicate pattern, not just an abstract case.

---

### Task 1: Add the duplicate-retrigger guard

**Files:**
- Modify: `script.js` (`checkScaleStep()`)
- Create: `test-scale-duplicate-note-fix.cjs`

**Interfaces:**
- Produces: no new functions or signature changes — `checkScaleStep(note)` keeps its existing signature and behavior for every case except the new duplicate-suppression path.

- [ ] **Step 1: Write the failing test**

Create `test-scale-duplicate-note-fix.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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

  // --- Scenario 1: the exact real-world pattern from a user's diagnostic trace --
  // every note in a full C Major up-and-down scale fired TWICE via note-on, no
  // note-off between the pair. Must complete the scale, not reset at the first duplicate. ---
  const scenario1 = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet the Scales');
    applyStage(idx);
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    scaleWrongNotes.clear();
    midiSuccessActive = false;

    const sequence = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60];
    for (const note of sequence) {
      onMidiMessage({ data: [0x90, note, 100] }); // genuine press
      onMidiMessage({ data: [0x90, note, 100] }); // duplicate, no note-off between
    }
    return { finalCursor: scaleCursor, wrongNotes: [...scaleWrongNotes], midiSuccessActive };
  });
  check('every note doubled: scale still completes (midiSuccessActive fires)', scenario1.midiSuccessActive, true);
  checkTrue('no notes ended up in scaleWrongNotes despite every note being duplicated', scenario1.wrongNotes.length === 0, scenario1.wrongNotes.join(','));

  // --- Scenario 2: a genuinely wrong note (not a duplicate) still fails and resets,
  // including at scaleCursor === 0 (confirms the guard doesn't misfire there) ---
  const scenario2 = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'Meet the Scales'));
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    scaleWrongNotes.clear();
    midiSuccessActive = false;

    onMidiMessage({ data: [0x90, 62, 100] }); // D, wrong -- C (pc 0) is expected first
    return { cursor: scaleCursor, wrongNotes: [...scaleWrongNotes] };
  });
  check('a genuine wrong note at cursor 0 still resets/fails normally', scenario2.cursor, 0);
  checkTrue('the wrong note is recorded in scaleWrongNotes', scenario2.wrongNotes.includes(62), scenario2.wrongNotes.join(','));

  // --- Scenario 3: a note matching an EARLIER step (not the immediately-preceding one)
  // still fails normally -- must not be silently treated as a duplicate ---
  const scenario3 = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'Meet the Scales'));
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    scaleWrongNotes.clear();
    midiSuccessActive = false;

    // Correctly play C, D, E, F (cursor moves 0->4, now expecting G=pc7)
    [60, 62, 64, 65].forEach(n => onMidiMessage({ data: [0x90, n, 100] }));
    const cursorBeforeMistake = scaleCursor;
    // Now play C again (pc 0) -- this is TWO steps back (seq[0]), not the immediately
    // preceding step (seq[3] = F = pc5) -- must NOT be treated as a duplicate.
    onMidiMessage({ data: [0x90, 60, 100] });
    return { cursorBeforeMistake, cursorAfterMistake: scaleCursor, wrongNotes: [...scaleWrongNotes] };
  });
  check('cursor correctly reached 4 after C,D,E,F', scenario3.cursorBeforeMistake, 4);
  check('replaying C (2 steps back, not the immediately-preceding step) resets the cursor', scenario3.cursorAfterMistake, 0);
  checkTrue('the mistaken C is recorded as wrong, not silently ignored as a duplicate', scenario3.wrongNotes.includes(60), scenario3.wrongNotes.join(','));

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-scale-duplicate-note-fix.cjs`
Expected: FAIL — Scenario 1 fails (`midiSuccessActive` stays `false`, `wrongNotes` is non-empty) since the current code has no duplicate guard yet; the first duplicate note-on resets the whole attempt.

- [ ] **Step 3: Add the guard to `checkScaleStep()`**

The current function (script.js:3804-3822) reads:

```js
function checkScaleStep(note) {
  if (midiSuccessActive) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected || expected.type !== 'scale') return;

  if (note % 12 === expected.seq[scaleCursor]) {
    // Defensive: clears this specific note from the wrong set in case the same MIDI note
    // number is retriggered (0x90 with no intervening 0x80) after previously being wrong --
    // otherwise it could sit in both scaleWrongNotes and scalePlayedNotes at once.
    scaleWrongNotes.delete(note);
    scaleCursor++;
    scalePlayedNotes.push(note);
    if (scaleCursor === expected.seq.length) completeScalePrompt();
  } else {
    scaleWrongNotes.add(note);
    scaleCursor = 0;
    scalePlayedNotes = [];
  }
}
```

Change it to (adds the duplicate-retrigger guard right after the existing early-return checks; everything else is unchanged):

```js
function checkScaleStep(note) {
  if (midiSuccessActive) return;
  const expected = getExpectedPCs(currentPromptKey);
  if (!expected || expected.type !== 'scale') return;

  // Some MIDI keyboards send a duplicate/retriggered note-on for a single physical key
  // press. If this note matches the step we JUST correctly played (not the one we're
  // expecting next), treat it as a harmless duplicate and ignore it, rather than failing
  // the whole attempt -- verified live against a real user's diagnostic trace showing
  // exactly this double-fire pattern on every single note.
  if (scaleCursor > 0 && note % 12 === expected.seq[scaleCursor - 1]) return;

  if (note % 12 === expected.seq[scaleCursor]) {
    // Defensive: clears this specific note from the wrong set in case the same MIDI note
    // number is retriggered (0x90 with no intervening 0x80) after previously being wrong --
    // otherwise it could sit in both scaleWrongNotes and scalePlayedNotes at once.
    scaleWrongNotes.delete(note);
    scaleCursor++;
    scalePlayedNotes.push(note);
    if (scaleCursor === expected.seq.length) completeScalePrompt();
  } else {
    scaleWrongNotes.add(note);
    scaleCursor = 0;
    scalePlayedNotes = [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-scale-duplicate-note-fix.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 5: Run a regression sample**

```bash
node test-scale-order-enforcement.cjs
node test-scale-hear-it-descending.cjs
```

Expected: `RESULT: PASS` for both — confirms the existing scale-mechanics suite (order enforcement, wrong-note tracking, the "Hear It" demo) is unaffected by the new guard.

- [ ] **Step 6: Commit**

```bash
git add script.js test-scale-duplicate-note-fix.cjs
git commit -m "Fix scale practice: ignore duplicate note-on retriggers instead of failing the whole attempt"
```
