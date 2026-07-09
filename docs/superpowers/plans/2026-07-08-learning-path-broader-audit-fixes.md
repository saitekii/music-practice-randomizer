# Learning Path Broader Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 6 missing-ramp findings from the Part 3 Learning Path audit by inserting 7 new stages across two phases (Scales beyond natural minor, Extended chords), each stage separating a "new content" step from a "key-range jump" step so no stage combines both at once.

**Architecture:** Pure data edits to the `LEARNING_PATH` array in `script.js`, plus updating the two affected phases' `count` fields in `LEARNING_PATH_PHASES`. No changes to `applyStage()`'s logic (only a documentation comment), `getStageMastery()`, or `renderStageList()` — all handle stage fields generically already.

**Tech Stack:** Vanilla JS, no build step. Testing via Playwright (`.cjs` scripts, run with `node`).

## Global Constraints

- No changes to any stage outside the two named phases (Scales beyond natural minor, Extended chords).
- Every new stage's `chords`/`scales` content must exactly match what the spec specifies — no extra content, no scope creep beyond the 6 named findings (in particular: do not "also fix" the pre-existing scales-mixing in `'9th Chords, All Keys'` or `'Add Half-Dim & Dim7'` beyond what's specified — only the inversions/key-jump combination is in scope for finding 5, and finding 6's split preserves the original stage's chord/scale content exactly).
- `LEARNING_PATH_PHASES` counts must be updated to match: Scales beyond natural minor 11 → 15, Extended chords 9 → 12. The sum of all `LEARNING_PATH_PHASES` counts must always equal `LEARNING_PATH.length`.
- Existing stages not touched by a specific finding must remain byte-for-byte unchanged.

---

### Task 1: Scales beyond natural minor — 3 ramp fixes (+4 stages)

