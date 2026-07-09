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

  // Starting the path stores a stage NAME, not a raw numeric index
  const startCheck = await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    return { stored: localStorage.getItem('mpr_learning_stage'), expectedName: LEARNING_PATH[0].name };
  });
  check('starting the path stores the stage name in localStorage', startCheck.stored, startCheck.expectedName);
  checkTrue('the stored value is not a bare numeric index', isNaN(Number(startCheck.stored)), null);

  // Next/Prev also store names
  const navCheck = await page.evaluate(() => {
    document.getElementById('stageNextBtn').click();
    const afterNext = localStorage.getItem('mpr_learning_stage');
    document.getElementById('stagePrevBtn').click();
    const afterPrev = localStorage.getItem('mpr_learning_stage');
    return { afterNext, afterPrev, name1: LEARNING_PATH[1].name, name0: LEARNING_PATH[0].name };
  });
  check('Next stores the new stage\'s name', navCheck.afterNext, navCheck.name1);
  check('Prev stores the stage name it lands back on', navCheck.afterPrev, navCheck.name0);

  // Reload restores position by name lookup
  await page.evaluate(() => location.reload());
  await page.waitForTimeout(500);
  const reloadCheck = await page.evaluate(() => learningStage);
  check('reload restores learningStage to the same index via name lookup', reloadCheck, 0);

  // A pre-existing numeric-format save (simulating a pre-migration user) resets cleanly to "not on path"
  await page.evaluate(() => { localStorage.setItem('mpr_learning_stage', '42'); location.reload(); });
  await page.waitForTimeout(500);
  const afterMigration = await page.evaluate(() => learningStage);
  check('an old numeric-format save resets to -1 (not on path) instead of landing on the wrong stage', afterMigration, -1);

  // Clicking a stage-list row stores that stage's name
  await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    document.getElementById('showStageListBtn').click();
  });
  await page.waitForTimeout(200);
  const rowClickCheck = await page.evaluate(() => {
    const openBody = Array.from(document.querySelectorAll('.stage-list-phase-body')).find(b => !b.classList.contains('collapsed'));
    const firstRow = openBody.querySelector('.stage-list-row');
    const idx = parseInt(firstRow.dataset.idx);
    firstRow.click();
    return { stored: localStorage.getItem('mpr_learning_stage'), expectedName: LEARNING_PATH[idx].name };
  });
  check('clicking a stage-list row stores that stage\'s name', rowClickCheck.stored, rowClickCheck.expectedName);

  // Export/import round-trip via the real file-input flow (Playwright can set files on a hidden input directly)
  await page.evaluate(() => {
    document.getElementById('startPathBtn').click();
    document.getElementById('stageNextBtn').click();
    document.getElementById('stageNextBtn').click();
  });
  const exportedName = await page.evaluate(() => localStorage.getItem('mpr_learning_stage'));
  checkTrue('export captures a stage name, not a numeric index', isNaN(Number(exportedName)), null);
  const backupJson = JSON.stringify({ learning_stage: exportedName });
  await page.evaluate(() => { localStorage.removeItem('mpr_learning_stage'); learningStage = -1; }); // simulate leaving the path
  await page.setInputFiles('#importFileInput', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backupJson) });
  await page.waitForTimeout(300);
  const afterImport = await page.evaluate(() => learningStage);
  check('importing a backup with a stage-name learning_stage restores the correct index', afterImport, 2);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
