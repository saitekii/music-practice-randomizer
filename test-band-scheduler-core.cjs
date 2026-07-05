const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  await page.evaluate(() => {
    // Simulate MIDI being enabled without real hardware.
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelector('input[name="timer"][value="metronome"]').click();
    metroBpmInput.value = '300'; // fast, so the test doesn't take long
    document.getElementById('metroNoteDuration').value = '4'; // Whole note — eligible
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
  });
  await page.waitForTimeout(100);

  const engaged = await page.evaluate(() => ({
    bandActive: bandActive,
    metroIntervalId: metroIntervalId,
    bandSchedulerId: bandSchedulerId !== null,
  }));
  check('band scheduler engaged, old interval not used', engaged, { bandActive: true, metroIntervalId: null, bandSchedulerId: true });

  const keyBefore = await page.evaluate(() => currentPromptKey);

  // With no correct answer ever given, nothing should auto-advance any more --
  // the old "cycle through prompts regardless of correctness" behavior no longer
  // applies once Band Mode's scheduler is engaged; the very first chord waits
  // indefinitely, the same as every later one. Simulate several downbeats
  // directly (deterministic, no need to wait on real scheduler timing).
  await page.evaluate(() => { onBeatTick(0); onBeatTick(0); onBeatTick(0); });

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt does NOT auto-advance without ever answering correctly', keyAfter, keyBefore);

  // Manual "Next" (showPrompt()) while Band Mode is running must NOT tear down and
  // restart the scheduler — it should just reset the beat/change counters in place,
  // the same way the old setInterval path's `else` branch does.
  const result = await page.evaluate(() => {
    const bandSchedulerIdBefore = bandSchedulerId;
    showPrompt();
    return {
      bandSchedulerIdSame: bandSchedulerId === bandSchedulerIdBefore,
      bandActiveStillTrue: bandActive === true,
    };
  });
  check('showPrompt() does not tear down/recreate the running scheduler', result.bandSchedulerIdSame && result.bandActiveStillTrue, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
