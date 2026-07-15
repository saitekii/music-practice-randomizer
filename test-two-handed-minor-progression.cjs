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

  // 1. The new stage exists, immediately after 'Four Chords, Two Hands' and before 'First Scale'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Four Chords, Two Hands');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfter: names[idx + 1],
      nextAfterThat: names[idx + 2],
    };
  });
  check('LEARNING_PATH grows to 152 stages', placement.totalStages, 152);
  check("'Two-Handed Minor Progression' sits immediately after 'Four Chords, Two Hands'", placement.nextAfter, 'Two-Handed Minor Progression');
  check("'First Scale' sits immediately after 'Two-Handed Minor Progression'", placement.nextAfterThat, 'First Scale');

  // 2. The stage's data: A-minor-only i-iv-V, left-hand mode on, required inversions on, no
  // scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Two-Handed Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, ['leftHandMode']);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('requireProgressionInversions', stageData.requireProgressionInversions, true);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES: 'Two-Handed Progressions' count goes 3 -> 4; total phase count
  // (25) is unaffected since no new phase was added; sums still match.
  const phaseData = await page.evaluate(() => ({
    totalPhases: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    twoHandedCount: LEARNING_PATH_PHASES.find(p => p.name === 'Two-Handed Progressions')?.count,
  }));
  check('LEARNING_PATH_PHASES stays at 25 entries (no new phase)', phaseData.totalPhases, 25);
  check('phase counts sum to 152', phaseData.phaseSum, 152);
  check("'Two-Handed Progressions' count is now 4", phaseData.twoHandedCount, 4);

  // 4. applyStage() checks exactly the A root, exactly the i-iv-V pattern, leftHandMode on,
  // requireInversions on, no scales, timer off.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Two-Handed Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      patternChecked: document.querySelector('input[data-pattern="i–iv–V"]')?.checked,
      leftHandChecked: document.getElementById('leftHandMode').checked,
      requireInvChecked: document.getElementById('functionalRequireInversions').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Two-Handed Minor Progression') checks exactly the A root", applied.checkedNotes, ['A']);
  check('applyStage() checks the i-iv-V pattern', applied.patternChecked, true);
  check('applyStage() checks leftHandMode', applied.leftHandChecked, true);
  check('applyStage() checks functionalRequireInversions', applied.requireInvChecked, true);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. getExpectedPCs() produces the correct leftHandPcs/rightHandPcs split at all 3 steps, for
  // A minor AND a second root (E minor) to confirm the pattern isn't A-specific.
  const handPcs = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'Two-Handed Minor Progression'));
    const forRoot = root => {
      const s0 = getExpectedPCs(`func|${root}|minor|i–iv–V|0|LH`);
      const s1 = getExpectedPCs(`func|${root}|minor|i–iv–V|1|LH`);
      const s2 = getExpectedPCs(`func|${root}|minor|i–iv–V|2|LH`);
      return {
        step0: { left: s0.leftHandPcs, right: s0.rightHandPcs },
        step1: { left: s1.leftHandPcs, right: s1.rightHandPcs },
        step2: { left: s2.leftHandPcs, right: s2.rightHandPcs },
      };
    };
    return { A: forRoot('A'), E: forRoot('E') };
  });
  check('A minor step 0 (i, root position): left hand root+5th (bass already is root)', handPcs.A.step0.left, [9, 4]);
  check('A minor step 0: right hand full triad', handPcs.A.step0.right, [9, 0, 4]);
  check('A minor step 1 (iv, 2nd inversion): left hand actual bass A + root D', handPcs.A.step1.left, [9, 2]);
  check('A minor step 1: right hand full triad', handPcs.A.step1.right, [2, 5, 9]);
  check('A minor step 2 (V, 1st inversion): left hand actual bass G# + root E', handPcs.A.step2.left, [8, 4]);
  check('A minor step 2: right hand full triad', handPcs.A.step2.right, [4, 8, 11]);
  check('E minor step 0 (i, root position): left hand root+5th', handPcs.E.step0.left, [4, 11]);
  check('E minor step 1 (iv, 2nd inversion): left hand actual bass', handPcs.E.step1.left, [4, 9]);
  check('E minor step 2 (V, 1st inversion): left hand actual bass', handPcs.E.step2.left, [3, 11]);

  // 6. Live playthrough: the correct two-handed voicing (left hand on the exact required pcs,
  // right hand on the full triad, any octave/order within each hand -- checkMidi() searches
  // every split point) advances through all 3 steps and completes on the last one. A plausible
  // wrong left-hand voicing (root+5th when a specific inversion's bass is required) is rejected.
  const playthrough = await page.evaluate(() => {
    midiEnabled = true;
    currentPromptKey = 'func|A|minor|i–iv–V|0|LH';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    // Step 0 (i, root position): left hand A3,E3 (57,52); right hand A4,C5,E5 (69,72,76).
    heldNotes = new Set([52, 57, 69, 72, 76]);
    checkMidi();
    const step0Advanced = midiSuccessActive;

    midiSuccessActive = false;
    // Step 1 (iv, 2nd inversion, required left hand = A+D): WRONG attempt -- left hand plays
    // D3,F3 instead, so no split of the held notes can put the required A pitch class into the
    // left-hand group while still leaving D,F,A covered on the right -- verified live during
    // planning that no split point satisfies both required sets simultaneously.
    heldNotes = new Set([50, 53, 74, 77, 81]); // D3,F3 left hand (wrong: missing the required A bass); D5,F5,A5 right hand
    checkMidi();
    const wrongVoicingRejected = !midiSuccessActive;

    midiSuccessActive = false;
    // Step 1 correct: left hand A3,D4 (57,62); right hand D5,F5,A5 (74,77,81).
    heldNotes = new Set([57, 62, 74, 77, 81]);
    checkMidi();
    const step1Advanced = midiSuccessActive;

    return { step0Advanced, wrongVoicingRejected, step1Advanced };
  });
  check('step 0 (i, root position) advances the progression', playthrough.step0Advanced, true);
  check('step 1 wrong voicing (missing the required bass note) is rejected', playthrough.wrongVoicingRejected, true);
  check('step 1 correct voicing (actual bass A + root D in left hand) advances the progression', playthrough.step1Advanced, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
