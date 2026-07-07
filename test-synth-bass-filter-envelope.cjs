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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const result = await page.evaluate(async () => {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * 0.5), sampleRate);
    const note = SYNTH_PRESETS.Bass.build(offlineCtx, 110, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function zeroCrossingRate(samples) {
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings++;
      }
      return crossings / samples.length;
    }

    const earlyWindow = data.slice(0, Math.floor(sampleRate * 0.02));
    const lateWindow  = data.slice(Math.floor(sampleRate * 0.3), Math.floor(sampleRate * 0.32));

    return {
      oscCount: note.oscs.length,
      earlyZcr: zeroCrossingRate(earlyWindow),
      lateZcr: zeroCrossingRate(lateWindow),
    };
  });

  check('Bass preset has 2-oscillator subtle unison', result.oscCount, 2);
  checkTrue(
    'Bass filter envelope: brighter attack than sustain (cutoff sweeping down)',
    result.earlyZcr > result.lateZcr,
    `early=${result.earlyZcr}, late=${result.lateZcr}`
  );

  const bandBassResult = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      playBandBass(0, ctx.currentTime + 0.05);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('playBandBass runs without throwing', bandBassResult.threw, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
