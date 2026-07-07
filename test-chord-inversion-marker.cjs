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

  const wrongVoicing = await page.evaluate(() => {
    buildKeyboard();
    currentPromptKey = 'chord|C|Major|1st inversion';
    heldNotes = new Set([60, 64, 67]); // C4, E4, G4 -- root position, wrong for "1st inversion"
    updateKeyboard();
    return {
      eIsMarked: keyElements.get(64).classList.contains('bass-target'), // E should be marked
      cIsMarked: keyElements.get(60).classList.contains('bass-target'), // C (current lowest) should not be
      eIsActive: keyElements.get(64).classList.contains('active'),      // still shown as a correct note too
    };
  });
  check('wrong inversion: the correct bass key (E) is marked bass-target', wrongVoicing.eIsMarked, true);
  check('wrong inversion: the currently-lowest key (C) is not marked', wrongVoicing.cIsMarked, false);
  check('marked key is still shown active (correct pitch class) alongside the marker', wrongVoicing.eIsActive, true);

  const correctVoicing = await page.evaluate(() => {
    buildKeyboard();
    currentPromptKey = 'chord|C|Major|1st inversion';
    heldNotes = new Set([64, 67, 72]); // E4, G4, C5 -- correct 1st inversion, E is lowest
    updateKeyboard();
    return {
      eIsMarked: keyElements.get(64).classList.contains('bass-target'),
    };
  });
  check('correct inversion: no bass-target marker once the bass note is right', correctVoicing.eIsMarked, false);

  const noInversionRequested = await page.evaluate(() => {
    buildKeyboard();
    currentPromptKey = 'chord|C|Major|'; // inversions checkbox off -- no bass requirement at all
    heldNotes = new Set([60, 64, 67]);   // root position
    updateKeyboard();
    return {
      anyMarked: [...keyElements.values()].some(el => el.classList.contains('bass-target')),
    };
  });
  check('inversions off: no bass-target marker ever appears', noInversionRequested.anyMarked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
