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
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {
        'Root position':  { ema: 900,  ema_slow: 950,  count: 5 },
        '1st inversion':  { ema: 1600, ema_slow: 1500, count: 5 },
      },
    };
    return renderStats();
  });

  checkTrue('stats page shows a Voicings section', html.includes('Voicings'), null);
  checkTrue('the section lists Root position', html.includes('Root position'), null);
  checkTrue('the section lists 1st inversion', html.includes('1st inversion'), null);

  const emptyVariations = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {},
    };
    return renderStats();
  });
  checkTrue('no empty Voicings heading when there is no variation data yet', !emptyVariations.includes('Voicings'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
