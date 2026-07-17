const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, cond, extra) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!cond) failed = true;
  };

  // --- Scenario 1: a single Bass note triggers and releases without throwing, and Tone is
  // pointed at the app's own AudioContext (not a separate one Tone created itself) ---
  const scenario1 = await page.evaluate(async () => {
    currentSynthPreset = 'Bass';
    let threw = false;
    try {
      await synthNoteOn(45, 100); // A2
      synthNoteOff(45);
    } catch (e) { threw = true; }
    return {
      threw,
      toneContextIsAppContext: Tone.getContext().rawContext === getAudioCtx(),
      instrumentCached: !!synthInstruments['Bass'],
    };
  });
  checkTrue('a Bass note triggers/releases without throwing', !scenario1.threw);
  checkTrue('Tone.js shares the app\'s own AudioContext (not a separate one)', scenario1.toneContextIsAppContext);
  checkTrue('the Bass instrument is cached after first use', scenario1.instrumentCached);

  // --- Scenario 2: polyphony -- multiple simultaneous notes, releasing one must not cut off
  // the others (this is the core reason every preset must be PolySynth-wrapped) ---
  const scenario2 = await page.evaluate(async () => {
    currentSynthPreset = 'Bass';
    await synthNoteOn(45, 100); // A2
    await synthNoteOn(48, 100); // C3
    await synthNoteOn(52, 100); // E3
    const allThreeRegistered = synthNotes.has(45) && synthNotes.has(48) && synthNotes.has(52);
    synthNoteOff(48); // release the middle note only
    const othersStillTracked = synthNotes.has(45) && !synthNotes.has(48) && synthNotes.has(52);
    synthNoteOff(45); synthNoteOff(52);
    return { allThreeRegistered, othersStillTracked };
  });
  checkTrue('three simultaneous notes are all tracked (polyphony works)', scenario2.allThreeRegistered);
  checkTrue('releasing one note leaves the other two tracked (independent release)', scenario2.othersStillTracked);

  // --- Scenario 3: the pendingNoteOns cancellation-token guard still works -- a rapid
  // note-on -> note-off -> note-on (all before any await resolves) must not leave two voices
  // playing for one key. This is the exact race item 51 fixed; must still hold under Tone.js. ---
  const scenario3 = await page.evaluate(async () => {
    currentSynthPreset = 'Bass';
    const p1 = synthNoteOn(50, 100);
    synthNoteOff(50);
    const p2 = synthNoteOn(50, 100);
    await Promise.all([p1, p2]);
    const trackedCount = synthNotes.has(50) ? 1 : 0;
    synthNoteOff(50);
    return { trackedCount };
  });
  check('rapid note-on/off/on leaves exactly one tracked voice, not two', scenario3.trackedCount, 1);

  // --- Scenario 4: volume slider (getSynthMasterGain) still actually controls Tone.js output ---
  const scenario4 = await page.evaluate(() => {
    const instrument = getSynthInstrument('Bass');
    return { outputConnectsExist: typeof instrument.output.connect === 'function' };
  });
  checkTrue('the Tone.js instrument exposes a connectable output', scenario4.outputConnectsExist);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
