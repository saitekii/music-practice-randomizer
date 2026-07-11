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

  // --- buildSection (Types) shows two separate "Major" rows, chord and scale, not merged ---
  const typesRowCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: { 'chord:Major': { ema: 3000, ema_slow: 3000, count: 5 }, 'scale:Major': { ema: 1000, ema_slow: 1000, count: 5 } },
      combos: {},
      variations: {},
    };
    const html = renderStats();
    return { majorRowCount: (html.match(/>Major</g) || []).length, hasPrefixedText: html.includes('chord:Major') || html.includes('scale:Major') };
  });
  check('Types section shows two separate "Major" rows (chord + scale)', typesRowCheck.majorRowCount, 2);
  checkTrue('no category-prefixed text leaks into rendered HTML', !typesRowCheck.hasPrefixedText, null);

  // --- Weak-spots panel: display name is stripped, data-type keeps the raw category-prefixed combo key ---
  const weakSpotCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: {},
      types: {},
      combos: { 'C|chord:Major': { ema: 3200, ema_slow: 3200, count: 4 } },
      variations: {},
    };
    document.getElementById('statsContent').innerHTML = renderStats();
    const row = document.querySelector('.weak-spot-name');
    const btn = document.querySelector('.drill-btn[data-combo="true"]');
    return { displayName: row ? row.textContent : null, dataType: btn ? btn.getAttribute('data-type') : null };
  });
  check('weak-spot display name strips the category prefix ("C Major", not "C chord:Major")', weakSpotCheck.displayName, 'C Major');
  check('weak-spot Drill button data-type keeps the raw combo key (needed by startDrillCombo)', weakSpotCheck.dataType, 'C|chord:Major');

  // --- getStageMastery reads back the prefixed key correctly, chord and scale mastery stay independent ---
  const masteryCheck = await page.evaluate(() => {
    adaptWeights = {
      roots: { C: { ema: 1000, ema_slow: 1000, count: 10 } },
      types: { 'chord:Major': { ema: 1000, ema_slow: 1000, count: 10 } }, // fast + confirmed -> "mastered"
      combos: {},
      variations: {},
    };
    document.getElementById('adaptiveToggle').checked = true;
    // Minimal stand-in stage: a chord-Major-only stage vs. a scale-Major-only stage.
    const chordStage = { chords: ['chordMajor'], scales: [], progressions: [], cats: ['catChords'], notes: ['C'], timer: 'off' };
    const scaleStage = { chords: [], scales: ['scaleMajor'], progressions: [], cats: ['catScales'], notes: ['C'], timer: 'off' };
    const origPath = LEARNING_PATH.slice();
    LEARNING_PATH.length = 0;
    LEARNING_PATH.push(chordStage, scaleStage);
    const chordMastery = getStageMastery(0);
    const scaleMastery = getStageMastery(1);
    LEARNING_PATH.length = 0;
    LEARNING_PATH.push(...origPath);
    return { chordReady: chordMastery?.ready, scaleReady: scaleMastery?.ready };
  });
  check('a stage using chord Major reports it mastered from chord-side data', masteryCheck.chordReady, true);
  check('a stage using scale Major does NOT report mastery from unrelated chord-side data (proves independence)', masteryCheck.scaleReady, false);

  // --- findPlayingDrillTarget dispatches by category, no more guessing ---
  const targetCheck = await page.evaluate(() => ({
    chord: findPlayingDrillTarget('Major', 'chord'),
    scale: findPlayingDrillTarget('Major', 'scale'),
  }));
  check('findPlayingDrillTarget("Major", "chord") resolves to the chord category', targetCheck.chord, { cat: 'catChords', id: 'chordMajor' });
  check('findPlayingDrillTarget("Major", "scale") resolves to the scale category (not chord)', targetCheck.scale, { cat: 'catScales', id: 'scaleMajor' });

  // --- startDrillCombo end-to-end: a scale-Major combo correctly checks the SCALE category, not chord ---
  const drillComboCheck = await page.evaluate(() => {
    document.getElementById('catChords').checked = false;
    document.getElementById('catScales').checked = false;
    startDrillCombo('C|scale:Major');
    return {
      catScalesChecked: document.getElementById('catScales').checked,
      catChordsChecked: document.getElementById('catChords').checked,
      scaleMajorChecked: document.getElementById('scaleMajor').checked,
    };
  });
  check('startDrillCombo on a scale-Major combo checks catScales, not catChords', { catScalesChecked: drillComboCheck.catScalesChecked, catChordsChecked: drillComboCheck.catChordsChecked }, { catScalesChecked: true, catChordsChecked: false });
  checkTrue('the specific scaleMajor checkbox is checked', drillComboCheck.scaleMajorChecked, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
