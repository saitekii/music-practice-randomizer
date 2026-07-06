const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

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

  await page.evaluate(() => {
    document.querySelector('input[name="timer"][value="metronome"]').click();
  });
  await page.waitForTimeout(100);

  // Band Mode is never disabled anymore, regardless of "Change every" or time signature.
  for (const noteDuration of ['4', '2', '1', '8']) {
    const state = await page.evaluate((val) => {
      const sel = document.getElementById('metroNoteDuration');
      sel.value = val;
      sel.dispatchEvent(new Event('change'));
      return {
        rowDisabled: document.getElementById('bandModeRow').classList.contains('disabled'),
        inputDisabled: document.getElementById('bandModeToggle').disabled,
      };
    }, noteDuration);
    check(`Change-every "${noteDuration}": row not disabled`, state.rowDisabled, false);
    check(`Change-every "${noteDuration}": input not disabled`, state.inputDisabled, false);
  }

  for (const timeSig of ['4', '3', '5']) {
    const rowDisabled = await page.evaluate((sig) => {
      const sel = document.getElementById('metroTimeSig');
      sel.value = sig;
      sel.dispatchEvent(new Event('change'));
      return document.getElementById('bandModeRow').classList.contains('disabled');
    }, timeSig);
    check(`Time sig ${timeSig}/4: row not disabled`, rowDisabled, false);
  }

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
