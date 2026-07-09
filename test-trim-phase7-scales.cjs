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

  const stillPresent = await page.evaluate(() =>
    ['Add G Major Scale', 'Add F Major Scale', 'Common Majors'].filter(n => LEARNING_PATH.some(s => s.name === n))
  );
  check('the 3 redundant key-ramp stages no longer exist', stillPresent, []);

  const adjacency = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    return {
      nextName: LEARNING_PATH[idx + 1]?.name,
      nextNotes: LEARNING_PATH[idx + 1]?.notes,
    };
  });
  check('"All Natural Scales" immediately follows "First Scale"', adjacency.nextName, 'All Natural Scales');
  check('"All Natural Scales" is at 7 natural keys', adjacency.nextNotes, ['C','D','E','F','G','A','B']);

  const stageCount = await page.evaluate(() => {
    const idxFirst = LEARNING_PATH.findIndex(s => s.name === 'First Scale');
    const idxAll12 = LEARNING_PATH.findIndex(s => s.name === 'All 12 Scales');
    return idxAll12 - idxFirst + 1;
  });
  check('Major scales phase now has 4 stages (was 7)', stageCount, 4);

  const phaseCount = await page.evaluate(() => LEARNING_PATH_PHASES.find(p => p.name === 'Major scales').count);
  check('LEARNING_PATH_PHASES "Major scales" count is 4', phaseCount, 4);

  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'All Natural Scales');
    applyStage(idx);
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      bChecked: document.querySelector('input[data-note="B"]').checked,
      c2Checked: document.querySelector('input[data-note="C#"]').checked,
    };
  });
  check('applyStage() on "All Natural Scales" checks C', applyCheck.cChecked, true);
  check('applyStage() on "All Natural Scales" checks B (7th natural)', applyCheck.bChecked, true);
  check('applyStage() on "All Natural Scales" leaves C# unchecked (not all 12 keys)', applyCheck.c2Checked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
