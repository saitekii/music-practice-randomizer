const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const NEW_PATTERN = 'I–V/vi–vi–V/V–ii–V';

  const dataCheck = await page.evaluate((pattern) => ({
    hasEntry: FUNCTIONAL.major.includes(pattern),
    majorCount: FUNCTIONAL.major.length,
  }), NEW_PATTERN);
  checkTrue('FUNCTIONAL.major contains the new secondary-dominant progression', dataCheck.hasEntry, null);
  check('FUNCTIONAL.major has 111 entries total (110 existing + 1 new)', dataCheck.majorCount, 111);

  const checkboxCheck = await page.evaluate((pattern) => {
    const el = document.querySelector(`input[data-pattern="${pattern}"]`);
    return { exists: !!el, checked: el ? el.checked : null };
  }, NEW_PATTERN);
  checkTrue('checkbox exists for the new progression', checkboxCheck.exists, null);
  check('checkbox is unchecked by default', checkboxCheck.checked, false);

  const integration = await page.evaluate((pattern) => {
    const before = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = true;
    const after = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = false; // reset
    return { before, after };
  }, NEW_PATTERN);
  check('excluded from enabledProgressions() by default (unchecked)', integration.before, false);
  check('included in enabledProgressions() once checked', integration.after, true);

  // End-to-end: the full progression resolves correctly step by step (exercises Task 1's
  // resolver against the real prompt-key format this progression will actually generate).
  const stepResolution = await page.evaluate((pattern) => {
    const steps = pattern.split('–');
    return steps.map((_, i) => {
      const r = getExpectedPCs(`func|C|Major|${pattern}|${i}`);
      return r ? r.pcs.length > 0 : false;
    });
  }, NEW_PATTERN);
  checkTrue('all 6 steps of the progression resolve to a non-empty chord', stepResolution.every(Boolean), JSON.stringify(stepResolution));

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
