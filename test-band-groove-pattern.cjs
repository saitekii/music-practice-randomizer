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

  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // No chord confirmed yet: drums still fire (band is never silent), bass/comp don't.
      bandChordPcs = null;
      scheduleGrooveHit(0, t, 4);

      // Confirmed C major chord (pcs [0, 4, 7]): drums + bass/comp all fire.
      bandChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (rock pattern)
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + kick + bass (push)
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat + comp

      bandChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('scheduleGrooveHit runs without throwing (with and without a confirmed chord)', result.threw, false);

  const patternShape = await page.evaluate(() => ({
    fourFour:  JSON.stringify(GROOVE_STYLES.rock[4]),
    threeFour: JSON.stringify(GROOVE_STYLES.rock[3]),
    fiveFour:  JSON.stringify(GROOVE_STYLES.rock[5]),
  }));
  check('rock 4/4 pattern defined', patternShape.fourFour.includes('"kick":[0,3,4]'), true);
  check('rock 3/4 pattern defined', patternShape.threeFour.includes('"kick":[0,3,4]'), true);
  check('rock 5/4 pattern defined', patternShape.fiveFour.includes('"kick":[0,5,6]'), true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
