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

  // --- earWeakSpotsHtml: display name stripped, data-type now raw ---
  const renderCheck = await page.evaluate(() => {
    earAdaptWeights.types = { 'scale:Major': { ema: 3000, ema_slow: 3000, count: 5 } };
    document.getElementById('statsContent').innerHTML = renderEarStats();
    const row = document.querySelector('.weak-spot-name');
    const btn = document.querySelector('.drill-btn[data-ear="true"]');
    return { displayName: row ? row.textContent : null, dataType: btn ? btn.getAttribute('data-type') : null };
  });
  check('displayed weak-spot name is stripped ("Major")', renderCheck.displayName, 'Major');
  check('Drill button data-type is now the raw category-prefixed key ("scale:Major")', renderCheck.dataType, 'scale:Major');

  // --- The actual bug from the original report: a scale-Major weak spot must drill SCALE, not chord ---
  const drillCheck = await page.evaluate(() => {
    document.getElementById('earCatChords').checked = false;
    document.getElementById('earCatScales').checked = false;
    startDrill('scale:Major', true);
    return {
      earCatScalesChecked: document.getElementById('earCatScales').checked,
      earCatChordsChecked: document.getElementById('earCatChords').checked,
      drillLabel: document.getElementById('drillLabel').textContent,
    };
  });
  check('startDrill("scale:Major", true) checks earCatScales, not earCatChords (the original bug)', { earCatScalesChecked: drillCheck.earCatScalesChecked, earCatChordsChecked: drillCheck.earCatChordsChecked }, { earCatScalesChecked: true, earCatChordsChecked: false });
  check('the drill label shows the stripped label, not the raw prefixed key', drillCheck.drillLabel, 'Drilling: Major');

  // --- A chord-Major weak spot still correctly drills chord ---
  const chordDrillCheck = await page.evaluate(() => {
    document.getElementById('earCatChords').checked = false;
    document.getElementById('earCatScales').checked = false;
    startDrill('chord:Major', true);
    return {
      earCatChordsChecked: document.getElementById('earCatChords').checked,
      earCatScalesChecked: document.getElementById('earCatScales').checked,
    };
  });
  check('startDrill("chord:Major", true) checks earCatChords, not earCatScales', chordDrillCheck, { earCatChordsChecked: true, earCatScalesChecked: false });

  // --- An interval weak spot still routes correctly ---
  const intervalDrillCheck = await page.evaluate(() => {
    document.getElementById('earCatIntervals').checked = false;
    startDrill('interval:Tritone', true);
    return document.getElementById('earCatIntervals').checked;
  });
  checkTrue('startDrill("interval:Tritone", true) checks earCatIntervals', intervalDrillCheck, null);

  // --- isEar=false is now a guaranteed no-op (dead branch removed) ---
  const noOpCheck = await page.evaluate(() => {
    const before = drillActive;
    startDrill('Major', false);
    return { drillActiveUnchanged: drillActive === before };
  });
  checkTrue('startDrill(label, false) is a safe no-op (dead branch removed)', noOpCheck.drillActiveUnchanged, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
