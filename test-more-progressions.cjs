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

  const NEW_MAJOR = ['I–IV–V–I', 'I–vi–IV–V', 'I–iii–IV–V', 'I–V–IV–I', 'I–iii–vi–ii–V', 'vi–ii–V–I', 'iii–vi–ii–V–I', 'IV–V–iii–vi', 'IV–V–I–vi', 'I–ii–IV–V', 'I–IV–ii–V', 'I–V–ii–IV', 'I–IV–vi–V', 'vi–V–I–IV'];
  const NEW_MINOR = ['i–VII–VI–V', 'i–iv–VI–V', 'i–VI–iv–V', 'i–III–VII–VI'];

  const dataCheck = await page.evaluate(([newMajor, newMinor]) => ({
    majorHasAll: newMajor.every(p => FUNCTIONAL.major.includes(p)),
    minorHasAll: newMinor.every(p => FUNCTIONAL.minor.includes(p)),
    majorTotalCount: FUNCTIONAL.major.length,
    minorTotalCount: FUNCTIONAL.minor.length,
  }), [NEW_MAJOR, NEW_MINOR]);
  checkTrue('FUNCTIONAL.major contains all 14 new major progressions', dataCheck.majorHasAll, null);
  checkTrue('FUNCTIONAL.minor contains all 4 new minor progressions', dataCheck.minorHasAll, null);
  check('FUNCTIONAL.major has 111 entries total (80 existing + 31 jazz-extended)', dataCheck.majorTotalCount, 111);
  check('FUNCTIONAL.minor has 16 entries total (after Task 3 added borrowed/mediant entries)', dataCheck.minorTotalCount, 16);

  const checkboxCheck = await page.evaluate(([newMajor, newMinor]) => {
    const all = [...newMajor, ...newMinor];
    return all.map(p => {
      const el = document.querySelector(`input[data-pattern="${p}"]`);
      return { pattern: p, exists: !!el, checked: el ? el.checked : null };
    });
  }, [NEW_MAJOR, NEW_MINOR]);
  checkTrue('all 18 new progression checkboxes exist', checkboxCheck.every(c => c.exists), JSON.stringify(checkboxCheck.filter(c => !c.exists).map(c => c.pattern)));
  checkTrue('all 18 new progression checkboxes are UNCHECKED by default', checkboxCheck.every(c => c.checked === false), JSON.stringify(checkboxCheck.filter(c => c.checked !== false).map(c => c.pattern)));

  const originalCheck = await page.evaluate(() => {
    const original = ['ii–V–I', 'I–IV–V', 'vi–IV–I–V', 'I–V–vi–IV', 'IV–V–I', 'ii°–V–i', 'i–VI–III–VII', 'i–iv–V'];
    return original.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true);
  });
  check('the original 8 progression checkboxes are still checked by default (unaffected)', originalCheck, true);

  const stageCheck = await page.evaluate(([newMajor, newMinor]) => {
    const idx9 = LEARNING_PATH.findIndex(s => (s.progressions || []).length === 13);
    const stage9  = LEARNING_PATH[idx9];
    const stage10 = LEARNING_PATH[idx9 + 1];
    const stage11 = LEARNING_PATH[idx9 + 2];
    const stage12 = LEARNING_PATH[idx9 + 3];
    return {
      afterStage8: LEARNING_PATH[idx9 - 1]?.name === 'Add i–VI–III–VII (minor)',
      stage9Count: (stage9?.progressions || []).length,
      stage10Count: (stage10?.progressions || []).length,
      stage11Count: (stage11?.progressions || []).length,
      stage12Count: (stage12?.progressions || []).length,
      stage9HasFirst5:  ['I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi'].every(p => (stage9?.progressions || []).includes(p)),
      stage10HasNext5:  ['I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV'].every(p => (stage10?.progressions || []).includes(p)),
      stage11HasIii:    ['I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi'].every(p => (stage11?.progressions || []).includes(p)),
      stage12HasMinor:  newMinor.every(p => (stage12?.progressions || []).includes(p)),
      stage12HasAll26:  [...newMajor, ...newMinor, 'ii–V–I','I–IV–V','vi–IV–I–V','I–V–vi–IV','IV–V–I','ii°–V–i','i–VI–III–VII','i–iv–V'].every(p => (stage12?.progressions || []).includes(p)),
    };
  }, [NEW_MAJOR, NEW_MINOR]);
  checkTrue('stage 9 (13 progressions) is right after the original 8-stage curriculum', stageCheck.afterStage8, null);
  check('stage 9 has 13 progressions (original 8 + 5 new)', stageCheck.stage9Count, 13);
  check('stage 10 has 18 progressions (stage 9 + 5 more)', stageCheck.stage10Count, 18);
  check('stage 11 has 22 progressions (stage 10 + 4 iii-introducing)', stageCheck.stage11Count, 22);
  check('stage 12 has 26 progressions (all of them)', stageCheck.stage12Count, 26);
  checkTrue('stage 9 includes its intended 5 new progressions', stageCheck.stage9HasFirst5, null);
  checkTrue('stage 10 includes its intended 5 new progressions', stageCheck.stage10HasNext5, null);
  checkTrue('stage 11 includes the 4 iii-introducing progressions', stageCheck.stage11HasIii, null);
  checkTrue('stage 12 includes the 4 new minor progressions', stageCheck.stage12HasMinor, null);
  checkTrue('stage 12 includes literally all 26 progressions', stageCheck.stage12HasAll26, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx9 = LEARNING_PATH.findIndex(s => (s.progressions || []).length === 13);
    applyStage(idx9);
    return {
      newOneChecked: document.querySelector(`input[data-pattern="I–IV–V–I"]`).checked,
      notYetIntroducedUnchecked: document.querySelector(`input[data-pattern="I–iii–IV–V"]`).checked, // belongs to stage 11, not 9
    };
  });
  check('applyStage() on stage 9 checks its new progressions', applyStageCheck.newOneChecked, true);
  check('applyStage() on stage 9 leaves stage-11-only progressions unchecked', applyStageCheck.notYetIntroducedUnchecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
