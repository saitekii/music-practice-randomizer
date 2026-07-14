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

  const NEW_PATTERN = 'I–V/vi–vi–V/V–ii–V';

  const stageCheck = await page.evaluate((pattern) => {
    const stage3 = LEARNING_PATH.find(s => s.name === 'Circle of Fifths & Applied Chords');
    const stage4 = LEARNING_PATH.find(s => s.name === 'Cadences & Color Chords');
    const otherStages = LEARNING_PATH.filter(s =>
      s.name !== 'Circle of Fifths & Applied Chords' && s.name !== 'Cadences & Color Chords');
    return {
      stage3HasIt: stage3.progressions.includes(pattern),
      stage3Count: stage3.progressions.length,
      stage4HasIt: stage4.progressions.includes(pattern),
      stage4Count: stage4.progressions.length,
      noOtherStageHasIt: otherStages.every(s => !(s.progressions || []).includes(pattern)),
    };
  }, NEW_PATTERN);
  checkTrue('"Circle of Fifths & Applied Chords" stage includes the new progression', stageCheck.stage3HasIt, null);
  check('"Circle of Fifths & Applied Chords" stage has 108 progressions (107 + 1 new)', stageCheck.stage3Count, 108);
  checkTrue('"Cadences & Color Chords" stage includes the new progression (cumulative)', stageCheck.stage4HasIt, null);
  check('"Cadences & Color Chords" stage has 113 progressions (112 + 1 new)', stageCheck.stage4Count, 113);
  checkTrue('no earlier stage was affected', stageCheck.noOtherStageHasIt, null);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCount: LEARNING_PATH_PHASES.length,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is unchanged at 26 (no new stage)', phaseCheck.functionalHarmonyCount, 26);
  check('LEARNING_PATH_PHASES has 20 entries', phaseCheck.phaseCount, 20);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 131 stages total', phaseCheck.totalStages, 131);

  const applyStageCheck = await page.evaluate((pattern) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Circle of Fifths & Applied Chords');
    applyStage(idx);
    return document.querySelector(`input[data-pattern="${pattern}"]`).checked;
  }, NEW_PATTERN);
  check('applyStage() on "Circle of Fifths & Applied Chords" checks the new progression', applyStageCheck, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
