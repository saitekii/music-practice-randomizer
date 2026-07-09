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

  const canonical = await page.evaluate(() => {
    const gated = checkboxGatedPatterns();
    const majorDiatonic = ['I','ii','iii','IV','V','vi','vii°'];
    const minorDiatonic = ['i','ii°','III','iv','V','VI','VII'];
    return { noneGated: [...majorDiatonic, ...minorDiatonic].every(p => !gated.includes(p)) };
  });
  checkTrue('the 14 canonical diatonic numerals are never in checkboxGatedPatterns()', canonical.noneGated, null);

  const existingProgressions = await page.evaluate(() =>
    ['ii–V–I', 'I–IV–V', 'i–iv–V'].every(p => checkboxGatedPatterns().includes(p))
  );
  checkTrue('existing multi-chord progressions are still gated (unchanged behavior)', existingProgressions, null);

  // Simulate a non-canonical bare (no dash) single-chord pattern, since real content
  // like this doesn't exist until Task 3. This is the exact bug this task fixes: the
  // old "no dash = never filtered" rule would have made this always-enabled.
  const fakeEntry = await page.evaluate(() => {
    FUNCTIONAL.major.push('ZZZ');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.pattern = 'ZZZ';
    input.checked = false;
    document.getElementById('functionalOptions').appendChild(input);
    return {
      isGated: checkboxGatedPatterns().includes('ZZZ'),
      excludedWhenUnchecked: !enabledProgressions('major').includes('ZZZ'),
    };
  });
  checkTrue('a non-canonical bare single-chord pattern is included in checkboxGatedPatterns()', fakeEntry.isGated, null);
  checkTrue('enabledProgressions() excludes it while unchecked (the bug this task fixes)', fakeEntry.excludedWhenUnchecked, null);

  const includedWhenChecked = await page.evaluate(() => {
    document.querySelector('input[data-pattern="ZZZ"]').checked = true;
    return enabledProgressions('major').includes('ZZZ');
  });
  checkTrue('enabledProgressions() includes it once its checkbox is checked', includedWhenChecked, null);

  const persisted = await page.evaluate(() => {
    saveSettings();
    return JSON.parse(localStorage.getItem('mpr_settings')).progressions['ZZZ'];
  });
  check('saveSettings() persists the fake pattern\'s checkbox state via checkboxGatedPatterns()', persisted, true);

  const appliedByStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx); // progressions: [] — should NOT include 'ZZZ'
    return document.querySelector('input[data-pattern="ZZZ"]').checked;
  });
  check('applyStage() uses checkboxGatedPatterns() and unchecks ZZZ (not in the stage\'s list)', appliedByStage, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
