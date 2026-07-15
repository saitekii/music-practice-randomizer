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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // 1. The new stage exists, immediately after 'Four Chords, Inverted' and before
  // 'Two-Handed First Song'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Four Chords, Inverted');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfter: names[idx + 1],
      nextAfterThat: names[idx + 2],
    };
  });
  check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);
  check("'Invert the Minor Progression' sits immediately after 'Four Chords, Inverted'", placement.nextAfter, 'Invert the Minor Progression');
  check("'Two-Handed First Song' sits immediately after 'Invert the Minor Progression'", placement.nextAfterThat, 'Two-Handed First Song');

  // 2. The stage's data: A-minor-only i-iv-V, required inversions on, no chords/scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Invert the Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, []);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('requireProgressionInversions', stageData.requireProgressionInversions, true);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES: 'Progressions, Inverted' count goes 3 -> 4; total phase count
  // (25) is unaffected since no new phase was added; sums still match.
  const phaseData = await page.evaluate(() => ({
    totalPhases: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    invertedCount: LEARNING_PATH_PHASES.find(p => p.name === 'Progressions, Inverted')?.count,
  }));
  check('LEARNING_PATH_PHASES stays at 25 entries (no new phase)', phaseData.totalPhases, 25);
  check('phase counts sum to 154', phaseData.phaseSum, 154);
  check("'Progressions, Inverted' count is now 4", phaseData.invertedCount, 4);

  // 4. applyStage() checks exactly the A root, exactly the i-iv-V pattern, requireInversions on,
  // no chords/scales categories, timer off. Root-note checkboxes are `<input data-note="A">`;
  // the pattern checkbox is `<input data-pattern="i–iv–V">` (a bare, non-mode-qualified string).
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Invert the Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      patternChecked: document.querySelector('input[data-pattern="i–iv–V"]')?.checked,
      requireInvChecked: document.getElementById('functionalRequireInversions').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Invert the Minor Progression') checks exactly the A root", applied.checkedNotes, ['A']);
  check('applyStage() checks the i-iv-V pattern', applied.patternChecked, true);
  check('applyStage() checks functionalRequireInversions', applied.requireInvChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. PROGRESSION_INVERSIONS['i-iv-V'] resolves to the correct required bass pitch class at
  // each step, verified for A minor AND a second root (E minor) to confirm the pattern isn't
  // A-specific: i/Root position -> tonic, iv/2nd inversion -> tonic (common tone),
  // V/1st inversion -> raised leading tone (a half-step below tonic).
  const bassPcs = await page.evaluate(() => {
    const forRoot = root => {
      applyStage(LEARNING_PATH.findIndex(s => s.name === 'Invert the Minor Progression'));
      const iBass  = getExpectedPCs(`func|${root}|minor|i–iv–V|0|`).requiredBassPc;
      const ivBass = getExpectedPCs(`func|${root}|minor|i–iv–V|1|`).requiredBassPc;
      const vBass  = getExpectedPCs(`func|${root}|minor|i–iv–V|2|`).requiredBassPc;
      return { iBass, ivBass, vBass };
    };
    return { A: forRoot('A'), E: forRoot('E') };
  });
  check('A minor: i requires bass A (9)', bassPcs.A.iBass, 9);
  check('A minor: iv (2nd inversion) requires bass A (9) -- common tone', bassPcs.A.ivBass, 9);
  check('A minor: V (1st inversion) requires bass G# (8) -- half-step below tonic', bassPcs.A.vBass, 8);
  check('E minor: i requires bass E (4)', bassPcs.E.iBass, 4);
  check('E minor: iv (2nd inversion) requires bass E (4) -- common tone', bassPcs.E.ivBass, 4);
  check('E minor: V (1st inversion) requires bass D# (3) -- half-step below tonic', bassPcs.E.vBass, 3);

  // 6. Live playthrough: the correct sequence of inversions advances the progression; a
  // right-notes-wrong-bass attempt on step 1 (iv) does not. MIDI note sets verified by hand:
  // i root position = A3,C4,E4 (57,60,64, bass=A/pc9); iv WRONG root-position attempt =
  // D4,F4,A4 (62,65,69, bass=D/pc2, not the required A); iv CORRECT 2nd inversion =
  // A4,D5,F5 (69,74,77, bass=A/pc9).
  const playthrough = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'func|A|minor|i–iv–V|0|';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([57, 60, 64]); // A3 C4 E4 -- i, root position, A in bass
    checkMidi();
    const step1Advanced = midiSuccessActive;

    currentPromptKey = 'func|A|minor|i–iv–V|1|';
    midiSuccessActive = false;
    heldNotes = new Set([62, 65, 69]); // D4 F4 A4 -- root position: D (62) is lowest, not the required 2nd-inversion bass (A)
    checkMidi();
    const wrongInversionRejected = !midiSuccessActive;

    heldNotes = new Set([69, 74, 77]); // A4 D5 F5 -- iv, 2nd inversion, A (69) is lowest -- correct
    checkMidi();
    const step2Advanced = midiSuccessActive;

    return { step1Advanced, wrongInversionRejected, step2Advanced };
  });
  check('step 1 (i, root position) advances the progression', playthrough.step1Advanced, true);
  check('step 2 wrong inversion (iv, root position) is rejected', playthrough.wrongInversionRejected, true);
  check('step 2 correct inversion (iv, 2nd inversion) advances the progression', playthrough.step2Advanced, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
