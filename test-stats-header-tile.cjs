const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
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

  const result = await page.evaluate(() => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    localStorage.setItem('mpr_daily', JSON.stringify([
      { date: yesterday, answers: 4, avgMs: 2000, totalMs: 5 * 60000, firstTryCount: 2 },
      { date: today,     answers: 6, avgMs: 1500, totalMs: 12 * 60000, firstTryCount: 4 },
    ]));
    const html = renderStats();
    const hasSep = html.includes('<span class="stats-header-num-sep">/</span>');
    const hasNewLabel = html.includes('min today / 30d');
    return { html, hasSep, hasNewLabel };
  });
  checkTrue('rendered HTML contains today\'s minutes (12)', result.html.includes('>12'), null);
  checkTrue('rendered HTML contains the 30-day total minutes (17)', result.html.includes('>17<'), null);
  checkTrue('the tile uses the stats-header-num-sep separator element', result.hasSep, null);
  checkTrue('the tile label reads "min today / 30d"', result.hasNewLabel, null);
  checkTrue('the old crammed label format is gone', !result.html.includes('today · 17 min (30 days)'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
