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

  const shapes = await page.evaluate(() => ({
    firstInv:  getExpectedPCs('chord|C|Major|1st inversion').requiredBassPc,
    secondInv: getExpectedPCs('chord|C|Major|2nd inversion').requiredBassPc,
    rootPos:   getExpectedPCs('chord|C|Major|Root position').requiredBassPc,
    noInv:     getExpectedPCs('chord|C|Major|').requiredBassPc,
    dom9:      getExpectedPCs('chord|C|Dominant 9|1st inversion').requiredBassPc,
    maj7Third: getExpectedPCs('chord|C|Major 7|3rd inversion').requiredBassPc,
  }));
  check('C Major 1st inversion requires the 3rd (E, pc 4) in the bass', shapes.firstInv, 4);
  check('C Major 2nd inversion requires the 5th (G, pc 7) in the bass', shapes.secondInv, 7);
  check('C Major Root position requires the root (C, pc 0) in the bass', shapes.rootPos, 0);
  check('inversions off (empty label) -- no bass requirement', shapes.noInv, null);
  check('excluded chord type (Dominant 9) -- no bass requirement', shapes.dom9, null);
  check('C Major 7 3rd inversion requires the 7th (B, pc 11) in the bass', shapes.maj7Third, 11);

  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    const results = {};

    // Correct 1st-inversion voicing (E lowest) should match.
    currentPromptKey = 'chord|C|Major|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([64, 67, 72]); // E4, G4, C5 -- E is lowest
    checkMidi();
    results.correctInversionMatches = midiSuccessActive;

    // Right notes, wrong inversion (root C lowest) should NOT match.
    currentPromptKey = 'chord|C|Major|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- root position
    checkMidi();
    results.wrongInversionRejected = midiSuccessActive;

    // Excluded chord type (Dominant 9) -- any voicing with the right pcs still matches.
    currentPromptKey = 'chord|C|Dominant 9|1st inversion';
    promptStartTime  = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67, 70, 62]); // C E G Bb D -- root position voicing
    checkMidi();
    results.excludedTypeStillLenient = midiSuccessActive;

    return results;
  });
  check('correct inversion voicing matches', behavior.correctInversionMatches, true);
  check('right notes but wrong inversion does not match', behavior.wrongInversionRejected, false);
  check('excluded chord type (Dominant 9) stays lenient regardless of bass note', behavior.excludedTypeStillLenient, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
