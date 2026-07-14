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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // --- getExpectedPCs resolves the new chord type correctly, no Left-Hand fields ---
  const resolveCheck = await page.evaluate(() => getExpectedPCs('chord|C|Root + 5th||'));
  check('Root + 5th resolves to pitch classes [0, 7]', resolveCheck.pcs, [0, 7]);
  checkTrue('no requiredBassPc (not an invertible chord)', resolveCheck.requiredBassPc == null, null);
  checkTrue('no leftHandPcs/rightHandPcs (not a Left-Hand-mode prompt)', !resolveCheck.leftHandPcs && !resolveCheck.rightHandPcs, null);

  // --- not invertible ---
  const invertible = await page.evaluate(() => INVERTIBLE_CHORD_TYPES.has('Root + 5th'));
  check('Root + 5th is not in INVERTIBLE_CHORD_TYPES', invertible, false);

  // --- checkbox exists, unchecked by default ---
  const checkboxCheck = await page.evaluate(() => {
    const el = document.getElementById('chordRoot5');
    return { exists: !!el, checked: el ? el.checked : null };
  });
  checkTrue('chordRoot5 checkbox exists', checkboxCheck.exists, null);
  check('chordRoot5 checkbox is unchecked by default', checkboxCheck.checked, false);

  // --- end-to-end MIDI check: no register enforcement, unlike Left-Hand mode ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;

    // Root + 5th played entirely ABOVE middle C -- must still match, since there's no
    // hand-split/register requirement for this chord type (unlike Left-Hand mode's LH check).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([72, 79]); // C5, G5 -- both above middle C
    checkMidi();
    const aboveMiddleCMatches = midiSuccessActive;

    // Same shape, entirely BELOW middle C -- must also match (no register requirement at all).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([48, 55]); // C3, G3 -- both below middle C
    checkMidi();
    const belowMiddleCMatches = midiSuccessActive;

    // Missing the 5th -- must NOT match (still requires both pitch classes).
    currentPromptKey = 'chord|C|Root + 5th||';
    promptStartTime = Date.now();
    midiSuccessActive = false;
    heldNotes = new Set([60]); // C4 only
    checkMidi();
    const missingFifthDoesNotMatch = midiSuccessActive;

    return { aboveMiddleCMatches, belowMiddleCMatches, missingFifthDoesNotMatch };
  });
  checkTrue('root+5th played entirely above middle C matches (no register enforcement)', midiCheck.aboveMiddleCMatches, null);
  checkTrue('root+5th played entirely below middle C also matches (no register enforcement)', midiCheck.belowMiddleCMatches, null);
  checkTrue('root alone (missing the 5th) does not match', !midiCheck.missingFifthDoesNotMatch, null);

  // --- LEARNING_PATH structure ---
  const pathCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left Hand Shape');
    const stage = LEARNING_PATH[idx];
    return {
      idx,
      nextName: LEARNING_PATH[idx + 1]?.name,
      chords: stage?.chords,
      notes: stage?.notes,
      timer: stage?.timer,
      totalStages: LEARNING_PATH.length,
    };
  });
  checkTrue('"Left Hand Shape" exists in LEARNING_PATH', pathCheck.idx !== -1, null);
  check('"Meet Left Hand" immediately follows "Left Hand Shape"', pathCheck.nextName, 'Meet Left Hand');
  check('"Left Hand Shape" practices only chordRoot5', pathCheck.chords, ['chordRoot5']);
  check('"Left Hand Shape" is C only', pathCheck.notes, ['C']);
  check('"Left Hand Shape" is untimed', pathCheck.timer, 'off');
  check('LEARNING_PATH has 150 stages total (124 + 1 Left Hand Shape + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);

  // --- phase count ---
  const phaseCheck = await page.evaluate(() => ({
    leftHandVoicingCount: LEARNING_PATH_PHASES.find(p => p.name === 'Left-Hand Voicing').count,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Left-Hand Voicing phase count is 6 (5 + 1 new)', phaseCheck.leftHandVoicingCount, 6);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);

  // --- applyStage() correctness ---
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left Hand Shape');
    applyStage(idx);
    return {
      chordRoot5Checked: document.getElementById('chordRoot5').checked,
      leftHandModeChecked: document.getElementById('leftHandMode').checked,
      chordMajorChecked: document.getElementById('chordMajor').checked,
    };
  });
  check('applyStage() checks chordRoot5', applyCheck.chordRoot5Checked, true);
  check('applyStage() leaves leftHandMode unchecked', applyCheck.leftHandModeChecked, false);
  check('applyStage() leaves chordMajor unchecked', applyCheck.chordMajorChecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
