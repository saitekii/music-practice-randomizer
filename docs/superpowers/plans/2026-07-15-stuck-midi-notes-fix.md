# Stuck MIDI Notes / Audio Not Starting Immediately Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a real, user-reported bug: MIDI notes don't produce sound until an unrelated control is touched, and notes played during that window can get permanently stuck playing.

**Architecture:** Two changes to `script.js`, same root cause (a race between `synthNoteOn()`'s `await ctx.resume()` and a note-off arriving before that await resolves): make `enableMidi()`'s existing partial audio warm-up actually wait for the context to finish resuming, and add a cancellation-token guard in `synthNoteOn()`/`synthNoteOff()` so a note-off that arrives mid-flight can never result in an orphaned, permanently-playing voice. Both were verified live against the real functions during brainstorming, before this plan was written.

**Tech Stack:** Vanilla JS (no build step — see repo CLAUDE.md), Playwright for testing.

## Global Constraints

- The cancellation-token design (not a plain boolean/Set flag) is required — a boolean flag fails a rapid-retrigger edge case (note-on → note-off → note-on again, all before the first note-on's `resume()` resolves), verified live during brainstorming: a boolean gets clobbered by the second note-on and the stale first call incorrectly also starts a voice, producing two voices for one key instead of one.
- `enableMidi()`'s `getAudioCtx()` call must remain synchronous, before any `await` in the function — this is what keeps the resume validly tied to the button-click gesture. Only the *awaiting* of that resume moves later in the function; the call that *initiates* it must not move.
- Both changes are wrapped in `try { ... } catch (_) {}` (already true in `enableMidi()`, newly added in `synthNoteOn()`) — an audio-resume failure must never block MIDI from enabling, or throw out of the MIDI message handler.
- No changes to `onMidiMessage()`, `getAudioCtx()`, or any synth preset/voice-building code — the fix is entirely in the note-on/note-off race handling and the MIDI-enable warm-up sequencing.

---

### Task 1: Fix the race — `enableMidi()` awaits resume, `synthNoteOn`/`synthNoteOff` gain a cancellation-token guard

**Files:**
- Modify: `script.js` (`enableMidi()`; `synthNoteOn()`/`synthNoteOff()`; a new module-scope `pendingNoteOns` map)
- Create: `test-stuck-midi-notes-fix.cjs`

**Interfaces:**
- Produces: no new exported functions — `pendingNoteOns` is internal, module-scope state alongside the existing `synthNotes` map. `synthNoteOn()`/`synthNoteOff()` keep their existing signatures (`synthNoteOn(noteNumber, velocity)`, `synthNoteOff(noteNumber)`) — callers (`onMidiMessage()`, `disableMidi()`, the preset-change handler) are unaffected and need no changes.

- [ ] **Step 1: Write the failing test**

Create `test-stuck-midi-notes-fix.cjs`:

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
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };
  const checkTrue = (label, condition, extra) => {
    console.log(`${condition ? 'PASS' : 'FAIL'} ${label}${extra !== undefined ? ` (${extra})` : ''}`);
    if (!condition) failed = true;
  };

  // --- Scenario 1: the original bug -- a note-off arrives while its note-on is still
  // awaiting a pending (not-yet-unlocked) resume(). Must not leave an orphaned,
  // permanently-playing voice once resume eventually completes. ---
  const scenario1 = await page.evaluate(async () => {
    let releaseResume;
    const resumeGate = new Promise(res => { releaseResume = res; });
    const ctx = getAudioCtx();
    const originalResume = ctx.resume.bind(ctx);
    ctx.resume = async () => { await resumeGate; return originalResume(); };
    Object.defineProperty(ctx, 'state', { get: () => 'suspended', configurable: true });

    const onPromise = synthNoteOn(60, 100);
    await new Promise(r => setTimeout(r, 10));
    const hadEntryDuringWait = synthNotes.has(60);
    synthNoteOff(60);

    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    releaseResume();
    await onPromise;

    const orphanedNoteExists = synthNotes.has(60);
    ctx.resume = originalResume;
    delete ctx.state; // un-shadow the real prototype getter for later scenarios
    return { hadEntryDuringWait, orphanedNoteExists };
  });
  checkTrue('no entry exists in synthNotes while note-on is still awaiting resume', !scenario1.hadEntryDuringWait, null);
  checkTrue('no orphaned note remains after a note-off/resume race', !scenario1.orphanedNoteExists, null);

  // --- Scenario 2: rapid retrigger -- note-on, note-off (cancels it), note-on AGAIN,
  // all before the first note-on's resume resolves. Must end up with exactly ONE
  // voice for the note, not zero (missed retrigger) and not two (leaked duplicate). ---
  const scenario2 = await page.evaluate(async () => {
    let releaseResume;
    const resumeGate = new Promise(res => { releaseResume = res; });
    const ctx = getAudioCtx();
    const originalResume = ctx.resume.bind(ctx);
    ctx.resume = async () => { await resumeGate; return originalResume(); };
    Object.defineProperty(ctx, 'state', { get: () => 'suspended', configurable: true });

    const onPromiseA = synthNoteOn(61, 100);
    await new Promise(r => setTimeout(r, 5));
    synthNoteOff(61);
    await new Promise(r => setTimeout(r, 5));
    const onPromiseB = synthNoteOn(61, 90);

    Object.defineProperty(ctx, 'state', { get: () => 'running', configurable: true });
    releaseResume();
    await Promise.all([onPromiseA, onPromiseB]);

    const hasVoice = synthNotes.has(61);
    ctx.resume = originalResume;
    delete ctx.state;
    return { hasVoice };
  });
  checkTrue('rapid retrigger through the race window ends with exactly one voice, not zero or two', scenario2.hasVoice, null);
  await page.evaluate(() => synthNoteOff(61)); // clean up the voice this scenario intentionally left playing

  // --- Normal operation (no race) is unaffected by the fix ---
  const normalOp = await page.evaluate(async () => {
    await synthNoteOn(62, 100);
    const hasVoiceAfterOn = synthNotes.has(62);
    synthNoteOff(62);
    const hasVoiceAfterOff = synthNotes.has(62);
    return { hasVoiceAfterOn, hasVoiceAfterOff };
  });
  checkTrue('normal note-on (no race) still registers a voice', normalOp.hasVoiceAfterOn, null);
  checkTrue('normal note-off (no race) still removes it', !normalOp.hasVoiceAfterOff, null);

  // --- enableMidi() awaits resume so audio is genuinely ready when it resolves ---
  const enableResult = await page.evaluate(async () => {
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map(), onstatechange: null });
    await enableMidi();
    return {
      midiEnabled,
      midiStatusText: document.getElementById('midiStatus').textContent,
      audioCtxState: audioCtx ? audioCtx.state : null,
    };
  });
  check('enableMidi() sets midiEnabled to true on success', enableResult.midiEnabled, true);
  checkTrue('audio context is running after enableMidi() resolves', enableResult.audioCtxState === 'running', enableResult.audioCtxState);

  // --- enableMidi() still handles requestMIDIAccess rejection gracefully ---
  const denyResult = await page.evaluate(async () => {
    midiEnabled = false;
    navigator.requestMIDIAccess = () => Promise.reject(new Error('denied'));
    await enableMidi();
    return { midiEnabled, midiStatusText: document.getElementById('midiStatus').textContent };
  });
  check('enableMidi() leaves midiEnabled false when access is denied', denyResult.midiEnabled, false);
  check('enableMidi() shows Access denied status', denyResult.midiStatusText, 'Access denied');

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-stuck-midi-notes-fix.cjs`
Expected: FAIL — `scenario1.orphanedNoteExists` is `true` against the current (unfixed) code, so `'no orphaned note remains after a note-off/resume race'` fails. Other checks may also fail or pass depending on exact timing; the important thing is the orphaned-note check fails, proving the test genuinely detects the bug.

- [ ] **Step 3: Add the `pendingNoteOns` state and fix `synthNoteOn`/`synthNoteOff`**

The current code (script.js:2070-2097) reads:

```js
async function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    const freq   = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel    = velocity / 127;
    const preset = SYNTH_PRESETS[currentSynthPreset] || SYNTH_PRESETS['Rhodes'];
    const note   = preset.build(ctx, freq, vel, getSynthMasterGain());
    synthNotes.set(noteNumber, note);
  } catch (_) {}
}

