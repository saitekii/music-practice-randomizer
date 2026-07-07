# Synth Voice Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace thin/bare synth voices (Rhodes, Pluck, Bass, Snare, Comp) with richer, better-researched Web Audio synthesis techniques — FM synthesis, Karplus-Strong physical modeling, and filter envelopes — while leaving already-rich voices (Organ/Piano/Marimba/Vibraphone/Strings/Pad) and already-correct ones (kick/hihat) untouched.

**Architecture:** All changes are localized rewrites of individual `build()` functions inside `SYNTH_PRESETS` and individual `playX(time)` functions, using only native Web Audio nodes (`OscillatorNode`, `GainNode`, `BiquadFilterNode`, `DelayNode`, the existing shared noise buffer). No new files, no shared infrastructure between voices, no new dependency.

**Tech Stack:** Vanilla JS, Web Audio API (including `OfflineAudioContext` for the new audio-content tests), Playwright `.cjs` scripts (no test framework).

## Global Constraints

- No build step, no framework, no dependencies — every change is a plain edit inside `script.js`.
- No changes to Organ, Pad, Bell, Piano, Marimba, Vibraphone, Strings, kick, or hihat — out of scope per the spec.
- No reverb, no shared effects bus, no new UI controls — out of scope per the spec.
- No change to `GROOVE_STYLES`/the scheduler/Band Mode timing — this pass only changes how existing voices sound, not when they play.
- The Karplus-Strong feedback loop's feedback gain must stay strictly below 1, and its non-oscillator nodes (`DelayNode`/`BiquadFilterNode`/`GainNode`, which have no `.stop()`) must be explicitly `.disconnect()`ed via a bounded `setTimeout` (~2.5s) so they don't process silently forever.
- Test convention: `.cjs` files in the project root, Playwright, `check(label, actual, expected)` + `RESULT: PASS`/`FAIL` pattern, run via `node test-script.cjs`. New in this plan: `OfflineAudioContext`-based tests that render a voice's actual audio output and inspect the sample buffer, used only where it catches a real correctness/safety issue (silence, runaway amplitude, absence of an intended brightness change) — never as a stand-in for "does it sound good," which remains a manual listening judgment.

---

### Task 1: Rhodes — FM synthesis

**Files:**
- Modify: `script.js:1624-1637` (`SYNTH_PRESETS.Rhodes`)
- Test: `test-synth-rhodes-fm.cjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on — establishes the `OfflineAudioContext` render-and-inspect test pattern (`zeroCrossingRate`, `peakAbs` helpers, redefined locally per test file per this project's no-shared-modules convention) that Tasks 2 and 3 reuse independently.

- [ ] **Step 1: Write the failing test**

Create `test-synth-rhodes-fm.cjs`:

```javascript
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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const result = await page.evaluate(async () => {
    const sampleRate = 44100;
    const durationS  = 1.0;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationS), sampleRate);
    const note = SYNTH_PRESETS.Rhodes.build(offlineCtx, 440, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function zeroCrossingRate(samples) {
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings++;
      }
      return crossings / samples.length;
    }
    function peakAbs(samples) {
      let m = 0;
      for (let i = 0; i < samples.length; i++) m = Math.max(m, Math.abs(samples[i]));
      return m;
    }

    const earlyWindow = data.slice(0, Math.floor(sampleRate * 0.02));                              // first 20ms -- bright FM transient
    const lateWindow  = data.slice(Math.floor(sampleRate * 0.4), Math.floor(sampleRate * 0.42));    // ~400ms -- settled tone

    return {
      oscCount: note.oscs.length,
      release: note.release,
      notSilent: peakAbs(data) > 0.01,
      earlyZcr: zeroCrossingRate(earlyWindow),
      lateZcr: zeroCrossingRate(lateWindow),
    };
  });

  check('Rhodes build() returns both carrier and modulator oscillators', result.oscCount, 2);
  check('Rhodes release unchanged from before', result.release, 0.55);
  check('Rhodes produces audible (non-silent) output', result.notSilent, true);
  checkTrue(
    'Rhodes early attack has more high-frequency content than the settled tone (FM modulation depth decaying)',
    result.earlyZcr > result.lateZcr,
    `early=${result.earlyZcr}, late=${result.lateZcr}`
  );

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-synth-rhodes-fm.cjs`
Expected: FAIL on `oscCount` (current Rhodes returns 1 oscillator, not 2) and likely on the ZCR comparison (current Rhodes has no modulation-depth decay).

- [ ] **Step 3: Implement the FM Rhodes preset**

Current code (`script.js:1624-1637`):

```javascript
  'Rhodes': {
    build(ctx, freq, vel, dest) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.7,  now + 0.006);
      gain.gain.exponentialRampToValueAtTime(vel * 0.35, now + 0.45);
      osc.connect(gain); gain.connect(dest); osc.start(now);
      return { gain, oscs: [osc], release: 0.55 };
    },
  },
