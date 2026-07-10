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

  const NEW_MAJOR_STANDALONE = ['iv','♭II','♭III','♭VI','♭VII','II','III','VI'];
  const NEW_MAJOR_PROGRESSIONS = ['I–iv–I','I–♭VII–IV','I–♭III–IV','I–♭VI–IV','I–♭III','I–♭VI','I–♭VII','I–♭II','I–iv','♭III–I','♭VI–I','♭VII–I','♭II–I','I–♭III–I','I–♭VI–I','IV–♭VII–I','ii–♭VII–I','iv–♭VII–I','I–IV–♭VII','V–♭VI','V–♭III','vi–IV–I','V–ii','I–♭VI–♭VII–I','I–♭III–♭VI','I–iv–♭VII–I','I–♭III–♭VI–IV','I–♭VII–♭VI–V','I–ii–♭III–IV','I–iii–IV–iv','I–♭III–IV–iv','I–♭III–IV–V','I–vi–ii–♭II','I–♭II–vi','I–III–♭II–vi','I–♭II–IV–III','I–VI–ii–V','I–III–vi–II–ii–V–I','iii–VI–ii–V–I','vi–II–ii–V–I','I–III','I–VI','III–♭VI','I–III–vi–IV','I–III–♭VI–IV'];
  const NEW_MINOR_STANDALONE = ['♭II'];
  const NEW_MINOR_PROGRESSIONS = ['i–♭II–VII–i'];

  const dataCheck = await page.evaluate(([major, minor]) => ({
    majorHasAll: major.every(p => FUNCTIONAL.major.includes(p)),
    minorHasAll: minor.every(p => FUNCTIONAL.minor.includes(p)),
    majorCount: FUNCTIONAL.major.length,
    minorCount: FUNCTIONAL.minor.length,
  }), [[...NEW_MAJOR_STANDALONE, ...NEW_MAJOR_PROGRESSIONS], [...NEW_MINOR_STANDALONE, ...NEW_MINOR_PROGRESSIONS]]);
  checkTrue('FUNCTIONAL.major contains all 53 new major entries', dataCheck.majorHasAll, null);
  checkTrue('FUNCTIONAL.minor contains all 2 new minor entries', dataCheck.minorHasAll, null);
  check('FUNCTIONAL.major has 110 entries total (79 from tasks 1–2 + 31 jazz from task 3)', dataCheck.majorCount, 110);
  check('FUNCTIONAL.minor has 16 entries total (14 existing + 2 new)', dataCheck.minorCount, 16);

  const allNewPatterns = [...NEW_MAJOR_STANDALONE, ...NEW_MAJOR_PROGRESSIONS, ...NEW_MINOR_PROGRESSIONS]; // minor ♭II shares the major ♭II checkbox, not counted twice
  const checkboxCheck = await page.evaluate((patterns) =>
    patterns.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    }), allNewPatterns);
  checkTrue('all 54 new checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 54 new checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const singleFlatIICheckboxCount = await page.evaluate(() => document.querySelectorAll('input[data-pattern="♭II"]').length);
  check('♭II has exactly one shared checkbox (not one per mode)', singleFlatIICheckboxCount, 1);

  const originalCheck = await page.evaluate(() => {
    const original = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V',
      'I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi',
      'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV', 'i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'];
    return original.map(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked);
  });
  checkTrue('all 26 existing progression checkboxes are unaffected', originalCheck.every((c, i) => c === (i < 8)), JSON.stringify(originalCheck));

  // Integration: enabledProgressions() correctly gates a real new standalone chord.
  const gatingIntegration = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('♭VII');
    document.querySelector('input[data-pattern="♭VII"]').checked = true;
    const after = enabledProgressions('major').includes('♭VII');
    document.querySelector('input[data-pattern="♭VII"]').checked = false; // reset
    return { before, after };
  });
  check('♭VII is excluded from enabledProgressions() by default (unchecked)', gatingIntegration.before, false);
  check('♭VII is included in enabledProgressions() once checked', gatingIntegration.after, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
