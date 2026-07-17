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

  const newPresets = ['Wurlitzer', 'Juno Lead', 'Brass Stab', 'Hammond Organ', 'Moog Bass'];

  // Not an exact total count -- future rounds are expected to keep adding more presets.
  const allDefined = await page.evaluate((names) => {
    return Object.keys(SYNTH_PRESETS).length >= 21 && names.every(n => !!SYNTH_PRESETS[n]);
  }, newPresets);
  checkTrue('all 5 new presets defined, at least 21 total, nothing replaced', allDefined);

  for (const preset of newPresets) {
    const result = await page.evaluate(async (presetName) => {
      currentSynthPreset = presetName;
      let threw = false;
      try {
        await synthNoteOn(60, 100);
        await synthNoteOn(64, 100);
        await synthNoteOn(67, 100);
        synthNoteOff(60); synthNoteOff(64); synthNoteOff(67);
      } catch (e) { threw = true; }
      return { threw };
    }, preset);
    checkTrue(`${preset}: a full triad triggers/releases without throwing`, !result.threw);
  }

  for (const preset of newPresets) {
    const result = await page.evaluate(async (presetName) => {
      const def = SYNTH_PRESETS[presetName];
      const buffer = await Tone.Offline(() => {
        const comp = new Tone.Compressor({ threshold: -12, ratio: 6, attack: 0.003, release: 0.15 });
        const gain = new Tone.Gain(0.7).toDestination();
        comp.connect(gain);
        const fresh = def.make();
        fresh.output.connect(comp);
        const root = 261.63;
        const notes = [root, root * Math.pow(2, 4 / 12), root * Math.pow(2, 7 / 12)];
        fresh.trigger.triggerAttack(notes, 0, 0.85);
      }, 1.5);
      const data = buffer.getChannelData(0);
      let clipped = 0;
      for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) >= 0.999) clipped++;
      return { clippedFraction: clipped / data.length };
    }, preset);
    checkTrue(`${preset}: no clipping through the real app signal chain`, result.clippedFraction === 0, `clipped=${(result.clippedFraction * 100).toFixed(2)}%`);
  }

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
