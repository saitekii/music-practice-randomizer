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

  // --- The exact user-reported bug: "Play Your First Song" (C major, I-IV-V only) must
  //     never produce minor mode or any pattern outside I-IV-V. ---
  const firstSong = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Play Your First Song');
    applyStage(idx);
    const modeCounts = {};
    const patternCounts = {};
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      const parts = prompt.key.split('|');
      modeCounts[parts[2]] = (modeCounts[parts[2]] || 0) + 1;
      patternCounts[parts[3]] = (patternCounts[parts[3]] || 0) + 1;
    }
    return { modeCounts, patternCounts };
  });
  check('Play Your First Song: 200 prompts are all Major mode (no minor leakage)', firstSong.modeCounts, { Major: 200 });
  check('Play Your First Song: 200 prompts are all the I–IV–V pattern (no bare-numeral leakage)', firstSong.patternCounts, { 'I–IV–V': 200 });

  // --- "Functional Harmony — C" must produce only Major mode, one of its 7 canonical numerals ---
  const canonicalStage = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Functional Harmony — C');
    applyStage(idx);
    const modes = new Set();
    const patterns = new Set();
    for (let i = 0; i < 200; i++) {
      const prompt = genFunctional();
      if (!prompt) continue;
      const parts = prompt.key.split('|');
      modes.add(parts[2]);
      patterns.add(parts[3]);
    }
    return { modes: [...modes], patterns: [...patterns].sort() };
  });
  check('Functional Harmony — C: only ever Major mode across 200 trials', canonicalStage.modes, ['Major']);
  checkTrue('Functional Harmony — C: every pattern seen is one of the 7 canonical numerals', canonicalStage.patterns.every(p => ['I','ii','iii','IV','V','vi','vii°'].includes(p)), `patterns=${JSON.stringify(canonicalStage.patterns)}`);
  checkTrue('Functional Harmony — C: more than one distinct numeral appears across 200 trials (real variety)', canonicalStage.patterns.length > 1, `patterns=${JSON.stringify(canonicalStage.patterns)}`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
