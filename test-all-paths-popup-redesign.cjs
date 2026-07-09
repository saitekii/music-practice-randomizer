const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  // Pre-seed mpr_settings so the onboarding overlay (shown when it's absent)
  // doesn't intercept clicks on a fresh profile — same workaround already
  // used by test-piano.cjs / test-themes.cjs in this repo.
  await page.addInitScript(() => {
    localStorage.setItem('mpr_settings', '{}');
  });
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

  // --- LEARNING_PATH_PHASES data integrity ---
  const phaseData = await page.evaluate(() => ({
    phaseCount: LEARNING_PATH_PHASES.length,
    countSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
    stageCount: LEARNING_PATH.length,
    firstName: LEARNING_PATH_PHASES[0].name,
    lastName: LEARNING_PATH_PHASES[LEARNING_PATH_PHASES.length - 1].name,
  }));
  check('LEARNING_PATH_PHASES has 17 entries', phaseData.phaseCount, 17);
  check('phase counts sum to LEARNING_PATH.length', phaseData.countSum, phaseData.stageCount);
  check('LEARNING_PATH.length matches the expected 119 stages', phaseData.stageCount, 119);
  check('first phase is Note Finder', phaseData.firstName, 'Note Finder');
  check('last phase is Diatonic chords', phaseData.lastName, 'Diatonic chords');

  // --- Set a known stage, open the popup, check grouped view ---
  await page.evaluate(() => {
    localStorage.setItem('mpr_learning_stage', '20'); // an arbitrary mid-path stage
    location.reload();
  });
  await page.waitForTimeout(500);

  await page.click('#showStageListBtn');
  await page.waitForTimeout(200);

  const groupedView = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('.stage-list-phase-header'));
    const bodies  = Array.from(document.querySelectorAll('.stage-list-phase-body'));
    const rows    = document.querySelectorAll('.stage-list-row');
    const openHeaders = headers.filter(h => h.classList.contains('open'));
    const openBodies  = bodies.filter(b => !b.classList.contains('collapsed'));
    const current = document.querySelector('.stage-list-row.current');
    return {
      headerCount: headers.length,
      bodyCount: bodies.length,
      rowCount: rows.length,
      openHeaderCount: openHeaders.length,
      openBodyCount: openBodies.length,
      currentIdx: current ? parseInt(current.dataset.idx) : null,
      currentRowIsInAnOpenBody: current ? !current.closest('.stage-list-phase-body').classList.contains('collapsed') : false,
      searchValueOnOpen: document.getElementById('stageListSearch').value,
    };
  });
  check('17 phase headers rendered', groupedView.headerCount, 17);
  check('17 phase bodies rendered', groupedView.bodyCount, 17);
  check('all 119 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 119);
  check('exactly one phase header is open by default', groupedView.openHeaderCount, 1);
  check('exactly one phase body is open by default', groupedView.openBodyCount, 1);
  check('the current stage (idx 20) is marked current', groupedView.currentIdx, 20);
  checkTrue('the current stage row sits inside the one open (expanded) phase body', groupedView.currentRowIsInAnOpenBody, null);
  check('search box is empty when the popup opens', groupedView.searchValueOnOpen, '');

  // --- Click a collapsed phase header, verify it opens ---
  const toggleResult = await page.evaluate(() => {
    const collapsedHeader = Array.from(document.querySelectorAll('.stage-list-phase-header')).find(h => !h.classList.contains('open'));
    const phaseIdx = collapsedHeader.dataset.phase;
    collapsedHeader.click();
    const body = document.querySelector(`.stage-list-phase-body[data-phase-body="${phaseIdx}"]`);
    return {
      headerNowOpen: collapsedHeader.classList.contains('open'),
      bodyNowVisible: !body.classList.contains('collapsed'),
    };
  });
  checkTrue('clicking a collapsed phase header opens it', toggleResult.headerNowOpen, null);
  checkTrue('clicking a collapsed phase header reveals its body', toggleResult.bodyNowVisible, null);

  // --- Search: flat filtered list, no headers ---
  await page.fill('#stageListSearch', 'Diatonic');
  await page.waitForTimeout(200);
  const searchView = await page.evaluate(() => {
    const headers = document.querySelectorAll('.stage-list-phase-header');
    const rows = Array.from(document.querySelectorAll('.stage-list-row'));
    return {
      headerCount: headers.length,
      rowCount: rows.length,
      allNamesMatch: rows.every(r => r.querySelector('.stage-list-name').textContent.toLowerCase().includes('diatonic')),
    };
  });
  check('no phase headers shown while searching', searchView.headerCount, 0);
  checkTrue('at least one matching row shown for "Diatonic"', searchView.rowCount > 0, searchView.rowCount);
  checkTrue('every visible row matches the search text', searchView.allNamesMatch, null);

  // --- Clear search, grouped view restored ---
  await page.fill('#stageListSearch', '');
  await page.waitForTimeout(200);
  const clearedView = await page.evaluate(() => document.querySelectorAll('.stage-list-phase-header').length);
  check('clearing search restores the 17 phase headers', clearedView, 17);

  // --- Reopen popup: search resets, grouped view resets to current-phase-open ---
  await page.click('#stageListClose');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const collapsedHeader = Array.from(document.querySelectorAll('.stage-list-phase-header')).find(h => !h.classList.contains('open'));
    if (collapsedHeader) collapsedHeader.click(); // leave some other phase open too
  });
  await page.click('#showStageListBtn');
  await page.waitForTimeout(200);
  const reopenView = await page.evaluate(() => ({
    searchValue: document.getElementById('stageListSearch').value,
    openHeaderCount: Array.from(document.querySelectorAll('.stage-list-phase-header')).filter(h => h.classList.contains('open')).length,
  }));
  check('search box is cleared again on reopen', reopenView.searchValue, '');
  check('exactly one phase open again on reopen (reset, not carried over)', reopenView.openHeaderCount, 1);

  // --- Clicking a visible stage row still applies the stage and closes the popup (regression) ---
  const rowClickResult = await page.evaluate(() => {
    const openBody = Array.from(document.querySelectorAll('.stage-list-phase-body')).find(b => !b.classList.contains('collapsed'));
    const firstRow = openBody.querySelector('.stage-list-row');
    const idx = parseInt(firstRow.dataset.idx);
    firstRow.click();
    return { clickedIdx: idx };
  });
  await page.waitForTimeout(300);
  const afterRowClick = await page.evaluate(() => ({
    learningStage,
    modalHidden: document.getElementById('stageListModal').classList.contains('hidden'),
  }));
  check('clicking a stage row sets learningStage to that row\'s index', afterRowClick.learningStage, rowClickResult.clickedIdx);
  checkTrue('clicking a stage row closes the popup', afterRowClick.modalHidden, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
