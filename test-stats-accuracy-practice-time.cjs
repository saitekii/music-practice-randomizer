const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const directLog = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    updateDailyLog(1000, false, true);  // first-try correct, 1s
    updateDailyLog(2000, false, false); // wrong note played first, 2s
    updateDailyLog(500, false, true);   // first-try correct, 0.5s
    const log = JSON.parse(localStorage.getItem('mpr_daily'));
    return log[log.length - 1]; // today's entry
  });
  check('answers accumulated', directLog.answers, 3);
  check('totalMs sums all three response times', directLog.totalMs, 3500);
  check('firstTryCount counts only the two first-try-correct answers', directLog.firstTryCount, 2);

  const earUnaffected = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    updateDailyLog(1000, true); // ear-training answer -- isEar=true, firstTryCorrect defaults to false
    const log = JSON.parse(localStorage.getItem('mpr_daily'));
    const entry = log[log.length - 1];
    return {
      hasTotalMs: 'totalMs' in entry,
      hasFirstTryCount: 'firstTryCount' in entry,
      earAnswers: entry.earAnswers,
    };
  });
  check('ear-training answers do not get totalMs', earUnaffected.hasTotalMs, false);
  check('ear-training answers do not get firstTryCount', earUnaffected.hasFirstTryCount, false);
  check('ear-training answers still increment earAnswers as before', earUnaffected.earAnswers, 1);

  const behavior = await page.evaluate(() => {
    localStorage.removeItem('mpr_daily');
    midiEnabled = true;
    const results = {};

    // Prompt 1: play a wrong note, then correct it -- should log as NOT first-try.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
    promptHadWrongNote = false;
    midiSuccessActive = false;
    heldNotes = new Set([61]); // C#4 -- wrong note for C Major
    updateKeyboard(); // this is what should flip promptHadWrongNote to true
    heldNotes = new Set([60, 64, 67]); // now the correct C E G
    updateKeyboard();
    checkMidi();
    const log1 = JSON.parse(localStorage.getItem('mpr_daily'));
    results.wrongNoteFirstLogsAsNotFirstTry = log1[log1.length - 1].firstTryCount;

    // Prompt 2 (new prompt -- flag must reset): play the correct notes immediately.
    currentPromptKey = 'chord|D|Major|';
    promptStartTime = Date.now();
    promptHadWrongNote = false; // showPrompt()/advanceToNextPrompt() do this in the real flow
    midiSuccessActive = false;
    heldNotes = new Set([62, 66, 69]); // D F# A -- correct D Major, no mistakes
    updateKeyboard();
    checkMidi();
    const log2 = JSON.parse(localStorage.getItem('mpr_daily'));
    results.cleanFirstTryLogsAsFirstTry = log2[log2.length - 1].firstTryCount;

    return results;
  });
  check('a wrong note played before the correct answer is NOT counted as first-try', behavior.wrongNoteFirstLogsAsNotFirstTry, 1);
  check('a clean first-try answer brings the running firstTryCount to 2', behavior.cleanFirstTryLogsAsFirstTry, 2);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
