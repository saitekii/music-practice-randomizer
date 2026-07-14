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

  // --- The 3 new stages exist, immediately after Triad Mastery and before Two-Handed First Song
  //     (the first stage of the later Two-Handed Progressions phase) ---
  const orderCheck = await page.evaluate(() => {
    const idxTriadMastery = LEARNING_PATH.findIndex(s => s.name === 'Triad Mastery');
    const idxNextPhase    = LEARNING_PATH.findIndex(s => s.name === 'Two-Handed First Song');
    const between = LEARNING_PATH.slice(idxTriadMastery + 1, idxNextPhase);
    return {
      count: between.length,
      names: between.map(s => s.name),
    };
  });
  check('exactly 3 new stages between Triad Mastery and Two-Handed First Song', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted']);

  // --- Total stage count and the new phase's count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    invertedPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Progressions, Inverted'),
  }));
  check('LEARNING_PATH has 145 stages total (128 + 3 new + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions)', phaseData.totalStages, 145);
  check('LEARNING_PATH_PHASES sums to 145', phaseData.phaseSum, 145);
  check('Progressions, Inverted phase has count 3', phaseData.invertedPhase?.count, 3);

  // --- applyStage() on each new stage: cumulative progressions, requireProgressionInversions
  //     on, C-only, untimed. ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedProgressions] of [
      ['Invert Your First Song', ['I–IV–V']],
      ['Invert the Turnaround', ['I–IV–V', 'IV–V–I']],
      ['Four Chords, Inverted', ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        requireInvChecked: document.getElementById('functionalRequireInversions').checked,
        cChecked: document.querySelector('input[data-note="C"]').checked,
        dChecked: document.querySelector('input[data-note="D"]').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        progressionsChecked: expectedProgressions.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Invert Your First Song', 'Invert the Turnaround', 'Four Chords, Inverted']) {
    checkTrue(`applyStage() on ${name} checks functionalRequireInversions`, applyChecks[name].requireInvChecked, null);
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves D unchecked (C-only)`, !applyChecks[name].dChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected progressions`, applyChecks[name].progressionsChecked, null);
  }

  // --- End-to-end sanity: Invert Your First Song actually requires the registered
  //     inversion, not just root position. ---
  const e2eCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Invert Your First Song');
    applyStage(idx);
    return {
      step1RequiredBass: getExpectedPCs('func|C|Major|I–IV–V|1').requiredBassPc, // IV, 2nd inversion -> C (0)
    };
  });
  check('Invert Your First Song: step 1 (IV) requires bass C via the registered voicing', e2eCheck.step1RequiredBass, 0);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
