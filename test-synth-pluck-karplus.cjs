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
    const durationS  = 2.5;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationS), sampleRate);
    const note = SYNTH_PRESETS.Pluck.build(offlineCtx, 220, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function rms(samples) {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.sqrt(sum / samples.length);
    }
    function peakAbs(samples) {
      let m = 0;
      for (let i = 0; i < samples.length; i++) m = Math.max(m, Math.abs(samples[i]));
      return m;
    }

    const earlyWindow = data.slice(Math.floor(sampleRate * 0.05), Math.floor(sampleRate * 0.15));
    const lateWindow  = data.slice(Math.floor(sampleRate * 2.0),  Math.floor(sampleRate * 2.1));

    return {
      freeDecay: note.freeDecay,
      release: note.release,
      overallPeak: peakAbs(data),
      earlyRms: rms(earlyWindow),
      lateRms: rms(lateWindow),
    };
  });

  check('Pluck stays freeDecay (percussive, decays on its own)', result.freeDecay, true);
  check('Pluck release field unchanged', result.release, 0);
  checkTrue(
    'Pluck output never blows past a sane amplitude ceiling (no runaway feedback)',
    result.overallPeak < 1.5,
    `peak=${result.overallPeak}`
  );
  checkTrue(
    'Pluck decays -- energy 2s in is much lower than energy shortly after the pluck',
    result.lateRms < result.earlyRms * 0.2,
    `early=${result.earlyRms}, late=${result.lateRms}`
  );

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
