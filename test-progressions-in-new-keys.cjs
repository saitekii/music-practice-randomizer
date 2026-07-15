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

  // 1. The 5 new stages exist, in order, immediately between 'Speed Up' and 'Left Hand Shape'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const speedUpIdx = names.indexOf('Speed Up');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(speedUpIdx + 1, speedUpIdx + 6),
      nextAfter: names[speedUpIdx + 6],
    };
  });
  check('LEARNING_PATH grows to 151 stages', placement.totalStages, 151);
  check('the 5 new stages sit immediately after Speed Up, in order', placement.between, [
    'First Song, New Keys',
    'First Song, More Keys',
    'First Song, Even More Keys',
    'First Song, Almost All Keys',
    'First Song, All 12 Keys',
  ]);
  check("First Minor Progression, New Keys immediately follows the 5 new stages", placement.nextAfter, 'First Minor Progression, New Keys');

  // 2. Each stage's data: fixed I-IV-V, no chords/scales, no timer, and the exact cumulative
  // root-note set per stage (in NOTES array order, matching every other stage in the file).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      newKeys:      byName('First Song, New Keys'),
      moreKeys:     byName('First Song, More Keys'),
      evenMore:     byName('First Song, Even More Keys'),
      almostAll:    byName('First Song, Almost All Keys'),
      all12:        byName('First Song, All 12 Keys'),
    };
  });
  const expectedCommon = { cats: ['catFunctional'], chords: [], scales: [], progressions: ['I–IV–V'], timer: 'off' };
  check('First Song, New Keys roots', stageData.newKeys.notes, ['C', 'F', 'G']);
  check('First Song, More Keys roots', stageData.moreKeys.notes, ['C', 'D', 'F', 'G', 'Bb']);
  check('First Song, Even More Keys roots', stageData.evenMore.notes, ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']);
  check('First Song, Almost All Keys roots', stageData.almostAll.notes, ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb']);
  check('First Song, All 12 Keys roots', stageData.all12.notes,
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
    const idx = names.indexOf('Progressions in New Keys');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 25 entries', phaseData.totalPhases, 25);
  check('phase counts sum to 151', phaseData.phaseSum, 151);
  check("new phase's count is 5", phaseData.newPhaseCount, 5);
  check("new phase sits right after 'Accidentals one at a time'", phaseData.prevPhase, 'Accidentals one at a time');
  check("new phase sits right before 'Minor Progressions in New Keys'", phaseData.nextPhase, 'Minor Progressions in New Keys');

  // 4. applyStage() on one of the ramped stages sets exactly its cumulative root-note set and
  // nothing else (no chords, no scales, correct category state). Root-note checkboxes are
  // `<input type="checkbox" data-note="C">` etc (index.html:552-563) -- select by that attribute,
  // not by a guessed id, since there's no per-note id in the markup.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Song, Even More Keys');
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
  check("applyStage('First Song, Even More Keys') checks exactly its 7 cumulative roots",
    applied.checkedNotes, ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb']);
  check('applyStage() enables catFunctional', applied.catFunctionalChecked, true);
  check('applyStage() leaves catChords off', applied.catChordsChecked, false);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check: with a non-C-only root pool active (via the 'First Song,
  // Even More Keys' stage), genFunctional() can actually produce a non-C-rooted I-IV-V prompt --
  // not just that the checkbox data looks right.
  const liveGen = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'First Song, Even More Keys');
    applyStage(idx);
    const roots = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (prompt) {
        const root = prompt.key.split('|')[1];
        roots.add(root);
      }
    }
    return [...roots].sort();
  });
  check('genFunctional() produces prompts rooted on more than just C across 200 tries',
    liveGen.length > 1, true);
  check('every generated root is in the stage\'s enabled set', liveGen.every(r =>
    ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'].includes(r)), true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
