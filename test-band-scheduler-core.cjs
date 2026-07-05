const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file:///C:/Projects/music-practice-randomizer/.claude/worktrees/band-mode/index.html');
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

  // At BPM 300 and Whole note (4 beats), one bar is 4 * 60/300 = 0.8s. Wait for it to elapse.
  await page.waitForTimeout(1500);

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt key changed after one bar elapsed', keyAfter !== keyBefore, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
