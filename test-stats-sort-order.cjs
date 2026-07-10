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

  // Playing tab: a "building" entry (count=2) has a WORSE (higher) EMA than a "confirmed"
  // entry (count=10) -- confirmed must still render first, building entries pushed below.
  const playingOrder = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: {
        'Diminished': { ema: 2600, ema_slow: 2600, count: 2 },  // building, slowest raw EMA
        'Dominant 7': { ema: 2200, ema_slow: 2200, count: 6 },  // confirmed
        'Major':      { ema: 1100, ema_slow: 1100, count: 20 }, // confirmed, fastest
      },
      combos: {},
      variations: {},
    };
    const html = renderStats();
    const order = [...html.matchAll(/<span class="stats-key">([^<]+)<\/span>/g)].map(m => m[1]);
    return order;
  });
  check('confirmed entries (count>=3) sort worst-to-best by speed, building entries come after regardless of raw EMA', playingOrder, ['Dominant 7', 'Major', 'Diminished']);

  // Ear tab: same principle, using category-prefixed keys (post Task 1).
  const earOrder = await page.evaluate(() => {
    earAdaptWeights = {
      types: {
        'chord:Diminished': { ema: 2600, ema_slow: 2600, count: 2 },
        'chord:Dominant 7': { ema: 2200, ema_slow: 2200, count: 6 },
        'chord:Major':      { ema: 1100, ema_slow: 1100, count: 20 },
      },
    };
    localStorage.setItem('mpr_daily', JSON.stringify([{ date: new Date().toISOString().slice(0,10), earAnswers: 5, earAvgMs: 1000 }]));
    const html = renderEarStats();
    return [...html.matchAll(/<span class="stats-key">([^<]+)<\/span>/g)].map(m => m[1]);
  });
  check('Ear tab: same confirmed-then-building ordering, with bare (stripped) labels', earOrder, ['Dominant 7', 'Major', 'Diminished']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
