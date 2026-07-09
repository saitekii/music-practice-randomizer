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

  const stageData = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    const stages = LEARNING_PATH.slice(idx, idx + 6);
    return {
      idx,
      afterAddE: LEARNING_PATH[idx - 1]?.name === 'Progressions, Add E',
      beforeNatKeys: LEARNING_PATH[idx + 6]?.name === 'Functional, Nat. Keys',
      names: stages.map(s => s.name),
      counts: stages.map(s => (s.progressions || []).length),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
    };
  });
  checkTrue('the 6 new stages start right after "Progressions, Add E"', stageData.afterAddE, JSON.stringify(stageData.names));
  checkTrue('"Functional, Nat. Keys" immediately follows the 6 new stages', stageData.beforeNatKeys, null);
  check('stage names in order', stageData.names, [
    'Borrowed Chords — Intro', 'Single Borrowed Chord Progressions', 'Combining Borrowed Chords',
    'Raised Mediants', 'Minor Borrowed — ♭II', 'Borrowed Content, Two Keys',
  ]);
  check('cumulative progression counts', stageData.counts, [34, 57, 70, 79, 81, 81]);
  check('all 6 stages are timer off', stageData.timers, ['off','off','off','off','off','off']);
  check('stages 1-5 are C only', stageData.notes.slice(0, 5), [['C'],['C'],['C'],['C'],['C']]);
  check('stage 6 is C and G', stageData.notes[5], ['C', 'G']);

  const contentSpotCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    const [intro, single, combo, mediants, minor, twoKeys] = LEARNING_PATH.slice(idx, idx + 6);
    return {
      introHasStandalones: ['iv','♭II','♭III','♭VI','♭VII','II','III','VI'].every(p => intro.progressions.includes(p)),
      singleHasNewOnes: ['I–♭VII–IV','vi–IV–I','V–ii'].every(p => single.progressions.includes(p)),
      singleLacksCombo: !single.progressions.includes('I–♭VI–♭VII–I'), // belongs to stage 3
      comboHasNewOnes: ['I–♭VI–♭VII–I','I–vi–ii–♭II'].every(p => combo.progressions.includes(p)),
      mediantsHasNewOnes: ['I–VI–ii–V','I–III–vi–II–ii–V–I'].every(p => mediants.progressions.includes(p)),
      minorHasNewOnes: ['♭II','i–♭II–VII–i'].every(p => minor.progressions.includes(p)),
      twoKeysMatchesMinorContent: JSON.stringify([...twoKeys.progressions].sort()) === JSON.stringify([...minor.progressions].sort()),
    };
  });
  checkTrue('stage 1 has the 8 standalone borrowed chords', contentSpotCheck.introHasStandalones, null);
  checkTrue('stage 2 has its new single-borrowed-chord progressions', contentSpotCheck.singleHasNewOnes, null);
  checkTrue('stage 2 does not yet have stage-3-only combos', contentSpotCheck.singleLacksCombo, null);
  checkTrue('stage 3 has its new two-borrowed-chord combos', contentSpotCheck.comboHasNewOnes, null);
  checkTrue('stage 4 has its new raised-mediant progressions', contentSpotCheck.mediantsHasNewOnes, null);
  checkTrue('stage 5 has the new minor content', contentSpotCheck.minorHasNewOnes, null);
  checkTrue('stage 6 has the same progression list as stage 5 (only the key changed)', contentSpotCheck.twoKeysMatchesMinorContent, null);

  const applyStageCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Borrowed Chords — Intro');
    applyStage(idx);
    return {
      ivChecked: document.querySelector('input[data-pattern="iv"]').checked,
      flatVIIChecked: document.querySelector('input[data-pattern="♭VII"]').checked,
      singleOnlyStillUnchecked: document.querySelector('input[data-pattern="I–♭VII–IV"]').checked, // belongs to stage 2, not 1
    };
  });
  check('applyStage() on "Borrowed Chords — Intro" checks the new standalone chords', applyStageCheck.ivChecked, true);
  check('applyStage() checks ♭VII too', applyStageCheck.flatVIIChecked, true);
  check('applyStage() leaves stage-2-only progressions unchecked', applyStageCheck.singleOnlyStillUnchecked, false);

  const phaseCheck = await page.evaluate(() => ({
    functionalHarmonyCount: LEARNING_PATH_PHASES.find(p => p.name === 'Functional harmony').count,
    phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
    totalStages: LEARNING_PATH.length,
  }));
  check('Functional harmony phase count is now 28 (22 + 6 new stages)', phaseCheck.functionalHarmonyCount, 28);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);
  check('LEARNING_PATH has 125 stages total (119 + 6 new)', phaseCheck.totalStages, 125);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
