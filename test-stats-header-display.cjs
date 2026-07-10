const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const html = await page.evaluate(() => {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const log = [
      { date: yesterday, answers: 4, avgMs: 2000, totalMs: 5 * 60000, firstTryCount: 2 },  // 5 min
      { date: today,     answers: 6, avgMs: 1500, totalMs: 12 * 60000, firstTryCount: 4 }, // 12 min
    ];
    localStorage.setItem('mpr_daily', JSON.stringify(log));
    return renderStats();
  });

  // 10 total answers, 6 first-try (2+4) -> 60% accuracy
  checkTrue('header shows 60% first-try accuracy', html.includes('60%'), 'expected "60%" somewhere in rendered HTML');
  checkTrue('header labels it "first-try accuracy"', html.includes('first-try accuracy'), null);
  // today = 12 min, 30-day total = 5 + 12 = 17 min, shown as "12/17"
  checkTrue('header shows today\'s practice minutes (12)', html.includes('>12'), null);
  checkTrue('header shows the 30-day practice total (17)', html.includes('>17<'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
