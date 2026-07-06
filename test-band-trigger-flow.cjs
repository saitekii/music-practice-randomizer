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

  // ── Band Mode ON: correct chord should ride out, not instantly advance ──
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.querySelector('input[name="timer"][value="metronome"]').click();
    metroBpmInput.value = '300';
    document.getElementById('metroNoteDuration').value = '4'; // Whole note
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    // Force a known C major prompt so the correct notes are predictable.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const keyBefore = await page.evaluate(() => currentPromptKey);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) via the MIDI path.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const stateRightAfter = await page.evaluate(() => ({
    currentPromptKey,
    rideOutActive,
    midiSuccessActive,
  }));
  check('prompt does not instantly advance when Band Mode is on', stateRightAfter.currentPromptKey, keyBefore);
  check('ride-out engaged', stateRightAfter.rideOutActive, true);
  check('success guard held during ride-out', stateRightAfter.midiSuccessActive, true);

  // Wait past one bar (4 beats @ 300bpm = 0.8s) for the ride-out to complete.
  await page.waitForTimeout(1200);
  const keyAfterRideOut = await page.evaluate(() => currentPromptKey);
  check('prompt advances once the ride-out bar completes', keyAfterRideOut !== keyBefore, true);

  // ── Band Mode OFF: correct chord should instantly advance (regression check) ──
  await page.evaluate(() => {
    // Fully tear down the running band scheduler so the OFF setting actually
    // takes effect (bandActive is only consulted when the metronome (re)starts).
    stopBandScheduler();
    stopMetronome();
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const bandActiveOff = await page.evaluate(() => bandActive);
  check('bandActive is false after Band Mode is turned off', bandActiveOff, false);

  const keyBefore2 = await page.evaluate(() => currentPromptKey);

  await page.evaluate(() => {
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  await page.waitForTimeout(50);
  const stateRightAfter2 = await page.evaluate(() => ({
    currentPromptKey,
    rideOutActive,
    midiSuccessActive,
  }));
  check('Band Mode off: does not engage ride-out', stateRightAfter2.rideOutActive, false);
  check('Band Mode off: prompt has not advanced yet at 50ms (still on the 700ms path)', stateRightAfter2.currentPromptKey, keyBefore2);

  await page.waitForTimeout(900); // triggerMidiSuccess advances after a fixed 700ms
  const keyAfter2 = await page.evaluate(() => currentPromptKey);
  check('Band Mode off: prompt still advances via the original 700ms path', keyAfter2 !== keyBefore2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
