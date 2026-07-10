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

  // Roots and types both have qualifying (count>=3) data, but NO combo has count>=3 yet --
  // previously this synthesized a cross-product estimate; now the panel must not render at all.
  const noComboResult = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 3000, ema_slow: 3000, count: 10 }, D: { ema: 1000, ema_slow: 1000, count: 10 } },
      types: { Major: { ema: 3000, ema_slow: 3000, count: 10 }, Minor: { ema: 1000, ema_slow: 1000, count: 10 } },
      combos: {},
      variations: {},
    };
    return renderStats();
  });
  checkTrue('no "Focus on these" panel when no combo has 3+ samples, even though roots/types do', !noComboResult.includes('Focus on these'), null);
  checkTrue('no synthesized cross-product entry (e.g. "C Major") appears anywhere', !noComboResult.includes('C Major'), null);

  // A real measured combo exists -- panel renders, using it.
  const withComboResult = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 3000, ema_slow: 3000, count: 10 } },
      types: { Major: { ema: 3000, ema_slow: 3000, count: 10 } },
      combos: { 'C|Major': { ema: 3200, ema_slow: 3200, count: 4 } },
      variations: {},
    };
    return renderStats();
  });
  checkTrue('"Focus on these" panel renders when a real combo has 3+ samples', withComboResult.includes('Focus on these'), null);
  checkTrue('the real combo is shown, root and type space-separated', withComboResult.includes('C Major'), null);
  checkTrue('the drill button is marked data-combo="true"', withComboResult.includes('data-combo="true"'), null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
