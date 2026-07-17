# Synth Preset Rebuild on Tone.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all 10 hand-rolled Web Audio synth presets with presets built on Tone.js, fixing `Pluck`'s known feedback-gain instability outright and making future presets cheap to add.

**Architecture:** Vendor `tone.min.js` locally (this project's second dependency, after vendored `tonal.min.js`). Replace `SYNTH_PRESETS`'s hand-rolled `build(ctx, freq, vel, dest)` functions with factories that construct `Tone.PolySynth`-wrapped instruments. Rewrite `synthNoteOn`/`synthNoteOff` to call `triggerAttack`/`triggerRelease` instead of manually scheduling gain ramps, while preserving every existing outer guarantee unchanged: the `pendingNoteOns` cancellation-token race guard, `getSynthMasterGain()` volume routing, and the sustain-pedal mechanism. Tone.js is pointed at the app's own existing `AudioContext` via `Tone.setContext()` rather than using Tone.js's own separate gesture-gated startup, so there remains exactly one context and one resume path in the whole app.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Tone.js 15.1.22 (vendored), Playwright for testing.

## Global Constraints

- `tone.min.js` must be byte-identical to the file at `https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js`, verified against SHA-256 `e290952fa43d9a7a780182a83c6fccf44d79cb7ae2cba102ef1f2b9d98124e22` (already cross-checked byte-identical against `https://unpkg.com/tone@15.1.22/build/Tone.js` independently — either source is fine, the hash is the actual gate). No CDN loading at runtime — vendored file only, loaded via a plain `<script>` tag before `script.js`, exactly like `tonal.min.js`.
- Every preset instrument must be wrapped in `Tone.PolySynth(...)` — this app plays full chords (multiple simultaneous notes), and Tone.js's individual instrument classes are monophonic on their own.
- The `pendingNoteOns` Map cancellation-token guard in `synthNoteOn` (the fix from [[feature-history]] item 51 / the stuck-MIDI-notes bug) must be preserved exactly as-is around the new Tone.js internals — do not remove or restructure it.
- Tone.js must be pointed at the app's existing `AudioContext` via `Tone.setContext(getAudioCtx())`, called lazily exactly once, the first time a Tone.js instrument is actually needed — not at module load time (mirrors this file's existing lazy-init pattern used by `getAudioCtx()`/`getClickGain()`/`getSynthMasterGain()`). Tone.js's own `Tone.start()` gesture-gating flow must NOT be used — the app's existing `ctx.resume()` inside `synthNoteOn` remains the only resume path.
- `getSynthMasterGain()` (the existing native `GainNode` the volume slider controls) is unchanged and must remain the single point every preset's audio output connects into.
- Band Mode's kick/snare/hihat/bass/comp sounds are a fully separate code path (verified: nothing in Band Mode references `SYNTH_PRESETS`, `currentSynthPreset`, or `synthNoteOn`) — do not touch Band Mode code in this plan.
- The 10 preset names (`Rhodes`, `Piano`, `Organ`, `Pad`, `Strings`, `Vibraphone`, `Marimba`, `Bell`, `Pluck`, `Bass`) and their dropdown order in `index.html`'s `#synthPreset` select are unchanged — only what happens internally per preset changes.

---

### Task 1: Vendor `tone.min.js`

**Files:**
- Create: `tone.min.js` (repo root)
- Modify: `index.html` (add `<script>` tag)

**Interfaces:**
- Produces: a global `Tone` object (`window.Tone`), available to `script.js` after this script tag loads — same pattern as the existing global `Tonal` object from `tonal.min.js`.

- [ ] **Step 1: Download and verify the file**

```bash
curl -s --max-time 30 "https://cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js" -o tone.min.js
sha256sum tone.min.js
```

Expected hash: `e290952fa43d9a7a780182a83c6fccf44d79cb7ae2cba102ef1f2b9d98124e22`

If the hash does not match, STOP and report — do not proceed with a file that doesn't match the pinned hash. (If `cdn.jsdelivr.net` is unreachable, `https://unpkg.com/tone@15.1.22/build/Tone.js` serves byte-identical content, already independently verified during planning.)

- [ ] **Step 2: Add the script tag**

In `index.html`, find:

```html
  <script src="tonal.min.js"></script>
  <script src="script.js"></script>
```

Change to:

```html
  <script src="tonal.min.js"></script>
  <script src="tone.min.js"></script>
  <script src="script.js"></script>
```

