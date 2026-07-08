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

  // genFunctional() always appends a stepIndex segment, and its display text depends
  // on whether the randomly-picked pattern happens to be single-chord or a progression --
  // both are checked without needing to control which one gets picked.
  const genResult = await page.evaluate(() => {
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const prompt = genFunctional();
    const parts  = prompt.key.split('|');
    return { parts, line2: prompt.line2, pattern: parts[3] };
  });
  check('genFunctional() key always has 5 segments', genResult.parts.length, 5);
  check('genFunctional() key starts at step 0', genResult.parts[4], '0');
  const isProgression = genResult.pattern.includes('–');
  const firstNumeral  = genResult.pattern.split('–')[0];
  const expectedLine2 = isProgression
    ? `Play: ${firstNumeral} (chord 1 of ${genResult.pattern.split('–').length})`
    : `Play: ${genResult.pattern}`;
  check('genFunctional() line2 matches single-chord or progression format as appropriate', genResult.line2, expectedLine2);

  // getExpectedPCs() resolves each step of a hand-built progression key correctly.
  // Key of C major, progression I-IV-V: step 0 = C major (C E G), step 1 = F major
  // (IV of C = F, F A C), step 2 = G major (V of C = G, G B D).
  const shapes = await page.evaluate(() => ({
    step0: getExpectedPCs('func|C|Major|I–IV–V|0'),
    step1: getExpectedPCs('func|C|Major|I–IV–V|1'),
    step2: getExpectedPCs('func|C|Major|I–IV–V|2'),
  }));
  check('step 0 (I) resolves to C major (0,4,7)', JSON.stringify(shapes.step0.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([0, 4, 7]));
  check('step 1 (IV) resolves to F major (5,9,0)', JSON.stringify(shapes.step1.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([0, 5, 9]));
  check('step 2 (V) resolves to G major (7,11,2)', JSON.stringify(shapes.step2.pcs.slice().sort((a,b)=>a-b)), JSON.stringify([2, 7, 11]));

  // End-to-end: play through I-IV-V correctly, verify it advances step-by-step without
  // resetting promptStartTime, and only fully completes (daily log entry) on the last step.
  const behavior = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI(); // populates keyElements -- required for updateKeyboard() to do anything
    localStorage.removeItem('mpr_daily');
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = {};

    const results = {};
    const startTime = Date.now() - 500; // pretend the progression started 500ms ago

    currentPromptKey   = 'func|C|Major|I–IV–V|0';
    promptStartTime    = startTime;
    promptHadWrongNote = false;
    midiSuccessActive  = false;

    heldNotes = new Set([60, 64, 67]); // C E G -- step 0, correct
    updateKeyboard();
    checkMidi();
    results.afterStep0Key = currentPromptKey;
    results.promptStartTimeUnchangedAfterStep0 = (promptStartTime === startTime);

    midiSuccessActive = false; // step-advance sets this true and clears it after 700ms --
                                // reset directly here rather than waiting on a real timer
    heldNotes = new Set([61]); // C#4 -- a wrong note during step 1 (IV/F major)
    updateKeyboard();
    heldNotes = new Set([65, 69, 60]); // F A C -- step 1, now correct
    updateKeyboard();
    checkMidi();
    results.afterStep1Key = currentPromptKey;
    results.promptStartTimeUnchangedAfterStep1 = (promptStartTime === startTime);

    midiSuccessActive = false;
    heldNotes = new Set([67, 71, 62]); // G B D -- step 2 (V/G major), the LAST step, correct
    updateKeyboard();
    checkMidi();

    const log = JSON.parse(localStorage.getItem('mpr_daily') || '[]');
    results.dailyLogEntryAfterCompletion = log[log.length - 1];
    results.variationTracked = adaptWeights.variations['I–IV–V']?.count;

    return results;
  });
  check('after step 0, key advances to step 1', behavior.afterStep0Key, 'func|C|Major|I–IV–V|1');
  check('promptStartTime unchanged after step 0 (progression, not a new prompt)', behavior.promptStartTimeUnchangedAfterStep0, true);
  check('after step 1 (with a wrong note first), key advances to step 2', behavior.afterStep1Key, 'func|C|Major|I–IV–V|2');
  check('promptStartTime still unchanged after step 1', behavior.promptStartTimeUnchangedAfterStep1, true);
  check('completing the last step logs exactly 1 answer for the whole progression', behavior.dailyLogEntryAfterCompletion.answers, 1);
  check('the wrong note during step 1 means the whole progression is NOT first-try clean', behavior.dailyLogEntryAfterCompletion.firstTryCount, 0);
  check('completing the progression tracks "I–IV–V" in adaptWeights.variations', behavior.variationTracked, 1);

  // Single-chord func prompts must be unaffected: recordAdaptiveResult should NOT
  // create a variations entry for them, only roots.
  const singleChord = await page.evaluate(() => {
    adaptWeights = { roots: {}, types: {}, combos: {}, variations: {} };
    document.getElementById('adaptiveToggle').checked = true;
    recordAdaptiveResult('func|C|Major|V|0', 1000);
    return {
      variationKeys: Object.keys(adaptWeights.variations).length,
      rootTracked: adaptWeights.roots['C']?.count,
    };
  });
  check('a single-chord func answer creates no variations entry', singleChord.variationKeys, 0);
  check('a single-chord func answer still tracks roots as before', singleChord.rootTracked, 1);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