```

Replace with:

```javascript
  'Rhodes': {
    build(ctx, freq, vel, dest) {
      const now       = ctx.currentTime;
      const carrier   = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      carrier.type   = 'sine'; carrier.frequency.value   = freq;
      modulator.type = 'sine'; modulator.frequency.value = freq; // 1:1 ratio -- classic mellow FM e-piano ratio

      const modGain = ctx.createGain(); // modulation index, in Hz of frequency deviation
      modGain.gain.setValueAtTime(freq * 1.5, now);                                     // bright "tine" attack transient
      modGain.gain.exponentialRampToValueAtTime(Math.max(freq * 0.15, 0.01), now + 0.3); // settles into a mellow tone
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.7,  now + 0.006);
      gain.gain.exponentialRampToValueAtTime(vel * 0.35, now + 0.45);

      carrier.connect(gain); gain.connect(dest);
      modulator.start(now); carrier.start(now);
      return { gain, oscs: [carrier, modulator], release: 0.55 };
    },
  },
```

Note: the amplitude envelope (attack/decay values and timing) is byte-for-byte unchanged from the original — only the carrier's timbre (now FM instead of a plain triangle wave) and the new `modulator`/`modGain` are new. `oscs` now lists both oscillators so `synthNoteOff` (`script.js:1838-1852`) releases and stops both together, exactly as it already does for multi-oscillator presets like `Organ`/`Piano`/`Strings`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-synth-rhodes-fm.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-synth-rhodes-fm.cjs
git commit -m "Replace Rhodes preset with 2-operator FM synthesis"
```

---

### Task 2: Pluck — Karplus-Strong plucked-string synthesis

**Files:**
- Modify: `script.js:1689-1705` (`SYNTH_PRESETS.Pluck`)
- Test: `test-synth-pluck-karplus.cjs`

**Interfaces:**
- Consumes: `getNoiseBuffer(ctx)` (`script.js:1514-1521`, unchanged, already used by `playSnare`/`playHihat`).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-synth-pluck-karplus.cjs`:

```javascript
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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const result = await page.evaluate(async () => {
    const sampleRate = 44100;
    const durationS  = 2.5;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * durationS), sampleRate);
    const note = SYNTH_PRESETS.Pluck.build(offlineCtx, 220, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function rms(samples) {
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      return Math.sqrt(sum / samples.length);
    }
    function peakAbs(samples) {
      let m = 0;
      for (let i = 0; i < samples.length; i++) m = Math.max(m, Math.abs(samples[i]));
      return m;
    }

    const earlyWindow = data.slice(Math.floor(sampleRate * 0.05), Math.floor(sampleRate * 0.15));
    const lateWindow  = data.slice(Math.floor(sampleRate * 2.0),  Math.floor(sampleRate * 2.1));

    return {
      freeDecay: note.freeDecay,
      release: note.release,
      overallPeak: peakAbs(data),
      earlyRms: rms(earlyWindow),
      lateRms: rms(lateWindow),
    };
  });

  check('Pluck stays freeDecay (percussive, decays on its own)', result.freeDecay, true);
  check('Pluck release field unchanged', result.release, 0);
  checkTrue(
    'Pluck output never blows past a sane amplitude ceiling (no runaway feedback)',
    result.overallPeak < 1.5,
    `peak=${result.overallPeak}`
  );
  checkTrue(
    'Pluck decays -- energy 2s in is much lower than energy shortly after the pluck',
    result.lateRms < result.earlyRms * 0.2,
    `early=${result.earlyRms}, late=${result.lateRms}`
  );

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-synth-pluck-karplus.cjs`
Expected: FAIL on the decay-ratio check (the current sawtooth+filter-sweep Pluck holds near its sustain level rather than physically decaying via a feedback loop).

- [ ] **Step 3: Implement Karplus-Strong**

Current code (`script.js:1689-1705`):

```javascript
  'Pluck': {
    build(ctx, freq, vel, dest) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(5000, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.4);
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      gain.gain.setValueAtTime(vel * 0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      osc.connect(filter); filter.connect(gain); gain.connect(dest);
      osc.start(now); osc.stop(now + 1.1);
      return { gain, oscs: [osc], release: 0, freeDecay: true };
    },
  },
