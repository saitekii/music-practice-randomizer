const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createReporter, launchApp } = require('./test-helpers.cjs');

(async () => {
  const { browser, page } = await launchApp();
  const { check, checkTrue, finish } = createReporter();

  // --- launchApp() successfully loads the real app ---
  const hasKeyboard = await page.evaluate(() => !!document.getElementById('pianoKeyboard'));
  checkTrue('launchApp() loads the real app (pianoKeyboard element exists)', hasKeyboard, null);

  // --- launchApp() pre-seeds mpr_settings by default ---
  const seededSettings = await page.evaluate(() => localStorage.getItem('mpr_settings'));
  check('launchApp() pre-seeds mpr_settings by default', seededSettings, '{}');

  await browser.close();

  // --- launchApp({ seedSettings: false }) does NOT pre-seed ---
  const { browser: browser2, page: page2 } = await launchApp({ seedSettings: false });
  const unseededSettings = await page2.evaluate(() => localStorage.getItem('mpr_settings'));
  check('launchApp({ seedSettings: false }) does not pre-seed mpr_settings', unseededSettings, null);
  await browser2.close();

  // --- createReporter()'s check()/checkTrue() report PASS/FAIL and JSON.stringify-compare correctly ---
  const inner = createReporter();
  const originalLog = console.log;
  const capturedLines = [];
  console.log = (line) => capturedLines.push(line);
  inner.check('array equality via JSON.stringify', [1, 2, 3], [1, 2, 3]);
  inner.check('array inequality', [1, 2], [1, 2, 3]);
  inner.checkTrue('true condition', true, null);
  inner.checkTrue('false condition', false, null);
  console.log = originalLog;

  checkTrue('check() reports PASS for deep-equal arrays', capturedLines[0].startsWith('PASS'), capturedLines[0]);
  checkTrue('check() reports FAIL for unequal arrays', capturedLines[1].startsWith('FAIL'), capturedLines[1]);
  checkTrue('checkTrue() reports PASS for true', capturedLines[2].startsWith('PASS'), capturedLines[2]);
  checkTrue('checkTrue() reports FAIL for false', capturedLines[3].startsWith('FAIL'), capturedLines[3]);

  // --- finish() exits 0 when all checks passed, 1 when any failed ---
  // (tested via spawned child fixtures, since finish() calls process.exit() and would kill
  // this test process itself if called in-process with a failing reporter)
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpr-test-helpers-'));
  const helpersPath = path.resolve(__dirname, 'test-helpers.cjs');

  fs.writeFileSync(path.join(fixtureDir, 'passing.cjs'), `
    const { createReporter } = require(${JSON.stringify(helpersPath)});
    const { check, finish } = createReporter();
    check('always true', 1, 1);
    finish();
  `);
  fs.writeFileSync(path.join(fixtureDir, 'failing.cjs'), `
    const { createReporter } = require(${JSON.stringify(helpersPath)});
    const { check, finish } = createReporter();
    check('deliberately false', 1, 2);
    finish();
  `);

  const passResult = spawnSync('node', [path.join(fixtureDir, 'passing.cjs')], { encoding: 'utf8' });
  check('finish() exits 0 when all checks passed', passResult.status, 0);
  checkTrue('finish() prints RESULT: PASS on success', passResult.stdout.includes('RESULT: PASS'), passResult.stdout);

  const failResult = spawnSync('node', [path.join(fixtureDir, 'failing.cjs')], { encoding: 'utf8' });
  check('finish() exits 1 when a check failed', failResult.status, 1);
  checkTrue('finish() prints RESULT: FAIL on failure', failResult.stdout.includes('RESULT: FAIL'), failResult.stdout);

  fs.rmSync(fixtureDir, { recursive: true, force: true });

  finish();
})();
