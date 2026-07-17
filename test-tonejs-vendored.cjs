const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const result = await page.evaluate(() => ({
    toneExists: typeof Tone !== 'undefined',
    hasPolySynth: typeof Tone?.PolySynth === 'function',
    hasFMSynth: typeof Tone?.FMSynth === 'function',
    hasSetContext: typeof Tone?.setContext === 'function',
  }));

  check('Tone global exists', result.toneExists, true);
  check('Tone.PolySynth is a constructor', result.hasPolySynth, true);
  check('Tone.FMSynth is a constructor', result.hasFMSynth, true);
  check('Tone.setContext is a function', result.hasSetContext, true);
  check('no page errors during load', errors.length, 0);
  if (errors.length) console.log('Errors:', errors);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