```

Replace with:

```javascript
  'Pluck': {
    build(ctx, freq, vel, dest) {
      const now = ctx.currentTime;

      // Karplus-Strong plucked string: a short noise burst excites a feedback
      // loop (a delay tuned to the string's period + a lowpass filter), which
      // loses a little energy and brightness each pass -- the same way a real
      // plucked string's vibration decays, rather than a programmed envelope.
      const period = 1 / freq;
      const delay  = ctx.createDelay(1.0);
      delay.delayTime.value = period;

      const loopFilter = ctx.createBiquadFilter();
      loopFilter.type = 'lowpass';
      loopFilter.frequency.value = 4500;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.97; // < 1 -- guarantees the loop decays, never sustains or grows

      const burst = ctx.createBufferSource();
      burst.buffer = getNoiseBuffer(ctx);

      const burstGain = ctx.createGain();
      burstGain.gain.setValueAtTime(1, now);
      burstGain.gain.setValueAtTime(0, now + period); // one period's worth of noise -- a single "pluck"

      const outGain = ctx.createGain();
      outGain.gain.value = vel * 0.7;

      burst.connect(burstGain);
      burstGain.connect(delay);
      delay.connect(loopFilter);
      loopFilter.connect(feedback);
      feedback.connect(delay);      // closes the feedback loop
      loopFilter.connect(outGain);
      outGain.connect(dest);

      burst.start(now);
      burst.stop(now + period + 0.01);

      // DelayNode/BiquadFilterNode/GainNode have no .stop() -- disconnect the
      // loop explicitly once it has decayed, or it silently processes
      // near-zero signal for the rest of the session.
      setTimeout(() => {
        try {
          delay.disconnect(); loopFilter.disconnect(); feedback.disconnect(); outGain.disconnect();
        } catch (_) {}
      }, 2500);

      return { gain: outGain, oscs: [burst], release: 0, freeDecay: true };
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-synth-pluck-karplus.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-synth-pluck-karplus.cjs
git commit -m "Replace Pluck preset with Karplus-Strong plucked-string synthesis"
```

---

### Task 3: Bass — filter envelope (melodic preset + Band Mode)

**Files:**
- Modify: `script.js:1794-1808` (`SYNTH_PRESETS.Bass`)
- Modify: `script.js:1568-1583` (`playBandBass`)
- Test: `test-synth-bass-filter-envelope.cjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-synth-bass-filter-envelope.cjs`:

```javascript
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
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  const result = await page.evaluate(async () => {
    const sampleRate = 44100;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(sampleRate * 0.5), sampleRate);
    const note = SYNTH_PRESETS.Bass.build(offlineCtx, 110, 1.0, offlineCtx.destination);
    const buffer = await offlineCtx.startRendering();
    const data = buffer.getChannelData(0);

    function zeroCrossingRate(samples) {
      let crossings = 0;
      for (let i = 1; i < samples.length; i++) {
        if ((samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings++;
      }
      return crossings / samples.length;
    }

    const earlyWindow = data.slice(0, Math.floor(sampleRate * 0.02));
    const lateWindow  = data.slice(Math.floor(sampleRate * 0.3), Math.floor(sampleRate * 0.32));

    return {
      oscCount: note.oscs.length,
      earlyZcr: zeroCrossingRate(earlyWindow),
      lateZcr: zeroCrossingRate(lateWindow),
    };
  });

  check('Bass preset has 2-oscillator subtle unison', result.oscCount, 2);
  checkTrue(
    'Bass filter envelope: brighter attack than sustain (cutoff sweeping down)',
    result.earlyZcr > result.lateZcr,
    `early=${result.earlyZcr}, late=${result.lateZcr}`
  );

  const bandBassResult = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      playBandBass(0, ctx.currentTime + 0.05);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('playBandBass runs without throwing', bandBassResult.threw, false);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-synth-bass-filter-envelope.cjs`
Expected: FAIL on `oscCount` (current Bass preset has 1 oscillator, not 2).

- [ ] **Step 3: Implement the filter envelope + subtle unison**

Current code (`script.js:1794-1808`):

```javascript
  'Bass': {
    build(ctx, freq, vel, dest) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 2.5;
      const gain = ctx.createGain();
      const now  = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.9, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(vel * 0.45, now + 0.18);
      filter.connect(gain); gain.connect(dest);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      osc.connect(filter); osc.start(now);
      return { gain, oscs: [osc], release: 0.15 };
    },
  },
```

Replace with:

```javascript
  'Bass': {
    build(ctx, freq, vel, dest) {
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass'; filter.Q.value = 2.5;
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.25); // filter envelope: bright pluck -> warm sustain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(vel * 0.9, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(vel * 0.45, now + 0.18);
      filter.connect(gain); gain.connect(dest);
      const oscs = [0, -6].map(detune => { // subtle 2-osc unison for warmth, matching Pad/Strings' technique
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.value = freq; osc.detune.value = detune;
        osc.connect(filter); osc.start(now);
        return osc;
      });
      return { gain, oscs, release: 0.15 };
    },
  },
```

Current code (`script.js:1568-1583`):

```javascript
function playBandBass(pc, time) {
  try {
    const ctx    = getAudioCtx();
    const freq   = 440 * Math.pow(2, ((36 + pc) - 69) / 12); // low bass register
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.8, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    osc.connect(filter); filter.connect(gain); gain.connect(getSynthMasterGain());
    osc.start(time); osc.stop(time + 0.4);
  } catch (_) {}
}
```

Replace with:

```javascript
function playBandBass(pc, time) {
  try {
    const ctx    = getAudioCtx();
    const freq   = 440 * Math.pow(2, ((36 + pc) - 69) / 12); // low bass register
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 1.5;
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.2); // filter envelope: bright attack -> warm sustain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.8, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth'; osc.frequency.value = freq;
    osc.connect(filter); filter.connect(gain); gain.connect(getSynthMasterGain());
    osc.start(time); osc.stop(time + 0.4);
  } catch (_) {}
}
```

Note: `playBandBass` keeps a single oscillator (no added unison) — it's a short percussive stab within a drum/bass/comp mix, not a sustained note, so the filter envelope alone is the relevant improvement. It calls `getAudioCtx()` internally rather than receiving a `ctx` parameter, so (unlike the melodic `Bass` preset) it can't be cleanly rendered through `OfflineAudioContext` without changing its signature, which is out of scope — the test below only confirms it runs without throwing, consistent with how `test-band-groove-pattern.cjs` already tests `playKick`/`playSnare`/`playHihat`/`playBandComp`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-synth-bass-filter-envelope.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-synth-bass-filter-envelope.cjs
git commit -m "Add filter envelope to Bass preset and playBandBass, plus subtle unison to the melodic preset"
```