**Files:**
- Modify: `script.js` (three separate insertions within the `'Scales beyond natural minor'` phase block, lines 240–250; the `LEARNING_PATH_PHASES` entry for that phase, line 320; a documentation comment near `applyStage()`'s interval fallback, lines 2789–2791)
- Test: `test-audit-fixes-scales-phase.cjs` (create, project root)

**Interfaces:**
- Consumes: `LEARNING_PATH` (existing array), `LEARNING_PATH_PHASES` (existing array from the Part 2 popup redesign — `{name, count}` per phase), `applyStage(idx)` (existing, unchanged logic).
- Produces: nothing new consumed by Task 2 — the two tasks touch disjoint stages and disjoint `LEARNING_PATH_PHASES` entries, and can be implemented and reviewed independently. `LEARNING_PATH.length` reaches **116** after this task (112 + 4); Task 2 takes it to 119.

- [ ] **Step 1: Write the failing test**

Create `test-audit-fixes-scales-phase.cjs` with this exact content:

```javascript
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

  check('LEARNING_PATH has 116 stages (112 + 4 new)', data.totalStages, 116);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-audit-fixes-scales-phase.cjs`

Expected: `RESULT: FAIL`. None of the 4 new stages exist yet, so `byName(...)` calls return `undefined` and the `checkTrue('... exists', ...)` lines fail, `totalStages` is `112` not `116`, and the phase count is `11` not `15`.

- [ ] **Step 3: Insert the Melodic Minor ramp fix**

In `script.js`, find this exact two-line block:

```javascript
  { name: 'Melodic Minor, Nat. Keys', hint: 'Melodic minor across the seven natural keys',                                                           cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMelMinor'],                        timer: 'off' },
  { name: 'Three Minors',             hint: 'Natural, harmonic and melodic minor — hear the difference between each in all 12 keys',                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleNatMinor','scaleHarmMinor','scaleMelMinor'], timer: '10' },
```

Replace it with:

```javascript
  { name: 'Melodic Minor, Nat. Keys', hint: 'Melodic minor across the seven natural keys',                                                           cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMelMinor'],                        timer: 'off' },
  { name: 'Melodic Minor, All 12',    hint: 'Every key — 10 seconds',                                                                                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleMelMinor'],                        timer: '10'  },
  { name: 'Three Minors',             hint: 'Natural, harmonic and melodic minor — hear the difference between each in all 12 keys',                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleNatMinor','scaleHarmMinor','scaleMelMinor'], timer: '10' },
```

- [ ] **Step 4: Insert the Major Pentatonic ramp fix**

Find this exact two-line block:

```javascript
  { name: 'Major Pentatonic — C',     hint: 'Five notes, no half steps — open and singable',                                                        cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleMajPent'],                         timer: 'off' },
  { name: 'Both Pentatonics, Nat.',   hint: 'Major and minor pentatonic — the backbone of blues and rock across natural keys',                       cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMajPent','scaleMinPent'],           timer: 'off' },
```

Replace it with:

```javascript
  { name: 'Major Pentatonic — C',     hint: 'Five notes, no half steps — open and singable',                                                        cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleMajPent'],                         timer: 'off' },
  { name: 'Major Pentatonic, Nat. Keys', hint: 'Major pentatonic across the seven natural keys',                                                     cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMajPent'],                         timer: 'off' },
  { name: 'Both Pentatonics, Nat.',   hint: 'Major and minor pentatonic — the backbone of blues and rock across natural keys',                       cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleMajPent','scaleMinPent'],           timer: 'off' },
```

- [ ] **Step 5: Insert the Modes ramp fix**

Find this exact two-line block:

```javascript
  { name: 'Meet the Modes',           hint: 'Seven modes of the major scale — Ionian through Locrian, each with its own flavour',                   cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleModes'],                           timer: 'off' },
  { name: 'All Scales, All Keys',     hint: 'Every scale type in every key — 10 seconds',                                                           cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'], timer: '10' },
```

Replace it with:

```javascript
  { name: 'Meet the Modes',           hint: 'Seven modes of the major scale — Ionian through Locrian, each with its own flavour',                   cats: ['catScales'],             notes: ['C'],                                                            chords: [],                                                                                                scales: ['scaleModes'],                           timer: 'off' },
  { name: 'Modes, Nat. Keys',         hint: 'All seven modes across the seven natural keys',                                                        cats: ['catScales'],             notes: ['C','D','E','F','G','A','B'],                                    chords: [],                                                                                                scales: ['scaleModes'],                           timer: 'off' },
  { name: 'Modes, All 12',            hint: 'Every key — 10 seconds',                                                                                cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleModes'],                           timer: '10'  },
  { name: 'All Scales, All Keys',     hint: 'Every scale type in every key — 10 seconds',                                                           cats: ['catScales'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: [],                                                                                                scales: ['scaleMajor','scaleNatMinor','scaleHarmMinor','scaleMelMinor','scaleMajPent','scaleMinPent','scaleModes'], timer: '10' },
```

- [ ] **Step 6: Update the phase count in `LEARNING_PATH_PHASES`**

Find this exact line:

```javascript
  { name: 'Scales beyond natural minor', count: 11 },
```

Replace it with:

```javascript
  { name: 'Scales beyond natural minor', count: 15 },
```

- [ ] **Step 7: Add the guarding comment for the dormant `intervals`/`intDirs` fallback**

Find this exact two-line block:

```javascript
  const stageInts    = stage.intervals ?? (onCats.has('catIntervals') ? INTERVALS.map(i => i.id) : []);
  INTERVALS.forEach(i => { const el = document.getElementById(i.id); if (el) el.checked = stageInts.includes(i.id); });
  const stageIntDirs = stage.intDirs ?? (onCats.has('catIntervals') ? ['up'] : []);
```

Replace it with:

```javascript
  // Like the (now-fixed) progressions fallback: a catIntervals stage with no explicit
  // intervals/intDirs field silently enables ALL intervals. Every current interval-phase
  // stage sets both fields explicitly — keep doing so for any new one.
  const stageInts    = stage.intervals ?? (onCats.has('catIntervals') ? INTERVALS.map(i => i.id) : []);
  INTERVALS.forEach(i => { const el = document.getElementById(i.id); if (el) el.checked = stageInts.includes(i.id); });
  const stageIntDirs = stage.intDirs ?? (onCats.has('catIntervals') ? ['up'] : []);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `node test-audit-fixes-scales-phase.cjs`

Expected: every line `PASS`, ending with `RESULT: PASS`.

- [ ] **Step 9: Run existing regression tests touching `LEARNING_PATH`**

```bash
node test-progression-curriculum-fix.cjs
node test-all-paths-popup-redesign.cjs
```

Both must print `RESULT: PASS` — neither should be affected by this task (they don't reference the Scales beyond natural minor phase by name or index), but they do assert `LEARNING_PATH_PHASES` shape/behavior generically, so it's worth confirming nothing broke.

- [ ] **Step 10: Commit**

```bash
git add script.js test-audit-fixes-scales-phase.cjs
git commit -m "$(cat <<'EOF'
Fix 3 missing ramps in the Scales beyond natural minor phase

Melodic Minor, Major Pentatonic, and Modes each jumped straight from
a narrow key range to a wider one while simultaneously introducing
new scale-type combinations. Inserted 4 stages that separate "learn
this scale type" from "now play it in more keys," matching the ramp
shape every other scale type in this phase already had.
EOF
)"
```

---

### Task 2: Extended chords — 3 ramp fixes (+3 stages)

**Files:**
- Modify: `script.js` (three separate edits within the `'Extended chords'` phase block, lines 256–261 in the pre-Task-1 file — re-read the file to find current line numbers before editing, since Task 1 shifted everything after line 250 down by 4 lines; the `LEARNING_PATH_PHASES` entry for that phase)
- Test: `test-audit-fixes-extended-chords-phase.cjs` (create, project root)

**Interfaces:**
- Consumes: `LEARNING_PATH`, `LEARNING_PATH_PHASES`, `applyStage(idx)` — same as Task 1, all pre-existing and unchanged by this task's logic.
- Produces: `LEARNING_PATH.length` reaches **119** after this task (116 + 3, assuming Task 1 already landed).

- [ ] **Step 1: Write the failing test**

Create `test-audit-fixes-extended-chords-phase.cjs` with this exact content:

```javascript
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

  check('LEARNING_PATH has 119 stages (116 + 3 new)', data.totalStages, 119);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-audit-fixes-extended-chords-phase.cjs`

Expected: `RESULT: FAIL` — none of the 3 new/renamed stages exist yet (`'Add Half-Dim & Dim7'` is still the original single stage, not yet split), so `totalStages` is `116` (assuming Task 1 already landed) not `119`, and the phase count is `9` not `12`.

- [ ] **Step 3: Insert the Sus chords ramp fix**

First, re-read `script.js` to find the current line numbers for the `'Extended chords'` phase (Task 1 shifted everything after line 250 down by 4 lines, so this block now starts around line 259 instead of 255). Find this exact two-line block (unique text, so exact line numbers don't matter for the match):

```javascript
  { name: 'Meet Sus Chords',          hint: 'Sus2 and sus4 replace the 3rd — open and unresolved, wanting to move',                                 cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordSus2','chordSus4'],                                                scales: [],                                       timer: 'off' },
  { name: 'Sus + 7sus4, All Keys',    hint: '7sus4 adds the flat 7 — common in funk and jazz, all 12 keys',                                         cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordSus2','chordSus4','chord7sus4'],                                   scales: [],                                       timer: '10'  },
```

Replace it with:

```javascript
  { name: 'Meet Sus Chords',          hint: 'Sus2 and sus4 replace the 3rd — open and unresolved, wanting to move',                                 cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordSus2','chordSus4'],                                                scales: [],                                       timer: 'off' },
  { name: 'Add 7sus4, Nat. Keys',     hint: '7sus4 adds the flat 7 — common in funk and jazz, natural keys first',                                  cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordSus2','chordSus4','chord7sus4'],                                   scales: [],                                       timer: 'off' },
  { name: 'Sus + 7sus4, All Keys',    hint: '7sus4 adds the flat 7 — common in funk and jazz, all 12 keys',                                         cats: ['catChords'],             notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordSus2','chordSus4','chord7sus4'],                                   scales: [],                                       timer: '10'  },
```

- [ ] **Step 4: Split the Half-Dim & Dim7 stage**

Find this exact one-line block:

```javascript
  { name: 'Add Half-Dim & Dim7',      hint: 'Half-diminished (m7♭5) lives in jazz; fully diminished (dim7) in classical and horror — all 12 keys', cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

Replace it with:

```javascript
  { name: 'Meet Half-Dim & Dim7',     hint: 'Half-diminished (m7♭5) lives in jazz; fully diminished (dim7) in classical and horror',              cats: ['catChords','catScales'], notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: 'off' },
  { name: 'Half-Dim & Dim7, All Keys',hint: 'Same chords — all 12 keys, 10 seconds',                                                              cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordHalfDim','chordDim7','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

- [ ] **Step 5: Insert the 9th chords ramp fix**

Find this exact two-line block:

```javascript
  { name: 'Add Major 9 & Minor 9',    hint: 'Three flavours of 9th chord — dominant, major, and minor',                                             cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9'],scales: [],                                       timer: 'off' },
  { name: '9th Chords, All Keys',     hint: 'All three 9th chord types in every key — 10 seconds',                                                  cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

Replace it with:

```javascript
  { name: 'Add Major 9 & Minor 9',    hint: 'Three flavours of 9th chord — dominant, major, and minor',                                             cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9'],scales: [],                                       timer: 'off' },
  { name: '9th Chords, Inversions',   hint: 'Same 9th chords — now with inversions, natural keys first',                                            cats: ['catChords'],             notes: ['C','D','E','F','G','A','B'],                                    chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9','inversions'],scales: [],                                       timer: 'off' },
  { name: '9th Chords, All Keys',     hint: 'All three 9th chord types in every key — 10 seconds',                                                  cats: ['catChords','catScales'], notes: ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'],           chords: ['chordMajor','chordMinor','chordMaj7','chordMin7','chordDom7','chordDom9','chordMaj9','chordMin9','inversions'], scales: ['scaleMajor','scaleNatMinor'], timer: '10' },
```

- [ ] **Step 6: Update the phase count in `LEARNING_PATH_PHASES`**

Find this exact line:

```javascript
  { name: 'Extended chords', count: 9 },
```

Replace it with:

```javascript
  { name: 'Extended chords', count: 12 },
```

- [ ] **Step 7: Run test to verify it passes**

Run: `node test-audit-fixes-extended-chords-phase.cjs`

Expected: every line `PASS`, ending with `RESULT: PASS`.

- [ ] **Step 8: Run the Task 1 test and other existing regression tests**

```bash
node test-audit-fixes-scales-phase.cjs
node test-progression-curriculum-fix.cjs
node test-all-paths-popup-redesign.cjs
```

All three must print `RESULT: PASS` — this task's edits are in a disjoint phase from Task 1's, but re-confirm nothing broke.

- [ ] **Step 9: Commit**

```bash
git add script.js test-audit-fixes-extended-chords-phase.cjs
git commit -m "$(cat <<'EOF'
Fix 3 missing ramps in the Extended chords phase

Sus chords, 9th chords, and Half-Dim/Dim7 each combined introducing
new chord content with a jump to all 12 keys in a single stage.
Inserted 3 stages (one a natural-keys split of the Half-Dim/Dim7
debut) that separate "learn this chord type" from "now play it in
more keys," matching the ramp shape used elsewhere in the path.
EOF
)"
```
