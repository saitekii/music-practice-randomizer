const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const before = await page.evaluate(() => promptStartTime);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    await page.waitForTimeout(50); // advance is instant now -- no bar-length wait needed
    const after = await page.evaluate(() => promptStartTime);
    check(`time sig ${timeSig}/4: prompt advances instantly after a correct answer`, after !== before, true);
  }

  check('no uncaught page errors during the whole session', errors.length, 0);
  if (errors.length) console.log('Errors seen:', errors);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