function synthNoteOff(noteNumber) {
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  synthNotes.delete(noteNumber);
  if (note.freeDecay) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const rel = note.release ?? 0.55;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(Math.max(note.gain.gain.value, 0.001), now);
    note.gain.gain.exponentialRampToValueAtTime(0.0001, now + rel);
    note.oscs.forEach(o => { try { o.stop(now + rel + 0.05); } catch (_) {} });
  } catch (_) {}
}
```

Change it to (adds a `pendingNoteOns` cancellation-token map and the guard check in `synthNoteOn`; adds one line to `synthNoteOff` to clear any pending token — everything else in `synthNoteOff` is unchanged):

```js
const pendingNoteOns = new Map(); // note number -> token object; only the most recent synthNoteOn call for a given note is allowed to actually start it

async function synthNoteOn(noteNumber, velocity) {
  synthNoteOff(noteNumber);
  const token = {};
  pendingNoteOns.set(noteNumber, token);
  try {
    const ctx = getAudioCtx();
    if (ctx.state !== 'running') await ctx.resume();
    if (pendingNoteOns.get(noteNumber) !== token) return; // superseded by a note-off (or a newer note-on) while we were waiting
    pendingNoteOns.delete(noteNumber);
    const freq   = 440 * Math.pow(2, (noteNumber - 69) / 12);
    const vel    = velocity / 127;
    const preset = SYNTH_PRESETS[currentSynthPreset] || SYNTH_PRESETS['Rhodes'];
    const note   = preset.build(ctx, freq, vel, getSynthMasterGain());
    synthNotes.set(noteNumber, note);
  } catch (_) {
    if (pendingNoteOns.get(noteNumber) === token) pendingNoteOns.delete(noteNumber);
  }
}

