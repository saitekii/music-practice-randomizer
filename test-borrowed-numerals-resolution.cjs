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

  const result = await page.evaluate(() => {
    const pcs = (key) => {
      const r = getExpectedPCs(key);
      return r ? [...r.pcs].sort((a, b) => a - b) : null;
    };
    return {
      flatVII:     pcs('func|C|Major|♭VII|0'),
      flatIII:     pcs('func|C|Major|♭III|0'),
      flatVI:      pcs('func|C|Major|♭VI|0'),
      flatII:      pcs('func|C|Major|♭II|0'),
      borrowedIv:  pcs('func|C|Major|iv|0'),
      raisedII:    pcs('func|C|Major|II|0'),
      raisedIII:   pcs('func|C|Major|III|0'),
      raisedVI:    pcs('func|C|Major|VI|0'),
      minorFlatII: pcs('func|C|minor|♭II|0'),
      majorII:     pcs('func|C|Major|ii|0'),
      majorVii:    pcs('func|C|Major|vii°|0'),
      minorIII:    pcs('func|C|minor|III|0'),
      minorVhack:  pcs('func|C|minor|V|0'),
      unknown:     pcs('func|C|Major|ZZZ|0'),
    };
  });

  check('♭VII in C major resolves to Bb major',                result.flatVII,     [2, 5, 10]);
  check('♭III in C major resolves to Eb major',                result.flatIII,     [3, 7, 10]);
  check('♭VI in C major resolves to Ab major',                 result.flatVI,      [0, 3, 8]);
  check('♭II in C major resolves to Db major',                 result.flatII,      [1, 5, 8]);
  check('borrowed iv in C major resolves to F minor',          result.borrowedIv,  [0, 5, 8]);
  check('raised II in C major resolves to D major',            result.raisedII,    [2, 6, 9]);
  check('raised III in C major resolves to E major',           result.raisedIII,   [4, 8, 11]);
  check('raised VI in C major resolves to A major',            result.raisedVI,    [1, 4, 9]);
  check('♭II in C minor resolves to Db major (Neapolitan)',    result.minorFlatII, [1, 5, 8]);
  check('regression: ii in C major still resolves to D minor', result.majorII,     [2, 5, 9]);
  check('regression: vii° in C major still resolves to B dim', result.majorVii,    [2, 5, 11]);
  check('regression: III in C minor still resolves to Eb major', result.minorIII,  [3, 7, 10]);
  check('regression: V-in-minor hack still resolves to G major', result.minorVhack, [2, 7, 11]);
  check('unknown numeral returns null',                         result.unknown,    null);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
