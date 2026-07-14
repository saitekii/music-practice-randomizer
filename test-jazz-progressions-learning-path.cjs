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
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    const stages = LEARNING_PATH.slice(idx, idx + 4);
    return {
      afterMinorBorrowed: LEARNING_PATH[idx - 1]?.name === 'Minor Borrowed — ♭II',
      beforeNatKeys: LEARNING_PATH[idx + 4]?.name === 'Functional, Nat. Keys',
      names: stages.map(s => s.name),
      counts: stages.map(s => (s.progressions || []).length),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 4 new stages start right after "Minor Borrowed — ♭II"', stageData.afterMinorBorrowed, JSON.stringify(stageData.names));
  checkTrue('"Functional, Nat. Keys" immediately follows the 4 new stages', stageData.beforeNatKeys, null);
  check('stage names in order', stageData.names, [
    'Jazz 7th Chords', 'Extended 9ths, 11ths & 13ths', 'Circle of Fifths & Applied Chords', 'Cadences & Color Chords',
  ]);
  check('cumulative progression counts (81 base + 8/19/26/31 + 2 secondary-dominant)', stageData.counts, [89, 100, 108, 113]);
  check('all 4 stages are timer off', stageData.timers, ['off', 'off', 'off', 'off']);
  check('all 4 stages are C only (no key ramp needed here)', stageData.notes, [['C'], ['C'], ['C'], ['C']]);

  const contentSpotCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    const [s1, s2, s3, s4] = LEARNING_PATH.slice(idx, idx + 4);
    return {
      s1HasOwn: ['I–VI7–ii–V', 'ii9–V13–Imaj9'].every(p => s1.progressions.includes(p)),
      s2LacksS3Only: !s2.progressions.includes('I–III7–vi–II7–ii–V–I'),
      s2HasOwn: ['Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13'].every(p => s2.progressions.includes(p)),
      s3HasOwn: ['I–III7–vi–II7–ii–V–I', '♭II7–I'].every(p => s3.progressions.includes(p)),
      s4HasOwn: ['V–vi', 'V–IV', 'Imaj7–viiø7–iii7–vi7', 'Imaj7♯11–IImaj7', 'Imaj7♯11–♭VIImaj7'].every(p => s4.progressions.includes(p)),
    };
  });
  checkTrue('stage 1 has its own jazz-7th content', contentSpotCheck.s1HasOwn, null);
  checkTrue('stage 2 does not yet have stage-3-only content', contentSpotCheck.s2LacksS3Only, null);
  checkTrue('stage 2 has its own extended-9/11/13 content', contentSpotCheck.s2HasOwn, null);
  checkTrue('stage 3 has its own Circle-of-Fifths/applied-chord content', contentSpotCheck.s3HasOwn, null);
  checkTrue('stage 4 has all 5 of its own cadence/color-chord entries', contentSpotCheck.s4HasOwn, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Jazz 7th Chords');
    applyStage(idx);
    return {
      ownChecked: document.querySelector('input[data-pattern="Imaj7–iii7–vi7–ii7–V7"]').checked,
      laterStageUnchecked: document.querySelector('input[data-pattern="V–vi"]').checked, // stage 4 only
    };
  });
  check('applyStage() on "Jazz 7th Chords" checks its own content', applyStageCheck.ownChecked, true);
  check('applyStage() leaves stage-4-only content unchecked', applyStageCheck.laterStageUnchecked, false);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is 26 (22 + 4 new stages)', phaseCheck.functionalHarmonyCount, 26);
  check('LEARNING_PATH_PHASES has 22 entries', phaseCheck.phaseCount, 22);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 141 stages total', phaseCheck.totalStages, 141);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
