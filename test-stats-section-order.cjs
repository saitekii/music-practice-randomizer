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
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 5 } },
      types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: { 'C|Major': { ema: 1200, ema_slow: 1200, count: 4 } },
      variations: { 'Root position': { ema: 900, ema_slow: 900, count: 5 } },
    };
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('mpr_daily', JSON.stringify([
      { date: today, answers: 5, avgMs: 1000, totalMs: 5000, firstTryCount: 3 },
      { date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), answers: 5, avgMs: 1000, totalMs: 5000, firstTryCount: 3 },
    ]));
    const html = renderStats();
    const markers = ['stats-header-row', 'weak-spots-panel', 'cal-section', 'stats-chart-wrap', 'stats-legend', '>Root Notes<', '>Types<', '>Voicings<'];
    return markers.map(m => html.indexOf(m));
  });

  const [header, weakSpots, calendar, chart, legend, roots, types, voicings] = result;
  checkTrue('all 8 expected sections are present', result.every(i => i !== -1), JSON.stringify(result));
  checkTrue('order: header, then Focus on These, then Calendar, then Chart, then Legend, then Root Notes, Types, Voicings',
    header < weakSpots && weakSpots < calendar && calendar < chart && chart < legend && legend < roots && roots < types && types < voicings, JSON.stringify(result));

  const noInversions = await page.evaluate(() => renderStats().includes('Inversions'));
  checkTrue('the section is titled "Voicings", not "Inversions"', !noInversions, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
