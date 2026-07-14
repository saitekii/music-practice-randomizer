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

  // --- The 2 new stages exist, in order, between All 12, Inverted and Add Dim & Aug ---
  const orderCheck = await page.evaluate(() => {
    const idxAllInv = LEARNING_PATH.findIndex(s => s.name === 'All 12, Inverted');
    const idxAddDimAug = LEARNING_PATH.findIndex(s => s.name === 'Add Dim & Aug');
    const between = LEARNING_PATH.slice(idxAllInv + 1, idxAddDimAug);
    return { count: between.length, names: between.map(s => s.name) };
  });
  check('exactly 2 new stages between All 12, Inverted and Add Dim & Aug', orderCheck.count, 2);
  check('the 2 stages are named and ordered correctly', orderCheck.names, ['Meet Diminished', 'Meet Augmented']);

  // --- Total stage count and Triad inversions phase count ---
  const phaseData = await page.evaluate(() => ({
    totalStages: LEARNING_PATH.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    triadInversionsCount: LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions')?.count,
    totalPhases: LEARNING_PATH_PHASES.length,
  }));
  check('LEARNING_PATH has 150 stages total (134 + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', phaseData.totalStages, 150);
  check('LEARNING_PATH_PHASES sums to 150', phaseData.phaseSum, 150);
  check('Triad inversions phase count is 10 (8 + 2 new)', phaseData.triadInversionsCount, 10);
  check('LEARNING_PATH_PHASES has 25 entries (21 + Progressions in New Keys + First Minor Progression + Left-Hand Progressions + Minor Progressions in New Keys)', phaseData.totalPhases, 25);

  // --- applyStage() on each new stage: correct content, C-only, no inversions, untimed ---
  const applyChecks = await page.evaluate(() => {
    const results = {};
    for (const [name, expectedChords] of [
      ['Meet Diminished', ['chordMajor', 'chordMinor', 'chordDiminished']],
      ['Meet Augmented', ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented']],
    ]) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = {
        cChecked: document.querySelector('input[data-note="C"]').checked,
        c2Checked: document.querySelector('input[data-note="C#"]').checked,
        inversionsChecked: document.getElementById('inversions').checked,
        timerOff: document.querySelector('input[name="timer"]:checked')?.value === 'off',
        chordsChecked: expectedChords.every(c => document.getElementById(c).checked === true),
      };
    }
    return results;
  });
  for (const name of ['Meet Diminished', 'Meet Augmented']) {
    checkTrue(`applyStage() on ${name} checks C`, applyChecks[name].cChecked, null);
    checkTrue(`applyStage() on ${name} leaves C# unchecked (C-only)`, !applyChecks[name].c2Checked, null);
    checkTrue(`applyStage() on ${name} leaves inversions unchecked`, !applyChecks[name].inversionsChecked, null);
    checkTrue(`applyStage() on ${name} sets timer off`, applyChecks[name].timerOff, null);
    checkTrue(`applyStage() on ${name} checks its expected chord types`, applyChecks[name].chordsChecked, null);
  }
  const meetAugAlsoCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Diminished');
    applyStage(idx);
    return document.getElementById('chordAugmented').checked;
  });
  check('Meet Diminished leaves chordAugmented unchecked (not yet introduced)', meetAugAlsoCheck, false);

  // --- Add Dim & Aug and Triad Mastery are unchanged ---
  const unchangedCheck = await page.evaluate(() => {
    const addDimAug = LEARNING_PATH.find(s => s.name === 'Add Dim & Aug');
    const triadMastery = LEARNING_PATH.find(s => s.name === 'Triad Mastery');
    return {
      addDimAugChords: addDimAug.chords,
      addDimAugTimer: addDimAug.timer,
      addDimAugNotes: addDimAug.notes,
      triadMasteryChords: triadMastery.chords,
    };
  });
  check('Add Dim & Aug chords unchanged', unchangedCheck.addDimAugChords, ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented', 'inversions']);
  check('Add Dim & Aug timer unchanged', unchangedCheck.addDimAugTimer, '10');
  check('Add Dim & Aug notes unchanged (all 12 keys)', unchangedCheck.addDimAugNotes.length, 12);
  check('Triad Mastery chords unchanged', unchangedCheck.triadMasteryChords, ['chordMajor', 'chordMinor', 'chordDiminished', 'chordAugmented', 'inversions']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
