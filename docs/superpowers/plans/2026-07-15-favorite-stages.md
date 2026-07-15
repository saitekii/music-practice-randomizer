# Favorite Learning Path Stages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users star Learning Path stages in the existing "All Paths" popup and filter that same popup down to just their favorites, combinable with the existing search box.

**Architecture:** Extends the existing `renderStageRow()`/`renderStageList()` functions and the popup's delegated click handler — no new rendering strategy, no new "jump to a stage" logic (that already exists via `applyStage()`). A new `mpr_favorite_stages` localStorage key (array of stage names) is the only new persisted state, added to the existing `exportJSON()`/`importJSON()` backup flow.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Playwright for testing.

## Global Constraints

- `mpr_favorite_stages` stores stage **names**, not indices — matching the established convention (the `mpr_learning_stage` fix) so a future stage insertion never corrupts a saved favorites list.
- The star toggle lives inside each `.stage-list-row` but must NOT trigger that row's existing jump-to-stage behavior when clicked — the delegated click handler must check for the star target and `return` before reaching the existing row-jump logic.
- The Favorites filter and the search box combine (AND logic) — this was an explicit user decision during brainstorming, not a default to reconsider.
- Both the search box and the Favorites filter reset to off/empty every time the popup is opened (matching the search box's existing reset-on-open behavior).
- `mpr_favorite_stages` is included in `exportJSON()`/`importJSON()` — favorites are portable user data, not a local device preference (unlike auto-backup's own 3 keys, which are deliberately excluded from backups).
- No changes to `applyStage()`, `saveSettings()`, or `loadSettings()` — favorites are entirely independent of `mpr_settings`.

---

### Task 1: Favorite toggle, filter, and backup integration

**Files:**
- Modify: `script.js` (new `getFavoriteStages()`/`toggleFavoriteStage()` helpers; `renderStageRow()`; `renderStageList()`; the `showStageListBtn`/`stageListSearch` handlers; a new `stageListFavoritesBtn` handler; the delegated `#stageListContent` click handler; `exportJSON()`; `importJSON()`)
- Modify: `index.html` (add the Favorites filter button to `.stage-list-search-row`)
- Modify: `style.css` (`.stage-list-search-row` becomes a flex row; new `.stage-list-favorites-btn`, `.stage-favorite-star`, `.stage-list-empty` rules)
- Create: `test-favorite-stages.cjs`

**Interfaces:**
- Produces: `getFavoriteStages()` — no args, returns `string[]` of favorited stage names (empty array if none/corrupted). `toggleFavoriteStage(name)` — toggles `name` in/out of the stored list. `renderStageList(filterText, favoritesOnly)` — `favoritesOnly` is a new second parameter (optional, falsy by default, backward-compatible with existing calls that only pass `filterText`).

- [ ] **Step 1: Write the failing test**

Create `test-favorite-stages.cjs`:

```js
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
      learningStageUnchanged: learningStage === 20, // seeded to LEARNING_PATH[20] earlier in this test, via mpr_learning_stage + reload
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-favorite-stages.cjs`
Expected: FAIL — `document.getElementById('stageListFavoritesBtn')` is `null` (element doesn't exist yet), causing an error/FAIL on the very first check.

- [ ] **Step 3: Add the localStorage helpers**

In `script.js`, find `function renderStageRow(stage, i) {` (currently script.js:3108). Immediately **before** that line, insert:

```js
function getFavoriteStages() {
  try { return JSON.parse(localStorage.getItem('mpr_favorite_stages')) || []; }
  catch (_) { return []; }
}

function toggleFavoriteStage(name) {
  const favs = getFavoriteStages();
  const idx = favs.indexOf(name);
  if (idx === -1) favs.push(name); else favs.splice(idx, 1);
  localStorage.setItem('mpr_favorite_stages', JSON.stringify(favs));
}

```

- [ ] **Step 4: Add the star to each row**

The current `renderStageRow()` (script.js, now shifted down by the Step 3 insertion) reads:

```js
function renderStageRow(stage, i) {
  const isCurrent = i === learningStage;
  const mastery = adaptiveOn() ? getStageMastery(i) : null;
  let dotHtml = '';
  if (mastery) {
    const dotColor = mastery.ready ? '#22c55e' : mastery.pct >= 50 ? '#f59e0b' : 'var(--border)';
    dotHtml = `<span class="stage-dot" style="background:${dotColor}" title="${mastery.pct}% mastered"></span>`;
  }
  return `<div class="stage-list-row${isCurrent ? ' current' : ''}" data-idx="${i}">
    <span class="stage-list-num">${i + 1}</span>
    <span class="stage-list-name">${stage.name}</span>
    ${dotHtml}
  </div>`;
}
```

Change it to (adds the favorite star between the number and the name):

```js
function renderStageRow(stage, i) {
  const isCurrent = i === learningStage;
  const isFavorite = getFavoriteStages().includes(stage.name);
  const mastery = adaptiveOn() ? getStageMastery(i) : null;
  let dotHtml = '';
  if (mastery) {
    const dotColor = mastery.ready ? '#22c55e' : mastery.pct >= 50 ? '#f59e0b' : 'var(--border)';
    dotHtml = `<span class="stage-dot" style="background:${dotColor}" title="${mastery.pct}% mastered"></span>`;
  }
  return `<div class="stage-list-row${isCurrent ? ' current' : ''}" data-idx="${i}">
    <span class="stage-list-num">${i + 1}</span>
    <span class="stage-favorite-star${isFavorite ? ' favorited' : ''}" data-name="${stage.name}" role="button" aria-label="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">${isFavorite ? '★' : '☆'}</span>
    <span class="stage-list-name">${stage.name}</span>
    ${dotHtml}
  </div>`;
}
```

- [ ] **Step 5: Add the Favorites filter to `renderStageList()`**

The current `renderStageList()` reads:

```js
function renderStageList(filterText) {
  const filter = (filterText || '').trim().toLowerCase();

  if (filter) {
    return LEARNING_PATH
      .map((stage, i) => ({ stage, i }))
      .filter(({ stage }) => stage.name.toLowerCase().includes(filter))
      .map(({ stage, i }) => renderStageRow(stage, i))
      .join('');
  }

  const openPhase = currentPhaseIndex();
  let html = '';
  let idx = 0;
  LEARNING_PATH_PHASES.forEach((phase, p) => {
```

Change it to (adds `favoritesOnly` as a new second parameter and a new first branch — the existing `filter`-only branch and the phase-grouped default view are both otherwise unchanged):

```js
function renderStageList(filterText, favoritesOnly) {
  const filter = (filterText || '').trim().toLowerCase();

  if (favoritesOnly) {
    const favs = getFavoriteStages();
    if (!favs.length) {
      return '<div class="stage-list-empty">No favorites yet — tap ☆ on any stage to add it here.</div>';
    }
    return LEARNING_PATH
      .map((stage, i) => ({ stage, i }))
      .filter(({ stage }) => favs.includes(stage.name))
      .filter(({ stage }) => !filter || stage.name.toLowerCase().includes(filter))
      .map(({ stage, i }) => renderStageRow(stage, i))
      .join('');
  }

  if (filter) {
    return LEARNING_PATH
      .map((stage, i) => ({ stage, i }))
      .filter(({ stage }) => stage.name.toLowerCase().includes(filter))
      .map(({ stage, i }) => renderStageRow(stage, i))
      .join('');
  }

  const openPhase = currentPhaseIndex();
  let html = '';
  let idx = 0;
  LEARNING_PATH_PHASES.forEach((phase, p) => {
```

(The rest of the function — the phase-grouped default view — is unchanged; only add the new `favoritesOnly` branch above the existing `if (filter)` branch.)

- [ ] **Step 6: Add favorites-filter state, the star click handler, and reset-on-open behavior**

The current handlers (script.js:3330-3340) read:

```js
document.getElementById('showStageListBtn').addEventListener('click', () => {
  document.getElementById('stageListSearch').value = '';
  document.getElementById('stageListContent').innerHTML = renderStageList();
  document.getElementById('stageListModal').classList.remove('hidden');
  const current = document.querySelector('#stageListContent .stage-list-row.current');
  if (current) setTimeout(() => current.scrollIntoView({ block: 'center', behavior: 'instant' }), 30);
});

document.getElementById('stageListSearch').addEventListener('input', e => {
  document.getElementById('stageListContent').innerHTML = renderStageList(e.target.value);
});
```

Change it to (adds a module-scope `stageListFavoritesOnly` flag, resets it on every popup open, passes it through on every search keystroke, and adds the new Favorites-button handler):

```js
let stageListFavoritesOnly = false;

document.getElementById('showStageListBtn').addEventListener('click', () => {
  document.getElementById('stageListSearch').value = '';
  stageListFavoritesOnly = false;
  document.getElementById('stageListFavoritesBtn').classList.remove('active');
  document.getElementById('stageListContent').innerHTML = renderStageList();
  document.getElementById('stageListModal').classList.remove('hidden');
  const current = document.querySelector('#stageListContent .stage-list-row.current');
  if (current) setTimeout(() => current.scrollIntoView({ block: 'center', behavior: 'instant' }), 30);
});

document.getElementById('stageListSearch').addEventListener('input', e => {
  document.getElementById('stageListContent').innerHTML = renderStageList(e.target.value, stageListFavoritesOnly);
});

document.getElementById('stageListFavoritesBtn').addEventListener('click', () => {
  stageListFavoritesOnly = !stageListFavoritesOnly;
  document.getElementById('stageListFavoritesBtn').classList.toggle('active', stageListFavoritesOnly);
  document.getElementById('stageListContent').innerHTML = renderStageList(document.getElementById('stageListSearch').value, stageListFavoritesOnly);
});
```

- [ ] **Step 7: Handle star clicks in the delegated content handler**

The current delegated handler (script.js:3351+) starts:

```js
document.getElementById('stageListContent').addEventListener('click', e => {
  const header = e.target.closest('.stage-list-phase-header');
  if (header) {
```

Change it to (adds a star-click check before the existing phase-header/row-jump checks — this must return early so a star click never falls through to the row-jump logic below it):

```js
document.getElementById('stageListContent').addEventListener('click', e => {
  const star = e.target.closest('.stage-favorite-star');
  if (star) {
    toggleFavoriteStage(star.dataset.name);
    document.getElementById('stageListContent').innerHTML = renderStageList(document.getElementById('stageListSearch').value, stageListFavoritesOnly);
    return;
  }
  const header = e.target.closest('.stage-list-phase-header');
  if (header) {
```

(Everything after this in the function — the phase-header toggle and the row-jump logic — is unchanged.)

- [ ] **Step 8: Add `favorite_stages` to `exportJSON()`**

The current function reads:

```js
function exportJSON() {
  const rawSettings = localStorage.getItem('mpr_settings');
  const data = {
    exported:         new Date().toISOString(),
    adaptive_weights: adaptWeights,
    ear_weights:      earAdaptWeights,
    daily_log:        loadDailyLog(),
    settings:         rawSettings ? JSON.parse(rawSettings) : null,
    learning_stage:   localStorage.getItem('mpr_learning_stage'),
    theme:            localStorage.getItem('mpr_theme'),
  };
```

Change it to:

```js
function exportJSON() {
  const rawSettings = localStorage.getItem('mpr_settings');
  const data = {
    exported:         new Date().toISOString(),
    adaptive_weights: adaptWeights,
    ear_weights:      earAdaptWeights,
    daily_log:        loadDailyLog(),
    settings:         rawSettings ? JSON.parse(rawSettings) : null,
    learning_stage:   localStorage.getItem('mpr_learning_stage'),
    theme:            localStorage.getItem('mpr_theme'),
    favorite_stages:  getFavoriteStages(),
  };
```

- [ ] **Step 9: Add `favorite_stages` restoration to `importJSON()`**

The current handler reads:

```js
      if (data.theme) {
        applyTheme(data.theme);
        restored.push('theme');
      }
      updateStreakDisplay();
```

Change it to:

```js
      if (data.theme) {
        applyTheme(data.theme);
        restored.push('theme');
      }
      if (data.favorite_stages) {
        localStorage.setItem('mpr_favorite_stages', JSON.stringify(data.favorite_stages));
        restored.push('favorite stages');
      }
      updateStreakDisplay();
```

- [ ] **Step 10: Add the Favorites button to the HTML**

In `index.html`, the current search row (lines 895-897) reads:

```html
      <div class="stage-list-search-row">
        <input id="stageListSearch" class="stage-list-search-input" type="text" placeholder="Search stages…" autocomplete="off">
      </div>
```

Change it to:

```html
      <div class="stage-list-search-row">
        <input id="stageListSearch" class="stage-list-search-input" type="text" placeholder="Search stages…" autocomplete="off">
        <button id="stageListFavoritesBtn" class="stage-list-favorites-btn" type="button" aria-pressed="false">★ Favorites</button>
      </div>
```

- [ ] **Step 11: Update the CSS**

In `style.css`, the current rules (style.css:2924-2939) read:

```css
.stage-list-search-row {
  padding: 8px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.stage-list-search-input {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text);
  font-size: 0.85rem;
}
```

Change it to (the search row becomes a flex row so the new button sits beside the input; the input goes from `width: 100%` to `flex: 1` since it now shares horizontal space):

```css
.stage-list-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.stage-list-search-input {
  flex: 1;
  box-sizing: border-box;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text);
  font-size: 0.85rem;
}

.stage-list-favorites-btn {
  flex-shrink: 0;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}

.stage-list-favorites-btn:hover { color: var(--text); }

.stage-list-favorites-btn.active {
  border-color: var(--accent);
  color: var(--accent);
}

.stage-favorite-star {
  flex-shrink: 0;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1;
}

.stage-favorite-star.favorited { color: var(--accent); }

.stage-favorite-star:hover { color: var(--accent); }

.stage-list-empty {
  padding: 24px 18px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-dim);
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `node test-favorite-stages.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 13: Run a regression sample**

```bash
node test-all-paths-popup-redesign.cjs
node test-scales-ramp-reorder.cjs
```

Expected: `RESULT: PASS` for both — confirms the pre-existing "All Paths" popup behavior (phase grouping, search, row-jump, `applyStage()`) and an unrelated Learning Path stage's own test are unaffected by these changes.

- [ ] **Step 14: Commit**

```bash
git add script.js index.html style.css test-favorite-stages.cjs
git commit -m "Add favorite Learning Path stages: star toggle + combinable Favorites filter in the All Paths popup"
```
