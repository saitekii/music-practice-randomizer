const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

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

  const chimeResult = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      playHitChime(ctx.currentTime + 0.05);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('playHitChime runs without throwing', chimeResult.threw, false);

  const hiddenByDefault = await page.evaluate(() =>
    document.getElementById('nextPromptRow').classList.contains('hidden')
  );
  check('Next preview is hidden with no prompt', hiddenByDefault, true);

  const shown = await page.evaluate(() => {
    renderNextPreview({ line1: 'G Major', line2: '', key: 'chord|G|Major|' });
    return {
      hidden: document.getElementById('nextPromptRow').classList.contains('hidden'),
      text: document.getElementById('nextPromptText').textContent,
    };
  });
  check('Next preview shows and populates text', shown, { hidden: false, text: 'G Major' });

  const hiddenAgain = await page.evaluate(() => {
    renderNextPreview(null);
    return {
      hidden: document.getElementById('nextPromptRow').classList.contains('hidden'),
      text: document.getElementById('nextPromptText').textContent,
    };
  });
  check('Next preview hides and clears text when passed null', hiddenAgain, { hidden: true, text: '' });

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
