const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

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
      playKick(t);
      playSnare(t + 0.1);
      playHihat(t + 0.2);
      const buf1 = noiseBuffer;
      playSnare(t + 0.3);
      const buf2 = noiseBuffer;
      return { threw: false, bufferReused: buf1 === buf2 && buf1 !== null };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });

  check('percussion functions run without throwing', result.threw, false);
  check('noise buffer created once and reused', result.bufferReused, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
