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

  // --- relativeMinorOf / relativeMajorOf are correct for all 12 roots ---
  const relPairs = await page.evaluate(() => {
    const NOTES_LOCAL = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
    return NOTES_LOCAL.map(m => [m, relativeMinorOf(m)]);
  });
  check('relativeMinorOf() matches the known-correct table for all 12 roots', relPairs, [
    ['C','A'], ['C#','Bb'], ['D','B'], ['Eb','C'], ['E','C#'], ['F','D'],
    ['F#','Eb'], ['G','E'], ['Ab','F'], ['A','F#'], ['Bb','G'], ['B','Ab'],
  ]);

  // --- pickPairedRoot: the "More Minors" 6-root case reproduces its own hint text exactly ---
  const moreMinorsCandidates = await page.evaluate(() => {
    const notes = ['C','D','E','F','G','A'];
    const majorCandidates = notes.filter(n => notes.includes(relativeMinorOf(n)));
    const minorCandidates = notes.filter(n => notes.includes(relativeMajorOf(n)));
    return { majorCandidates: majorCandidates.sort(), minorCandidates: minorCandidates.sort() };
  });
  check('"More Minors" root set: major candidates are exactly C/F/G', moreMinorsCandidates.majorCandidates, ['C','F','G']);
  check('"More Minors" root set: minor candidates are exactly A/D/E', moreMinorsCandidates.minorCandidates, ['A','D','E']);

  // --- Meet the Scales: with pairing on and only {C,A} enabled, 200 generated prompts
  // never produce a mismatched combination (C Minor or A Major) ---
  const meetTheScales = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet the Scales');
    applyStage(idx);
    const results = new Set();
    for (let i = 0; i < 200; i++) {
      const p = genScale();
      if (p) results.add(p.line1);
    }
    return [...results].sort();
  });
  check('200 generated prompts on "Meet the Scales" only ever produce C Major or A Natural minor', meetTheScales, ['A Natural minor', 'C Major']);

  // --- applyStage() sets pairedScales/pairedChords per the stage mapping ---
  const stageFlags = await page.evaluate(() => {
    const byName = n => {
      applyStage(LEARNING_PATH.findIndex(s => s.name === n));
      return {
        chords: document.getElementById('chordPairedRelativeKeys').checked,
        scales: document.getElementById('scalePairedRelativeKeys').checked,
      };
    };
    return {
      firstMinor: byName('First Minor'),
      moreMinors: byName('More Minors'),
      allNaturalMinor: byName('All Natural Minor'),
      meetTheScales: byName('Meet the Scales'),
      scales2Acc: byName('Scales, 2 Accidentals'),
      allTwelveKeys: byName('Scales, All 12 Keys'),
      scaleTimer: byName('Scale Timer'),
    };
  });
  check('First Minor: chordPairedRelativeKeys on', stageFlags.firstMinor.chords, true);
  check('More Minors: chordPairedRelativeKeys on', stageFlags.moreMinors.chords, true);
  check('All Natural Minor: chordPairedRelativeKeys off', stageFlags.allNaturalMinor.chords, false);
  check('Meet the Scales: scalePairedRelativeKeys on', stageFlags.meetTheScales.scales, true);
  check('Scales, 2 Accidentals: scalePairedRelativeKeys on', stageFlags.scales2Acc.scales, true);
  check('Scales, All 12 Keys: scalePairedRelativeKeys off', stageFlags.allTwelveKeys.scales, false);
  check('Scale Timer: scalePairedRelativeKeys off', stageFlags.scaleTimer.scales, false);

  // --- Regression: with the checkbox OFF, genChord()/genScale() are unconstrained (unchanged) ---
  const unpaired = await page.evaluate(() => {
    applyStage(LEARNING_PATH.findIndex(s => s.name === 'All Natural Minor'));
    const results = new Set();
    for (let i = 0; i < 300; i++) {
      const p = genChord();
      if (p) results.add(p.line1.split(' ')[1]); // just the quality
    }
    return [...results].sort();
  });
  checkTrue('with pairing off, both Major and Minor still appear across 300 samples (unconstrained, unchanged)', unpaired.includes('Major') && unpaired.includes('Minor'), unpaired.join(', '));

  // --- Degenerate case: pairing checkbox on, but only one quality enabled -> falls back, still produces prompts ---
  const degenerate = await page.evaluate(() => {
    document.getElementById('catChords').checked = true;
    document.getElementById('chordPairedRelativeKeys').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.getElementById('chordMinor').checked = false;
    document.querySelectorAll('input[data-note]').forEach(el => el.checked = (el.dataset.note === 'C'));
    const p = genChord();
    return p ? p.line1 : null;
  });
  checkTrue('degenerate case (pairing on, only one quality enabled) still produces a prompt via fallback', degenerate !== null, degenerate);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
