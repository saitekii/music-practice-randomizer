const fs = require('fs');
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 }, acceptDownloads: true });
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

  // #showStageListBtn lives inside #pathActive, which is hidden until a Learning Path stage
  // is active -- seed one and reload, matching the exact pattern test-all-paths-popup-redesign.cjs
  // already uses for the same button.
  await page.evaluate(() => {
    localStorage.setItem('mpr_learning_stage', LEARNING_PATH[20].name); // an arbitrary mid-path stage
    location.reload();
  });
  await page.waitForTimeout(500);

  await page.click('#showStageListBtn');
  await page.waitForTimeout(100);

  // --- Empty state: no favorites yet ---
  const emptyState = await page.evaluate(() => {
    document.getElementById('stageListFavoritesBtn').click();
    return document.getElementById('stageListContent').textContent;
  });
  checkTrue('Favorites filter with zero favorites shows the empty-state message', emptyState.includes('No favorites yet'), emptyState.trim());

  // Turn favorites filter back off before continuing
  await page.evaluate(() => document.getElementById('stageListFavoritesBtn').click());

  // --- Starring a stage: updates storage, updates the star's own visual state, does NOT jump ---
  const starResult = await page.evaluate(() => {
    const firstRow = document.querySelector('#stageListContent .stage-list-row');
    const stageName = firstRow.querySelector('.stage-list-name').textContent;
    const star = firstRow.querySelector('.stage-favorite-star');
    star.click();
    return {
      stageName,
      favorites: JSON.parse(localStorage.getItem('mpr_favorite_stages') || '[]'),
      starIsFavorited: document.querySelector('.stage-favorite-star').classList.contains('favorited'),
      modalStillOpen: !document.getElementById('stageListModal').classList.contains('hidden'),
      learningStageUnchanged: learningStage === 20,
    };
  });
  check('starring the first stage adds it to mpr_favorite_stages', starResult.favorites, [starResult.stageName]);
  checkTrue('the starred row shows the filled star (favorited class)', starResult.starIsFavorited, null);
  checkTrue('clicking the star does not close the popup', starResult.modalStillOpen, null);
  checkTrue('clicking the star does not jump to that stage (learningStage unchanged)', starResult.learningStageUnchanged, null);

  // --- Star a second stage, then filter to favorites only ---
  const secondStarredName = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#stageListContent .stage-list-row')];
    const second = rows[5]; // an arbitrary different row
    const name = second.querySelector('.stage-list-name').textContent;
    second.querySelector('.stage-favorite-star').click();
    return name;
  });

  const filteredView = await page.evaluate(() => {
    document.getElementById('stageListFavoritesBtn').click();
    const names = [...document.querySelectorAll('#stageListContent .stage-list-name')].map(el => el.textContent);
    const hasPhaseHeaders = !!document.querySelector('#stageListContent .stage-list-phase-header');
    return { names, hasPhaseHeaders };
  });
  check('Favorites filter shows exactly the 2 starred stages', filteredView.names.sort(), [starResult.stageName, secondStarredName].sort());
  checkTrue('Favorites filter view has no phase headers (flat list, like search)', !filteredView.hasPhaseHeaders, null);

  // --- Combine Favorites filter with search text ---
  const combined = await page.evaluate((firstName) => {
    const searchTerm = firstName.slice(0, 4);
    document.getElementById('stageListSearch').value = searchTerm;
    document.getElementById('stageListSearch').dispatchEvent(new Event('input'));
    return [...document.querySelectorAll('#stageListContent .stage-list-name')].map(el => el.textContent);
  }, starResult.stageName);
  checkTrue('combining search with Favorites filter narrows to matching favorited stages only', combined.length >= 1 && combined.every(n => n === starResult.stageName || n === secondStarredName), combined.join(', '));

  // --- Clicking a row (not the star) inside the filtered view still jumps and closes the popup ---
  await page.evaluate(() => {
    document.getElementById('stageListSearch').value = '';
    document.getElementById('stageListSearch').dispatchEvent(new Event('input'));
  });
  const jumpResult = await page.evaluate(() => {
    const row = document.querySelector('#stageListContent .stage-list-row');
    const idx = parseInt(row.dataset.idx);
    row.querySelector('.stage-list-name').click();
    return { idx, learningStage, modalHidden: document.getElementById('stageListModal').classList.contains('hidden') };
  });
  check('clicking a row (not the star) inside the Favorites view jumps to that stage', jumpResult.learningStage, jumpResult.idx);
  checkTrue('clicking a row inside the Favorites view closes the popup', jumpResult.modalHidden, null);

  // --- Reopening the popup resets both the search box and the Favorites filter, but the
  //     starred stage's own state (persisted in localStorage) survives the reopen ---
  await page.click('#showStageListBtn');
  await page.waitForTimeout(100);
  const resetState = await page.evaluate((favoritedName) => ({
    searchValue: document.getElementById('stageListSearch').value,
    favoritesBtnActive: document.getElementById('stageListFavoritesBtn').classList.contains('active'),
    hasPhaseHeaders: !!document.querySelector('#stageListContent .stage-list-phase-header'),
    reFoundRow: [...document.querySelectorAll('#stageListContent .stage-list-row')]
      .find(r => r.querySelector('.stage-list-name').textContent === favoritedName),
  }), secondStarredName);
  check('search box is empty on reopen', resetState.searchValue, '');
  checkTrue('Favorites filter button is not active on reopen', !resetState.favoritesBtnActive, null);
  checkTrue('reopening shows the normal phase-grouped view, not the favorites-filtered flat view', resetState.hasPhaseHeaders, null);
  const stillFavorited = await page.evaluate((favoritedName) => {
    const row = [...document.querySelectorAll('#stageListContent .stage-list-row')]
      .find(r => r.querySelector('.stage-list-name').textContent === favoritedName);
    return row.querySelector('.stage-favorite-star').classList.contains('favorited');
  }, secondStarredName);
  checkTrue('a previously-starred stage still shows as favorited after closing and reopening the popup', stillFavorited, null);

  // --- exportJSON() / importJSON() (the REAL functions, real download + real file-input
  //     selection, not a reimplementation of their internal logic) round-trip favorite_stages ---
  await page.evaluate(() => localStorage.setItem('mpr_favorite_stages', JSON.stringify(['Find C', 'Add C♯'])));
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => exportJSON());
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const exportedContent = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
  check("exportJSON()'s real downloaded file includes favorite_stages", exportedContent.favorite_stages, ['Find C', 'Add C♯']);

  await page.evaluate(() => localStorage.setItem('mpr_favorite_stages', JSON.stringify([])));
  await page.setInputFiles('#importFileInput', downloadPath);
  await page.waitForTimeout(200);
  const afterImport = await page.evaluate(() => JSON.parse(localStorage.getItem('mpr_favorite_stages')));
  check("importJSON()'s real file-input handler restores favorite_stages", afterImport, ['Find C', 'Add C♯']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