(`tone.min.js` must load before `script.js`, same as `tonal.min.js` — `script.js` will reference the global `Tone` object.)

- [ ] **Step 3: Verify it loads with no errors**

Create `test-tonejs-vendored.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const result = await page.evaluate(() => ({
    toneExists: typeof Tone !== 'undefined',
    hasPolySynth: typeof Tone?.PolySynth === 'function',
    hasFMSynth: typeof Tone?.FMSynth === 'function',
    hasSetContext: typeof Tone?.setContext === 'function',
  }));

  check('Tone global exists', result.toneExists, true);
  check('Tone.PolySynth is a constructor', result.hasPolySynth, true);
  check('Tone.FMSynth is a constructor', result.hasFMSynth, true);
  check('Tone.setContext is a function', result.hasSetContext, true);
  check('no page errors during load', errors.length, 0);
  if (errors.length) console.log('Errors:', errors);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

Run: `node test-tonejs-vendored.cjs`
Expected: `RESULT: PASS`

- [ ] **Step 4: Commit**

```bash
git add tone.min.js index.html test-tonejs-vendored.cjs
git commit -m "Vendor Tone.js 15.1.22 for the synth preset rebuild"
```

---

### Task 2: Rewrite the core note-triggering path, proven with the Bass preset

**Files:**
- Modify: `script.js` (`SYNTH_PRESETS`, `synthNoteOn`, `synthNoteOff`, and the area near `getAudioCtx`/`getSynthMasterGain`)
- Create: `test-tonejs-core-rewrite.cjs`

**Interfaces:**
- Consumes: `Tone` global (Task 1), `getAudioCtx()`, `getSynthMasterGain()`, `pendingNoteOns` Map, `synthNotes` Map, `currentSynthPreset` (all pre-existing).
- Produces: new `SYNTH_PRESETS` shape — each entry is `{ make() }`, where `make()` returns `{ trigger, output }` (`trigger` has `triggerAttack(freq, time, velocity)`/`triggerRelease(freq, time)`; `output` has `.connect(destinationNode)` — usually the same object as `trigger`, but kept separate so a later preset can insert an effect node like a filter between the synth and the output, without changing this interface again). New `getSynthInstrument(name)` — lazily creates and caches one `Tone.PolySynth` instance per preset name, connecting its `output` into `getSynthMasterGain()` on first creation. New module-level `synthInstruments` object (cache) and `toneContextLinked` boolean (guards the one-time `Tone.setContext()` call). Later tasks add more entries to `SYNTH_PRESETS` using this exact `{ make() }` shape — do not change the shape established here.

- [ ] **Step 1: Write the failing test**

Create `test-tonejs-core-rewrite.cjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-tonejs-core-rewrite.cjs`
Expected: FAIL — `SYNTH_PRESETS['Bass']` doesn't exist yet in the old shape, `synthInstruments`/`getSynthInstrument` aren't defined yet.

- [ ] **Step 3: Rewrite the core**

Find the existing `SYNTH_PRESETS` object (script.js:1818) and its final closing before `async function synthNoteOn`. Replace the entire `SYNTH_PRESETS` object with:

```js
// Tone.js-based instrument definitions. Each entry's make() returns { trigger, output }:
// trigger has triggerAttack(freq, time, velocity)/triggerRelease(freq, time); output has
// .connect(destination). They're usually the same object -- kept separate so a preset can
// insert an effect node (e.g. a filter) between the synth and its output without changing
// this shape. More presets are added here in later tasks.
const SYNTH_PRESETS = {
  'Bass': {
    make() {
      const synth = new Tone.PolySynth(Tone.MonoSynth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
        filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.4, baseFrequency: 80, octaves: 3 },
      });
      return { trigger: synth, output: synth };
    },
  },
};

const synthInstruments = {}; // preset name -> cached { trigger, output }
let toneContextLinked = false;

function getSynthInstrument(name) {
  if (!synthInstruments[name]) {
    if (!toneContextLinked) {
      Tone.setContext(getAudioCtx());
      toneContextLinked = true;
    }
    const def = SYNTH_PRESETS[name] || SYNTH_PRESETS['Bass'];
    const instrument = def.make();
    instrument.output.connect(getSynthMasterGain());
    synthInstruments[name] = instrument;
  }
  return synthInstruments[name];
}
```

Then replace `synthNoteOn`/`synthNoteOff` (script.js:2086-2120) with:

```js
async function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  const token = {};
  pendingNoteOns.set(noteNumber, token);
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    if (pendingNoteOns.get(noteNumber) !== token) return; // superseded by a note-off (or a newer note-on) while we were waiting
    pendingNoteOns.delete(noteNumber);
    const freq       = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel        = velocity / 127;
    const instrument = getSynthInstrument(currentSynthPreset);
    instrument.trigger.triggerAttack(freq, Tone.now(), vel);
    synthNotes.set(noteNumber, { instrument, freq });
  } catch (_) {
    if (pendingNoteOns.get(noteNumber) === token) pendingNoteOns.delete(noteNumber);
  }
}

