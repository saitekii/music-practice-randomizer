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
