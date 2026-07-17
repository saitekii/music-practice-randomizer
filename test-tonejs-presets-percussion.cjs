const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const checkTrue = (label, cond, extra) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!cond) failed = true;
  };

  for (const preset of ['Vibraphone', 'Marimba', 'Bell', 'Pluck']) {
    const result = await page.evaluate(async (presetName) => {
      currentSynthPreset = presetName;
      let threw = false;
      try {
        await synthNoteOn(60, 100);
        await synthNoteOn(64, 100);
        synthNoteOff(60); synthNoteOff(64);
      } catch (e) { threw = true; }
      return { threw, defined: !!SYNTH_PRESETS[presetName] };
    }, preset);
    checkTrue(`${preset}: is defined in SYNTH_PRESETS`, result.defined);
    checkTrue(`${preset}: two-note polyphony triggers/releases without throwing`, !result.threw);
  }

  // All 10 presets now defined
  const allTen = await page.evaluate(() =>
    ['Rhodes','Piano','Organ','Pad','Strings','Vibraphone','Marimba','Bell','Pluck','Bass']
      .every(name => !!SYNTH_PRESETS[name])
  );
  checkTrue('all 10 presets are defined', allTen);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
