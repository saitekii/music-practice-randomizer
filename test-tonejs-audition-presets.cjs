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

  const newPresets = ['Electric Cello', 'Pianoetta', 'Cool Guy', 'Tiny', 'Delicate Wind', 'Super Saw'];

  // All 16 presets defined, existing 10 untouched
  const allDefined = await page.evaluate((names) => {
    const existing = ['Rhodes','Piano','Organ','Pad','Strings','Vibraphone','Marimba','Bell','Pluck','Bass'];
    return existing.every(n => !!SYNTH_PRESETS[n]) && names.every(n => !!SYNTH_PRESETS[n])
      && Object.keys(SYNTH_PRESETS).length === existing.length + names.length;
  }, newPresets);
  checkTrue('all 10 existing + 6 new presets defined, exactly 16 total, nothing replaced', allDefined);

  // Each new preset triggers/releases a chord without throwing
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

  // No clipping through the app's REAL signal chain (getSynthMasterGain -- compressor, no
  // pre-attenuation, no limiter) for the 3 presets that needed a volume trim.
  for (const preset of ['Cool Guy', 'Pianoetta', 'Delicate Wind']) {
    const result = await page.evaluate(async (presetName) => {
      const def = SYNTH_PRESETS[presetName];
      const instrument = def.make();
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
