const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file:///C:/Projects/music-practice-randomizer/index.html');
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Switch to metronome timer mode
  await page.evaluate(() => {
    document.querySelector('input[name="timer"][value="metronome"]').click();
  });
  await page.waitForTimeout(100);

  // Default "Whole note" — should be eligible and enabled
  const state1 = await page.evaluate(() => ({
    rowDisabled: document.getElementById('bandModeRow').classList.contains('disabled'),
    inputDisabled: document.getElementById('bandModeToggle').disabled,
  }));
  check('eligible at Whole note: row disabled class', state1.rowDisabled, false);
  check('eligible at Whole note: input.disabled', state1.inputDisabled, false);

  // Switch "Change every" to Quarter note — should become ineligible
  await page.evaluate(() => {
    const sel = document.getElementById('metroNoteDuration');
    sel.value = '1';
    sel.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(100);
  const state2 = await page.evaluate(() => ({
    rowDisabled: document.getElementById('bandModeRow').classList.contains('disabled'),
    inputDisabled: document.getElementById('bandModeToggle').disabled,
  }));
  check('ineligible at Quarter note: row disabled class', state2.rowDisabled, true);
  check('ineligible at Quarter note: input.disabled', state2.inputDisabled, true);

  // Switch back to "2 bars" — should be eligible again
  await page.evaluate(() => {
    const sel = document.getElementById('metroNoteDuration');
    sel.value = '8';
    sel.dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(100);
  const state3 = await page.evaluate(() => document.getElementById('bandModeRow').classList.contains('disabled'));
  check('eligible again at 2 bars', state3, false);

  // Toggle persists across reload
  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(100);
  await page.reload();
  await page.waitForTimeout(300);
  const persisted = await page.evaluate(() => document.getElementById('bandModeToggle').checked);
  check('toggle persists across reload', persisted, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
