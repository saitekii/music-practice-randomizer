# All Paths Popup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the All Paths popup's flat 112-row scrolling list with collapsible phase groups plus a live search box, without changing panel sizing, the mastery dot, auto-scroll-to-current, or click-row-to-jump behavior.

**Architecture:** A new `LEARNING_PATH_PHASES` array (17 entries, `{ name, count }`) provides phase boundaries without touching any of the 112 existing `LEARNING_PATH` stage objects. `renderStageList()` is split into a row-renderer helper plus grouped/filtered rendering modes; a new search input and phase-header click handling are added alongside the existing modal open/close/row-click listeners.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No change to `LEARNING_PATH` stage content, ordering, or count (112 stages).
- `LEARNING_PATH_PHASES` counts must sum to exactly 112 and match the phase boundaries already implied by the file's `// ── Phase N: ...` comments.
- Panel sizing (`min(380px, calc(100vw - 32px))` width, `70vh` max height) is unchanged.
- The mastery dot, auto-scroll-to-current-row on open, and click-row-to-jump-and-close behavior must all still work exactly as before.
- Search matches only stage `name` (case-insensitive substring) — not hint text.
- While search has text, phase grouping/headers disappear entirely (flat filtered list); clearing search restores the grouped view.
- Only the phase containing the current stage starts expanded when the popup opens; all others start collapsed. Collapse state is not persisted — it resets every time the popup opens.

---

### Task 1: Phase data, grouped/searchable rendering, and interaction

**Files:**
- Modify: `script.js` (insert `LEARNING_PATH_PHASES` after `LEARNING_PATH` at line 302; rewrite `renderStageList()` at lines 2946–2961; update the `showStageListBtn` handler and add a search-input handler and phase-header toggle handling, lines 3130–3156)
- Modify: `index.html` (add a search input row inside `#stageListModal`, lines 759–768)
- Modify: `style.css` (add rules for the search row and phase headers, after the `.stage-dot` block ending at line 2869)
- Test: `test-all-paths-popup-redesign.cjs` (create, project root)

**Interfaces:**
- Consumes: `LEARNING_PATH` (existing 112-entry array), `learningStage` (existing module-level variable holding the current stage index), `getStageMastery(idx)`, `adaptiveOn()`, `applyStage(idx)`, `updateLearningUI()` — all pre-existing, unchanged.
- Produces: `LEARNING_PATH_PHASES` (new array), `renderStageRow(stage, i)` (new helper, returns an HTML string for one stage row), `currentPhaseIndex()` (new helper, returns the phase index containing `learningStage`, or `-1`), `renderStageList(filterText)` (existing function name kept, now takes an optional `filterText` argument — no filter text or an empty string renders the grouped view, non-empty text renders a flat filtered list).

- [ ] **Step 1: Write the failing test**

Create `test-all-paths-popup-redesign.cjs` with this exact content:

```javascript
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
  check('LEARNING_PATH.length is still 112 (unchanged)', phaseData.stageCount, 112);
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
  check('all 112 stage rows exist in the DOM (even inside collapsed groups)', groupedView.rowCount, 112);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-all-paths-popup-redesign.cjs`

Expected: `RESULT: FAIL`. `LEARNING_PATH_PHASES` doesn't exist yet, so the very first `page.evaluate` call will throw a `ReferenceError` inside the page context, which surfaces as an unhandled rejection/crash of the test script rather than a clean `FAIL` line — that crash itself (non-zero exit, no `RESULT: PASS` printed) is the expected "failing" signal for this step.

- [ ] **Step 3: Add `LEARNING_PATH_PHASES` to `script.js`**

Find this exact block (end of `LEARNING_PATH`, start of the Ear Training section):

```javascript
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
];

// ── Ear Training constants ────────────────────────────────────────────────────
```

Replace it with:

