const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
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

  // --- LEARNING_PATH placement and content ---
  const pathCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    const stages = LEARNING_PATH.slice(idx, idx + 3);
    return {
      idx,
      prevName: LEARNING_PATH[idx - 1]?.name,
      nextName: LEARNING_PATH[idx + 3]?.name,
      names: stages.map(s => s.name),
      progressions: stages.map(s => s.progressions),
      notes: stages.map(s => s.notes),
      timers: stages.map(s => s.timer),
      totalStages: LEARNING_PATH.length,
    };
  });
  check('the 3 new stages start right after "All Natural Minor"', pathCheck.prevName, 'All Natural Minor');
  check('"Add a Timer" immediately follows the 3 new stages', pathCheck.nextName, 'Add a Timer');
  check('stage names in order', pathCheck.names, ['Play Your First Song', 'Add a Turnaround', 'Four Chord Song']);
  check('cumulative progressions (1, then 2, then 3 entries)', pathCheck.progressions, [
    ['I–IV–V'],
    ['I–IV–V', 'IV–V–I'],
    ['I–IV–V', 'IV–V–I', 'I–V–vi–IV'],
  ]);
  check('all 3 stages are C only', pathCheck.notes, [['C'], ['C'], ['C']]);
  check('all 3 stages are untimed', pathCheck.timers, ['off', 'off', 'off']);
  check('LEARNING_PATH has 150 stages total (125 + 3 First Progressions + 3 Progressions Inverted + 3 Two-Handed Progressions + 2 Dim/Aug warmup + 5 Progressions in New Keys + 1 First Minor Progression + 3 Left-Hand Progressions + 5 Minor Progressions in New Keys)', pathCheck.totalStages, 150);

  // --- No duplicate stage names anywhere in the whole path (the collision risk this plan flagged) ---
  const nameUniqueness = await page.evaluate(() => {
    const names = LEARNING_PATH.map(s => s.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    return { uniqueDupes: [...new Set(dupes)] };
  });
  check('no two stages in LEARNING_PATH share the same name', nameUniqueness.uniqueDupes, []);

  // --- The existing late-phase stages covering the same progressions are untouched ---
  const lateStageCheck = await page.evaluate(() => {
    const s1 = LEARNING_PATH.find(s => s.name === 'Progression: I–IV–V');
    const s2 = LEARNING_PATH.find(s => s.name === 'Add IV–V–I');
    const s3 = LEARNING_PATH.find(s => s.name === 'Add I–V–vi–IV');
    return {
      s1Progressions: s1?.progressions,
      s2Progressions: s2?.progressions,
      s3Progressions: s3?.progressions,
    };
  });
  check('late-phase "Progression: I–IV–V" is untouched', lateStageCheck.s1Progressions, ['I–IV–V']);
  check('late-phase "Add IV–V–I" is untouched', lateStageCheck.s2Progressions, ['I–IV–V', 'IV–V–I']);
  check('late-phase "Add I–V–vi–IV" is untouched', lateStageCheck.s3Progressions, ['I–IV–V', 'IV–V–I', 'I–V–vi–IV']);

  // --- LEARNING_PATH_PHASES ---
  const phaseCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH_PHASES.findIndex(p => p.name === 'First Progressions');
    return {
      idx,
      count: LEARNING_PATH_PHASES[idx]?.count,
      prevPhaseName: LEARNING_PATH_PHASES[idx - 1]?.name,
      nextPhaseName: LEARNING_PATH_PHASES[idx + 1]?.name,
      phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),
      totalStages: LEARNING_PATH.length,
    };
  });
  checkTrue('"First Progressions" phase exists', phaseCheck.idx !== -1, null);
  check('"First Progressions" phase has count 3', phaseCheck.count, 3);
  check('"First Progressions" sits right after "Introduce minor"', phaseCheck.prevPhaseName, 'Introduce minor');
  check('"First Progressions" sits right before "Add timer pressure"', phaseCheck.nextPhaseName, 'Add timer pressure');
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', phaseCheck.phaseCountSum, phaseCheck.totalStages);

  // --- applyStage() correctness ---
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Four Chord Song');
    applyStage(idx);
    return {
      iIvVChecked: document.querySelector('input[data-pattern="I–IV–V"]').checked,
      ivVIChecked: document.querySelector('input[data-pattern="IV–V–I"]').checked,
      iVViIVChecked: document.querySelector('input[data-pattern="I–V–vi–IV"]').checked,
      viIvIVChecked: document.querySelector('input[data-pattern="vi–IV–I–V"]').checked,
    };
  });
  check('applyStage() on "Four Chord Song" checks all 3 of its progressions', applyCheck, {
    iIvVChecked: true, ivVIChecked: true, iVViIVChecked: true, viIvIVChecked: false,
  });

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
