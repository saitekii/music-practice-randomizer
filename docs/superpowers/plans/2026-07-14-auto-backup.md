# Auto-Backup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in automatic backup that periodically downloads the same JSON backup file the existing manual Export button produces, so users who never remember to click Export still get a safety net.

**Architecture:** Reuses the existing `exportJSON()` function (script.js:4139) verbatim — no new export/serialization logic. A new `checkAutoBackup()` function runs once at app load and checks three new localStorage keys (enabled flag, cadence, last-backup timestamp) to decide whether to fire. A new checkbox + cadence dropdown in the Stats popup footer controls the feature; a new small toast confirms when an automatic backup happens.

**Tech Stack:** Vanilla JS (no framework, no build step — see repo CLAUDE.md), Playwright for testing (`.cjs` scripts only, per repo convention).

## Global Constraints

- Auto-backup is **off by default** — a new `mpr_auto_backup_enabled` localStorage key must be `'1'` for anything to fire; absent or any other value means off.
- Cadence choices are exactly `daily` / `weekly` / `monthly`, stored in `mpr_auto_backup_cadence`, defaulting to `'weekly'` the first time the feature is enabled. `monthly` is a flat 30 days (`2592000000` ms) — not calendar-month-aware.
- The last-fire timestamp lives in `mpr_last_auto_backup` (a `Date.now()` string).
- Enabling the checkbox must trigger an immediate backup check (since `mpr_last_auto_backup` is absent the first time, this always fires immediately on first enable — proof-of-life for the user).
- Unchecking the checkbox must NOT clear `mpr_last_auto_backup` — re-enabling later must respect the original cadence clock, not force an immediate re-download, unless the cadence window has genuinely elapsed.
- The cadence `<select>` must be disabled (grayed) whenever the checkbox is unchecked, and this must be its own dedicated `change` listener on the checkbox — NOT added to the existing `syncUI()` function, which governs the main settings panel's checkbox tree, not the Stats popup.
- The new toast (`backupToast`) must be a separate DOM element/CSS class from the existing `undoToast` (index.html:768-771, style.css:889-939) — do not modify or repurpose `undoToast`, since it's structurally tied to the Undo button and its own 4-second progress-bar animation.
- `checkAutoBackup()` must be called once at app load, alongside the existing startup checks (script.js:4321, `if (localStorage.getItem('mpr_midi') === '1') enableMidi();`).
- "Clear practice history" (`clearHistoryBtn`) must remain untouched — it only clears `mpr_daily` and must not be modified to touch any of the three new keys.
- Test file must be `.cjs`, use the `chromium.launch()` + `page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'))` pre-seed pattern (avoids the onboarding overlay intercepting clicks on a fresh profile — see repo CLAUDE.md's Gotchas section), and follow the existing `check()`/`checkTrue()` + `RESULT: PASS`/`RESULT: FAIL` convention used by every other test file in this repo (e.g. `test-all-paths-popup-redesign.cjs`).

---

### Task 1: Auto-backup checkbox, cadence dropdown, trigger logic, and toast

**Files:**
- Modify: `index.html:768-799` (add `#backupToast` div near `#undoToast`; add a new auto-backup row inside `.stats-footer`)
- Modify: `style.css` (add `.backup-toast` rules near the existing `.undo-toast` rules at style.css:887-939, plus a light-theme override near style.css:75-77, plus a `:disabled` rule for the new cadence select)
- Modify: `script.js:634` (add a new module-scope timeout variable next to `undoTimeout`)
- Modify: `script.js:4321` (add the auto-backup function definitions, DOM hydration, event listeners, and startup call, right after the existing `mpr_midi` startup check)
- Create: `test-auto-backup.cjs`

**Interfaces:**
- Consumes: `exportJSON()` (script.js:4139, unchanged, no signature change) — called with no arguments, downloads the existing full backup JSON.
- Produces: `checkAutoBackup()` — no arguments, no return value, callable from Playwright via `page.evaluate(() => checkAutoBackup())` and by the checkbox's `change` handler. `showBackupToast()` — no arguments, no return value, toggles the `.visible` class on `#backupToast` for 3 seconds.

- [ ] **Step 1: Write the failing test**

Create `test-auto-backup.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 }, acceptDownloads: true });
  // Pre-seed mpr_settings so the onboarding overlay (shown when it's absent)
  // doesn't intercept clicks on a fresh profile — same workaround already
  // used by test-piano.cjs / test-themes.cjs / test-all-paths-popup-redesign.cjs.
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

  // --- UI: checkbox + dropdown exist, dropdown disabled state tracks checkbox ---
  const initial = await page.evaluate(() => ({
    checkboxExists: !!document.getElementById('autoBackupEnabled'),
    selectExists:   !!document.getElementById('autoBackupCadence'),
    checkboxChecked: document.getElementById('autoBackupEnabled').checked,
    selectDisabled:  document.getElementById('autoBackupCadence').disabled,
    selectValue:     document.getElementById('autoBackupCadence').value,
    toastExists:     !!document.getElementById('backupToast'),
  }));
  checkTrue('autoBackupEnabled checkbox exists', initial.checkboxExists, null);
  checkTrue('autoBackupCadence select exists', initial.selectExists, null);
  check('checkbox starts unchecked (feature off by default)', initial.checkboxChecked, false);
  check('cadence select starts disabled (checkbox off)', initial.selectDisabled, true);
  check('cadence select defaults to weekly', initial.selectValue, 'weekly');
  checkTrue('backupToast element exists', initial.toastExists, null);

  // --- Toggling the checkbox flips the select's disabled state ---
  await page.evaluate(() => {
    document.getElementById('autoBackupEnabled').checked = true;
    document.getElementById('autoBackupEnabled').dispatchEvent(new Event('change'));
  });
  const afterToggleOn = await page.evaluate(() => ({
    selectDisabled: document.getElementById('autoBackupCadence').disabled,
    enabledFlag: localStorage.getItem('mpr_auto_backup_enabled'),
    cadenceFlag: localStorage.getItem('mpr_auto_backup_cadence'),
  }));
  check('cadence select becomes enabled when checkbox is checked', afterToggleOn.selectDisabled, false);
  check('mpr_auto_backup_enabled set to 1', afterToggleOn.enabledFlag, '1');
  check('mpr_auto_backup_cadence defaults to weekly on first enable', afterToggleOn.cadenceFlag, 'weekly');

  // --- Enabling for the first time triggers an immediate backup download ---
  const firstEnableTimestamp = await page.evaluate(() => localStorage.getItem('mpr_last_auto_backup'));
  checkTrue('mpr_last_auto_backup is set after first enable (immediate backup fired)', firstEnableTimestamp !== null, firstEnableTimestamp);

  // --- Toast appears after an automatic backup, then fades ---
  const toastVisibleAfterEnable = await page.evaluate(() => document.getElementById('backupToast').classList.contains('visible'));
  checkTrue('backupToast is visible immediately after an automatic backup', toastVisibleAfterEnable, null);
  await page.waitForTimeout(3300);
  const toastHiddenAfterWait = await page.evaluate(() => !document.getElementById('backupToast').classList.contains('visible'));
  checkTrue('backupToast fades out after ~3 seconds', toastHiddenAfterWait, null);

  // --- Unchecking does not clear mpr_last_auto_backup ---
  await page.evaluate(() => {
    document.getElementById('autoBackupEnabled').checked = false;
    document.getElementById('autoBackupEnabled').dispatchEvent(new Event('change'));
  });
  const afterUncheck = await page.evaluate(() => ({
    enabledFlag: localStorage.getItem('mpr_auto_backup_enabled'),
    lastBackupStillSet: localStorage.getItem('mpr_last_auto_backup') !== null,
    selectDisabled: document.getElementById('autoBackupCadence').disabled,
  }));
  check('mpr_auto_backup_enabled set to 0 on uncheck', afterUncheck.enabledFlag, '0');
  checkTrue('mpr_last_auto_backup is NOT cleared on uncheck', afterUncheck.lastBackupStillSet, null);
  check('cadence select becomes disabled again on uncheck', afterUncheck.selectDisabled, true);

  // --- Re-checking shortly after does NOT fire a new download (cadence window hasn't elapsed) ---
  let secondDownloadFired = false;
  page.once('download', () => { secondDownloadFired = true; });
  await page.evaluate(() => {
    document.getElementById('autoBackupEnabled').checked = true;
    document.getElementById('autoBackupEnabled').dispatchEvent(new Event('change'));
  });
  await page.waitForTimeout(800);
  check('re-checking soon after does not re-trigger a download (cadence window not elapsed)', secondDownloadFired, false);

  // --- checkAutoBackup() fires a real download when the cadence window HAS elapsed ---
  await page.evaluate(() => {
    localStorage.setItem('mpr_auto_backup_enabled', '1');
    localStorage.setItem('mpr_auto_backup_cadence', 'daily');
    localStorage.setItem('mpr_last_auto_backup', String(Date.now() - 2 * 86400000)); // 2 days ago, cadence is daily
  });
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => checkAutoBackup());
  const download = await downloadPromise;
  checkTrue('checkAutoBackup() downloads a file when the cadence window has elapsed',
    /^mpr-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()),
    download.suggestedFilename());

  // --- checkAutoBackup() does NOT fire when the cadence window has NOT elapsed ---
  await page.evaluate(() => {
    localStorage.setItem('mpr_last_auto_backup', String(Date.now()));
  });
  let noDownloadFired = true;
  page.once('download', () => { noDownloadFired = false; });
  await page.evaluate(() => checkAutoBackup());
  await page.waitForTimeout(800);
  checkTrue('checkAutoBackup() does not download when the cadence window has not elapsed', noDownloadFired, null);

  // --- checkAutoBackup() does NOT fire when the feature is disabled ---
  await page.evaluate(() => {
    localStorage.setItem('mpr_auto_backup_enabled', '0');
    localStorage.setItem('mpr_last_auto_backup', String(Date.now() - 100 * 86400000)); // very stale, but feature is off
  });
  let noDownloadWhenDisabled = true;
  page.once('download', () => { noDownloadWhenDisabled = false; });
  await page.evaluate(() => checkAutoBackup());
  await page.waitForTimeout(800);
  checkTrue('checkAutoBackup() does not download when the feature is disabled', noDownloadWhenDisabled, null);

  // --- Changing the cadence dropdown does not reset the last-backup clock ---
  await page.evaluate(() => {
    localStorage.setItem('mpr_auto_backup_enabled', '1');
    localStorage.setItem('mpr_last_auto_backup', String(Date.now()));
    document.getElementById('autoBackupCadence').value = 'monthly';
    document.getElementById('autoBackupCadence').dispatchEvent(new Event('change'));
  });
  const afterCadenceChange = await page.evaluate(() => ({
    cadence: localStorage.getItem('mpr_auto_backup_cadence'),
    lastBackupUnchanged: Date.now() - parseInt(localStorage.getItem('mpr_last_auto_backup'), 10) < 5000,
  }));
  check('changing cadence updates mpr_auto_backup_cadence', afterCadenceChange.cadence, 'monthly');
  checkTrue('changing cadence does not reset mpr_last_auto_backup', afterCadenceChange.lastBackupUnchanged, null);

  // --- Regression: the existing manual Export button still works ---
  const manualDownloadPromise = page.waitForEvent('download');
  await page.evaluate(() => document.getElementById('exportJsonBtn').click());
  const manualDownload = await manualDownloadPromise;
  checkTrue('manual Export JSON button still triggers a download',
    /^mpr-backup-\d{4}-\d{2}-\d{2}\.json$/.test(manualDownload.suggestedFilename()),
    manualDownload.suggestedFilename());

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-auto-backup.cjs`
Expected: FAIL — `autoBackupEnabled checkbox exists` (and everything after it) fails, since none of the new HTML/CSS/JS exists yet.

- [ ] **Step 3: Add the HTML**

In `index.html`, the current undo-toast block (lines 768-771) reads:

```html
  <div id="undoToast" class="undo-toast" role="status" aria-live="polite">
    <span>Settings shuffled</span>
    <button id="undoBtn" type="button">Undo</button>
  </div>
```

Change it to (adds a new `#backupToast` div right after):

```html
  <div id="undoToast" class="undo-toast" role="status" aria-live="polite">
    <span>Settings shuffled</span>
    <button id="undoBtn" type="button">Undo</button>
  </div>

  <div id="backupToast" class="backup-toast" role="status" aria-live="polite">
    Backup saved to Downloads
  </div>
```

The current stats-footer block (lines 785-797) reads:

```html
      <div class="stats-footer">
        <div class="stats-export-row">
          <span class="stats-footer-label">Export</span>
          <button id="exportJsonBtn" class="export-btn" type="button">JSON backup</button>
          <button id="exportCsvBtn" class="export-btn" type="button">CSV daily log</button>
        </div>
        <div class="stats-export-row">
          <span class="stats-footer-label">Import</span>
          <button id="importJsonBtn" class="export-btn" type="button">JSON backup</button>
          <input type="file" id="importFileInput" accept=".json" style="display:none">
        </div>
        <button id="clearHistoryBtn" class="clear-history-btn" type="button">Clear practice history</button>
      </div>
```

Change it to (adds a new auto-backup row between the Import row and the Clear History button):

```html
      <div class="stats-footer">
        <div class="stats-export-row">
          <span class="stats-footer-label">Export</span>
          <button id="exportJsonBtn" class="export-btn" type="button">JSON backup</button>
          <button id="exportCsvBtn" class="export-btn" type="button">CSV daily log</button>
        </div>
        <div class="stats-export-row">
          <span class="stats-footer-label">Import</span>
          <button id="importJsonBtn" class="export-btn" type="button">JSON backup</button>
          <input type="file" id="importFileInput" accept=".json" style="display:none">
        </div>
        <div class="stats-export-row">
          <span class="stats-footer-label">Auto-backup</span>
          <input type="checkbox" id="autoBackupEnabled">
          <select id="autoBackupCadence">
            <option value="daily">Daily</option>
            <option value="weekly" selected>Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button id="clearHistoryBtn" class="clear-history-btn" type="button">Clear practice history</button>
      </div>
```

- [ ] **Step 4: Add the CSS**

In `style.css`, the current light-theme undo-toast override (lines 75-77) reads:

```css
[data-theme="light"] .undo-toast {
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
}
```

Change it to (adds the matching light-theme override for the new toast right after):

```css
[data-theme="light"] .undo-toast {
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
}

[data-theme="light"] .backup-toast {
  box-shadow: 0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08);
}
```

The current end of the undo-toast section (lines 936-939) reads:

```css
@keyframes toast-progress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}
```

Change it to (adds a new `.backup-toast` section right after — simpler than `.undo-toast`, no progress-bar pseudo-element since there's no linked action to undo):

```css
@keyframes toast-progress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* ── Backup toast ────────────────────────────────────────────────────────────── */

.backup-toast {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%) translateY(90px);
  background: var(--surface);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 12px 18px;
  font-size: 0.875rem;
  color: var(--text-muted);
  box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.25s ease, opacity 0.25s ease;
  opacity: 0;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
}

.backup-toast.visible {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}
```

The current `.export-btn:hover` rule (style.css:2460-2463) reads:

```css
.export-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
```

Change it to (adds a disabled-state rule for the new cadence select right after):

```css
.export-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

#autoBackupCadence:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Add the JS state variable**

In `script.js`, the current state-variable block (lines 633-635) reads:

```js
let prevSettings  = null;
let undoTimeout   = null;
let learningStage = -1;
```

Change it to:

```js
let prevSettings      = null;
let undoTimeout       = null;
let backupToastTimeout = null;
let learningStage     = -1;
```

- [ ] **Step 6: Add the auto-backup logic**

In `script.js`, the current startup-check line (line 4321) reads:

```js
if (localStorage.getItem('mpr_midi') === '1') enableMidi();
```

Change it to (adds the full auto-backup block right after, before the `// ── Ear training init & listeners` comment):

```js
if (localStorage.getItem('mpr_midi') === '1') enableMidi();

// ── Auto-backup ──────────────────────────────────────────────────────────────

const AUTO_BACKUP_CADENCE_MS = { daily: 86400000, weekly: 604800000, monthly: 2592000000 };

function showBackupToast() {
  const backupToast = document.getElementById('backupToast');
  clearTimeout(backupToastTimeout);
  backupToast.classList.remove('visible');
  void backupToast.offsetWidth; // force reflow so the fade-in restarts cleanly
  backupToast.classList.add('visible');
  backupToastTimeout = setTimeout(() => backupToast.classList.remove('visible'), 3000);
}

function checkAutoBackup() {
  if (localStorage.getItem('mpr_auto_backup_enabled') !== '1') return;
  const cadenceMs = AUTO_BACKUP_CADENCE_MS[localStorage.getItem('mpr_auto_backup_cadence') || 'weekly'];
  const last = parseInt(localStorage.getItem('mpr_last_auto_backup') || '0', 10);
  if (Date.now() - last < cadenceMs) return;
  exportJSON();
  localStorage.setItem('mpr_last_auto_backup', Date.now().toString());
  showBackupToast();
}

const autoBackupEnabledCheckbox = document.getElementById('autoBackupEnabled');
const autoBackupCadenceSelect   = document.getElementById('autoBackupCadence');

autoBackupEnabledCheckbox.checked = localStorage.getItem('mpr_auto_backup_enabled') === '1';
autoBackupCadenceSelect.value     = localStorage.getItem('mpr_auto_backup_cadence') || 'weekly';
autoBackupCadenceSelect.disabled  = !autoBackupEnabledCheckbox.checked;

autoBackupEnabledCheckbox.addEventListener('change', () => {
  autoBackupCadenceSelect.disabled = !autoBackupEnabledCheckbox.checked;
  if (autoBackupEnabledCheckbox.checked) {
    localStorage.setItem('mpr_auto_backup_enabled', '1');
    if (!localStorage.getItem('mpr_auto_backup_cadence')) {
      localStorage.setItem('mpr_auto_backup_cadence', autoBackupCadenceSelect.value);
    }
    checkAutoBackup();
  } else {
    localStorage.setItem('mpr_auto_backup_enabled', '0');
  }
});

autoBackupCadenceSelect.addEventListener('change', () => {
  localStorage.setItem('mpr_auto_backup_cadence', autoBackupCadenceSelect.value);
});

checkAutoBackup();
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-auto-backup.cjs`
Expected: `RESULT: PASS`, every `check`/`checkTrue` line prefixed `PASS`.

- [ ] **Step 8: Run a regression sample**

Run these three existing tests to confirm nothing in the Stats popup or startup sequence broke:

```bash
node test-all-paths-popup-redesign.cjs
node test-two-handed-minor-progression.cjs
node test-two-handed-progressions-learning-path.cjs
```

Expected: `RESULT: PASS` for all three (unrelated to this feature — confirms the new startup block and stats-footer markup didn't break existing DOM assumptions or the app's load sequence).

- [ ] **Step 9: Commit**

```bash
git add index.html style.css script.js test-auto-backup.cjs
git commit -m "Add opt-in auto-backup: periodic JSON export with configurable cadence"
```
