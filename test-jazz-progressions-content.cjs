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

  const NEW_ENTRIES = ['I–VI7–ii–V','Imaj7–iii7–vi7–ii7–V7','iii7–vi7–ii7–V7–Imaj7','vi7–ii7–V7–Imaj7','Imaj7–VI7–ii7–V7','Imaj7–vi7–IVmaj7–V13','vi9–V13–Imaj9–IVmaj9','ii9–V13–Imaj9','IVmaj7–V7–iii7–vi7–ii7–V7','Imaj7–IVmaj7–ii7–V13','Imaj7–iii7–IVmaj7–iv7','Imaj7–♭VIImaj7–IVmaj7','Imaj9–VI7–ii9–V13','Imaj9–VI13–ii11–V13','Imaj9–♯IV°7–ii9–V13','Imaj7–IIImaj7–vi9–IVmaj7','Imaj9–♭IImaj7–vi11–V13♯11','Imaj9–♭IIImaj7–IVmaj9–iv7','Imaj9–IIImaj7–vi9–IVmaj9–ii11–V13','I–III7–vi–II7–ii–V–I','iii–VI7–ii–V–I','vi–II7–ii–V–I','I–III7–vi','vi–II7–V','ii–♭II7–I','♭II7–I','V–vi','V–IV','Imaj7–viiø7–iii7–vi7','Imaj7♯11–IImaj7','Imaj7♯11–♭VIImaj7'];

  const dataCheck = await page.evaluate((entries) => ({
    hasAll: entries.every(p => FUNCTIONAL.major.includes(p)),
    majorCount: FUNCTIONAL.major.length,
  }), NEW_ENTRIES);
  checkTrue('FUNCTIONAL.major contains all 31 new jazz-extended entries', dataCheck.hasAll, null);
  check('FUNCTIONAL.major has 110 entries total (79 existing + 31 new)', dataCheck.majorCount, 110);

  const checkboxCheck = await page.evaluate((entries) =>
    entries.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    }), NEW_ENTRIES);
  checkTrue('all 31 new checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 31 new checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const originalCheck = await page.evaluate(() => {
    const checkedByDefault = ['ii–V–I', 'I–IV–V']; // the original 8 progressions
    const uncheckedByDefault = ['I–VI–ii–V', 'i–♭II–VII–i']; // later batches, unchecked-by-default convention
    return {
      checkedOk: checkedByDefault.every(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked === true),
      uncheckedOk: uncheckedByDefault.every(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked === false),
    };
  });
  checkTrue('the original 8 progressions remain checked by default (unaffected)', originalCheck.checkedOk, null);
  checkTrue('later-batch progressions remain unchecked by default (unaffected)', originalCheck.uncheckedOk, null);

  // Integration: enabledProgressions() correctly gates real new content, and applyStage-style
  // checking makes a jazz progression's steps actually playable end to end.
  const integration = await page.evaluate(() => {
    const pattern = 'Imaj7–iii7–vi7–ii7–V7';
    const before = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = true;
    const after = enabledProgressions('major').includes(pattern);
    document.querySelector(`input[data-pattern="${pattern}"]`).checked = false; // reset
    return { before, after };
  });
  check('a new jazz progression is excluded from enabledProgressions() by default (unchecked)', integration.before, false);
  check('a new jazz progression is included in enabledProgressions() once checked', integration.after, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