function synthNoteOff(noteNumber) {
  pendingNoteOns.delete(noteNumber);
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  synthNotes.delete(noteNumber);
  try {
    note.instrument.trigger.triggerRelease(note.freq, Tone.now());
  } catch (_) {}
}
```

Note: the old `synthNotes` value shape was `{ gain, oscs, release, freeDecay }`; the new shape is `{ instrument, freq }`. Verified during planning: the only other references to `synthNotes` in script.js (two `[...synthNotes.keys()].forEach(n => synthNoteOff(n))` cleanup call sites) use only `.keys()` and call `synthNoteOff`, never reading the value shape directly — both are unaffected by this change and need no edits.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-tonejs-core-rewrite.cjs`
Expected: `RESULT: PASS`

- [ ] **Step 5: Run the stuck-MIDI-notes regression test**

```bash
node test-stuck-midi-notes-fix.cjs
```

Expected: `RESULT: PASS` — confirms the item-51 fix's guarantees (no premature playback, no stuck notes) hold under the new Tone.js-based internals, not just under the old hand-rolled ones.

- [ ] **Step 6: Manual listening check**

Open `index.html` in a real browser (not headless), enable MIDI or use a connected keyboard, select "Bass" from the synth preset dropdown, and play a few notes including a held chord. Confirm: sound plays promptly on the first note (no missing first-note-silent bug), multiple simultaneous notes all sound and don't cut each other off, releasing a note stops only that note, and the volume slider still works. Also test the sustain pedal specifically: hold the pedal, play and release a note, confirm it keeps sounding until the pedal is released — the sustain mechanism (`sustainedNotes`/`pedalDown` in `onMidiMessage`) is unmodified existing code that only defers calls to `synthNoteOff`, but its interaction with a real Tone.js voice's release behavior is worth confirming by ear, not just assumed. This is a genuine listening check — report what you heard, don't skip it.

- [ ] **Step 7: Commit**

```bash
git add script.js test-tonejs-core-rewrite.cjs
git commit -m "Rewrite synth note-triggering core on Tone.js, proven with the Bass preset"
```

---

### Task 3: Rhodes, Piano, Organ, Pad, Strings presets

**Files:**
- Modify: `script.js` (`SYNTH_PRESETS`)
- Create: `test-tonejs-presets-keys.cjs`

**Interfaces:**
- Consumes: the `{ make() }` shape and `getSynthInstrument()` established in Task 2. Do not modify `getSynthInstrument`, `synthNoteOn`, or `synthNoteOff` in this task.

- [ ] **Step 1: Write the failing test**

Create `test-tonejs-presets-keys.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const checkTrue = (label, cond, extra) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!cond) failed = true;
  };

  for (const preset of ['Rhodes', 'Piano', 'Organ', 'Pad', 'Strings']) {
    const result = await page.evaluate(async (presetName) => {
      currentSynthPreset = presetName;
      let threw = false;
      try {
        await synthNoteOn(60, 100);
        await synthNoteOn(64, 100);
        await synthNoteOn(67, 100);
        synthNoteOff(60); synthNoteOff(64); synthNoteOff(67);
      } catch (e) { threw = true; }
      return { threw, defined: !!SYNTH_PRESETS[presetName] };
    }, preset);
    checkTrue(`${preset}: is defined in SYNTH_PRESETS`, result.defined);
    checkTrue(`${preset}: a full triad triggers/releases without throwing`, !result.threw);
  }

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-tonejs-presets-keys.cjs`
Expected: FAIL — none of these 5 presets are defined yet.

- [ ] **Step 3: Add the 5 presets**

Add these entries to `SYNTH_PRESETS`, alongside `'Bass'`:

