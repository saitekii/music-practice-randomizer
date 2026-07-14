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
      phaseCount: LEARNING_PATH_PHASES.find(p => p.name === 'Scales beyond natural minor').count,
      phaseCountSum: LEARNING_PATH_PHASES.reduce((s, p) => s + p.count, 0),

      melodicAll12: byName('Melodic Minor, All 12'),
      melodicAll12Idx: LEARNING_PATH.findIndex(s => s.name === 'Melodic Minor, All 12'),
      melodicNatIdx: LEARNING_PATH.findIndex(s => s.name === 'Melodic Minor, Nat. Keys'),
      threeMinorsIdx: LEARNING_PATH.findIndex(s => s.name === 'Three Minors'),

      majPentNat: byName('Major Pentatonic, Nat. Keys'),
      majPentNatIdx: LEARNING_PATH.findIndex(s => s.name === 'Major Pentatonic, Nat. Keys'),
      majPentCIdx: LEARNING_PATH.findIndex(s => s.name === 'Major Pentatonic — C'),
      bothPentIdx: LEARNING_PATH.findIndex(s => s.name === 'Both Pentatonics, Nat.'),

      modesNat: byName('Modes, Nat. Keys'),
      modesAll12: byName('Modes, All 12'),
      modesNatIdx: LEARNING_PATH.findIndex(s => s.name === 'Modes, Nat. Keys'),
      modesAll12Idx: LEARNING_PATH.findIndex(s => s.name === 'Modes, All 12'),
      meetModesIdx: LEARNING_PATH.findIndex(s => s.name === 'Meet the Modes'),
      allScalesIdx: LEARNING_PATH.findIndex(s => s.name === 'All Scales, All Keys'),

      // Unaffected stages must be untouched
      harmonicAll12: byName('Harmonic Minor, All 12'),
    };
  }, [NAT7, ALL12]);

  check('LEARNING_PATH has the expected 145 stages', data.totalStages, 145);
  check('Scales beyond natural minor phase count is 15', data.phaseCount, 15);
  check('LEARNING_PATH_PHASES counts sum to LEARNING_PATH.length', data.phaseCountSum, data.totalStages);

  checkTrue('Melodic Minor, All 12 exists', !!data.melodicAll12, null);
  check('Melodic Minor, All 12 has all 12 notes', JSON.stringify(data.melodicAll12?.notes), JSON.stringify(ALL12));
  check('Melodic Minor, All 12 has only scaleMelMinor', JSON.stringify(data.melodicAll12?.scales), JSON.stringify(['scaleMelMinor']));
  check('Melodic Minor, All 12 has timer 10', data.melodicAll12?.timer, '10');
  check('Melodic Minor, All 12 sits right after Melodic Minor, Nat. Keys', data.melodicAll12Idx, data.melodicNatIdx + 1);
  check('Three Minors sits right after Melodic Minor, All 12', data.threeMinorsIdx, data.melodicAll12Idx + 1);

  checkTrue('Major Pentatonic, Nat. Keys exists', !!data.majPentNat, null);
  check('Major Pentatonic, Nat. Keys has all 7 natural notes', JSON.stringify(data.majPentNat?.notes), JSON.stringify(NAT7));
  check('Major Pentatonic, Nat. Keys has only scaleMajPent', JSON.stringify(data.majPentNat?.scales), JSON.stringify(['scaleMajPent']));
  check('Major Pentatonic, Nat. Keys has timer off', data.majPentNat?.timer, 'off');
  check('Major Pentatonic, Nat. Keys sits right after Major Pentatonic — C', data.majPentNatIdx, data.majPentCIdx + 1);
  check('Both Pentatonics, Nat. sits right after Major Pentatonic, Nat. Keys', data.bothPentIdx, data.majPentNatIdx + 1);

  checkTrue('Modes, Nat. Keys exists', !!data.modesNat, null);
  check('Modes, Nat. Keys has all 7 natural notes', JSON.stringify(data.modesNat?.notes), JSON.stringify(NAT7));
  check('Modes, Nat. Keys has only scaleModes', JSON.stringify(data.modesNat?.scales), JSON.stringify(['scaleModes']));
  check('Modes, Nat. Keys has timer off', data.modesNat?.timer, 'off');
  checkTrue('Modes, All 12 exists', !!data.modesAll12, null);
  check('Modes, All 12 has all 12 notes', JSON.stringify(data.modesAll12?.notes), JSON.stringify(ALL12));
  check('Modes, All 12 has only scaleModes', JSON.stringify(data.modesAll12?.scales), JSON.stringify(['scaleModes']));
  check('Modes, All 12 has timer 10', data.modesAll12?.timer, '10');
  check('Modes, Nat. Keys sits right after Meet the Modes', data.modesNatIdx, data.meetModesIdx + 1);
  check('Modes, All 12 sits right after Modes, Nat. Keys', data.modesAll12Idx, data.modesNatIdx + 1);
  check('All Scales, All Keys sits right after Modes, All 12', data.allScalesIdx, data.modesAll12Idx + 1);

  check('Harmonic Minor, All 12 is unchanged (timer)', data.harmonicAll12?.timer, '10');
  check('Harmonic Minor, All 12 is unchanged (scales)', JSON.stringify(data.harmonicAll12?.scales), JSON.stringify(['scaleHarmMinor']));

  // applyStage() sanity check on one new stage
  const applyCheck = await page.evaluate(() => {
    const idx = LEARNING_PATH.findIndex(s => s.name === 'Modes, Nat. Keys');
    applyStage(idx);
    return {
      cChecked: document.querySelector('input[data-note="C"]').checked,
      gChecked: document.querySelector('input[data-note="G"]').checked,
      c2Checked: document.querySelector('input[data-note="C#"]').checked,
      modesChecked: document.getElementById('scaleModes').checked,
      majorUnchecked: document.getElementById('scaleMajor').checked,
    };
  });
  check('applyStage() on Modes, Nat. Keys checks C', applyCheck.cChecked, true);
  check('applyStage() on Modes, Nat. Keys checks G', applyCheck.gChecked, true);
  check('applyStage() on Modes, Nat. Keys leaves C# unchecked (not all 12 keys)', applyCheck.c2Checked, false);
  check('applyStage() on Modes, Nat. Keys checks scaleModes', applyCheck.modesChecked, true);
  check('applyStage() on Modes, Nat. Keys leaves scaleMajor unchecked', applyCheck.majorUnchecked, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
