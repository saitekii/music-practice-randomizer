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

  const checkboxes = await page.evaluate(() => {
    const patterns = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return patterns.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    });
  });
  checkTrue('all 8 progression checkboxes exist', checkboxes.every(c => c.exists), JSON.stringify(checkboxes.map(c => c.pattern)));
  checkTrue('all 8 progression checkboxes are checked by default', checkboxes.every(c => c.checked === true), null);

  const filtering = await page.evaluate(() => {
    const allMajor = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = false;
    const withOneUnchecked = enabledProgressions('major');
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = true; // restore
    return {
      allMajorHasIIVV: allMajor.includes('I–IV–V'),
      afterUncheckMissingIIVV: !withOneUnchecked.includes('I–IV–V'),
      singleNumeralsUnaffectedByUnrelatedUncheck: withOneUnchecked.includes('I') && withOneUnchecked.includes('V'),
    };
  });
  check('enabledProgressions("major") includes I–IV–V when checked', filtering.allMajorHasIIVV, true);
  check('unchecking I–IV–V removes it from enabledProgressions("major")', filtering.afterUncheckMissingIIVV, true);
  check('unchecking I–IV–V does not affect unrelated single-chord numerals I, V', filtering.singleNumeralsUnaffectedByUnrelatedUncheck, true);

  const canonicalFiltering = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = false;
    const afterUncheck = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = true; // restore
    return { before, afterUncheck };
  });
  check('enabledProgressions("major") includes single-chord numeral I when its own checkbox is checked', canonicalFiltering.before, true);
  check('canonical single-chord numeral I IS filtered out once its own checkbox is unchecked (the bug this fix addresses)', canonicalFiltering.afterUncheck, false);

  const wireCheck = await page.evaluate(() => {
    const original = enabledProgressions;
    enabledProgressions = (mode) => mode === 'major' ? ['I–IV–V'] : ['i'];
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    const results = [];
    for (let i = 0; i < 20; i++) {
      const prompt = genFunctional();
      results.push(prompt.key.split('|')[3]);
    }
    enabledProgressions = original;
    return results;
  });
  checkTrue('genFunctional() only ever picks patterns enabledProgressions() returned', wireCheck.every(p => p === 'I–IV–V' || p === 'i'), `results=${JSON.stringify(wireCheck)}`);

  const persistence = await page.evaluate(() => {
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = false;
    saveSettings();
    document.querySelector(`input[data-pattern="I–IV–V"]`).checked = true;
    loadSettings();
    return document.querySelector(`input[data-pattern="I–IV–V"]`).checked;
  });
  check('progression checkbox state persists through save/load', persistence, false);

  const disableBehavior = await page.evaluate(() => {
    document.getElementById('catFunctional').checked = false;
    syncUI();
    const whileOff = document.getElementById('functionalOptions').classList.contains('disabled');
    document.getElementById('catFunctional').checked = true;
    syncUI();
    const whileOn = document.getElementById('functionalOptions').classList.contains('disabled');
    return { whileOff, whileOn };
  });
  check('functionalOptions is disabled when catFunctional is off', disableBehavior.whileOff, true);
  check('functionalOptions is enabled when catFunctional is on', disableBehavior.whileOn, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
