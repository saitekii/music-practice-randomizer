const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const url = 'file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(url);
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const options = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#bandStyle option')).map(o => o.value)
  );
  check('exactly 3 style options in this order', options, ['rock', 'jazz', 'latin']);

  const defaultValue = await page.evaluate(() => document.getElementById('bandStyle').value);
  check('defaults to rock', defaultValue, 'rock');

  const getBandStyleResult = await page.evaluate(() => getBandStyle());
  check('getBandStyle() returns rock by default', getBandStyleResult, 'rock');

  await page.evaluate(() => {
    const sel = document.getElementById('bandStyle');
    sel.value = 'jazz';
    sel.dispatchEvent(new Event('change'));
  });
  const persisted = await page.evaluate(() => localStorage.getItem('mpr_band_style'));
  check('selecting jazz persists to mpr_band_style', persisted, 'jazz');

  const liveGetter = await page.evaluate(() => getBandStyle());
  check('getBandStyle() reflects the live selection without reload', liveGetter, 'jazz');

  await page.reload();
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.getElementById('bandStyle').value);
  check('selection survives reload', afterReload, 'jazz');

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
