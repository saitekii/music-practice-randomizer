const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{"adaptiveToggle":true}'));
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

  // Enable adaptive weighting toggle in the live DOM (addInitScript's localStorage seed isn't
  // read into a live checkbox state automatically -- set it directly).
  await page.evaluate(() => { document.getElementById('adaptiveToggle').checked = true; });

  // --- Chord and scale "Major" answers write to distinct keys, not merged ---
  const distinctKeys = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('chord|C|Major||', 1500);
    recordAdaptiveResult('scale|C|Major', 2500);
    return {
      typeKeys: Object.keys(adaptWeights.types).sort(),
      comboKeys: Object.keys(adaptWeights.combos).sort(),
      chordMajorEma: adaptWeights.types['chord:Major']?.ema,
      scaleMajorEma: adaptWeights.types['scale:Major']?.ema,
    };
  });
  check('adaptWeights.types has distinct chord:Major and scale:Major keys', distinctKeys.typeKeys, ['chord:Major', 'scale:Major']);
  check('adaptWeights.combos has distinct C|chord:Major and C|scale:Major keys', distinctKeys.comboKeys, ['C|chord:Major', 'C|scale:Major']);
  check('chord Major and scale Major keep distinct EMA values (not merged)', { chordMajorEma: distinctKeys.chordMajorEma, scaleMajorEma: distinctKeys.scaleMajorEma }, { chordMajorEma: 1500, scaleMajorEma: 2500 });

  // --- Interval answers are also category-prefixed ---
  const intervalResult = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('interval|Minor 2nd|C|above', 1800);
    return Object.keys(adaptWeights.types);
  });
  check('interval answers write to a category-prefixed key', intervalResult, ['interval:Minor 2nd']);

  // --- Root-note weighting (no category) is completely unaffected ---
  const rootsUnaffected = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    recordAdaptiveResult('note|C', 1200);
    return Object.keys(adaptWeights.roots);
  });
  check('root-note answers still write a bare (unprefixed) key', rootsUnaffected, ['C']);

  // --- weightedPick reads back the category-scoped key (statistical trial) ---
  const pickResult = await page.evaluate(() => {
    adaptWeights.types = {
      'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 },
      'chord:Minor': { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let majorCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPick(['Major', 'Minor'], 'types', 'chord') === 'Major') majorCount++;
    }
    return majorCount;
  });
  checkTrue('weightedPick favors the slower ("Major") item well above uniform 50%', pickResult > 240, `Major picked ${pickResult}/400 times`);

  // --- weightedPick without a category (roots dim) is unaffected ---
  const rootsPickResult = await page.evaluate(() => {
    adaptWeights.roots = {
      C: { ema: 3000, ema_slow: 3000, count: 5 },
      D: { ema: 500,  ema_slow: 500,  count: 5 },
    };
    let cCount = 0;
    for (let i = 0; i < 400; i++) {
      if (weightedPick(['C', 'D'], 'roots') === 'C') cCount++;
    }
    return cCount;
  });
  checkTrue('weightedPick with no category still works for roots dim', rootsPickResult > 240, `C picked ${rootsPickResult}/400 times`);

  // --- stripTypeCategory rename: existing Ear Training rendering still works ---
  const earRenderStillWorks = await page.evaluate(() => {
    earAdaptWeights.types = { 'chord:Major': { ema: 1000, ema_slow: 1000, count: 5 } };
    const html = renderEarStats();
    return { hasStrippedLabel: html.includes('>Major<'), hasPrefixedText: html.includes('chord:Major') };
  });
  checkTrue('post-rename, Ear Training still renders the stripped label', earRenderStillWorks.hasStrippedLabel, null);
  checkTrue('post-rename, no raw prefixed text leaks into Ear Training HTML', !earRenderStillWorks.hasPrefixedText, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