```js
  'Rhodes': {
    make() {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 1,
        modulationIndex: 2.5,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.006, decay: 0.5, sustain: 0.15, release: 0.55 },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.05, release: 0.3 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Piano': {
    // Deliberately distinct from Rhodes: higher harmonicity/modulationIndex for a brighter,
    // more inharmonic "hammer" attack transient, faster attack, longer natural decay.
    make() {
      const synth = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        envelope: { attack: 0.002, decay: 1.2, sustain: 0.05, release: 0.8 },
        modulationEnvelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.2 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Organ': {
    make() {
      const synth = new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2,
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.1 },
        modulationEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.1 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Pad': {
    // First preset needing trigger !== output: the synth feeds a lowpass filter, and the
    // filter (not the synth) is what connects to getSynthMasterGain().
    make() {
      const synth  = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 1.2, decay: 0.3, sustain: 0.8, release: 1.5 },
      });
      const filter = new Tone.Filter(1600, 'lowpass');
      synth.connect(filter);
      return { trigger: synth, output: filter };
    },
  },
  'Strings': {
    make() {
      const synth = new Tone.PolySynth(Tone.DuoSynth, {
        vibratoAmount: 0.3,
        vibratoRate: 4,
        harmonicity: 1.005,
        voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.6, decay: 0.2, sustain: 0.9, release: 1.2 } },
        voice1: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.6, decay: 0.2, sustain: 0.9, release: 1.2 } },
      });
      return { trigger: synth, output: synth };
    },
  },
```

All constructor option names above (`harmonicity`, `oscillator`, `modulation`, `modulationEnvelope`, `modulationIndex`, `voice0`/`voice1`/`vibratoRate`/`vibratoAmount`, `envelope`) were verified during planning against Tone.js 15.1.22's real TypeScript definitions (`FMSynthOptions`, `AMSynthOptions`/`ModulationSynthOptions`, `SynthOptions`, `DuoSynthOptions`) — they should work as written against the vendored file from Task 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-tonejs-presets-keys.cjs`
Expected: `RESULT: PASS`

- [ ] **Step 5: Manual listening check**

Open `index.html` in a real browser, play a chord on each of Rhodes/Piano/Organ/Pad/Strings. Confirm each sounds like a plausible, distinct version of its instrument category — in particular, confirm Piano is audibly different from Rhodes (not just a copy), and Pad genuinely has the slow, filtered swell character. Report what you heard; adjust the envelope/filter numbers above if something sounds clearly wrong (e.g. Pad has no swell, Piano sounds identical to Rhodes) before moving on.

- [ ] **Step 6: Regression check**

```bash
node test-tonejs-core-rewrite.cjs
node test-stuck-midi-notes-fix.cjs
```

Expected: `RESULT: PASS` for both — confirms adding these 5 presets didn't disturb the core rewrite or the stuck-notes guarantees.

- [ ] **Step 7: Commit**

```bash
git add script.js test-tonejs-presets-keys.cjs
git commit -m "Add Rhodes, Piano, Organ, Pad, and Strings presets on Tone.js"
```

---

### Task 4: Vibraphone, Marimba, Bell, Pluck presets; cleanup; docs

**Files:**
- Modify: `script.js` (`SYNTH_PRESETS`), `CLAUDE.md`
- Create: `test-tonejs-presets-percussion.cjs`

**Interfaces:**
- Consumes: the `{ make() }` shape from Task 2. Completes `SYNTH_PRESETS` to all 10 presets.

- [ ] **Step 1: Write the failing test**

Create `test-tonejs-presets-percussion.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const checkTrue = (label, cond, extra) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!cond) failed = true;
  };

  for (const preset of ['Vibraphone', 'Marimba', 'Bell', 'Pluck']) {
    const result = await page.evaluate(async (presetName) => {
      currentSynthPreset = presetName;
      let threw = false;
      try {
        await synthNoteOn(60, 100);
        await synthNoteOn(64, 100);
        synthNoteOff(60); synthNoteOff(64);
      } catch (e) { threw = true; }
      return { threw, defined: !!SYNTH_PRESETS[presetName] };
    }, preset);
    checkTrue(`${preset}: is defined in SYNTH_PRESETS`, result.defined);
    checkTrue(`${preset}: two-note polyphony triggers/releases without throwing`, !result.threw);
  }

  // All 10 presets now defined
  const allTen = await page.evaluate(() =>
    ['Rhodes','Piano','Organ','Pad','Strings','Vibraphone','Marimba','Bell','Pluck','Bass']
      .every(name => !!SYNTH_PRESETS[name])
  );
  checkTrue('all 10 presets are defined', allTen);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-tonejs-presets-percussion.cjs`
