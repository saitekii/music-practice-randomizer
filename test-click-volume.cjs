const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    let ok;
    if (typeof actual === 'number' && typeof expected === 'number') {
      ok = Math.abs(actual - expected) < 0.0001;
    } else {
      ok = JSON.stringify(actual) === JSON.stringify(expected);
    }
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Default value matches the instrument slider's default (70).
  const defaultValue = await page.evaluate(() => document.getElementById('clickVolume').value);
  check('click volume slider defaults to 70', defaultValue, '70');

  // Playing a click lazily creates clickGain, independent of synthMasterGain.
  const afterClick = await page.evaluate(() => {
    playClick(true, getAudioCtx().currentTime + 0.05);
    return {
      clickGainExists: clickGain !== null,
      clickGainValue: clickGain.gain.value,
      synthMasterGainUntouched: synthMasterGain === null,
    };
  });
  check('clickGain is created on first playClick call', afterClick.clickGainExists, true);
  check('clickGain defaults to 0.7 (70/100)', afterClick.clickGainValue, 0.7);
  check('synthMasterGain is untouched by playClick', afterClick.synthMasterGainUntouched, true);

  // Moving the slider updates clickGain's live value and persists to localStorage.
  const afterSlide = await page.evaluate(() => {
    const slider = document.getElementById('clickVolume');
    slider.value = '30';
    slider.dispatchEvent(new Event('input'));
    return {
      clickGainValue: clickGain.gain.value,
      stored: localStorage.getItem('mpr_click_vol'),
    };
  });
  check('moving the slider updates clickGain.gain.value', afterSlide.clickGainValue, 0.3);
  check('moving the slider persists to mpr_click_vol', afterSlide.stored, '30');

  // Persists across reload.
  await page.reload();
  await page.waitForTimeout(300);
  const afterReload = await page.evaluate(() => document.getElementById('clickVolume').value);
  check('click volume persists across reload', afterReload, '30');

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