---

### Task 4: Snare body tone + Comp filter envelope

**Files:**
- Modify: `script.js:1538-1551` (`playSnare`)
- Modify: `script.js:1585-1600` (`playBandComp`)
- Test: `test-synth-snare-comp-touchups.cjs`

**Interfaces:**
- Consumes: `getSynthMasterGain()` (unchanged), `getNoiseBuffer(ctx)` (unchanged).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Write the failing test**

Create `test-synth-snare-comp-touchups.cjs`:

```javascript
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);

  let failed = false;
  const check = (label, actual, expected) => {
    const ok = actual === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;
      playSnare(t);
      playBandComp([0, 4, 7], t);
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
  check('playSnare and playBandComp run without throwing', result.threw, false);

  await page.waitForTimeout(200);
  check('no uncaught page errors from the new snare body tone or comp filter', errors.length, 0);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-synth-snare-comp-touchups.cjs`
Expected: PASS on this test even before the change (both functions already run without throwing today) — this is expected; the meaningful verification for this task is the regression sweep in Task 5 plus a manual listen. Proceed to Step 3 regardless.

- [ ] **Step 3: Implement the touch-ups**

Current code (`script.js:1538-1551`):

```javascript
function playSnare(time) {
  try {
    const ctx    = getAudioCtx();
    const noise  = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    noise.connect(filter); filter.connect(gain); gain.connect(getSynthMasterGain());
    noise.start(time); noise.stop(time + 0.16);
  } catch (_) {}
}
```

