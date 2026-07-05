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

  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      // "2 bars" -- getBandBarsPerChange() returns 2, so this is eligible for
      // every tested time signature (bandModeEligible() only checks the
      // metroNoteDuration value itself, not a beat-count comparison anymore).
      document.getElementById('metroNoteDuration').value = '8';
      document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const startBefore = await page.evaluate(() => promptStartTime);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    // Worst case: up to 1 bar to confirm, then getBandBarsPerChange()=2 more
    // bars to reveal = 3 bar-lengths total. At 300bpm, 3 bars of a 5-beat bar
    // is 3s; pad generously for headless-browser/scheduler-housekeeping overhead.
    await page.waitForTimeout(4500);
    const startAfter = await page.evaluate(() => promptStartTime);
    check(`time sig ${timeSig}/4: prompt advances after confirm+reveal`, startAfter !== startBefore, true);
  }

  // Bar-alignment fix: 5/4 + "Whole note" was previously ineligible (the old
  // fixed beat count, 4, was less than a 5-beat bar). getBandBarsPerChange()
  // makes this a proper 1-bar cadence now.
  await page.evaluate(() => {
    document.getElementById('metroTimeSig').value = '5';
    document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 1 bar
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
  });
  const fiveFourEligible = await page.evaluate(() => bandModeEligible());
  check('5/4 + Whole note is now eligible (previously excluded)', fiveFourEligible, true);

  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const startBefore5 = await page.evaluate(() => promptStartTime);
  await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
  // Worst case: 1 bar to confirm + 1 bar (getBandBarsPerChange()=1) to reveal
  // = 2 bar-lengths of a 5-beat bar at 300bpm = 2s; pad generously.
  await page.waitForTimeout(3000);
  const startAfter5 = await page.evaluate(() => promptStartTime);
  check('5/4 + Whole note: prompt advances after confirm+reveal', startAfter5 !== startBefore5, true);

  check('no uncaught page errors during the whole session', errors.length, 0);
  if (errors.length) console.log('Errors seen:', errors);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
