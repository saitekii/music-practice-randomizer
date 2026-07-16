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
