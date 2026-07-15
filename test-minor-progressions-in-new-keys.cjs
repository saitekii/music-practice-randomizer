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

  // 1. The 5 new stages exist, in order, immediately between 'First Song, All 12 Keys' and
  // 'Left Hand Shape'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const allTwelveIdx = names.indexOf('First Song, All 12 Keys');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(allTwelveIdx + 1, allTwelveIdx + 6),
      nextAfter: names[allTwelveIdx + 6],
    };
  });
  check('LEARNING_PATH grows to 154 stages', placement.totalStages, 154);
  check("the 5 new stages sit immediately after 'First Song, All 12 Keys', in order", placement.between, [
    'First Minor Progression, New Keys',
    'First Minor Progression, More Keys',
    'First Minor Progression, Even More Keys',
    'First Minor Progression, Almost All Keys',
    'First Minor Progression, All 12 Keys',
  ]);
  check("'Left Hand Shape' immediately follows the 5 new stages", placement.nextAfter, 'Left Hand Shape');

  // 2. Each stage's data: fixed i-iv-V, no chords/scales, no timer, and the exact cumulative
  // root-note set per stage (in NOTES array order).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      newKeys:   byName('First Minor Progression, New Keys'),
      moreKeys:  byName('First Minor Progression, More Keys'),
      evenMore:  byName('First Minor Progression, Even More Keys'),
      almostAll: byName('First Minor Progression, Almost All Keys'),
      all12:     byName('First Minor Progression, All 12 Keys'),
    };
  });
  const expectedCommon = { cats: ['catFunctional'], chords: [], scales: [], progressions: ['i–iv–V'], timer: 'off' };
  check('First Minor Progression, New Keys roots', stageData.newKeys.notes, ['D', 'E', 'A']);
  check('First Minor Progression, More Keys roots', stageData.moreKeys.notes, ['D', 'E', 'G', 'A', 'B']);
  check('First Minor Progression, Even More Keys roots', stageData.evenMore.notes, ['C', 'D', 'E', 'F#', 'G', 'A', 'B']);
  check('First Minor Progression, Almost All Keys roots', stageData.almostAll.notes,
    ['C', 'C#', 'D', 'E', 'F', 'F#', 'G', 'A', 'B']);
  check('First Minor Progression, All 12 Keys roots', stageData.all12.notes,
    ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']);
  for (const [label, stage] of Object.entries(stageData)) {
    check(`${label}: cats/chords/scales/progressions/timer`, {
      cats: stage.cats, chords: stage.chords, scales: stage.scales,
      progressions: stage.progressions, timer: stage.timer,
    }, expectedCommon);
  }

  // 3. LEARNING_PATH_PHASES gains exactly one new entry, in the right place, and the phase
  // counts still sum to the total stage count.
  const phaseData = await page.evaluate(() => {
    const names = LEARNING_PATH_PHASES.map(p => p.name);
    const idx = names.indexOf('Minor Progressions in New Keys');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 25 entries', phaseData.totalPhases, 25);
  check('phase counts sum to 154', phaseData.phaseSum, 154);
  check("new phase's count is 5", phaseData.newPhaseCount, 5);
  check("new phase sits right after 'Progressions in New Keys'", phaseData.prevPhase, 'Progressions in New Keys');
  check("new phase sits right before 'Left-Hand Voicing'", phaseData.nextPhase, 'Left-Hand Voicing');

  // 4. applyStage() on one of the ramped stages sets exactly its cumulative root-note set and
  // nothing else. Root-note checkboxes are `<input type="checkbox" data-note="D">` etc
  // (index.html:552-563).
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression, Even More Keys');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    return {
      checkedNotes,
      catFunctionalChecked: document.getElementById('catFunctional').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('First Minor Progression, Even More Keys') checks exactly its 7 cumulative roots",
    applied.checkedNotes, ['C', 'D', 'E', 'F#', 'G', 'A', 'B']);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with a multi-root pool active, genFunctional() produces
  // prompts rooted on more than one key, all in minor mode, all i-iv-V.
  const liveGen = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Minor Progression, Even More Keys');
    applyStage(idx);
    const roots = new Set(), modes = new Set(), patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (prompt) {
        const parts = prompt.key.split('|');
        roots.add(parts[1]);
        modes.add(parts[2]);
        patterns.add(parts[3]);
      }
    }
    return { roots: [...roots].sort(), modes: [...modes], patterns: [...patterns] };
  });
  check('genFunctional() produces prompts rooted on more than just one key across 200 tries',
    liveGen.roots.length > 1, true);
  check('every generated root is in the stage\'s enabled set', liveGen.roots.every(r =>
    ['C', 'D', 'E', 'F#', 'G', 'A', 'B'].includes(r)), true);
  check('every generated prompt is in minor mode', liveGen.modes, ['minor']);
  check('every generated prompt is i-iv-V', liveGen.patterns, ['i–iv–V']);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
