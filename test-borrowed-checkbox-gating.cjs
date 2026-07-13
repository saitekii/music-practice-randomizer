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
    return {
      majorAllQualified: CANONICAL_FUNCTIONAL_NUMERALS.major.every(p => gated.includes(`major:${p}`)),
      minorAllQualified: CANONICAL_FUNCTIONAL_NUMERALS.minor.every(p => gated.includes(`minor:${p}`)),
    };
  });
  checkTrue('the 7 canonical major numerals are gated via their major: prefixed identifiers', canonical.majorAllQualified, null);
  checkTrue('the 7 canonical minor numerals are gated via their minor: prefixed identifiers', canonical.minorAllQualified, null);

  const existingProgressions = await page.evaluate(() =>
    ['ii–V–I', 'I–IV–V', 'i–iv–V'].every(p => checkboxGatedPatterns().includes(p))
  );
  checkTrue('existing multi-chord progressions are still gated (unchanged behavior)', existingProgressions, null);

  // Simulate a non-canonical bare (no dash) single-chord pattern, since real content like
  // this doesn't exist until Task 3. Confirms the general (non-canonical) gating path.
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
  checkTrue('enabledProgressions() excludes it while unchecked', fakeEntry.excludedWhenUnchecked, null);

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

  // The core bug fix: canonical numerals are now individually gated, just like everything else.
  const canonicalGating = await page.evaluate(() => {
    const before = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = false;
    const after = enabledProgressions('major').includes('I');
    document.querySelector('input[data-pattern="major:I"]').checked = true; // restore
    return { before, after };
  });
  check('enabledProgressions("major") includes I while major:I is checked', canonicalGating.before, true);
  check('enabledProgressions("major") excludes I once major:I is unchecked', canonicalGating.after, false);

  // Collision independence: minor's canonical III/iv/VI must be distinct checkboxes from
  // major's existing borrowed-chord III/iv/VI checkboxes.
  const collisionIndependence = await page.evaluate(() => {
    const borrowedIII = document.querySelector('input[data-pattern="III"]');
    const canonicalMinorIII = document.querySelector('input[data-pattern="minor:III"]');
    const distinctElements = borrowedIII !== canonicalMinorIII;
    const wasBorrowed = borrowedIII.checked;
    borrowedIII.checked = false;
    const minorIIIStillEnabled = enabledProgressions('minor').includes('III');
    borrowedIII.checked = wasBorrowed; // restore to original state
    return { distinctElements, minorIIIStillEnabled };
  });
  checkTrue('borrowed III (major) and canonical III (minor) are distinct checkbox elements', collisionIndependence.distinctElements, null);
  checkTrue('unchecking borrowed III (major) does not affect canonical minor III', collisionIndependence.minorIIIStillEnabled, null);

  const borrowedDefaults = await page.evaluate(() =>
    ['iv', 'III', 'VI'].every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false)
  );
  checkTrue('existing borrowed-chord iv/III/VI checkboxes keep their unchecked-by-default state', borrowedDefaults, null);

  const canonicalDefaults = await page.evaluate(() => {
    const allPatterns = [...CANONICAL_FUNCTIONAL_NUMERALS.major.map(p => `major:${p}`), ...CANONICAL_FUNCTIONAL_NUMERALS.minor.map(p => `minor:${p}`)];
    return allPatterns.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true);
  });
  checkTrue('all 14 canonical numeral checkboxes default to checked', canonicalDefaults, null);

  const appliedByStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx); // progressions: [] at this point in the plan -- should NOT include 'ZZZ'
    return document.querySelector('input[data-pattern="ZZZ"]').checked;
  });
  check('applyStage() uses checkboxGatedPatterns() and unchecks ZZZ (not in the stage\'s list)', appliedByStage, false);

  const diatonicUntouched = await page.evaluate(() => ({
    minorNumerals: DIATONIC.minor.numerals,
    minorQualities: DIATONIC.minor.qualities,
  }));
  check('DIATONIC.minor.numerals is untouched (still lowercase v at index 4, unrelated to Functional Harmony gating)', diatonicUntouched.minorNumerals, ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  check('DIATONIC.minor.qualities is untouched', diatonicUntouched.minorQualities, ['Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
