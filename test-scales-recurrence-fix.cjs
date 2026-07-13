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

  const ALL_7_SCALES = ['scaleMajor', 'scaleNatMinor', 'scaleHarmMinor', 'scaleMelMinor', 'scaleMajPent', 'scaleMinPent', 'scaleModes'];

  // --- Data check: both stages list all 7 scale types ---
  const dataCheck = await page.evaluate(([all7]) => {
    const ext = LEARNING_PATH.find(s => s.name === 'All Extensions, All Keys');
    const full = LEARNING_PATH.find(s => s.name === 'Full Theory Workout');
    return {
      extScales: ext ? ext.scales.slice().sort() : null,
      fullScales: full ? full.scales.slice().sort() : null,
      all7Sorted: all7.slice().sort(),
    };
  }, [ALL_7_SCALES]);
  check('All Extensions, All Keys lists all 7 scale types', dataCheck.extScales, dataCheck.all7Sorted);
  check('Full Theory Workout lists all 7 scale types', dataCheck.fullScales, dataCheck.all7Sorted);

  // --- applyStage() checks all 7 scale checkboxes for each stage ---
  const applyCheck = await page.evaluate(([all7]) => {
    const results = {};
    for (const name of ['All Extensions, All Keys', 'Full Theory Workout']) {
      const idx = LEARNING_PATH.findIndex(s => s.name === name);
      applyStage(idx);
      results[name] = all7.every(id => document.getElementById(id).checked === true);
    }
    return results;
  }, [ALL_7_SCALES]);
  checkTrue('applyStage() on All Extensions, All Keys checks all 7 scale checkboxes', applyCheck['All Extensions, All Keys'], null);
  checkTrue('applyStage() on Full Theory Workout checks all 7 scale checkboxes', applyCheck['Full Theory Workout'], null);

  // --- Live-generation sanity check: genScale() can actually produce every scale
  //     family once one of these stages is applied, not just that the checkbox
  //     array contains the right strings. ---
  const genCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Full Theory Workout');
    applyStage(idx);
    document.getElementById('adaptiveToggle').checked = false; // deterministic uniform picks
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });

    const labels = new Set();
    for (let i = 0; i < 300; i++) {
      const prompt = genScale();
      if (!prompt) continue;
      labels.add(prompt.line1.split(' ').slice(1).join(' ')); // "C Harmonic minor" -> "Harmonic minor"
    }
    return [...labels];
  });
  const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];
  checkTrue('genScale() produces Major', genCheck.includes('Major'), `labels=${JSON.stringify(genCheck)}`);
  checkTrue('genScale() produces Natural minor', genCheck.includes('Natural minor'), null);
  checkTrue('genScale() produces Harmonic minor', genCheck.includes('Harmonic minor'), null);
  checkTrue('genScale() produces Melodic minor', genCheck.includes('Melodic minor'), null);
  checkTrue('genScale() produces Major pentatonic', genCheck.includes('Major pentatonic'), null);
  checkTrue('genScale() produces Minor pentatonic', genCheck.includes('Minor pentatonic'), null);
  checkTrue('genScale() produces at least one mode', genCheck.some(l => MODE_NAMES.includes(l)), `labels=${JSON.stringify(genCheck)}`);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
