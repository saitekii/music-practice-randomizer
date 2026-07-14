const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const NAT7  = ['C','D','E','F','G','A','B'];
  const ALL12 = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

  const data = await page.evaluate(([nat7, all12]) => {
    const byName = n => LEARNING_PATH.find(s => s.name === n);
    return {
      totalStages: LEARNING_PATH.length,
      phaseCount: LEARNING_PATH_PHASES.find(p => p.name === 'Extended chords').count,
      phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),

      sus7Nat: byName('Add 7sus4, Nat. Keys'),
      sus7NatIdx: LEARNING_PATH.findIndex(s => s.name === 'Add 7sus4, Nat. Keys'),
      meetSusIdx: LEARNING_PATH.findIndex(s => s.name === 'Meet Sus Chords'),
      susAllKeysIdx: LEARNING_PATH.findIndex(s => s.name === 'Sus + 7sus4, All Keys'),
      susAllKeys: byName('Sus + 7sus4, All Keys'),

      meetHalfDim: byName('Meet Half-Dim & Dim7'),
      halfDimAllKeys: byName('Half-Dim & Dim7, All Keys'),
      meetHalfDimIdx: LEARNING_PATH.findIndex(s => s.name === 'Meet Half-Dim & Dim7'),
      halfDimAllKeysIdx: LEARNING_PATH.findIndex(s => s.name === 'Half-Dim & Dim7, All Keys'),
      susAllKeysIdx2: LEARNING_PATH.findIndex(s => s.name === 'Sus + 7sus4, All Keys'),
      meetDom9Idx: LEARNING_PATH.findIndex(s => s.name === 'Meet Dominant 9'),

      ninthInv: byName('9th Chords, Inversions'),
      ninthInvIdx: LEARNING_PATH.findIndex(s => s.name === '9th Chords, Inversions'),
      addMaj9Min9Idx: LEARNING_PATH.findIndex(s => s.name === 'Add Major 9 & Minor 9'),
      ninthAllKeysIdx: LEARNING_PATH.findIndex(s => s.name === '9th Chords, All Keys'),
      ninthAllKeys: byName('9th Chords, All Keys'),
    };
  }, [NAT7, ALL12]);

  check('LEARNING_PATH has 142 stages', data.totalStages, 142);
  check('Extended chords phase count is 12', data.phaseCount, 12);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', data.phaseCountSum, data.totalStages);

  checkTrue('Add 7sus4, Nat. Keys exists', !!data.sus7Nat, null);
  check('Add 7sus4, Nat. Keys has all 7 natural notes', JSON.stringify(data.sus7Nat?.notes), JSON.stringify(NAT7));
  check('Add 7sus4, Nat. Keys has chord7sus4', (data.sus7Nat?.chords || []).includes('chord7sus4'), true);
  check('Add 7sus4, Nat. Keys has timer off', data.sus7Nat?.timer, 'off');
  check('Add 7sus4, Nat. Keys sits right after Meet Sus Chords', data.sus7NatIdx, data.meetSusIdx + 1);
  check('Sus + 7sus4, All Keys sits right after Add 7sus4, Nat. Keys', data.susAllKeysIdx, data.sus7NatIdx + 1);
  check('Sus + 7sus4, All Keys is unchanged (still all 12 notes)', JSON.stringify(data.susAllKeys?.notes), JSON.stringify(ALL12));

  checkTrue('Meet Half-Dim & Dim7 exists', !!data.meetHalfDim, null);
  check('Meet Half-Dim & Dim7 has all 7 natural notes', JSON.stringify(data.meetHalfDim?.notes), JSON.stringify(NAT7));
  check('Meet Half-Dim & Dim7 has timer off', data.meetHalfDim?.timer, 'off');
  check('Meet Half-Dim & Dim7 has chordHalfDim and chordDim7', (data.meetHalfDim?.chords || []).includes('chordHalfDim') && (data.meetHalfDim?.chords || []).includes('chordDim7'), true);
  checkTrue('Half-Dim & Dim7, All Keys exists', !!data.halfDimAllKeys, null);
  check('Half-Dim & Dim7, All Keys has all 12 notes', JSON.stringify(data.halfDimAllKeys?.notes), JSON.stringify(ALL12));
  check('Half-Dim & Dim7, All Keys has timer 10', data.halfDimAllKeys?.timer, '10');
  check('Half-Dim & Dim7, All Keys has same chord list as Meet Half-Dim & Dim7', JSON.stringify(data.halfDimAllKeys?.chords), JSON.stringify(data.meetHalfDim?.chords));
  check('Meet Half-Dim & Dim7 sits right after Sus + 7sus4, All Keys', data.meetHalfDimIdx, data.susAllKeysIdx2 + 1);
  check('Half-Dim & Dim7, All Keys sits right after Meet Half-Dim & Dim7', data.halfDimAllKeysIdx, data.meetHalfDimIdx + 1);
  check('Meet Dominant 9 sits right after Half-Dim & Dim7, All Keys', data.meetDom9Idx, data.halfDimAllKeysIdx + 1);

  checkTrue('9th Chords, Inversions exists', !!data.ninthInv, null);
  check('9th Chords, Inversions has all 7 natural notes', JSON.stringify(data.ninthInv?.notes), JSON.stringify(NAT7));
  check('9th Chords, Inversions has timer off', data.ninthInv?.timer, 'off');
  check('9th Chords, Inversions has inversions', (data.ninthInv?.chords || []).includes('inversions'), true);
  check('9th Chords, Inversions sits right after Add Major 9 & Minor 9', data.ninthInvIdx, data.addMaj9Min9Idx + 1);
  check('9th Chords, All Keys sits right after 9th Chords, Inversions', data.ninthAllKeysIdx, data.ninthInvIdx + 1);
  check('9th Chords, All Keys is unchanged (still all 12 notes)', JSON.stringify(data.ninthAllKeys?.notes), JSON.stringify(ALL12));
  check('9th Chords, All Keys still has inversions (unchanged content)', (data.ninthAllKeys?.chords || []).includes('inversions'), true);

  // applyStage() sanity check on one new stage
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Meet Half-Dim & Dim7');
    applyStage(idx);
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      c2Checked: document.querySelector('input[data-note="C#"]').checked,
      halfDimChecked: document.getElementById('chordHalfDim').checked,
      dim7Checked: document.getElementById('chordDim7').checked,
    };
  });
  check('applyStage() on Meet Half-Dim & Dim7 checks C', applyCheck.cChecked, true);
  check('applyStage() on Meet Half-Dim & Dim7 leaves C# unchecked (not all 12 keys)', applyCheck.c2Checked, false);
  check('applyStage() on Meet Half-Dim & Dim7 checks chordHalfDim', applyCheck.halfDimChecked, true);
  check('applyStage() on Meet Half-Dim & Dim7 checks chordDim7', applyCheck.dim7Checked, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
