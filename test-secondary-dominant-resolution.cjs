const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
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

  // Identity checks: V/x should resolve to the exact same pitch classes as the existing
  // entry it's musically equivalent to, in the SAME key -- this avoids hand-computing new
  // pitch-class literals (a repeated source of plan-authoring bugs in this project's history;
  // see the Tonal.js jazz-extensions plan, where 7 hand-computed literals were wrong).
  const identityChecks = await page.evaluate(() => {
    const sorted = (pcs) => [...pcs].sort((a, b) => a - b);
    const resolve = (numeral, root, modeLabel) => {
      const r = getExpectedPCs(`func|${root}|${modeLabel}|${numeral}|0`);
      return r ? sorted(r.pcs) : null;
    };
    return {
      cMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'C', 'Major')) === JSON.stringify(resolve('III', 'C', 'Major')),
      cMajor_VoverV_eq_II:   JSON.stringify(resolve('V/V', 'C', 'Major')) === JSON.stringify(resolve('II', 'C', 'Major')),
      cMajor_VoverIV_eq_I:   JSON.stringify(resolve('V/IV', 'C', 'Major')) === JSON.stringify(resolve('I', 'C', 'Major')),
      gMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'G', 'Major')) === JSON.stringify(resolve('III', 'G', 'Major')),
      gMajor_VoverV_eq_II:   JSON.stringify(resolve('V/V', 'G', 'Major')) === JSON.stringify(resolve('II', 'G', 'Major')),
      fMajor_VoverVI_eq_III: JSON.stringify(resolve('V/vi', 'F', 'Major')) === JSON.stringify(resolve('III', 'F', 'Major')),
    };
  });
  checkTrue('C major: V/vi resolves to the same pitches as III', identityChecks.cMajor_VoverVI_eq_III, null);
  checkTrue('C major: V/V resolves to the same pitches as II', identityChecks.cMajor_VoverV_eq_II, null);
  checkTrue("C major: V/IV resolves to the same pitches as I (tonic doubles as IV's dominant)", identityChecks.cMajor_VoverIV_eq_I, null);
  checkTrue('G major: V/vi resolves to the same pitches as III', identityChecks.gMajor_VoverVI_eq_III, null);
  checkTrue('G major: V/V resolves to the same pitches as II', identityChecks.gMajor_VoverV_eq_II, null);
  checkTrue('F major: V/vi resolves to the same pitches as III', identityChecks.fMajor_VoverVI_eq_III, null);

  // Unresolvable target numeral must fail safely, not throw or silently return wrong pitches.
  const badTarget = await page.evaluate(() => getExpectedPCs('func|C|Major|V/xyz|0'));
  check('V/<unknown numeral> returns null', badTarget, null);

  // Regression: the direct-lookup and jazz-suffix-fallback paths must be unaffected by the
  // new branch inserted between them.
  const regressionCheck = await page.evaluate(() => {
    const v = getExpectedPCs('func|C|Major|V|0');
    const v13 = getExpectedPCs('func|C|Major|V13|0');
    return { vLen: v ? v.pcs.length : null, v13Len: v13 ? v13.pcs.length : null };
  });
  check('plain "V" still resolves to a 3-note triad (direct-lookup path unaffected)', regressionCheck.vLen, 3);
  check('"V13" still resolves to a 6-note chord (jazz-suffix fallback path unaffected)', regressionCheck.v13Len, 6);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
