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
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const result = await page.evaluate(async () => {
    await enableMidi();
    // lookAhead is only set lazily inside getSynthInstrument(), which only runs on the first
    // actual note trigger -- not at enableMidi() time.
    currentSynthPreset = 'Rhodes';
    await synthNoteOn(60, 100);
    synthNoteOff(60);
    const ctx = getAudioCtx();
    return {
      lookAhead: Tone.getContext().lookAhead,
      toneNowMinusCurrentTime: Tone.now() - ctx.currentTime,
    };
  });
  check('Tone.js lookAhead is set to 0 (no artificial scheduling delay)', result.lookAhead, 0);
  check('Tone.now() equals raw currentTime -- notes trigger immediately, not 100ms in the future', result.toneNowMinusCurrentTime, 0);

  // A full chord still triggers/releases correctly with zero lookahead -- no regression from
  // the latency fix.
  const chordResult = await page.evaluate(async () => {
    currentSynthPreset = 'Rhodes';
    let threw = false;
    try {
      await synthNoteOn(60, 100);
      await synthNoteOn(64, 100);
      await synthNoteOn(67, 100);
      synthNoteOff(60); synthNoteOff(64); synthNoteOff(67);
    } catch (e) { threw = true; }
    return { threw };
  });
  check('a full chord still triggers/releases without throwing at zero lookahead', chordResult.threw, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