```javascript
  { name: 'Full Theory Workout',      hint: 'Diatonic chords, functional patterns, chord voicings, and scales — everything together',              cats: ['catDiatonic','catFunctional','catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'], chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','inversions'], scales: ['scaleMajor','scaleNatMinor'], diatonicKey: 'C', diatonicMode: 'major', timer: '10' },
];

// Phase boundaries for LEARNING_PATH, used by the All Paths popup to group stages.
// Each count is the number of consecutive LEARNING_PATH stages in that phase;
// counts must sum to LEARNING_PATH.length. Bump a count when inserting stages
// into that phase — do not add a per-stage field (see All Paths popup redesign spec).
const LEARNING_PATH_PHASES = [
  { name: 'Note Finder', count: 7 },
  { name: 'Major chords, natural keys, no timer', count: 7 },
  { name: 'Introduce minor', count: 3 },
  { name: 'Add timer pressure', count: 3 },
  { name: 'Accidentals one at a time', count: 6 },
  { name: 'Triad inversions', count: 9 },
  { name: 'Major scales', count: 7 },
  { name: 'Combine chords + scales', count: 3 },
  { name: 'Seventh chords — root position', count: 4 },
  { name: 'Seventh chord inversions', count: 5 },
  { name: 'Full Foundation', count: 1 },
  { name: 'Scales beyond natural minor', count: 11 },
  { name: 'Enharmonic spellings', count: 3 },
  { name: 'Extended chords', count: 9 },
  { name: 'Functional harmony', count: 22 },
  { name: 'Interval reading', count: 7 },
  { name: 'Diatonic chords', count: 5 },
];

// ── Ear Training constants ────────────────────────────────────────────────────
```

- [ ] **Step 4: Rewrite `renderStageList()` in `script.js`**

Find this exact block:

```javascript
function renderStageList() {
  return LEARNING_PATH.map((stage, i) => {
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
  }).join('');
}
```

Replace it with:

```javascript
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

function currentPhaseIndex() {
  let running = 0;
  for (let p = 0; p < LEARNING_PATH_PHASES.length; p++) {
    running += LEARNING_PATH_PHASES[p].count;
    if (learningStage < running) return p;
  }
  return -1;
}

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
    const isOpen = p === openPhase;
    html += `<div class="stage-list-phase-header${isOpen ? ' open' : ''}" data-phase="${p}">
      <span class="stage-list-phase-chevron">${isOpen ? '▾' : '▸'}</span>
      <span class="stage-list-phase-name">${phase.name}</span>
      <span class="stage-list-phase-count">${phase.count}</span>
    </div>`;
    html += `<div class="stage-list-phase-body${isOpen ? '' : ' collapsed'}" data-phase-body="${p}">`;
    for (let k = 0; k < phase.count; k++) {
      html += renderStageRow(LEARNING_PATH[idx], idx);
      idx++;
    }
    html += `</div>`;
  });
  return html;
}
```

- [ ] **Step 5: Update the modal's event listeners in `script.js`**

Find this exact block:

```javascript
document.getElementById('showStageListBtn').addEventListener('click', () => {
  document.getElementById('stageListContent').innerHTML = renderStageList();
  document.getElementById('stageListModal').classList.remove('hidden');
  const current = document.querySelector('#stageListContent .stage-list-row.current');
  if (current) setTimeout(() => current.scrollIntoView({ block: 'center', behavior: 'instant' }), 30);
});

document.getElementById('stageListClose').addEventListener('click', () => {
  document.getElementById('stageListModal').classList.add('hidden');
});

document.getElementById('stageListModal').addEventListener('click', e => {
  if (e.target === document.getElementById('stageListModal'))
    document.getElementById('stageListModal').classList.add('hidden');
});

document.getElementById('stageListContent').addEventListener('click', e => {
  const row = e.target.closest('.stage-list-row');
  if (!row) return;
  const idx = parseInt(row.dataset.idx);
  if (isNaN(idx)) return;
  learningStage = idx;
  localStorage.setItem('mpr_learning_stage', String(idx));
  updateLearningUI();
  applyStage(idx);
  document.getElementById('stageListModal').classList.add('hidden');
});
```

Replace it with:

```javascript
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

document.getElementById('stageListClose').addEventListener('click', () => {
  document.getElementById('stageListModal').classList.add('hidden');
});

document.getElementById('stageListModal').addEventListener('click', e => {
  if (e.target === document.getElementById('stageListModal'))
    document.getElementById('stageListModal').classList.add('hidden');
});

document.getElementById('stageListContent').addEventListener('click', e => {
  const header = e.target.closest('.stage-list-phase-header');
  if (header) {
    const body = document.querySelector(`.stage-list-phase-body[data-phase-body="${header.dataset.phase}"]`);
    if (body) body.classList.toggle('collapsed');
    header.classList.toggle('open');
    const chevron = header.querySelector('.stage-list-phase-chevron');
    if (chevron) chevron.textContent = header.classList.contains('open') ? '▾' : '▸';
    return;
  }
  const row = e.target.closest('.stage-list-row');
  if (!row) return;
  const idx = parseInt(row.dataset.idx);
  if (isNaN(idx)) return;
  learningStage = idx;
  localStorage.setItem('mpr_learning_stage', String(idx));
  updateLearningUI();
  applyStage(idx);
  document.getElementById('stageListModal').classList.add('hidden');
});
```

- [ ] **Step 6: Add the search input to `index.html`**

Find this exact block:

```html
  <!-- Stage list modal -->
  <div id="stageListModal" class="stage-list-overlay hidden" role="dialog" aria-modal="true" aria-label="All learning path stages">
    <div class="stage-list-panel">
      <div class="stage-list-header">
        <h2 class="stage-list-title">Learning Path</h2>
        <button id="stageListClose" class="stage-list-close" type="button" aria-label="Close">×</button>
      </div>
      <div id="stageListContent" class="stage-list-content"></div>
    </div>
  </div>
```

Replace it with:

```html
  <!-- Stage list modal -->
  <div id="stageListModal" class="stage-list-overlay hidden" role="dialog" aria-modal="true" aria-label="All learning path stages">
    <div class="stage-list-panel">
      <div class="stage-list-header">
        <h2 class="stage-list-title">Learning Path</h2>
        <button id="stageListClose" class="stage-list-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="stage-list-search-row">
        <input id="stageListSearch" class="stage-list-search-input" type="text" placeholder="Search stages…" autocomplete="off">
      </div>
      <div id="stageListContent" class="stage-list-content"></div>
    </div>
  </div>
```

- [ ] **Step 7: Add CSS rules to `style.css`**

Find this exact block:

```css
.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.show-stages-btn {
```

Replace it with:

```css
.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

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

.stage-list-search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.stage-list-phase-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
  user-select: none;
}

.stage-list-phase-header:hover { background: var(--accent-dim); }

.stage-list-phase-chevron {
  flex-shrink: 0;
  width: 12px;
}

.stage-list-phase-name { flex: 1; }

.stage-list-phase-count {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.stage-list-phase-body.collapsed { display: none; }

.show-stages-btn {
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-all-paths-popup-redesign.cjs`

Expected: every line `PASS`, ending with `RESULT: PASS`.

- [ ] **Step 9: Optionally spot-check the existing calendar/learning-path script**

The informal script `test-calendar-stages.cjs` (untracked, no `RESULT: PASS/FAIL` convention — a manual screenshot script, not a formal regression test, and it launches with `headless: false`) also exercises this modal. This step is informational only, not a pass/fail gate — if it fails to launch in your environment (e.g. no display available for `headless: false`), skip it and note that in your report rather than treating it as a task failure.

```bash
node test-calendar-stages.cjs
```

If it does run, console lines of interest: `Stage rows count: 112` (rows still exist in the DOM even when their phase is collapsed — collapsing only hides via CSS, it doesn't remove elements) and `Current stage row index: 4 (should be 4)`. The script's later step, "Click stage 10 (index 9)", may now fail or time out if stage index 9 falls inside a collapsed (not-currently-open) phase — Playwright's `.click()` requires the target to be visible. If it does, that's an expected consequence of collapsing, not a regression to fix; this script is not part of this task's file list and is left as-is.

- [ ] **Step 10: Commit**

```bash
git add script.js index.html style.css test-all-paths-popup-redesign.cjs
git commit -m "$(cat <<'EOF'
Redesign All Paths popup: collapsible phase groups + search

Replaces the flat 112-row scrolling list with 17 collapsible phase
groups (only the phase containing the current stage starts expanded)
and a live search box that shows a flat filtered list by stage name.
Phase boundaries come from a new LEARNING_PATH_PHASES array rather
than a per-stage field, so future stage insertions only need one
count bumped instead of touching every affected stage object.
EOF
)"
```
