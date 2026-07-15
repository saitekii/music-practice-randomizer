const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
  });
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

  // --- Placement: new phase sits immediately after Speed Up, before First Song, New Keys ---
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Speed Up');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(idx + 1, idx + 7),
      nextAfterThat: names[idx + 7],
    };
  });
  check('LEARNING_PATH has 154 stages total (152 - 4 deleted + 6 new)', placement.totalStages, 154);
  check('the 6 new stages sit immediately after Speed Up, in order', placement.between, [
    'Meet the Scales',
    'Scales, 0–1 Accidentals',
    'Scales, 2 Accidentals',
    'Scales, 3 Accidentals',
    'Scales, All 12 Keys',
    'Scale Timer',
  ]);
  check("'First Song, New Keys' sits immediately after the new phase", placement.nextAfterThat, 'First Song, New Keys');

  // --- Old Major scales phase and its 4 stages no longer exist anywhere ---
  const oldContentGone = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    return {
      firstScaleGone: !names.includes('First Scale'),
      allNaturalScalesGone: !names.includes('All Natural Scales'),
      oldScaleTimerGone: !names.includes('Scale Timer') || names.filter(n => n === 'Scale Timer').length === 1, // new phase reuses this exact name once
      all12ScalesGone: !names.includes('All 12 Scales'),
      oldPhaseGone: !LEARNING_PATH_PHASES.some(p => p.name === 'Major scales'),
    };
  });
  checkTrue("'First Scale' no longer exists", oldContentGone.firstScaleGone, null);
  checkTrue("'All Natural Scales' no longer exists", oldContentGone.allNaturalScalesGone, null);
  checkTrue("'Scale Timer' exists exactly once (only the new phase's own stage, not a leftover)", oldContentGone.oldScaleTimerGone, null);
  checkTrue("'All 12 Scales' no longer exists", oldContentGone.all12ScalesGone, null);
  checkTrue("the old 'Major scales' LEARNING_PATH_PHASES entry no longer exists", oldContentGone.oldPhaseGone, null);

  // --- 'Two-Handed Minor Progression' (old neighbor of the deleted phase) is now immediately followed by 'Mix Chords + Scales' ---
  const deletionBoundary = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const idx = names.indexOf('Two-Handed Minor Progression');
    return names[idx + 1];
  });
  check("'Mix Chords + Scales' now sits immediately after 'Two-Handed Minor Progression'", deletionBoundary, 'Mix Chords + Scales');

  // --- Exact field values for all 6 new stages ---
  const stageData = await page.evaluate(() => {
    const byName = n => LEARNING_PATH.find(s => s.name === n);
    return {
      meet:    byName('Meet the Scales'),
      b1:      byName('Scales, 0–1 Accidentals'),
      b2:      byName('Scales, 2 Accidentals'),
      b3:      byName('Scales, 3 Accidentals'),
      all12:   byName('Scales, All 12 Keys'),
      timerSt: byName('Scale Timer'),
    };
  });
  check('Meet the Scales notes', stageData.meet.notes, ['C','A']);
  check('Meet the Scales scales', stageData.meet.scales, ['scaleMajor','scaleNatMinor']);
  check('Meet the Scales timer', stageData.meet.timer, 'off');
  check('Meet the Scales chords', stageData.meet.chords, []);
  check('Meet the Scales cats', stageData.meet.cats, ['catScales']);

  check('Scales, 0–1 Accidentals notes', stageData.b1.notes, ['C','D','E','F','G','A']);
  check('Scales, 0–1 Accidentals scales', stageData.b1.scales, ['scaleMajor','scaleNatMinor']);
  check('Scales, 0–1 Accidentals timer', stageData.b1.timer, 'off');

  check('Scales, 2 Accidentals notes', stageData.b2.notes, ['C','D','E','F','G','A','Bb','B']);
  check('Scales, 2 Accidentals timer', stageData.b2.timer, 'off');

  check('Scales, 3 Accidentals notes', stageData.b3.notes, ['C','D','Eb','E','F','F#','G','A','Bb','B']);
  check('Scales, 3 Accidentals timer', stageData.b3.timer, 'off');

  check('Scales, All 12 Keys notes', stageData.all12.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Scales, All 12 Keys timer', stageData.all12.timer, 'off');

  check('Scale Timer notes', stageData.timerSt.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Scale Timer scales', stageData.timerSt.scales, ['scaleMajor','scaleNatMinor']);
  check('Scale Timer timer', stageData.timerSt.timer, '15');

  // --- Add Minor Scale: only the hint changed, everything else identical to before ---
  const addMinorScale = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'Add Minor Scale'));
  check('Add Minor Scale hint is updated', addMinorScale.hint, 'Minor scale (already familiar) now combined with chords too');
  check('Add Minor Scale notes unchanged', addMinorScale.notes, ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
  check('Add Minor Scale chords unchanged', addMinorScale.chords, ['chordMajor','chordMinor','inversions']);
  check('Add Minor Scale scales unchanged', addMinorScale.scales, ['scaleMajor','scaleNatMinor']);
  check('Add Minor Scale timer unchanged', addMinorScale.timer, '10');

  // --- LEARNING_PATH_PHASES: length stays 25, sums to 154, new entry has count 6 ---
  const phaseData = await page.evaluate(() => ({
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    newPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Major & Minor Scales'),
  }));
  check('LEARNING_PATH_PHASES.length stays 25', phaseData.phaseCount, 25);
  check('LEARNING_PATH_PHASES sums to 154', phaseData.phaseSum, 154);
  checkTrue("'Major & Minor Scales' phase entry exists", !!phaseData.newPhase, null);
  check("'Major & Minor Scales' count is 6", phaseData.newPhase?.count, 6);

  // --- applyStage() spot check: 'Scales, 2 Accidentals' checks exactly the right roots/scales/timer ---
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Scales, 2 Accidentals');
    applyStage(idx);
    const checkedNotes = [...document.querySelectorAll('input[data-note]')].filter(el => el.checked).map(el => el.dataset.note);
    return {
      checkedNotes: checkedNotes.sort(),
      scaleMajorChecked: document.getElementById('scaleMajor').checked,
      scaleNatMinorChecked: document.getElementById('scaleNatMinor').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      timerOffChecked: document.querySelector('input[name="timer"][value="off"]')?.checked,
    };
  });
  check("applyStage('Scales, 2 Accidentals') checks exactly C,D,E,F,G,A,Bb,B", applied.checkedNotes, ['A','B','Bb','C','D','E','F','G'].sort());
  checkTrue('applyStage() checks scaleMajor', applied.scaleMajorChecked, null);
  checkTrue('applyStage() checks scaleNatMinor', applied.scaleNatMinorChecked, null);
  checkTrue('applyStage() checks catScales', applied.catScalesChecked, null);
  checkTrue('applyStage() leaves catChords unchecked', !applied.catChordsChecked, null);
  checkTrue('applyStage() selects the off timer radio (stage timer is "off")', applied.timerOffChecked, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
