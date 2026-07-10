const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // offline: true proves this is genuinely vendored, not just a CDN happening to respond fast.
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
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

  const result = await page.evaluate(() => {
    if (typeof Tonal === 'undefined') return { loaded: false };
    const c1 = Tonal.Chord.getChord('maj7', 'C');
    const c2 = Tonal.Chord.getChord('m7b5', 'F#');
    return {
      loaded: true,
      c1notes: c1.notes,
      c2chromas: c2.notes.map(n => Tonal.Note.chroma(n)),
    };
  });
  checkTrue('Tonal is loaded from the vendored local file with network fully disabled', result.loaded, null);
  check('Tonal.Chord.getChord resolves Cmaj7 correctly', result.c1notes, ['C', 'E', 'G', 'B']);
  check('Tonal.Note.chroma correctly converts F# half-diminished notes to pitch classes', result.c2chromas, [6, 9, 0, 4]);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
