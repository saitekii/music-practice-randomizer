const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  // --- Toggle both on: leftHandPcs/rightHandPcs match the design table exactly,
  //     at C, for every step of all 3 progressions. requiredBassPc must be null. ---
  const cChecks = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    const get = (pattern, step) => getExpectedPCs(`func|C|Major|${pattern}|${step}|LH`);
    return {
      iivv0: get('I–IV–V', 0), iivv1: get('I–IV–V', 1), iivv2: get('I–IV–V', 2),
      ivvi0: get('IV–V–I', 0), ivvi1: get('IV–V–I', 1), ivvi2: get('IV–V–I', 2),
      ivvi_iv0: get('I–V–vi–IV', 0), ivvi_iv1: get('I–V–vi–IV', 1), ivvi_iv2: get('I–V–vi–IV', 2), ivvi_iv3: get('I–V–vi–IV', 3),
    };
  });
  check('I–IV–V step 0: leftHandPcs [0,7], rightHandPcs [0,4,7]', [cChecks.iivv0.leftHandPcs, cChecks.iivv0.rightHandPcs], [[0, 7], [0, 4, 7]]);
  check('I–IV–V step 0: requiredBassPc is null', cChecks.iivv0.requiredBassPc, null);
  check('I–IV–V step 1 (IV, 2nd inv): leftHandPcs [0,5], rightHandPcs [5,9,0]', [cChecks.iivv1.leftHandPcs, cChecks.iivv1.rightHandPcs], [[0, 5], [5, 9, 0]]);
  check('I–IV–V step 2 (V, 1st inv): leftHandPcs [11,7], rightHandPcs [7,11,2]', [cChecks.iivv2.leftHandPcs, cChecks.iivv2.rightHandPcs], [[11, 7], [7, 11, 2]]);
  check('IV–V–I step 0: leftHandPcs [5,0], rightHandPcs [5,9,0]', [cChecks.ivvi0.leftHandPcs, cChecks.ivvi0.rightHandPcs], [[5, 0], [5, 9, 0]]);
  check('IV–V–I step 1: leftHandPcs [7,2], rightHandPcs [7,11,2]', [cChecks.ivvi1.leftHandPcs, cChecks.ivvi1.rightHandPcs], [[7, 2], [7, 11, 2]]);
  check('IV–V–I step 2 (I, 2nd inv): leftHandPcs [7,0], rightHandPcs [0,4,7]', [cChecks.ivvi2.leftHandPcs, cChecks.ivvi2.rightHandPcs], [[7, 0], [0, 4, 7]]);
  check('I–V–vi–IV step 0: leftHandPcs [0,7]', cChecks.ivvi_iv0.leftHandPcs, [0, 7]);
  check('I–V–vi–IV step 1 (V, 1st inv): leftHandPcs [11,7]', cChecks.ivvi_iv1.leftHandPcs, [11, 7]);
  check('I–V–vi–IV step 2 (vi, root): leftHandPcs [9,4], rightHandPcs [9,0,4]', [cChecks.ivvi_iv2.leftHandPcs, cChecks.ivvi_iv2.rightHandPcs], [[9, 4], [9, 0, 4]]);
  check('I–V–vi–IV step 3 (IV, 1st inv): leftHandPcs [9,5]', cChecks.ivvi_iv3.leftHandPcs, [9, 5]);

  // --- Transposition check: same progression at D confirms it's not hardcoded to C. ---
  const dChecks = await page.evaluate(() => ({
    step0: getExpectedPCs('func|D|Major|I–IV–V|0|LH'),
    step1: getExpectedPCs('func|D|Major|I–IV–V|1|LH'),
    step2: getExpectedPCs('func|D|Major|I–IV–V|2|LH'),
  }));
  check('I–IV–V (D) step 0: leftHandPcs [2,9]', dChecks.step0.leftHandPcs, [2, 9]);
  check('I–IV–V (D) step 1: leftHandPcs [2,7]', dChecks.step1.leftHandPcs, [2, 7]);
  check('I–IV–V (D) step 2: leftHandPcs [1,9]', dChecks.step2.leftHandPcs, [1, 9]);

  // --- handMode !== 'LH': no leftHandPcs/rightHandPcs, requiredBassPc still populated
  //     (today's existing single-hand behavior, completely unaffected). ---
  const noHandModeCheck = await page.evaluate(() => getExpectedPCs('func|C|Major|I–IV–V|1|'));
  check('non-LH key: no leftHandPcs', noHandModeCheck.leftHandPcs, undefined);
  check('non-LH key: requiredBassPc is the plain single-hand value (0, C)', noHandModeCheck.requiredBassPc, 0);

  // --- leftHandMode on, functionalRequireInversions OFF: bassPc is always null (the branch
  //     short-circuits on `checked('functionalRequireInversions')` before ever calling
  //     getRequiredBassPc), so leftHandPcs always takes the [pcs[0], pcs[2]] (root+5th)
  //     fallback, regardless of step/inversion. Step 1 of I-IV-V is the IV chord: root F
  //     (rootIdx 0 + offset 5 = 5), Major triad pcs [0,4,7] transposed -> [5, 9, 0] (F, A, C).
  //     pcs[0]=5, pcs[2]=0, so the fallback is [5, 0] -- NOT the bass-C voicing
  //     ([0, 5]) that full-inversions mode would require for a 2nd-inversion IV. ---
  const noInversionsHandCheck = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = false;
    return getExpectedPCs('func|C|Major|I–IV–V|1|LH');
  });
  check('leftHandMode on + inversions off, IV step: requiredBassPc is null', noInversionsHandCheck.requiredBassPc, null);
  check('leftHandMode on + inversions off, IV step: leftHandPcs falls back to [5,0] (root+5th, not the inversion-aware bass)', noInversionsHandCheck.leftHandPcs, [5, 0]);
  check('leftHandMode on + inversions off, IV step: rightHandPcs [5,9,0]', noInversionsHandCheck.rightHandPcs, [5, 9, 0]);

  // --- genFunctional() builds a 6-segment key with handMode='LH' when both toggles are on
  //     and the pool is restricted to one of the 3 registered progressions. ---
  const genCheck = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === 'I–IV–V');
    });
    const prompt = genFunctional();
    return prompt.key.split('|');
  });
  check('genFunctional() key has 6 segments with handMode LH', genCheck, ['func', 'C', 'Major', 'I–IV–V', '0', 'LH']);

  // --- genFunctional() with leftHandMode off: handMode segment is empty. ---
  const genOffCheck = await page.evaluate(() => {
    document.getElementById('leftHandMode').checked = false;
    const prompt = genFunctional();
    return prompt.key.split('|')[5];
  });
  check('genFunctional() key has empty handMode when leftHandMode is off', genOffCheck, '');

  // --- checkMidi() end-to-end: correct two-hand voicing advances; left-hand notes in the
  //     "wrong" relative order still advances (proves the conflict-avoidance actually
  //     works, not just the happy path); wrong notes do not advance. ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('leftHandMode').checked = true;
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|1|LH'; // IV, 2nd inversion: LH=[C,F], RH=[F,A,C]
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;

    // Wrong: right hand has the right pitch classes but bass is missing from the left hand.
    heldNotes = new Set([65, 69, 72]); // F4 A4 C5 only -- no left-hand notes at all
    updateKeyboard();
    checkMidi();
    const afterWrong = currentPromptKey;

    // Correct, but left hand's two notes voiced in "wrong" relative order (F below C).
    heldNotes = new Set([41, 48, 65, 69, 72]); // F2 C3 (left, F lower than C) + F4 A4 C5 (right)
    updateKeyboard();
    checkMidi();
    const afterCorrectReorderedLeftHand = currentPromptKey;

    return { afterWrong, afterCorrectReorderedLeftHand };
  });
  check('missing left hand does not advance the prompt', midiCheck.afterWrong, 'func|C|Major|I–IV–V|1|LH');
  check('correct two-hand voicing (left hand notes in either relative order) advances to step 2', midiCheck.afterCorrectReorderedLeftHand, 'func|C|Major|I–IV–V|2|LH');

  // --- Regression: existing Phase 7 (single-chord Left-Hand) and Phase 9 (single-hand
  //     Progressions-with-Inversions) stages are unaffected by each other's mechanism. ---
  const regressionCheck = await page.evaluate(() => {
    const idxPhase7 = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    applyStage(idxPhase7);
    const phase7RequireInv = document.getElementById('functionalRequireInversions').checked;

    const idxPhase9 = LEARNING_PATH.findIndex(s => s.name === 'Invert Your First Song');
    applyStage(idxPhase9);
    const phase9LeftHand = document.getElementById('leftHandMode').checked;

    return { phase7RequireInv, phase9LeftHand };
  });
  check('applyStage() on a Phase 7 (single-chord LH) stage leaves functionalRequireInversions unchecked', regressionCheck.phase7RequireInv, false);
  check('applyStage() on a Phase 9 (single-hand inversions) stage leaves leftHandMode unchecked', regressionCheck.phase9LeftHand, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
