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
    const durationS  = 1.0;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationS), sampleRate);
    const note = SYNTH_PRESETS.Rhodes.build(offlineCtx, 440, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function zeroCrossingRate(samples) {
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings++;
      }
      return crossings / samples.length;
    }
    function peakAbs(samples) {
      let m = 0;
      for (let i = 0; i < samples.length; i++) m = Math.max(m, Math.abs(samples[i]));
      return m;
    }

    const earlyWindow = data.slice(0, Math.floor(sampleRate * 0.02));                              // first 20ms -- bright FM transient
    const lateWindow  = data.slice(Math.floor(sampleRate * 0.4), Math.floor(sampleRate * 0.42));    // ~400ms -- settled tone

    return {
      oscCount: note.oscs.length,
      release: note.release,
      notSilent: peakAbs(data) > 0.01,
      earlyZcr: zeroCrossingRate(earlyWindow),
      lateZcr: zeroCrossingRate(lateWindow),
    };
  });

  check('Rhodes build() returns both carrier and modulator oscillators', result.oscCount, 2);
  check('Rhodes release unchanged from before', result.release, 0.55);
  check('Rhodes produces audible (non-silent) output', result.notSilent, true);
  checkTrue(
    'Rhodes early attack has more high-frequency content than the settled tone (FM modulation depth decaying)',
    result.earlyZcr > result.lateZcr,
    `early=${result.earlyZcr}, late=${result.lateZcr}`
  );

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
