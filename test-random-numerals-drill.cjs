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

  const defaultState = await page.evaluate(() => document.getElementById('functionalRandomNumerals').checked);
  check('Random Numerals toggle is unchecked by default', defaultState, false);

  // Enable the toggle, restrict to C only, and confirm genFunctional() never returns a
  // multi-step progression while it's on -- only single canonical/borrowed numerals.
  const drillResults = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      patterns.add(prompt.key.split('|')[3]);
    }
    document.getElementById('functionalRandomNumerals').checked = false; // restore
    return [...patterns];
  });
  checkTrue('with Random Numerals on, every pattern across 200 trials is single-numeral (no dash)', drillResults.every(p => !p.includes('–')), `patterns=${JSON.stringify(drillResults)}`);

  // Confirm it still respects individual numeral checkbox state.
  const respectsCheckboxes = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const keepOnly = 'major:I';
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === keepOnly);
    });
    const patterns = new Set();
    for (let i = 0; i < 100; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      patterns.add(prompt.key.split('|')[3]);
    }
    document.getElementById('functionalRandomNumerals').checked = false; // restore
    return [...patterns];
  });
  check('with Random Numerals on and only major:I checked, every prompt is exactly "I"', respectsCheckboxes, ['I']);

  const persistence = await page.evaluate(() => {
    document.getElementById('functionalRandomNumerals').checked = true;
    saveSettings();
    document.getElementById('functionalRandomNumerals').checked = false;
    loadSettings();
    return document.getElementById('functionalRandomNumerals').checked;
  });
  check('Random Numerals toggle state persists through save/load', persistence, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
