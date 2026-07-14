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

  // 1. The 3 new stages exist, in order, immediately between 'Left Hand, All 12' and 'Meet Inversions'.
  const placement = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const allTwelveIdx = names.indexOf('Left Hand, All 12');
    return {
      totalStages: LEARNING_PATH.length,
      between: names.slice(allTwelveIdx + 1, allTwelveIdx + 4),
      nextAfter: names[allTwelveIdx + 4],
    };
  });
  check('LEARNING_PATH grows to 145 stages', placement.totalStages, 145);
  check('the 3 new stages sit immediately after Left Hand, All 12, in order', placement.between, [
    'Meet Left-Hand Progressions',
    'Left-Hand Progressions, Nat. Keys',
    'Left-Hand Progressions, All 12',
  ]);
  check("'Meet Inversions' immediately follows the 3 new stages", placement.nextAfter, 'Meet Inversions');

  // 2. Each stage's data: fixed 4-progression content, left-hand mode, no scales, no timer, and
  // the exact cumulative root-note set per stage (in NOTES array order).
  const stageData = await page.evaluate(() => {
    const byName = name => LEARNING_PATH.find(s => s.name === name);
    return {
      meetLHP:  byName('Meet Left-Hand Progressions'),
      natKeys:  byName('Left-Hand Progressions, Nat. Keys'),
      all12:    byName('Left-Hand Progressions, All 12'),
    };
  });
  const expectedCommon = {
    cats: ['catFunctional'], chords: ['leftHandMode'], scales: [],
    progressions: ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'], timer: 'off',
  };
  check('Meet Left-Hand Progressions roots', stageData.meetLHP.notes, ['C']);
  check('Left-Hand Progressions, Nat. Keys roots', stageData.natKeys.notes, ['C','D','E','F','G','A','B']);
  check('Left-Hand Progressions, All 12 roots', stageData.all12.notes,
    ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']);
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
    const idx = names.indexOf('Left-Hand Progressions');
    return {
      totalPhases: LEARNING_PATH_PHASES.length,
      phaseSum: LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0),
      newPhaseCount: LEARNING_PATH_PHASES[idx]?.count,
      prevPhase: names[idx - 1],
      nextPhase: names[idx + 1],
    };
  });
  check('LEARNING_PATH_PHASES grows to 24 entries', phaseData.totalPhases, 24);
  check('phase counts sum to 145', phaseData.phaseSum, 145);
  check("new phase's count is 3", phaseData.newPhaseCount, 3);
  check("new phase sits right after 'Left-Hand Voicing'", phaseData.prevPhase, 'Left-Hand Voicing');
  check("new phase sits right before 'Triad inversions'", phaseData.nextPhase, 'Triad inversions');

  // 4. applyStage() on the first stage sets exactly its root, exactly the 4 progression
  // checkboxes, leftHandMode on, no scales/inversions-required. Root-note checkboxes are
  // `<input data-note="C">`; progression checkboxes are `<input data-pattern="...">`.
  const applied = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left-Hand Progressions');
    applyStage(idx);
    const checkedNotes = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
      .filter(n => document.querySelector(`input[data-note="${n}"]`)?.checked);
    const checkedPatterns = ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']
      .filter(p => document.querySelector(`input[data-pattern="${p}"]`)?.checked);
    return {
      checkedNotes,
      checkedPatterns,
      leftHandChecked: document.getElementById('leftHandMode').checked,
      catScalesChecked: document.getElementById('catScales').checked,
      requireInversionsChecked: document.getElementById('functionalRequireInversions')?.checked,
      timerValue: document.querySelector('input[name="timer"]:checked')?.value,
    };
  });
  check("applyStage('Meet Left-Hand Progressions') checks exactly the C root", applied.checkedNotes, ['C']);
  check('applyStage() checks exactly the 4 progression patterns', applied.checkedPatterns,
    ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V']);
  check('applyStage() checks leftHandMode', applied.leftHandChecked, true);
  check('applyStage() leaves catScales off', applied.catScalesChecked, false);
  check('applyStage() leaves functionalRequireInversions off', applied.requireInversionsChecked, false);
  check('applyStage() sets timer to off', applied.timerValue, 'off');

  // 5. Live-generation sanity check at the C-only stage: genFunctional() mixes Major and minor
  // modes, all 4 patterns appear, hand-mode is always 'LH'.
  const liveGenC = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Left-Hand Progressions');
    applyStage(idx);
    const modes = new Set(), patterns = new Set(), handModes = new Set();
    for (let i = 0; i < 300; i++) {
      const p = genFunctional();
      if (p) {
        const parts = p.key.split('|');
        modes.add(parts[2]);
        patterns.add(parts[3]);
        handModes.add(parts[5]);
      }
    }
    return { modes: [...modes].sort(), patterns: [...patterns].sort(), handModes: [...handModes] };
  });
  check('both Major and minor modes appear', liveGenC.modes, ['Major', 'minor']);
  check('all 4 progression patterns appear', liveGenC.patterns,
    ['I–IV–V','IV–V–I','I–V–vi–IV','i–iv–V'].sort());
  check('hand mode is always LH', liveGenC.handModes, ['LH']);

  // 6. Live-generation check at the All-12 stage: minor-mode prompts appear rooted on more than
  // just C/A, proving the shared root pool genuinely extends minor coverage across the ramp.
  const liveGenAll12 = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Left-Hand Progressions, All 12');
    applyStage(idx);
    const minorRoots = new Set();
    for (let i = 0; i < 400; i++) {
      const p = genFunctional();
      if (p) {
        const parts = p.key.split('|');
        if (parts[2] === 'minor') minorRoots.add(parts[1]);
      }
    }
    return [...minorRoots].sort();
  });
  check('minor prompts at the All-12 stage cover more than just C and A',
    liveGenAll12.length > 2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
