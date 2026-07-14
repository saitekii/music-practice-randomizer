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

  // 1. The new stage exists, in the right place, immediately between 'Faster Still' and 'Add F♯'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const fasterStillIdx = names.indexOf('Faster Still');
    return {
      totalStages: LEARNING_PATH.length,
      nextAfterFasterStill: names[fasterStillIdx + 1],
      nextAfterThat: names[fasterStillIdx + 2],
    };
  });
  check('LEARNING_PATH grows to 142 stages', placement.totalStages, 142);
  check("'First Minor Progression' sits immediately after 'Faster Still'", placement.nextAfterFasterStill, 'First Minor Progression');
  check("'Add F♯' sits immediately after 'First Minor Progression'", placement.nextAfterThat, 'Add F♯');

  // 2. The stage's data: exactly the A-minor-only i-iv-V content, no chords/scales, no timer.
  const stageData = await page.evaluate(() => LEARNING_PATH.find(s => s.name === 'First Minor Progression'));
  check('cats', stageData.cats, ['catFunctional']);
  check('notes', stageData.notes, ['A']);
  check('chords', stageData.chords, []);
  check('scales', stageData.scales, []);
  check('progressions', stageData.progressions, ['i–iv–V']);
  check('timer', stageData.timer, 'off');

  // 3. LEARNING_PATH_PHASES gains exactly one new entry, in the right place, and the phase
  // counts still sum to the total stage count.
  const phaseData = await page.evaluate(() => {
    const names = LEARNING_PATH_PHASES.map(p => p.name);
    const idx = names.indexOf('First Minor Progression');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 23 entries', phaseData.totalPhases, 23);
  check('phase counts sum to 142', phaseData.phaseSum, 142);
  check("new phase's count is 1", phaseData.newPhaseCount, 1);
  check("new phase sits right after 'Add timer pressure'", phaseData.prevPhase, 'Add timer pressure');
  check("new phase sits right before 'Accidentals one at a time'", phaseData.nextPhase, 'Accidentals one at a time');

  // 4. applyStage() sets exactly the A root-note checkbox and exactly the i-iv-V pattern
  // checkbox, nothing else. Root-note checkboxes are `<input type="checkbox" data-note="A">`
  // (index.html:552-563); the i-iv-V progression checkbox is `<input data-pattern="i–iv–V">`
  // (index.html:376) -- a bare, non-mode-qualified pattern string, since it's a multi-chord
  // progression, not one of the 7 canonical single-numeral entries that get a "minor:" prefix.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    const checkedPattern = document.querySelector('input[data-pattern="i–iv–V"]')?.checked;
    return {
      checkedNotes,
      checkedPattern,
      catFunctionalChecked: document.getElementById('catFunctional').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('First Minor Progression') checks exactly the A root note", applied.checkedNotes, ['A']);
  check('applyStage() checks the i–iv–V pattern checkbox', applied.checkedPattern, true);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with the stage applied, genFunctional() produces only
  // 'func|A|minor|i–iv–V|0|' -- never a major-mode prompt, never a different minor numeral.
  const liveGen = await page.evaluate(() => {
    const keys = new Set();
    for (let i = 0; i < 100; i++) {
      const prompt = genFunctional();
      if (prompt) keys.add(prompt.key);
    }
    return [...keys];
  });
  check('genFunctional() produces only the A minor i-iv-V prompt across 100 tries', liveGen, ['func|A|minor|i–iv–V|0|']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
