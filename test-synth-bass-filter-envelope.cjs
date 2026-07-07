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

    // Direct spectral check of the filter sweep: 1320Hz is the 12th harmonic of the
    // 110Hz fundamental, sitting between the filter's start (1800Hz) and end (500Hz)
    // cutoff. If the sweep is real, that harmonic should be strong while the cutoff
    // is still above it and fade once the cutoff sweeps below it.
    function magnitudeAtFreq(samples, freq) {
      let real = 0, imag = 0;
      for (let n = 0; n < samples.length; n++) {
        const angle = 2 * Math.PI * freq * n / sampleRate;
        real += samples[n] * Math.cos(angle);
        imag -= samples[n] * Math.sin(angle);
      }
      return Math.sqrt(real * real + imag * imag) / samples.length;
    }

    const earlyWindow = data.slice(Math.floor(sampleRate * 0.02), Math.floor(sampleRate * 0.05));
    const lateWindow  = data.slice(Math.floor(sampleRate * 0.3),  Math.floor(sampleRate * 0.33));
    const testFreq = 1320;

    return {
      oscCount: note.oscs.length,
      earlyMag: magnitudeAtFreq(earlyWindow, testFreq),
      lateMag: magnitudeAtFreq(lateWindow, testFreq),
    };
  });

  check('Bass preset has 2-oscillator subtle unison', result.oscCount, 2);
  checkTrue(
    'Bass filter envelope: a mid-harmonic (1320Hz) is much stronger early (cutoff~1800Hz) than late (cutoff~500Hz)',
    result.earlyMag > result.lateMag * 3,
    `early=${result.earlyMag}, late=${result.lateMag}`
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
