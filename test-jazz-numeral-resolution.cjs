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

  // Every distinct numeral token the 31-entry jazz batch uses, resolved in C major, sorted
  // pitch classes compared against hand-computed expected values.
  const result = await page.evaluate(() => {
    const pcs = (numeralToken) => {
      const key = `func|C|Major|${numeralToken}|0`;
      const r = getExpectedPCs(key);
      return r ? [...r.pcs].sort((a, b) => a - b) : null;
    };
    return {
      Imaj7:      pcs('Imaj7'),       // C maj7: C E G B
      iii7:       pcs('iii7'),        // E m7: E G B D
      V7:         pcs('V7'),          // G7: G B D F
      VI7:        pcs('VI7'),         // A7 (raised-VI root + dominant7): A C# E G
      iv7:        pcs('iv7'),         // borrowed iv m7: F Ab C Eb
      V13:        pcs('V13'),         // G13: G B D F A E
      ii9:        pcs('ii9'),         // D m9: D F A C E
      vi11:       pcs('vi11'),        // A m11: A C E G B D
      Imaj9:      pcs('Imaj9'),       // C maj9: C E G B D
      V13sharp11: pcs('V13♯11'),      // G13#11: G B D F A C# E (dominant 13 sharp-11)
      flatII7:    pcs('♭II7'),        // Db7: Db F Ab Cb(=B)
      III7:       pcs('III7'),        // E7 (raised-III root + dominant7): E G# B D
      maj7sharp11:pcs('Imaj7♯11'),    // Cmaj7#11: C E G B F#
      halfDim:    pcs('viiø7'),       // B half-dim7: B D F A
      sharpIVdim7:pcs('♯IV°7'),       // F# dim7: F# A C Eb
      // Regression: existing bare-numeral fast path completely untouched
      regressionI:  pcs('I'),         // C major triad: C E G
      regressionVii:pcs('vii°'),      // B diminished triad: B D F
      unknown:      pcs('ZZZmaj7'),   // not a real numeral at all -- must still return null
    };
  });

  check('Imaj7 -> C maj7', result.Imaj7, [0, 4, 7, 11]);
  check('iii7 -> E m7', result.iii7, [2, 4, 7, 11]);
  check('V7 -> G7', result.V7, [2, 5, 7, 11]);
  check('VI7 -> A7 (raised-VI root)', result.VI7, [1, 4, 7, 9]);
  check('iv7 -> borrowed iv m7', result.iv7, [0, 3, 5, 8]);
  check('V13 -> G13', result.V13, [2, 4, 5, 7, 9, 11]);
  check('ii9 -> D m9', result.ii9, [0, 2, 4, 5, 9]);
  check('vi11 -> A m11', result.vi11, [0, 2, 4, 7, 9, 11]);
  check('Imaj9 -> C maj9', result.Imaj9, [0, 2, 4, 7, 11]);
  check('V13♯11 -> G13#11', result.V13sharp11, [1, 2, 4, 5, 7, 9, 11]);
  check('♭II7 -> Db7', result.flatII7, [1, 5, 8, 11]);
  check('III7 -> E7 (raised-III root)', result.III7, [2, 4, 8, 11]);
  check('Imaj7♯11 -> Cmaj7#11', result.maj7sharp11, [0, 4, 6, 7, 11]);
  check('viiø7 -> B half-diminished7', result.halfDim, [2, 5, 9, 11]);
  check('♯IV°7 -> F# diminished7', result.sharpIVdim7, [0, 3, 6, 9]);
  check('regression: bare "I" still resolves via the fast path', result.regressionI, [0, 4, 7]);
  check('regression: bare "vii°" still resolves via the fast path', result.regressionVii, [2, 5, 11]);
  check('an unresolvable token returns null, not a crash', result.unknown, null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
