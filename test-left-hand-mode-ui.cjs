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

  const exists = await page.evaluate(() => document.getElementById('leftHandMode') !== null);
  check('leftHandMode checkbox exists', exists, true);

  const disableBehavior = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    syncUI();
    const disabledWhileOn = {
      inversionsInputDisabled: document.getElementById('inversions').disabled,
      rowHasDisabledClass: document.getElementById('inversionsRow').classList.contains('disabled'),
    };
    document.getElementById('leftHandMode').checked = false;
    syncUI();
    const enabledWhileOff = {
      inversionsInputDisabled: document.getElementById('inversions').disabled,
      rowHasDisabledClass: document.getElementById('inversionsRow').classList.contains('disabled'),
    };
    return { disabledWhileOn, enabledWhileOff };
  });
  check('inversions input is disabled while Left-Hand mode is on', disableBehavior.disabledWhileOn.inversionsInputDisabled, true);
  check('inversions row has the disabled class while Left-Hand mode is on', disableBehavior.disabledWhileOn.rowHasDisabledClass, true);
  check('inversions input is re-enabled once Left-Hand mode is off', disableBehavior.enabledWhileOff.inversionsInputDisabled, false);
  check('inversions row loses the disabled class once Left-Hand mode is off', disableBehavior.enabledWhileOff.rowHasDisabledClass, false);

  const persistence = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    saveSettings();
    document.getElementById('leftHandMode').checked = false;
    loadSettings();
    return document.getElementById('leftHandMode').checked;
  });
  check('leftHandMode checkbox state persists through save/load', persistence, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
