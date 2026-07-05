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
    // Force a deterministic 4/4 scenario, mid-ride-out, one beat away from the
    // "Change every" boundary -- this is the exact moment the pickup-note bug
    // (the trailing "and of 4" comp/hihat hit silently dropping) occurs.
    document.getElementById('metroTimeSig').value = '4';
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 4 beats
    metroBpmInput.value = '90';

    rideOutActive   = true;
    rideOutChordPcs = [0, 4, 7]; // C major, root first
    metroCount      = 3;         // one beat away from getBeatsPerChange() === 4

    const calls = { hihat: [], comp: [] };
    const origHihat = playHihat;
    const origComp  = playBandComp;
    playHihat    = (time) => calls.hihat.push(time);
    playBandComp = (pcs, time) => calls.comp.push(time);

    const ctx  = getAudioCtx();
    const t0   = ctx.currentTime + 0.05;
    // localStep 6 = beat 4 (0-indexed beat 3) in 4/4 -- the ride-out's final beat.
    scheduleStep(6, t0);

    playHihat    = origHihat;
    playBandComp = origComp;

    const secondsPerBeat = 60 / 90;
    return {
      hihatCount: calls.hihat.length,
      compCount: calls.comp.length,
      compTime: calls.comp[0],
      expectedPickupTime: t0 + secondsPerBeat / 2,
    };
  });

  // GROOVE_PATTERNS[4].hihat includes both step 6 (this beat) and step 7 (the
  // pickup) -- both should fire. GROOVE_PATTERNS[4].comp only includes step 7,
  // so exactly one comp hit should fire, and only via the proactive pickup path.
  check('hihat fires for both this beat and the trailing pickup', result.hihatCount, 2);
  check('comp fires exactly once (only the pickup, step 6 has no comp)', result.compCount, 1);
  check('pickup comp hit is scheduled half a beat after this beat',
    Math.abs(result.compTime - result.expectedPickupTime) < 0.001, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
