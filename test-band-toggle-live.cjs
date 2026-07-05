const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Engage Band Mode: MIDI enabled, metronome mode, "2 bars" change so eligibility
  // holds regardless of time signature, and bandModeToggle checked before entering
  // metronome mode so startMetronome() picks the scheduler path from the start.
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('metroNoteDuration').value = '8';
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('metroTimeSig').value = '4';
    document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    document.querySelector('input[name="timer"][value="metronome"]').click();
    showPrompt();
  });
  await page.waitForTimeout(150);

  const engaged = await page.evaluate(() => ({
    bandActive: bandActive,
    bandSchedulerId: bandSchedulerId !== null,
    metroIntervalId: metroIntervalId !== null,
  }));
  check('scheduler engaged after entering metronome mode with Band Mode on', engaged.bandActive && engaged.bandSchedulerId && !engaged.metroIntervalId, true);

  // Uncheck Band Mode mid-session (scheduler already running) and dispatch change.
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(150);

  const disengaged = await page.evaluate(() => ({
    bandActive: bandActive,
    bandSchedulerId: bandSchedulerId,
    metroIntervalId: metroIntervalId !== null,
  }));
  check('bandActive becomes false immediately after unchecking bandModeToggle', disengaged.bandActive, false);
  check('bandSchedulerId cleared after unchecking bandModeToggle', disengaged.bandSchedulerId, null);
  check('plain metronome interval takes over after unchecking bandModeToggle', disengaged.metroIntervalId, true);

  // Re-check Band Mode mid-session (plain metronome running) and dispatch change.
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(150);

  const reengaged = await page.evaluate(() => ({
    bandActive: bandActive,
    bandSchedulerId: bandSchedulerId !== null,
    metroIntervalId: metroIntervalId !== null,
  }));
  check('bandActive becomes true again after re-checking bandModeToggle mid-session', reengaged.bandActive, true);
  check('bandSchedulerId set again after re-checking bandModeToggle', reengaged.bandSchedulerId, true);
  check('plain metronome interval torn down after re-checking bandModeToggle', reengaged.metroIntervalId, false);

  // ── Fix 1 regression: unchecking Band Mode mid-ride-out must not leave
  // midiSuccessActive stuck true (and must not permanently kill MIDI detection). ──
  await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    metroBpmInput.value = '120'; // slow bar (2s) so we have time to interrupt the ride-out
    document.getElementById('metroNoteDuration').value = '4'; // whole note = 4 beats/bar
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.querySelector('input[name="timer"][value="metronome"]').click();
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) to force a correct chord answer.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const rideOutState = await page.evaluate(() => ({ rideOutActive, midiSuccessActive }));
  check('ride-out engaged before interrupting Band Mode', rideOutState.rideOutActive && rideOutState.midiSuccessActive, true);

  // Uncheck Band Mode WHILE the ride-out is still in progress (well before the 2s bar ends).
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(50);

  const afterInterrupt = await page.evaluate(() => ({ midiSuccessActive, rideOutActive }));
  check('midiSuccessActive is cleared when scheduler is torn down mid-ride-out', afterInterrupt.midiSuccessActive, false);

  // Prove MIDI answer detection is not permanently dead: simulate another correct answer.
  await page.evaluate(() => {
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });
  await page.waitForTimeout(50);

  const detectionRevived = await page.evaluate(() => midiSuccessActive);
  check('MIDI answer detection works again after Band Mode is unchecked mid-ride-out', detectionRevived, true);

  check('no uncaught page errors during the whole test', errors.length, 0);
  if (errors.length) console.log('Errors seen:', errors);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
