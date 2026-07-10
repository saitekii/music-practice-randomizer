const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });

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

  // --- Test 1: pre-fix bare-label data gets reset on load ---
  await page.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
    localStorage.setItem('mpr_weights_ear', JSON.stringify({ types: { Major: { ema: 1000, ema_slow: 1000, count: 5 } } }));
  });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);
  const afterReset = await page.evaluate(() => Object.keys(earAdaptWeights.types));
  check('pre-fix bare-label data is reset to empty on load', afterReset, []);
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('mpr_weights_ear')).types);
  check('the reset is persisted to localStorage, not just in-memory', persisted, {});
  await page.close();

  // --- Test 2: fresh page with no ear weights at all -- no-op, no crash ---
  const page2 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page2.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page2.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page2.waitForTimeout(300);
  const freshTypes = await page2.evaluate(() => earAdaptWeights.types);
  check('a fresh install with no ear data has empty types, no crash', freshTypes, {});
  await page2.close();

  // --- Test 3: post-fix prefixed data is NOT reset, chord/scale 'Major' stay separate ---
  const page3 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page3.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
    localStorage.setItem('mpr_weights_ear', JSON.stringify({
      types: {
        'chord:Major': { ema: 1000, ema_slow: 1000, count: 5 },
        'scale:Major': { ema: 2000, ema_slow: 2000, count: 5 },
      },
    }));
  });
  await page3.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page3.waitForTimeout(300);
  const keys3 = await page3.evaluate(() => Object.keys(earAdaptWeights.types).sort());
  check('already-prefixed data survives untouched (no reset)', keys3, ['chord:Major', 'scale:Major']);
  const emas3 = await page3.evaluate(() => ({
    chordMajor: earAdaptWeights.types['chord:Major'].ema,
    scaleMajor: earAdaptWeights.types['scale:Major'].ema,
  }));
  check('chord Major and scale Major keep distinct EMA values (not merged)', emas3, { chordMajor: 1000, scaleMajor: 2000 });

  // --- Test 4: recordEarResult writes distinct keys for the same label in different categories ---
  const recordResult = await page3.evaluate(() => {
    recordEarResult('chord', 'Minor', 1500);
    recordEarResult('scale', 'Minor', 2500);
    return {
      chordMinor: earAdaptWeights.types['chord:Minor']?.ema,
      scaleMinor: earAdaptWeights.types['scale:Minor']?.ema,
    };
  });
  check('recordEarResult keys by category, same label in two categories stay separate', recordResult, { chordMinor: 1500, scaleMinor: 2500 });

  // --- Test 5: weightedPickEar looks up the category-scoped key (statistical check) ---
  const pickResult = await page3.evaluate(() => {
    earAdaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'chord:Minor': { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let majorCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPickEar(['Major', 'Minor'], 'chord') === 'Major') majorCount++;
    }
    return majorCount;
  });
  checkTrue('weightedPickEar favors the slower ("Major") item well above uniform 50%', pickResult > 240, `Major picked ${pickResult}/400 times`);

  // --- Test 6: rendered Recognition Types / Focus on These show bare labels, not prefixed keys ---
  const renderResult = await page3.evaluate(() => {
    earAdaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'scale:Major': { ema: 1000, ema_slow: 1000, count: 5 },
    };
    const html = renderEarStats();
    const recognitionSection = html.slice(html.indexOf('Recognition Types'));
    return {
      html,
      majorRowCount: (recognitionSection.match(/>Major</g) || []).length,
      hasPrefixedText: html.includes('chord:Major') || html.includes('scale:Major'),
    };
  });
  check('Recognition Types shows two separate "Major" rows (chord + scale, not merged)', renderResult.majorRowCount, 2);
  checkTrue('no category-prefixed text ever appears in rendered HTML', !renderResult.hasPrefixedText, null);

  // --- Test 7: the critical startDrill regression -- data-type attribute must be the BARE label ---
  const drillAttr = await page3.evaluate(() => {
    earAdaptWeights.types = { 'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 } };
    document.getElementById('statsContent').innerHTML = renderEarStats();
    const btn = document.querySelector('.drill-btn[data-ear="true"]');
    return btn ? btn.getAttribute('data-type') : null;
  });
  check('the ear Drill button\'s data-type is the bare label ("Major"), not "chord:Major" -- startDrill() matches against EAR_CHORD_MAP\'s bare values and would silently no-op otherwise', drillAttr, 'Major');

  await page3.close();
  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
