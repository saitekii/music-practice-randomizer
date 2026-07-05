const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

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

  // ── Band Mode ON: confirm-then-groove reveal timing ──
  //
  // showPrompt() engages the real scheduler momentarily (needed to get
  // bandActive/eligibility wired up the normal way), but this test then stops
  // it immediately and drives every subsequent beat with direct onBeatTick(0)
  // calls. Leaving the real setInterval-driven scheduler running alongside
  // manual calls would risk a genuine background beat firing in between two
  // of this test's steps, corrupting the precise step-by-step assertions
  // below -- stopping it makes the sequence fully deterministic.
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.querySelector('input[name="timer"][value="metronome"]').click();
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 1 bar per change
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    stopBandScheduler(); // kill the real interval; bandActive is restored below
    bandActive = true;   // checkMidi()'s routing to triggerBandSuccess depends on this
    // Force a known C major prompt so the correct notes are predictable.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const startTimeBefore = await page.evaluate(() => promptStartTime);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) via the MIDI path.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  const rightAfterAnswer = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    confirmedChordPcs,
    midiSuccessActive,
  }));
  check('prompt does not instantly advance on a correct answer', rightAfterAnswer.promptStartTime, startTimeBefore);
  check('chord becomes pending (not yet confirmed) immediately after answering', rightAfterAnswer.pendingChordPcs, [0, 4, 7]);
  check('groove has not started yet (no downbeat has passed since answering)', rightAfterAnswer.confirmedChordPcs, null);
  check('success guard held while pending', rightAfterAnswer.midiSuccessActive, true);

  // Simulate the next downbeat directly, rather than waiting on real time --
  // deterministic and immune to scheduler-timing flakiness.
  await page.evaluate(() => { onBeatTick(0); });
  const afterFirstDownbeat = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    confirmedChordPcs,
  }));
  check('prompt still has not advanced right after the chord is confirmed', afterFirstDownbeat.promptStartTime, startTimeBefore);
  check('chord is now confirmed (audible in the groove)', afterFirstDownbeat.confirmedChordPcs, [0, 4, 7]);
  check('nothing left pending once confirmed', afterFirstDownbeat.pendingChordPcs, null);

  // One more downbeat -- with "Whole note" = 1 bar per change, this is where
  // the next chord should reveal, one full bar after confirmation.
  await page.evaluate(() => { onBeatTick(0); });
  const afterSecondDownbeat = await page.evaluate(() => ({
    promptStartTime,
    confirmedChordPcs,
    midiSuccessActive,
  }));
  check('prompt advances once a full bar of confirmed groove has elapsed', afterSecondDownbeat.promptStartTime !== startTimeBefore, true);
  check('groove keeps playing the same confirmed chord through the reveal', afterSecondDownbeat.confirmedChordPcs, [0, 4, 7]);
  check('input is unlocked again once the next chord is revealed', afterSecondDownbeat.midiSuccessActive, false);

  // No forced timeout: without a new correct answer, further downbeats change nothing.
  const startTimeAfterReveal = afterSecondDownbeat.promptStartTime;
  await page.evaluate(() => { onBeatTick(0); onBeatTick(0); onBeatTick(0); });
  const stillWaiting = await page.evaluate(() => ({
    promptStartTime,
    confirmedChordPcs,
  }));
  check('prompt does not auto-advance again without a new correct answer', stillWaiting.promptStartTime, startTimeAfterReveal);
  check('groove keeps playing the same chord with no new answer', stillWaiting.confirmedChordPcs, [0, 4, 7]);

  // ── Band Mode OFF: correct chord should instantly advance (regression check) ──
  await page.evaluate(() => {
    // Fully tear down the running band scheduler so the OFF setting actually
    // takes effect (bandActive is only consulted when the metronome (re)starts).
    stopBandScheduler();
    stopMetronome();
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const bandActiveOff = await page.evaluate(() => bandActive);
  check('bandActive is false after Band Mode is turned off', bandActiveOff, false);

  const startTimeBefore2 = await page.evaluate(() => promptStartTime);

  await page.evaluate(() => {
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  await page.waitForTimeout(50);
  const stateRightAfter2 = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    midiSuccessActive,
  }));
  check('Band Mode off: does not set a pending chord', stateRightAfter2.pendingChordPcs, null);
  check('Band Mode off: prompt has not advanced yet at 50ms (still on the 700ms path)', stateRightAfter2.promptStartTime, startTimeBefore2);

  await page.waitForTimeout(900); // triggerMidiSuccess advances after a fixed 700ms
  const startTimeAfter2 = await page.evaluate(() => promptStartTime);
  check('Band Mode off: prompt still advances via the original 700ms path', startTimeAfter2 !== startTimeBefore2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
