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
  check('Functional Harmony — C has zero progressions (no early unlock)', stage1Check.progressionsLength, 0);
  check('Functional Harmony — C hint no longer mentions ii–V–I', stage1Check.hint, 'I, ii, iii, IV, V, vi, vii° — every diatonic chord function in the key of C');

  // --- applyStage() on that stage must leave every progression checkbox unchecked ---
  const stage1ApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    return all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === false);
  }, [ALL_26]);
  checkTrue('applyStage() on Functional Harmony — C leaves all 26 progression checkboxes unchecked', stage1ApplyCheck, null);

  // --- 11 stages now exist between 'More Minor Progressions' and 'Functional, Nat. Keys' (5 ramps + 6 borrowed chord stages) ---
  const rampCheck = await page.evaluate(([all26]) => {
    const idxMoreMinor = LEARNING_PATH.findIndex(s => s.name === 'More Minor Progressions');
    const idxNatKeys    = LEARNING_PATH.findIndex(s => s.name === 'Functional, Nat. Keys');
    const between = LEARNING_PATH.slice(idxMoreMinor + 1, idxNatKeys);
    const expectedNames = ['Progressions, Two Keys', 'Progressions, Three Keys', 'Progressions, Add D', 'Progressions, Add A', 'Progressions, Add E', 'Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords', 'Raised Mediants', 'Minor Borrowed — ♭II', 'Borrowed Content, Two Keys'];
    const expectedNotes  = [['C','G'], ['C','F','G'], ['C','D','F','G'], ['C','D','F','G','A'], ['C','D','E','F','G','A'], ['C'], ['C'], ['C'], ['C'], ['C'], ['C','G']];
    return {
      count: between.length,
      namesMatch: between.map(s => s.name).every((n, i) => n === expectedNames[i]),
      notesMatch: between.every((s, i) => JSON.stringify(s.notes) === JSON.stringify(expectedNotes[i])),
      progressionsMatch: between.slice(0, 5).every(s => all26.every(p => (s.progressions || []).includes(p)) && (s.progressions || []).length === 26),
      allHaveNoTimer: between.every(s => s.timer === 'off'),
      allHaveEmptyChordsScales: between.every(s => (s.chords || []).length === 0 && (s.scales || []).length === 0),
      immediatelyAdjacent: idxNatKeys === idxMoreMinor + 12,
    };
  }, [ALL_26]);
  check('exactly 11 stages inserted between More Minor Progressions and Functional, Nat. Keys (5 ramps + 6 borrowed)', rampCheck.count, 11);
  checkTrue('the 11 stages are named and ordered correctly', rampCheck.namesMatch, null);
  checkTrue('each stage has the correct notes array', rampCheck.notesMatch, null);
  checkTrue('each ramp stage keeps all 26 progressions enabled', rampCheck.progressionsMatch, null);
  checkTrue('each ramp stage has timer: off', rampCheck.allHaveNoTimer, null);
  checkTrue('each ramp stage has empty chords/scales arrays', rampCheck.allHaveEmptyChordsScales, null);
  checkTrue('Functional, Nat. Keys sits exactly 12 stages after More Minor Progressions (11 between + itself)', rampCheck.immediatelyAdjacent, null);

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

  // --- applyStage() on 'Progressions, Two Keys' sets notes to C,G and checks all 26 progressions ---
  // Guarded: this stage doesn't exist until Step 3's edit lands, and calling applyStage(-1) would
  // throw (LEARNING_PATH[-1] is undefined), crashing page.evaluate before any result comes back.
  const twoKeysApplyCheck = await page.evaluate(([all26]) => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Progressions, Two Keys');
    if (idx === -1) return { found: false };
    applyStage(idx);
    return {
      found: true,
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      dUnchecked: document.querySelector('input[data-note="D"]').checked,
      allProgressionsChecked: all26.every(p => document.querySelector(`input[data-pattern="${p}"]`).checked === true),
    };
  }, [ALL_26]);
  checkTrue('Progressions, Two Keys stage exists', twoKeysApplyCheck.found, null);
  if (twoKeysApplyCheck.found) {
    check('applyStage() on Progressions, Two Keys checks C', twoKeysApplyCheck.cChecked, true);
    check('applyStage() on Progressions, Two Keys checks G', twoKeysApplyCheck.gChecked, true);
    check('applyStage() on Progressions, Two Keys leaves D unchecked', twoKeysApplyCheck.dUnchecked, false);
    checkTrue('applyStage() on Progressions, Two Keys checks all 26 progression checkboxes', twoKeysApplyCheck.allProgressionsChecked, null);
  }

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
