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

  const ALL_26 = ['I–IV–V','IV–V–I','I–V–vi–IV','vi–IV–I–V','ii–V–I','i–iv–V','ii°–V–i','i–VI–III–VII','I–IV–V–I','I–vi–IV–V','I–V–IV–I','vi–ii–V–I','IV–V–I–vi','I–ii–IV–V','I–IV–ii–V','I–V–ii–IV','I–IV–vi–V','vi–V–I–IV','I–iii–IV–V','I–iii–vi–ii–V','iii–vi–ii–V–I','IV–V–iii–vi','i–VII–VI–V','i–iv–VI–V','i–VI–iv–V','i–III–VII–VI'];

  // --- Bug fix: 'Functional Harmony — C' must have progressions: [] and updated hint ---
  const stage1Check = await page.evaluate(() => {
    const stage = LEARNING_PATH.find(s => s.name === 'Functional Harmony — C');
    return {
      exists: !!stage,
      progressionsLength: stage ? (stage.progressions || []).length : null,
      hint: stage ? stage.hint : null,
    };
  });
  checkTrue('Functional Harmony — C stage exists', stage1Check.exists, null);
  check('Functional Harmony — C has exactly the 7 canonical numerals as its progressions (Major-only diatonic content)', stage1Check.progressionsLength, 7);
  check('Functional Harmony — C hint no longer mentions ii–V–I', stage1Check.hint, 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C');

  // --- applyStage() on that stage must leave every non-canonical progression checkbox
  //     unchecked, check all 7 major-canonical numeral checkboxes, and leave all 7
  //     minor-canonical numeral checkboxes unchecked (Major-only stage). ---
  const stage1ApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    const majorCanonical = ['I','ii','iii','IV','V','vi','vii°'].map(p => `major:${p}`);
    const minorCanonical = ['i','ii°','III','iv','V','VI','VII'].map(p => `minor:${p}`);
    return {
      nonCanonicalAllUnchecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false),
      majorCanonicalAllChecked: majorCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      minorCanonicalAllUnchecked: minorCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false),
    };
  }, [ALL_26]);
  checkTrue('applyStage() on Functional Harmony — C leaves all 26 non-canonical progression checkboxes unchecked', stage1ApplyCheck.nonCanonicalAllUnchecked, null);
  checkTrue('applyStage() on Functional Harmony — C checks all 7 major-canonical numeral checkboxes', stage1ApplyCheck.majorCanonicalAllChecked, null);
  checkTrue('applyStage() on Functional Harmony — C leaves all 7 minor-canonical numeral checkboxes unchecked', stage1ApplyCheck.minorCanonicalAllUnchecked, null);

  // --- The old 5-stage key ramp and the 2-key borrowed-content stage were removed by the key-ramp
  //     audit (redundant: key fluency is already established well before Phase 14). The 5 C-only
  //     borrowed-content stages remain, now followed by 4 new C-only jazz-extended stages (9 total). ---
  const rampCheck = await page.evaluate(([all26]) => {
    const idxMoreMinor = LEARNING_PATH.findIndex(s => s.name === 'More Minor Progressions');
    const idxNatKeys    = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    const between = LEARNING_PATH.slice(idxMoreMinor + 1, idxNatKeys);
    const expectedNames = ['Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords', 'Raised Mediants', 'Minor Borrowed — ♭II', 'Jazz 7th Chords', 'Extended 9ths, 11ths & 13ths', 'Circle of Fifths & Applied Chords', 'Cadences & Color Chords'];
    const removedNames  = ['Progressions, Two Keys', 'Progressions, Three Keys', 'Progressions, Add D', 'Progressions, Add A', 'Progressions, Add E', 'Borrowed Content, Two Keys'];
    return {
      count: between.length,
      namesMatch: between.map(s => s.name).every((n, i) => n === expectedNames[i]),
      allCOnly: between.every(s => JSON.stringify(s.notes) === JSON.stringify(['C'])),
      allHaveNoTimer: between.every(s => s.timer === 'off'),
      immediatelyAdjacent: idxNatKeys === idxMoreMinor + 10,
      noneOfTheRemovedStagesExist: !LEARNING_PATH.some(s => removedNames.includes(s.name)),
    };
  }, [ALL_26]);
  check('exactly 9 stages remain between More Minor Progressions and Functional, Nat. Keys (5 borrowed + 4 new jazz)', rampCheck.count, 9);
  checkTrue('the 9 stages are named and ordered correctly', rampCheck.namesMatch, null);
  checkTrue('all 9 stages are C only (no key ramp needed anymore)', rampCheck.allCOnly, null);
  checkTrue('each stage has timer: off', rampCheck.allHaveNoTimer, null);
  checkTrue('Functional, Nat. Keys sits exactly 10 stages after More Minor Progressions (9 between + itself)', rampCheck.immediatelyAdjacent, null);
  checkTrue('all 6 removed stages (5 old ramp + Borrowed Content, Two Keys) are gone', rampCheck.noneOfTheRemovedStagesExist, null);

  // --- 'Functional, Nat. Keys' and 'Functional, All 12' remain unchanged ---
  const tailCheck = await page.evaluate(() => {
    const natKeys = LEARNING_PATH.find(s => s.name === 'Functional, Nat. Keys');
    const all12   = LEARNING_PATH.find(s => s.name === 'Functional, All 12');
    return {
      natKeysNotes: natKeys ? natKeys.notes : null,
      all12Notes:   all12 ? all12.notes : null,
    };
  });
  check('Functional, Nat. Keys notes unchanged (7 naturals)', JSON.stringify(tailCheck.natKeysNotes), JSON.stringify(['C','D','E','F','G','A','B']));
  check('Functional, All 12 notes unchanged (12 keys)', JSON.stringify(tailCheck.all12Notes), JSON.stringify(['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']));

  // --- applyStage() on 'Functional, Nat. Keys' (the stage that now immediately follows the C-only
  //     content buildup) still checks all 26+ progressions via its no-progressions-field fallback ---
  const natKeysApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    applyStage(idx);
    const allCanonical = [...['I','ii','iii','IV','V','vi','vii°'].map(p => `major:${p}`), ...['i','ii°','III','iv','V','VI','VII'].map(p => `minor:${p}`)];
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      dChecked: document.querySelector('input[data-note="D"]').checked,
      allProgressionsChecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
      allCanonicalChecked: allCanonical.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
    };
  }, [ALL_26]);
  check('applyStage() on Functional, Nat. Keys checks C', natKeysApplyCheck.cChecked, true);
  check('applyStage() on Functional, Nat. Keys checks G', natKeysApplyCheck.gChecked, true);
  check('applyStage() on Functional, Nat. Keys checks D (all 7 naturals, not a partial ramp)', natKeysApplyCheck.dChecked, true);
  checkTrue('applyStage() on Functional, Nat. Keys checks all 26 original progression checkboxes (fallback still works)', natKeysApplyCheck.allProgressionsChecked, null);
  checkTrue('applyStage() on Functional, Nat. Keys also checks all 14 canonical numeral checkboxes (fallback covers new canonical content too)', natKeysApplyCheck.allCanonicalChecked, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
