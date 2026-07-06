const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkClose = (label, actual, expected, tolerance) => {
    const ok = Math.abs(actual - expected) < tolerance;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${actual}, expected ~${expected}`);
    if (!ok) failed = true;
  };

  const styleKeys = await page.evaluate(() => Object.keys(GROOVE_STYLES));
  check('exactly 3 styles defined', styleKeys.sort(), ['jazz', 'latin', 'rock']);

  const shapeCheck = await page.evaluate(() =>
    Object.entries(GROOVE_STYLES).every(([name, style]) =>
      typeof style.swingRatio === 'number' &&
      [4, 3, 5].every(sig =>
        style[sig] && ['kick', 'snare', 'hihat', 'bass', 'comp'].every(voice => Array.isArray(style[sig][voice]))
      )
    )
  );
  check('every style has swingRatio + kick/snare/hihat/bass/comp arrays for 4, 3, and 5', shapeCheck, true);

  // Rock and Latin are straight (swingRatio 0.5): every step should take exactly
  // half a beat, matching today's original fixed-increment behavior exactly.
  await page.evaluate(() => { metroBpmInput.value = '120'; });
  const straightDurations = await page.evaluate(() => ({
    rockOnBeat:  getStepDuration(0, 'rock'),
    rockOffBeat: getStepDuration(1, 'rock'),
    latinOnBeat:  getStepDuration(0, 'latin'),
    latinOffBeat: getStepDuration(1, 'latin'),
  }));
  checkClose('rock on-beat step = quarter-beat straight (0.25s @ 120bpm)', straightDurations.rockOnBeat, 0.25, 0.0001);
  checkClose('rock off-beat step = same as on-beat (straight)', straightDurations.rockOffBeat, 0.25, 0.0001);
  checkClose('latin on-beat step = quarter-beat straight (0.25s @ 120bpm)', straightDurations.latinOnBeat, 0.25, 0.0001);
  checkClose('latin off-beat step = same as on-beat (straight)', straightDurations.latinOffBeat, 0.25, 0.0001);

  // Jazz swings (swingRatio 0.63): on-beat longer, off-beat shorter, but the pair
  // still sums to exactly one full beat (no tempo drift introduced by swing).
  const jazzDurations = await page.evaluate(() => ({
    onBeat:  getStepDuration(0, 'jazz'),
    offBeat: getStepDuration(1, 'jazz'),
  }));
  checkClose('jazz on-beat step is longer than off-beat (genuine swing)', jazzDurations.onBeat - jazzDurations.offBeat, 0.13, 0.01);
  checkClose('jazz on-beat + off-beat sums to exactly one beat (no tempo drift)', jazzDurations.onBeat + jazzDurations.offBeat, 0.5, 0.0001);

  // Styles must be rhythmically distinct from each other, not just relabeled copies.
  const distinctness = await page.evaluate(() => ({
    rockComp:  JSON.stringify(GROOVE_STYLES.rock[4].comp),
    jazzComp:  JSON.stringify(GROOVE_STYLES.jazz[4].comp),
    latinComp: JSON.stringify(GROOVE_STYLES.latin[4].comp),
    jazzSnareEmpty: GROOVE_STYLES.jazz[4].snare.length === 0,
    rockCompMatchesSnare: JSON.stringify(GROOVE_STYLES.rock[4].comp) === JSON.stringify(GROOVE_STYLES.rock[4].snare),
  }));
  check('rock, jazz, and latin have different comp patterns in 4/4', new Set([distinctness.rockComp, distinctness.jazzComp, distinctness.latinComp]).size, 3);
  check('jazz has no snare hits (ride/kick carry time instead)', distinctness.jazzSnareEmpty, true);
  check('rock comp accents the backbeat only (matches snare positions)', distinctness.rockCompMatchesSnare, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
