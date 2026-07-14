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

  // 1. Sequence shape: up the scale's intervals, repeat the root as the turnaround, then
  // the same intervals in reverse back to the root.
  const seqs = await page.evaluate(() => ({
    major:   getExpectedPCs('scale|C|Major').seq,
    majPent: getExpectedPCs('scale|C|Major pentatonic').seq,
  }));
  check('C Major seq is up + turnaround + down (15 steps)', seqs.major,
    [0, 2, 4, 5, 7, 9, 11, 0, 11, 9, 7, 5, 4, 2, 0]);
  check('C Major pentatonic seq is up + turnaround + down (11 steps)', seqs.majPent,
    [0, 2, 4, 7, 9, 0, 9, 7, 4, 2, 0]);

  // 2. Playing the full run in order, one note at a time (released between each, as on a
  // real keyboard), advances the cursor through every step and triggers success at the end.
  const playThrough = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    midiSuccessActive = false;
    const seq = getExpectedPCs(currentPromptKey).seq;
    for (let i = 0; i < seq.length; i++) {
      const midiNote = 60 + seq[i];
      onMidiMessage({ data: [0x90, midiNote, 100] });
      onMidiMessage({ data: [0x80, midiNote, 0] });
    }
    return { cursorAtEnd: scaleCursor, playedCount: scalePlayedNotes.length, success: midiSuccessActive };
  });
  check('cursor reaches the end of the sequence', playThrough.cursorAtEnd, 15);
  check('all 15 notes recorded as played', playThrough.playedCount, 15);
  check('success triggers on the final correct note', playThrough.success, true);

  // 3. A wrong note resets progress to the very start, no matter how far into the run it
  // happens -- check at the very first note, mid-ascent, the turnaround, and mid-descent.
  const resetPoints = await page.evaluate(() => {
    const seq = getExpectedPCs('scale|C|Major').seq; // [0,2,4,5,7,9,11,0,11,9,7,5,4,2,0]
    const wrongPcFor = correctPc => (correctPc + 1) % 12; // always a semitone off, never correct
    const results = [];
    for (const mistakeAt of [0, 5, 7, 10]) {
      currentPromptKey = 'scale|C|Major';
      scaleCursor = 0;
      scalePlayedNotes = [];
      midiSuccessActive = false;
      promptHadWrongNote = false;
      for (let i = 0; i < mistakeAt; i++) {
        const n = 60 + seq[i];
        onMidiMessage({ data: [0x90, n, 100] });
        onMidiMessage({ data: [0x80, n, 0] });
      }
      const cursorBeforeMistake = scaleCursor;
      const wrongNote = 60 + wrongPcFor(seq[mistakeAt]);
      onMidiMessage({ data: [0x90, wrongNote, 100] });
      results.push({
        mistakeAt,
        cursorBeforeMistake,
        cursorAfterMistake: scaleCursor,
        playedAfterMistake: scalePlayedNotes.length,
        wrongNoteFlagged: promptHadWrongNote,
      });
      onMidiMessage({ data: [0x80, wrongNote, 0] });
    }
    return results;
  });
  for (const r of resetPoints) {
    check(`mistake at step ${r.mistakeAt}: cursor was at ${r.mistakeAt} before the mistake`, r.cursorBeforeMistake, r.mistakeAt);
    check(`mistake at step ${r.mistakeAt}: cursor resets to 0`, r.cursorAfterMistake, 0);
    check(`mistake at step ${r.mistakeAt}: all recorded progress cleared`, r.playedAfterMistake, 0);
    check(`mistake at step ${r.mistakeAt}: promptHadWrongNote is set`, r.wrongNoteFlagged, true);
  }

  // 4. Visual feedback: correct notes stay green after release; a wrong note flashes red
  // while held; a reset wipes the earlier green highlights.
  const visuals = await page.evaluate(() => {
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    midiSuccessActive = false;
    onMidiMessage({ data: [0x90, 60, 100] }); // C -- correct
    const cWhileHeld = keyElements.get(60).className;
    onMidiMessage({ data: [0x80, 60, 0] });   // release C
    const cAfterRelease = keyElements.get(60).className;
    onMidiMessage({ data: [0x90, 63, 100] }); // D# -- wrong, expected D next
    const wrongWhileHeld = keyElements.get(63).className;
    onMidiMessage({ data: [0x80, 63, 0] });
    const cAfterReset = keyElements.get(60).className;
    return { cWhileHeld, cAfterRelease, wrongWhileHeld, cAfterReset };
  });
  check('correct note shows scale-correct while held', visuals.cWhileHeld.includes('scale-correct'), true);
  check('correct note stays scale-correct after release', visuals.cAfterRelease.includes('scale-correct'), true);
  check('wrong note shows wrong while held', visuals.wrongWhileHeld.includes('wrong'), true);
  check("a reset clears the earlier note's scale-correct class", visuals.cAfterReset.includes('scale-correct'), false);

  // 5. Multiple simultaneous wrong-and-held notes each stay independently flagged, and
  // releasing one doesn't affect the other (the sibling bug found after the first
  // wrong-note-tracking fix: a single scalar could only remember one wrong note at a time).
  const multiWrong = await page.evaluate(() => {
    currentPromptKey = 'scale|C|Major';
    scaleCursor = 0;
    scalePlayedNotes = [];
    midiSuccessActive = false;
    onMidiMessage({ data: [0x90, 60, 100] }); // C -- correct, don't release
    onMidiMessage({ data: [0x90, 63, 100] }); // D# -- wrong, don't release
    const afterFirstWrong = keyElements.get(63).className.includes('wrong');
    onMidiMessage({ data: [0x90, 66, 100] }); // F# -- also wrong, don't release
    const bothWrongWhileBothHeld = {
      first:  keyElements.get(63).className.includes('wrong'),
      second: keyElements.get(66).className.includes('wrong'),
    };
    onMidiMessage({ data: [0x90, 60, 100] }); // C again -- correct for the reset cursor
    const stillFlaggedAfterCorrectNote = {
      first:  keyElements.get(63).className.includes('wrong'),
      second: keyElements.get(66).className.includes('wrong'),
    };
    onMidiMessage({ data: [0x80, 63, 0] }); // release D#
    const afterReleasingFirst = {
      first:  keyElements.get(63).className.includes('wrong'),
      second: keyElements.get(66).className.includes('wrong'),
    };
    onMidiMessage({ data: [0x80, 66, 0] });
    onMidiMessage({ data: [0x80, 60, 0] });
    return { afterFirstWrong, bothWrongWhileBothHeld, stillFlaggedAfterCorrectNote, afterReleasingFirst };
  });
  check('D# flagged wrong while held', multiWrong.afterFirstWrong, true);
  check('both D# and F# flagged wrong while both held', multiWrong.bothWrongWhileBothHeld, { first: true, second: true });
  check('both stay flagged wrong even after a later correct note is played', multiWrong.stillFlaggedAfterCorrectNote, { first: true, second: true });
  check('releasing D# clears only its own flag, F# stays flagged', multiWrong.afterReleasingFirst, { first: false, second: true });

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
