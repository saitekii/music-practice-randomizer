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

  const stageData = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    const stages = LEARNING_PATH.slice(idx, idx + 5);
    return {
      afterSpeedUp: LEARNING_PATH[idx - 1]?.name === 'Speed Up',
      beforeMeetInversions: LEARNING_PATH[idx + 5]?.name === 'Meet Inversions',
      names: stages.map(s => s.name),
      notes: stages.map(s => s.notes),
      chords: stages.map(s => s.chords),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 5 new stages start right after "Speed Up"', stageData.afterSpeedUp, JSON.stringify(stageData.names));
  checkTrue('"Meet Inversions" immediately follows the 5 new stages', stageData.beforeMeetInversions, null);
  check('stage names in order', stageData.names, ['Meet Left Hand', 'Left Hand, Nat. Keys', 'Add Minor, Left Hand', 'Left Hand Timer', 'Left Hand, All 12']);
  checkTrue('all 5 stages include leftHandMode and chordMajor', stageData.chords.every(c => c.includes('leftHandMode') && c.includes('chordMajor')), null);
  checkTrue('stages 3-5 also include chordMinor', stageData.chords.slice(2).every(c => c.includes('chordMinor')), null);
  checkTrue('stages 1-2 do not yet include chordMinor', stageData.chords.slice(0, 2).every(c => !c.includes('chordMinor')), null);
  check('notes progression: C, 7 naturals, 7 naturals, 7 naturals, 12 keys', stageData.notes, [
    ['C'],
    ['C','D','E','F','G','A','B'],
    ['C','D','E','F','G','A','B'],
    ['C','D','E','F','G','A','B'],
    ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],
  ]);
  check('timers: off, off, off, 15, 10', stageData.timers, ['off','off','off','15','10']);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Add Minor, Left Hand');
    applyStage(idx);
    return {
      leftHandChecked: document.getElementById('leftHandMode').checked,
      majorChecked: document.getElementById('chordMajor').checked,
      minorChecked: document.getElementById('chordMinor').checked,
      inversionsChecked: document.getElementById('inversions').checked,
      inversionsDisabled: document.getElementById('inversions').disabled,
    };
  });
  check('applyStage() checks leftHandMode', applyStageCheck.leftHandChecked, true);
  check('applyStage() checks chordMajor', applyStageCheck.majorChecked, true);
  check('applyStage() checks chordMinor', applyStageCheck.minorChecked, true);
  check('applyStage() leaves inversions unchecked (mutually exclusive with left-hand mode)', applyStageCheck.inversionsChecked, false);
  checkTrue('the inversions checkbox is disabled while left-hand mode is active (existing mutual-exclusion UI)', applyStageCheck.inversionsDisabled, null);

  const navigateAwayCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    applyStage(idx);
    return { leftHandStillChecked: document.getElementById('leftHandMode').checked };
  });
  check('navigating to a non-left-hand stage unchecks leftHandMode', navigateAwayCheck.leftHandStillChecked, false);

  const masteryCheck = await page.evaluate(() => {
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = { 'Left Hand': { ema: 1000, ema_slow: 1000, count: 5 } };
    adaptWeights.types = {};
    adaptWeights.roots = {};
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    return getStageMastery(idx);
  });
  check('a mastered Left Hand variation makes the stage ready, even with empty types/roots buckets', masteryCheck.ready, true);
  check('mastery percentage is 100 for a single fully-mastered Left Hand item', masteryCheck.pct, 100);

  const masteryIsolationCheck = await page.evaluate(() => {
    adaptWeights.variations = {}; // no left-hand practice yet
    adaptWeights.types = { 'Major': { ema: 1000, ema_slow: 1000, count: 5 } }; // Major IS mastered, but from earlier one-handed practice
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left Hand');
    return getStageMastery(idx);
  });
  check('a Left Hand stage does NOT show as mastered just because Major chord type is already mastered elsewhere (the bug this task fixes)', masteryIsolationCheck.ready, false);

  const regressionMasteryCheck = await page.evaluate(() => {
    adaptWeights.types = { 'Major': { ema: 1000, ema_slow: 1000, count: 5 } };
    // 'First Chord' has cats:['catChords'] and notes:['C'], so its mastery items span BOTH
    // the 'types' and 'roots' dimensions (pre-existing, unmodified behavior for non-left-hand
    // stages) -- mock roots.C too so this regression check actually reaches ready:true.
    adaptWeights.roots = { 'C': { ema: 1000, ema_slow: 1000, count: 5 } };
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Chord'); // a normal, pre-existing, non-left-hand stage
    return getStageMastery(idx);
  });
  check('a normal (non-left-hand) stage\'s mastery calculation is unaffected (regression)', regressionMasteryCheck.ready, true);

  const phaseCheck = await page.evaluate(() => ({
    phaseNames: LEARNING_PATH_PHASES.map(p => p.name),
    lhPhase: LEARNING_PATH_PHASES.find(p => p.name === 'Left-Hand Voicing'),
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  checkTrue('"Left-Hand Voicing" phase exists', !!phaseCheck.lhPhase, null);
  check('"Left-Hand Voicing" phase has count 5', phaseCheck.lhPhase?.count, 5);
  check('"Left-Hand Voicing" sits right after "Accidentals one at a time"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') - 1], 'Accidentals one at a time');
  check('"Left-Hand Voicing" sits right before "Triad inversions"', phaseCheck.phaseNames[phaseCheck.phaseNames.indexOf('Left-Hand Voicing') + 1], 'Triad inversions');
  check('LEARNING_PATH_PHASES has 18 entries total', phaseCheck.phaseNames.length, 18);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 124 stages total (120 + 4 new jazz-extended progression stages)', phaseCheck.totalStages, 124);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
