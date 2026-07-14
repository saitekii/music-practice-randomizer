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

  // --- The 3 new stages exist, immediately after Four Chords, Inverted and before First Scale ---
  const orderCheck = await page.evaluate(() => {
    const idxFourInv    = LEARNING_PATH.findIndex(s => s.name === 'Four Chords, Inverted');
    const idxFirstScale = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const between = LEARNING_PATH.slice(idxFourInv + 1, idxFirstScale);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 3 new stages between Four Chords, Inverted and First Scale', orderCheck.count, 3);
  check('the 3 stages are named and ordered correctly', orderCheck.names, ['Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']);

  // --- Total stage count and the new phase's count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    newPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Two-Handed Progressions'),
  }));
  check('LEARNING_PATH has 150 stages total (131 + 3 new + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
  check('Two-Handed Progressions phase has count 3', phaseData.newPhase?.count, 3);

  // --- applyStage() on each new stage: cumulative progressions, leftHandMode on,
  //     requireProgressionInversions on, C-only, untimed. ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedProgressions] of [
      ['Two-Handed First Song', ['I–IV–V']],
      ['Two-Handed Turnaround', ['I–IV–V', 'IV–V–I']],
      ['Four Chords, Two Hands', ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        leftHandChecked: document.getElementById('leftHandMode').checked,
        requireInvChecked: document.getElementById('functionalRequireInversions').checked,
        cChecked: document.querySelector('input[data-note="C"]').checked,
        dChecked: document.querySelector('input[data-note="D"]').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        progressionsChecked: expectedProgressions.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Two-Handed First Song', 'Two-Handed Turnaround', 'Four Chords, Two Hands']) {
    checkTrue(`applyStage() on ${name} checks leftHandMode`, applyChecks[name].leftHandChecked, null);
    checkTrue(`applyStage() on ${name} checks functionalRequireInversions`, applyChecks[name].requireInvChecked, null);
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves D unchecked (C-only)`, !applyChecks[name].dChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected progressions`, applyChecks[name].progressionsChecked, null);
  }

  // --- End-to-end sanity: Two-Handed First Song actually produces a 6-segment
  //     LH-mode key with the correct left-hand voicing for step 1 (IV, 2nd inversion). ---
  const e2eCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Two-Handed First Song');
    applyStage(idx);
    return getExpectedPCs('func|C|Major|I–IV–V|1|LH').leftHandPcs;
  });
  check('Two-Handed First Song: step 1 (IV) left hand is [C,F] via the registered voicing', e2eCheck, [0, 5]);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
