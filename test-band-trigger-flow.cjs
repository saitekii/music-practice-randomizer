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

  // ── Band Mode ON: correct chord should advance instantly, update bandChordPcs,
  // and roll the Next preview forward ──
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.querySelector('input[name="timer"][value="metronome"]').click();
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    // Force a known C major prompt so the correct notes are predictable.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const before = await page.evaluate(() => ({
    promptStartTime,
    nextBefore: nextPromptObj ? nextPromptObj.key : null,
    bandChordPcs,
  }));
  check('bandChordPcs is null before any correct answer', before.bandChordPcs, null);
  check('a Next prompt was already pre-generated', before.nextBefore !== null, true);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) via the MIDI path.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  const after = await page.evaluate(() => ({
    currentPromptKey,
    promptStartTime,
    bandChordPcs,
    midiSuccessActive,
    nextPromptObjExists: nextPromptObj !== null,
  }));
  check('prompt advanced instantly (currentPromptKey became the pre-generated Next)', after.currentPromptKey, before.nextBefore);
  check('promptStartTime updated (a real advance happened)', after.promptStartTime !== before.promptStartTime, true);
  check('bandChordPcs was set to the answered chord', after.bandChordPcs, [0, 4, 7]);
  check('midiSuccessActive is released immediately, not held', after.midiSuccessActive, false);
  check('a fresh Next prompt was generated', after.nextPromptObjExists, true);

  // ── Non-chord correct answer: still advances instantly, but must not touch bandChordPcs ──
  await page.evaluate(() => {
    document.getElementById('catIntervals').checked = true;
    document.getElementById('intMaj3').checked = true;
    document.getElementById('intDirUp').checked = true;
    currentPromptKey = 'interval|Major 3rd|C|above';
    promptStartTime = Date.now();
  });
  const beforeInterval = await page.evaluate(() => ({ bandChordPcs, promptStartTime }));

  await page.evaluate(() => {
    heldNotes = new Set([60, 64]); // C, then E a major third above -- pcs 0 and 4
    checkMidi();
  });
  const afterInterval = await page.evaluate(() => ({ bandChordPcs, promptStartTime, midiSuccessActive }));
  check('a correct non-chord answer still advances instantly', afterInterval.promptStartTime !== beforeInterval.promptStartTime, true);
  check('a correct non-chord answer does not change bandChordPcs', afterInterval.bandChordPcs, beforeInterval.bandChordPcs);
  check('midiSuccessActive released after the non-chord advance too', afterInterval.midiSuccessActive, false);

  // ── Band Mode OFF: correct chord should advance via the original 700ms path (regression) ──
  await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('catIntervals').checked = false;
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
  const stateRightAfter2 = await page.evaluate(() => ({ promptStartTime, midiSuccessActive }));
  check('Band Mode off: prompt has not advanced yet at 50ms (still on the 700ms path)', stateRightAfter2.promptStartTime, startTimeBefore2);
  check('Band Mode off: success guard held during the 700ms wait', stateRightAfter2.midiSuccessActive, true);

  await page.waitForTimeout(900); // triggerMidiSuccess advances after a fixed 700ms
  const startTimeAfter2 = await page.evaluate(() => promptStartTime);
  check('Band Mode off: prompt still advances via the original 700ms path', startTimeAfter2 !== startTimeBefore2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
