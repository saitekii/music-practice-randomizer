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

  // If the housekeeping setInterval that drives bandSchedulerTick() ever falls
  // behind real time (a backgrounded tab, a GC pause, main-thread contention
  // from real MIDI/audio work -- none of which a quick synthetic test would
  // ever trigger), its catch-up `while` loop must not fire every backlogged
  // step in one burst. That causes several bars' worth of click/kick/snare/
  // bass/comp to play almost simultaneously (audible glitching) and can fire
  // multiple downbeats within milliseconds of each other.
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.getElementById('metroTimeSig').value = '4';
    document.querySelector('input[name="timer"][value="metronome"]').click();
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 1 bar per change
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    stopBandScheduler(); // kill the real interval -- full manual control from here
    bandActive = true;
    metroBpmInput.value = '120';
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();

    heldNotes = new Set([60, 64, 67]);
    checkMidi();
    onBeatTick(0); // confirm on a manually-simulated downbeat
  });

  const result = await page.evaluate(() => {
    // Simulate the housekeeping interval having stalled for 3 real seconds.
    const ctx = getAudioCtx();
    nextStepTime = ctx.currentTime - 3.0;
    const stepIndexBefore = stepIndex;
    bandSchedulerTick(); // one catch-up call, as the real interval would make
    return {
      stepsProcessedInOneTick: (stepIndex - stepIndexBefore + 10000) % 10000,
      nextStepTimeResynced: nextStepTime <= ctx.currentTime + SCHEDULER_LOOKAHEAD_S + 0.001,
      nextStepTimeStillFarBehind: nextStepTime < ctx.currentTime - 1.0,
    };
  });

  check('a single tick never processes more than MAX_CATCHUP_STEPS backlogged steps', result.stepsProcessedInOneTick <= 4, true);
  check('nextStepTime is resynced close to real time after a large backlog', result.nextStepTimeResynced, true);
  check('nextStepTime is not left far behind real time', result.nextStepTimeStillFarBehind, false);

  // Let any deferred onBeatTick callbacks from the (now-capped) catch-up fire,
  // then confirm the reveal logic still behaved correctly -- exactly one
  // downbeat should have been processed and the reveal should have fired once.
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ barsSinceConfirm, midiSuccessActive }));
  check('exactly one downbeat processed from the capped catch-up', after.barsSinceConfirm, 1);
  check('the reveal still fired correctly despite the backlog', after.midiSuccessActive, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
