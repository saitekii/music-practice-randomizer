const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const stageOrder = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    return {
      idx,
      afterFunctionalC: LEARNING_PATH[idx - 1]?.name === 'Functional Harmony — C',
      names: LEARNING_PATH.slice(idx, idx + 8).map(s => s.name),
      progressionsArrays: LEARNING_PATH.slice(idx, idx + 8).map(s => s.progressions),
    };
  });
  checkTrue('the 8 new stages are inserted right after "Functional Harmony — C"', stageOrder.afterFunctionalC, JSON.stringify(stageOrder.names));
  check('stage 1 has just I–IV–V', JSON.stringify(stageOrder.progressionsArrays[0]), JSON.stringify(['I–IV–V']));
  check('stage 5 has accumulated all 5 major progressions', JSON.stringify(stageOrder.progressionsArrays[4]), JSON.stringify(['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I']));
  check('stage 8 (last) has all 8 progressions', JSON.stringify(stageOrder.progressionsArrays[7]), JSON.stringify(['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII']));

  const applyStageResult = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    applyStage(idx); // progressions: ['I–IV–V'] only
    return {
      iivviChecked: document.querySelector(`input[data-pattern="I–IV–V"]`).checked,
      ivviChecked:  document.querySelector(`input[data-pattern="IV–V–I"]`).checked,
      iiViChecked:  document.querySelector(`input[data-pattern="ii–V–I"]`).checked,
    };
  });
  check('applyStage() checks only the progressions this stage lists', applyStageResult.iivviChecked, true);
  check('applyStage() unchecks progressions not listed by this stage', applyStageResult.ivviChecked, false);
  check('applyStage() unchecks other progressions not listed either', applyStageResult.iiViChecked, false);

  const backCompat = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C'); // no `progressions` field
    applyStage(idx);
    const patterns = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return patterns.map(p => document.querySelector(`input[data-pattern="${p}"]`).checked);
  });
  checkTrue('a stage with no progressions field enables all 8 (backward compatible)', backCompat.every(c => c === true), JSON.stringify(backCompat));

  const masteryResult = await page.evaluate(() => {
    document.getElementById('adaptiveToggle').checked = true;
    adaptWeights.variations = { 'I–IV–V': { ema: 1000, ema_slow: 1000, count: 5 } };
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progression: I–IV–V');
    return getStageMastery(idx);
  });
  check('a mastered progression (count>=5, fast enough) shows the stage as ready', masteryResult.ready, true);
  check('mastery percentage is 100 for a single fully-mastered progression', masteryResult.pct, 100);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
