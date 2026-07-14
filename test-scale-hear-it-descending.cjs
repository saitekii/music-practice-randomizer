const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // Record every note the demo actually plays, by wrapping synthNoteOn for the duration of
  // one playPromptKey() call.
  const notesPlayed = await page.evaluate(async () => {
    const seen = [];
    const original = synthNoteOn;
    synthNoteOn = async (n, v) => { seen.push(n); return original(n, v); };
    await playPromptKey('scale|C|Major', null);
    synthNoteOn = original;
    return seen;
  });
  check('Hear It plays the full up-and-down run (15 notes)', notesPlayed.length, 15);
  check('demo starts on the root', notesPlayed[0], 60);
  check('demo reaches the octave at the turnaround', notesPlayed[7], 72);
  check('demo ends back on the root', notesPlayed[notesPlayed.length - 1], 60);
  check('descending half mirrors the ascending half around the turnaround',
    notesPlayed.slice(8), [...notesPlayed.slice(0, 7)].reverse());

  // The Ear Training scale quiz reuses playPromptKey() with the same 'scale|root|type' key
  // shape (see genEarScale()'s playKey) -- confirm it isn't broken by this change.
  const earQuizNotes = await page.evaluate(async () => {
    const seen = [];
    const original = synthNoteOn;
    synthNoteOn = async (n, v) => { seen.push(n); return original(n, v); };
    await playPromptKey('scale|D|Natural minor', null);
    synthNoteOn = original;
    return seen.length;
  });
  check('Ear Training scale-quiz playback (D Natural minor) also plays the full run', earQuizNotes, 15);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
