const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Bug: the left-hand/right-hand split used a fixed MIDI-60 (middle C) cutoff. For any root from
  // F through B, the natural left-hand voicing (root at the highest octave instance below middle C,
  // 5th a perfect fifth above it) pushes the 5th to or past MIDI 60, misclassifying it as a
  // right-hand note even though it was physically played by the left hand -- so the left-hand
  // requirement (root + 5th both below the split) silently fails despite every pitch class being
  // correct. This sweeps all 12 roots with that exact natural voicing shape.
  const notesList = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const sweep = await page.evaluate((notesList) => {
    const out = {};
    for (const note of notesList) {
      const key = `chord|${note}|Major||LH`;
      const expected = getExpectedPCs(key);
      const rootPc = expected.pcs[0];
      const rootBelow60 = 48 + rootPc;
      const leftRoot = rootBelow60 <= 59 ? rootBelow60 : rootBelow60 - 12;
      const leftFifth = leftRoot + 7;
      const rightRoot = leftRoot + 12;
      const rightThird = rightRoot + ((expected.pcs[1] - rootPc + 12) % 12);
      const rightFifth = rightRoot + 7;

      midiEnabled = true;
      currentPromptKey = key;
      promptStartTime = Date.now();
      midiSuccessActive = false;
      heldNotes = new Set([leftRoot, leftFifth, rightRoot, rightThird, rightFifth]);
      checkMidi();
      out[note] = midiSuccessActive;
    }
    return out;
  }, notesList);

  notesList.forEach(note => {
    check(`${note} Major, natural left-hand voicing (root+5th just below middle C, full chord above) matches`, sweep[note], true);
  });

  // Regression: a chord with the correct pitch classes but played entirely in ONE register (no real
  // two-hand separation at all) must still be rejected -- the fix must not become too lenient.
  const noSeparation = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- nothing below middle C at all
    checkMidi();
    return midiSuccessActive;
  });
  check('right pitch classes but no left-hand register at all still does NOT match (regression)', noSeparation, false);

  // Regression: the original, already-working C major two-hand voicing (from test-left-hand-mode-check.cjs)
  // must still match after the fix.
  const originalCase = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([48, 55, 60, 64, 67]); // C3, G3 (left) + C4, E4, G4 (right)
    checkMidi();
    return midiSuccessActive;
  });
  check('the original C major two-hand voicing still matches (no regression)', originalCase, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
