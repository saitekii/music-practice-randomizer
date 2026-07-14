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

  // --- Toggle ON: each step of each of the 3 progressions resolves the exact
  //     required bass pitch class, verified at two different roots (C and D)
  //     to confirm it transposes rather than being hardcoded to C. ---
  const bassChecks = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    return {
      cIIVV_step0: getExpectedPCs('func|C|Major|I–IV–V|0').requiredBassPc,
      cIIVV_step1: getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc,
      cIIVV_step2: getExpectedPCs('func|C|Major|I–IV–V|2').requiredBassPc,
      dIIVV_step0: getExpectedPCs('func|D|Major|I–IV–V|0').requiredBassPc,
      dIIVV_step1: getExpectedPCs('func|D|Major|I–IV–V|1').requiredBassPc,
      dIIVV_step2: getExpectedPCs('func|D|Major|I–IV–V|2').requiredBassPc,
      cIVVI_step0: getExpectedPCs('func|C|Major|IV–V–I|0').requiredBassPc,
      cIVVI_step1: getExpectedPCs('func|C|Major|IV–V–I|1').requiredBassPc,
      cIVVI_step2: getExpectedPCs('func|C|Major|IV–V–I|2').requiredBassPc,
      cIVviIV_step0: getExpectedPCs('func|C|Major|I–V–vi–IV|0').requiredBassPc,
      cIVviIV_step1: getExpectedPCs('func|C|Major|I–V–vi–IV|1').requiredBassPc,
      cIVviIV_step2: getExpectedPCs('func|C|Major|I–V–vi–IV|2').requiredBassPc,
      cIVviIV_step3: getExpectedPCs('func|C|Major|I–V–vi–IV|3').requiredBassPc,
    };
  });
  check('I–IV–V (C) step 0 (I, root) required bass = C (0)', bassChecks.cIIVV_step0, 0);
  check('I–IV–V (C) step 1 (IV, 2nd inv) required bass = C (0)', bassChecks.cIIVV_step1, 0);
  check('I–IV–V (C) step 2 (V, 1st inv) required bass = B (11)', bassChecks.cIIVV_step2, 11);
  check('I–IV–V (D) step 0 (I, root) required bass = D (2)', bassChecks.dIIVV_step0, 2);
  check('I–IV–V (D) step 1 (IV, 2nd inv) required bass = D (2)', bassChecks.dIIVV_step1, 2);
  check('I–IV–V (D) step 2 (V, 1st inv) required bass = C# (1)', bassChecks.dIIVV_step2, 1);
  check('IV–V–I (C) step 0 (IV, root) required bass = F (5)', bassChecks.cIVVI_step0, 5);
  check('IV–V–I (C) step 1 (V, root) required bass = G (7)', bassChecks.cIVVI_step1, 7);
  check('IV–V–I (C) step 2 (I, 2nd inv) required bass = G (7)', bassChecks.cIVVI_step2, 7);
  check('I–V–vi–IV (C) step 0 (I, root) required bass = C (0)', bassChecks.cIVviIV_step0, 0);
  check('I–V–vi–IV (C) step 1 (V, 1st inv) required bass = B (11)', bassChecks.cIVviIV_step1, 11);
  check('I–V–vi–IV (C) step 2 (vi, root) required bass = A (9)', bassChecks.cIVviIV_step2, 9);
  check('I–V–vi–IV (C) step 3 (IV, 1st inv) required bass = A (9)', bassChecks.cIVviIV_step3, 9);

  // --- Toggle OFF: same prompts have no bass requirement (today's lenient behavior). ---
  const toggleOffCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = false;
    return getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc;
  });
  check('toggle off: I–IV–V step 1 has no required bass', toggleOffCheck, null);

  // --- Unregistered pattern, toggle on: no bass requirement (safe fallback). ---
  const unregisteredCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    return getExpectedPCs('func|C|Major|ii–V–I|0').requiredBassPc;
  });
  check('toggle on, unregistered pattern (ii–V–I): no required bass', unregisteredCheck, null);

  // --- applyStage() on an existing stage that predates this field leaves the
  //     toggle unchecked -- proving default-off, not leaking prior global state. ---
  const isolationCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true; // force on first
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    applyStage(idx);
    return document.getElementById('functionalRequireInversions').checked;
  });
  check('applyStage() on a stage without requireProgressionInversions unchecks the toggle', isolationCheck, false);

  // --- checkMidi() end-to-end: wrong inversion (right pitch classes, wrong bass)
  //     does not advance; correct inversion does. ---
  const midiCheck = await page.evaluate(() => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|0'; // I, requires root position (bass C)
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;

    heldNotes = new Set([64, 67, 72]); // E4 G4 C5 -- right pitch classes, bass is E not C
    updateKeyboard();
    checkMidi();
    const afterWrongInversion = currentPromptKey;

    heldNotes = new Set([60, 64, 67]); // C4 E4 G4 -- bass is C, correct
    updateKeyboard();
    checkMidi();
    const afterCorrectInversion = currentPromptKey;

    return { afterWrongInversion, afterCorrectInversion };
  });
  check('wrong inversion (right pitch classes, wrong bass) does not advance the prompt', midiCheck.afterWrongInversion, 'func|C|Major|I–IV–V|0');
  check('correct inversion (root position, bass C) advances to step 1', midiCheck.afterCorrectInversion, 'func|C|Major|I–IV–V|1');

  // --- Display text: genFunctional() includes the step-0 inversion label. ---
  const genDisplayCheck = await page.evaluate(() => {
    document.getElementById('functionalRequireInversions').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    checkboxGatedPatterns().forEach(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      if (el) el.checked = (p === 'I–IV–V');
    });
    const prompt = genFunctional();
    return prompt.line2;
  });
  checkTrue('genFunctional() line2 includes the step-0 inversion label', genDisplayCheck.includes('(Root position)'), `line2="${genDisplayCheck}"`);

  // --- Display text: advanceProgressionStep() includes the next step's inversion label. ---
  const advanceDisplayCheck = await page.evaluate(async () => {
    midiEnabled = true;
    updateMidiUI();
    document.getElementById('functionalRequireInversions').checked = true;
    currentPromptKey = 'func|C|Major|I–IV–V|0';
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;
    heldNotes = new Set([60, 64, 67]); // C E G, root position -- correct step 0, advances to step 1
    updateKeyboard();
    checkMidi();
    await new Promise(r => setTimeout(r, 200)); // renderPrompt()'s flash delay
    return promptLine2.textContent;
  });
  checkTrue('advanceProgressionStep() line2 includes step 1\'s inversion label (2nd inversion)', advanceDisplayCheck.includes('(2nd inversion)'), `line2="${advanceDisplayCheck}"`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