Replace with:

```javascript
function playSnare(time) {
  try {
    const ctx    = getAudioCtx();
    const noise  = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 1800; filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    noise.connect(filter); filter.connect(gain); gain.connect(getSynthMasterGain());
    noise.start(time); noise.stop(time + 0.16);

    // Low body tone -- the drum shell's thump underneath the wire-rattle noise.
    const body     = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle'; body.frequency.value = 180;
    bodyGain.gain.setValueAtTime(0.25, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    body.connect(bodyGain); bodyGain.connect(getSynthMasterGain());
    body.start(time); body.stop(time + 0.1);
  } catch (_) {}
}
```

Current code (`script.js:1585-1600`):

```javascript
function playBandComp(pcs, time) {
  try {
    const ctx  = getAudioCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.45 / Math.max(1, pcs.length), time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    gain.connect(getSynthMasterGain());
    pcs.forEach(pc => {
      const freq = 440 * Math.pow(2, ((60 + pc) - 69) / 12); // mid-register comp voicing
      const osc  = ctx.createOscillator();
      osc.type = 'triangle'; osc.frequency.value = freq;
      osc.connect(gain); osc.start(time); osc.stop(time + 0.32);
    });
  } catch (_) {}
}
```

Replace with:

```javascript
function playBandComp(pcs, time) {
  try {
    const ctx    = getAudioCtx();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 1.0;
    filter.frequency.setValueAtTime(2500, time);
    filter.frequency.exponentialRampToValueAtTime(700, time + 0.25); // filter envelope: bright stab -> warm sustain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.45 / Math.max(1, pcs.length), time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
    filter.connect(gain); gain.connect(getSynthMasterGain());
    pcs.forEach(pc => {
      const freq = 440 * Math.pow(2, ((60 + pc) - 69) / 12); // mid-register comp voicing
      const osc  = ctx.createOscillator();
      osc.type = 'triangle'; osc.frequency.value = freq;
      osc.connect(filter); osc.start(time); osc.stop(time + 0.32);
    });
  } catch (_) {}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-synth-snare-comp-touchups.cjs`
Expected: all `PASS`, `RESULT: PASS`

- [ ] **Step 5: Commit**

```bash
git add script.js test-synth-snare-comp-touchups.cjs
git commit -m "Add low body tone to snare and filter envelope to Band Mode comp"
```

---

### Task 5: Final regression sweep

**Files:** none modified — this task only runs existing tests and records the result. If any test fails, fix the regression in the file(s) it points to before considering this task done.

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: nothing new — a verification gate before this feature is considered complete.

- [ ] **Step 1: Run every synth and Band Mode test in the suite**

```bash
node test-synth-rhodes-fm.cjs
node test-synth-pluck-karplus.cjs
node test-synth-bass-filter-envelope.cjs
node test-synth-snare-comp-touchups.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-scheduler-core.cjs
node test-band-scheduler-catchup.cjs
node test-band-groove-pattern.cjs
node test-band-groove-styles.cjs
node test-band-style-ui.cjs
```

Expected: `RESULT: PASS` on all eleven. The `test-band-*` tests are included because `playSnare`/`playBandBass`/`playBandComp` are called from `scheduleGrooveHit` — this confirms the voice-quality changes didn't break Band Mode's scheduling/triggering behavior, even though none of those tests inspect audio content directly.

- [ ] **Step 2: Manual listening note**

`OfflineAudioContext` rendering confirms the intended *structural* changes happened (FM modulation decaying, a real decaying feedback loop, a sweeping filter cutoff) and that nothing produces silence or a runaway signal — but it cannot judge whether Rhodes now actually sounds like an electric piano or Pluck like a plucked string. Note in the final report to the user that a real listen-through (playing notes/chords through each of the Rhodes/Pluck/Bass presets, and triggering Band Mode to hear the updated snare/comp) is the only way to confirm the voices actually sound better, and at least one round of parameter adjustment should be expected.

- [ ] **Step 3: Commit (only if Step 1 required fixes)**

If all tests passed on the first run in Step 1, there is nothing to commit for this task. If fixes were needed:

```bash
git add -A
git commit -m "Fix regressions found in synth voice quality regression sweep"
```
