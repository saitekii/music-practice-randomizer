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

  const removed = await page.evaluate(() => LEARNING_PATH.some(s => s.name === 'Two Keys, Inverted'));
  checkTrue('"Two Keys, Inverted" no longer exists', !removed, null);

  const adjacency = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    return {
      nextName: LEARNING_PATH[idx + 1]?.name,
      nextNotes: LEARNING_PATH[idx + 1]?.notes,
    };
  });
  check('"Natural Majors Inv." immediately follows "Meet Inversions"', adjacency.nextName, 'Natural Majors Inv.');
  check('"Natural Majors Inv." is at 7 natural keys (no 2-key intermediate stage anymore)', adjacency.nextNotes, ['C','D','E','F','G','A','B']);

  const stageCount = await page.evaluate(() => {
    const idxMeet = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    const idxMastery = LEARNING_PATH.findIndex(s => s.name === 'Triad Mastery');
    return idxMastery - idxMeet + 1;
  });
  check('Triad inversions phase now has 8 stages (was 9)', stageCount, 8);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Triad inversions').count);
  check('LEARNING_PATH_PHASES "Triad inversions" count is 8', phaseCount, 8);

  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Inversions');
    applyStage(idx);
    return { cChecked: document.querySelector('input[data-note="C"]').checked, gChecked: document.querySelector('input[data-note="G"]').checked };
  });
  check('applyStage() on "Meet Inversions" checks C', applyCheck.cChecked, true);
  check('applyStage() on "Meet Inversions" leaves G unchecked (single key)', applyCheck.gChecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