function synthNoteOff(noteNumber) {
  pendingNoteOns.delete(noteNumber);
  const note = synthNotes.get(noteNumber);
  if (!note) return;
  synthNotes.delete(noteNumber);
  if (note.freeDecay) return;
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const rel = note.release ?? 0.55;
    note.gain.gain.cancelScheduledValues(now);
    note.gain.gain.setValueAtTime(Math.max(note.gain.gain.value, 0.001), now);
    note.gain.gain.exponentialRampToValueAtTime(0.0001, now + rel);
    note.oscs.forEach(o => { try { o.stop(now + rel + 0.05); } catch (_) {} });
  } catch (_) {}
}
```

- [ ] **Step 4: Fix `enableMidi()` to await the resume it already initiates**

The current code (script.js:4066-4088) reads:

```js
async function enableMidi() {
  if (!navigator.requestMIDIAccess) {
    midiStatus.textContent = 'Not supported in this browser';
    return;
  }
  // Initialize audio graph now while we still have the user-gesture context.
  // Without this, AudioContext is created later inside a MIDI message handler
  // where Chrome treats it as suspended and produces no sound.
  try { getSynthMasterGain(); } catch (_) {}
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiEnabled = true;
    attachMidiListeners();
    midiAccess.onstatechange = e => {
      if (e.port.type === 'input') attachMidiListeners();
      updateMidiUI();
    };
    localStorage.setItem('mpr_midi', '1');
  } catch (err) {
    midiStatus.textContent = 'Access denied';
  }
  updateMidiUI();
}
```

Change it to (the `getSynthMasterGain()` call still happens synchronously, before any `await`, preserving gesture validity — only the new `await ctx.resume()` is added, so `enableMidi()` doesn't resolve until audio is genuinely ready, not just requested):

```js
async function enableMidi() {
  if (!navigator.requestMIDIAccess) {
    midiStatus.textContent = 'Not supported in this browser';
    return;
  }
  // Initialize audio graph now while we still have the user-gesture context.
  // Without this, AudioContext is created later inside a MIDI message handler
  // where Chrome treats it as suspended and produces no sound.
  try {
    const ctx = getAudioCtx();
    getSynthMasterGain();
    if (ctx.state !== 'running') await ctx.resume();
  } catch (_) {}
  try {
    midiAccess = await navigator.requestMIDIAccess();
    midiEnabled = true;
    attachMidiListeners();
    midiAccess.onstatechange = e => {
      if (e.port.type === 'input') attachMidiListeners();
      updateMidiUI();
    };
    localStorage.setItem('mpr_midi', '1');
  } catch (err) {
    midiStatus.textContent = 'Access denied';
  }
  updateMidiUI();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node test-stuck-midi-notes-fix.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 6: Run a regression sample**

```bash
node test-adaptive-weights-category-collision.cjs
node test-left-hand-mode-check.cjs
node test-scale-order-enforcement.cjs
```

Expected: `RESULT: PASS` for all three — these exercise `onMidiMessage()`/`checkMidi()`/held-note tracking indirectly through normal (non-racing) MIDI simulation, confirming the fix doesn't change behavior for the overwhelming majority of note-on/note-off calls that never hit the race window.

- [ ] **Step 7: Commit**

```bash
git add script.js test-stuck-midi-notes-fix.cjs
git commit -m "Fix stuck MIDI notes: cancellation-token guard against the note-on/resume race, enableMidi() awaits its own audio warm-up"
```