Expected: FAIL — these 4 presets aren't defined yet.

- [ ] **Step 3: Add the 4 presets**

Add these entries to `SYNTH_PRESETS`:

```js
  'Vibraphone': {
    make() {
      const synth = new Tone.PolySynth(Tone.MetalSynth, {
        harmonicity: 3.1,
        modulationIndex: 16,
        resonance: 2500,
        octaves: 1,
        envelope: { attack: 0.001, decay: 1.4, release: 0.4 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Marimba': {
    // Shorter, woodier decay than Vibraphone -- lower harmonicity/modulationIndex/resonance.
    make() {
      const synth = new Tone.PolySynth(Tone.MetalSynth, {
        harmonicity: 1.5,
        modulationIndex: 8,
        resonance: 1200,
        octaves: 0.5,
        envelope: { attack: 0.001, decay: 0.4, release: 0.1 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Bell': {
    // Brighter and longer-ringing than either mallet preset -- higher harmonicity/
    // modulationIndex/resonance, much longer decay.
    make() {
      const synth = new Tone.PolySynth(Tone.MetalSynth, {
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
        envelope: { attack: 0.001, decay: 3, release: 1 },
      });
      return { trigger: synth, output: synth };
    },
  },
  'Pluck': {
    // Direct replacement for the broken hand-rolled Karplus-Strong implementation.
    // Verified against Tone.js 15.1.22's real PluckSynthOptions/usage docs during planning:
    // triggerAttack only takes (note, time), no velocity argument -- synthNoteOn's 3rd
    // argument to triggerAttack is simply extra and ignored for this preset, which is fine.
    make() {
      const synth = new Tone.PolySynth(Tone.PluckSynth, {
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.9,
      });
      return { trigger: synth, output: synth };
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-tonejs-presets-percussion.cjs`
Expected: `RESULT: PASS`

- [ ] **Step 5: Manual listening check, including the Pluck fix specifically**

Open `index.html` in a real browser. Play notes on Vibraphone, Marimba, and Bell — confirm they're audibly distinct from each other (Marimba shortest/woodiest, Bell longest/brightest-ringing). Play notes on Pluck specifically and confirm it sounds like a clean plucked string with no metallic buzzing, no instability, no runaway feedback — this is the preset that was broken before this plan. Report what you heard.

- [ ] **Step 6: Remove dead code and old test files**

Search script.js for any leftover reference to the old hand-rolled preset internals (the old `build(ctx, freq, vel, dest)` pattern, raw `OscillatorNode`/`BiquadFilterNode` construction inside `SYNTH_PRESETS`, any now-unused helper only the old presets called). Confirm nothing outside `SYNTH_PRESETS`/`synthNoteOn`/`synthNoteOff` depended on the old internals (Band Mode's own sound code is separate and untouched, per this plan's Global Constraints).

Delete the old preset-specific test files that tested the removed hand-rolled DSP directly and no longer apply: `test-synth-pluck-karplus.cjs`, `test-synth-rhodes-fm.cjs`, `test-synth-bass-filter-envelope.cjs`, `test-synth-snare-comp-touchups.cjs` (check this last one first — if it tests Band Mode's separate snare/comp sounds rather than the `SYNTH_PRESETS` system, it's unrelated and must NOT be deleted).

- [ ] **Step 7: Update CLAUDE.md**

In the `## Project` section, find the line describing `tonal.min.js` as the only dependency and update it to also mention `tone.min.js`, matching the existing style. Example current text: `` tonal.min.js (vendored [Tonal.js](https://github.com/tonaljs/tonal) music-theory library, used only for jazz-extended chord-quality parsing in Functional Harmony — no other dependencies, no CDN at runtime) ``. Update to describe both vendored libraries and what each is used for, keeping the "no CDN at runtime" constraint statement intact.

- [ ] **Step 8: Full regression suite**

```bash
node run-all-tests.cjs
```

Expected: all tests pass except any pre-existing, unrelated flakes already known from prior sessions (confirm any failure is genuinely pre-existing and unrelated before treating it as acceptable — don't assume).

- [ ] **Step 9: Commit**

```bash
git add script.js CLAUDE.md test-tonejs-presets-percussion.cjs
git rm test-synth-pluck-karplus.cjs test-synth-rhodes-fm.cjs test-synth-bass-filter-envelope.cjs
git commit -m "Add Vibraphone, Marimba, Bell, and Pluck presets on Tone.js; remove dead hand-rolled synth code and stale tests"
```
