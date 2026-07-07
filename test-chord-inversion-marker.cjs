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
    midiEnabled = true;
    updateMidiUI(); // makes #pianoKeyboard visible -- needed for real layout/geometry below
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

  // Regression guard for a real bug caught in review: the marker's CSS previously
  // positioned it entirely above the key's own box (top: -9px), which got silently
  // clipped by .piano-keyboard's forced overflow-y: auto (a side effect of
  // overflow-x: auto per the CSS Overflow spec) -- classList checks alone can't
  // catch that, since the class was still applied, it just never rendered visibly.
  // This checks the marker's actual computed geometry falls inside both the key's
  // own box and the keyboard container's visible (unclipped) client rect.
  const geometry = await page.evaluate(() => {
    const eKey = keyElements.get(64);
    const eRect = eKey.getBoundingClientRect();
    const keyboardRect = pianoKeyboard.getBoundingClientRect();
    const style = getComputedStyle(eKey, '::after');
    const markerTopOffset = parseFloat(style.top) || 0;
    const markerHeight = parseFloat(style.height) || 0;
    const markerY = eRect.top + markerTopOffset + markerHeight / 2;
    return {
      markerWithinKeyBox: markerY >= eRect.top && markerY <= eRect.bottom,
      markerWithinKeyboardBounds: markerY >= keyboardRect.top && markerY <= keyboardRect.bottom,
    };
  });
  check('bass-target marker geometry falls within the key\'s own box (not clipped)', geometry.markerWithinKeyBox, true);
  check('bass-target marker geometry falls within the keyboard\'s visible bounds', geometry.markerWithinKeyboardBounds, true);

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
