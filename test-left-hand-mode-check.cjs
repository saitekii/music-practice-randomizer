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

  const genResult = await page.evaluate(() => {
    document.querySelectorAll('#chordsOptions input[type="checkbox"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('chordMajor').checked = true;
    document.getElementById('leftHandMode').checked = true;
    const prompt = genChord();
    return { key: prompt.key, line2: prompt.line2 };
  });
  check('genChord() with Left-Hand mode on and only Major enabled produces a 5-segment LH key', genResult.key, 'chord|C|Major||LH');
  check('genChord() shows a left-hand hint instead of an inversion label', genResult.line2, 'Left hand: root + 5th');

  const fallbackResult = await page.evaluate(() => {
    document.querySelectorAll('#chordsOptions input[type="checkbox"]').forEach(el => { el.checked = false; });
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('chordDom7').checked = true; // not Major/Minor -- Left-Hand mode should not apply
    document.getElementById('leftHandMode').checked = true;
    const prompt = genChord();
    return { key: prompt.key };
  });
  check('genChord() falls back to normal (non-LH) key for a non-Major/Minor type even with Left-Hand mode checked', fallbackResult.key, 'chord|C|Dominant 7||');

  const shapes = await page.evaluate(() => ({
    lhExpected:  getExpectedPCs('chord|C|Major||LH'),
    normalExpected: getExpectedPCs('chord|C|Major||'),
  }));
  check('LH-mode expectation has leftHandPcs = root + 5th (C, G)', JSON.stringify(shapes.lhExpected.leftHandPcs), JSON.stringify([0, 7]));
  check('LH-mode expectation has rightHandPcs = full chord (C, E, G)', JSON.stringify(shapes.lhExpected.rightHandPcs), JSON.stringify([0, 4, 7]));
  check('non-LH expectation has no leftHandPcs field', 'leftHandPcs' in shapes.normalExpected, false);

  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    const results = {};

    // Correct two-hand voicing: C+G below middle C (left hand), C+E+G at/above middle C (right hand).
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([48, 55, 60, 64, 67]); // C3, G3 (left) + C4, E4, G4 (right)
    checkMidi();
    results.correctTwoHandVoicingMatches = midiSuccessActive;

    // Right pitch classes overall, but everything played in one hand's register (all above middle C).
    currentPromptKey = 'chord|C|Major||LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- nothing below middle C
    checkMidi();
    results.rightNotesWrongRegisterDoesNotMatch = midiSuccessActive;

    // Recording: a correct LH answer should land in adaptWeights.variations under 'Left Hand'.
    adaptWeights.variations = {};
    document.getElementById('adaptiveToggle').checked = true;
    recordAdaptiveResult('chord|C|Major||LH', 1000);
    results.leftHandCount = adaptWeights.variations['Left Hand']?.count;

    return results;
  });
  check('correct two-hand voicing (right notes, right registers) matches', behavior.correctTwoHandVoicingMatches, true);
  check('right pitch classes but wrong register does NOT match', behavior.rightNotesWrongRegisterDoesNotMatch, false);
  check('a correct Left-Hand answer is tracked in adaptWeights.variations under "Left Hand"', behavior.leftHandCount, 1);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
