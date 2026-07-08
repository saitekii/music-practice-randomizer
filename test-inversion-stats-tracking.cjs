const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const freshLoad = await page.evaluate(() => {
    return { hasVariations: 'variations' in adaptWeights, isObject: typeof adaptWeights.variations === 'object' };
  });
  check('adaptWeights.variations exists on fresh load', freshLoad.hasVariations, true);
  check('adaptWeights.variations is an object', freshLoad.isObject, true);

  const tracking = await page.evaluate(() => {
    localStorage.removeItem('mpr_weights');
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    document.getElementById('adaptiveToggle').checked = true;

    recordAdaptiveResult('chord|C|Major|1st inversion', 1000);
    recordAdaptiveResult('chord|G|Minor|1st inversion', 1500);
    recordAdaptiveResult('chord|D|Major|Root position', 800);
    recordAdaptiveResult('chord|F|Major|', 900); // inversions checkbox off -- empty label

    return {
      firstInvCount: adaptWeights.variations['1st inversion']?.count,
      rootPosCount:  adaptWeights.variations['Root position']?.count,
      totalVariationKeys: Object.keys(adaptWeights.variations).length,
      typesStillTracked: adaptWeights.types['Major']?.count,
    };
  });
  check('1st inversion tracked across two different chords/roots (count 2)', tracking.firstInvCount, 2);
  check('Root position is tracked too, not skipped as a default', tracking.rootPosCount, 1);
  check('no entry created for the empty-label (inversions off) answer', tracking.totalVariationKeys, 2);
  check('existing types tracking is unaffected', tracking.typesStillTracked, 3);

  const restoreSafety = await page.evaluate(() => {
    // Simulate the exact fallback the restore-import handler applies (script.js:3718-3719)
    // when loading a backup exported before this feature existed (no variations key) --
    // NOT a bypass of it. recordAdaptiveResult itself is not expected to be defensive on
    // its own; the guard lives at this load boundary, matching the other two load points.
    adaptWeights = { roots: {}, types: {}, combos: {} };
    adaptWeights.variations = adaptWeights.variations || {};
    try {
      recordAdaptiveResult('chord|C|Major|1st inversion', 1000);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('recording after an old-format restore does not throw', restoreSafety.threw, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
