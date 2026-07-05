# Band Mode Reveal Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Band Mode so a correct chord answer is recognized instantly but only takes effect in the groove on the next downbeat, grooves for a full bar, then reveals the next chord one bar later while still grooving the just-confirmed chord — with no forced timeout ever, including for the very first chord of a session.

**Architecture:** Replace the temporary "ride-out" state (`rideOutActive`/`rideOutChordPcs`, cleared at a fixed beat-count boundary) with two permanent pieces of state — `confirmedChordPcs` (what's audible) and `pendingChordPcs` (answered but not yet applied) — and move all confirm/reveal decisions from a beat-counter check to a downbeat-only check in `onBeatTick`. Also fix a latent bug this surfaces: `getBeatsPerChange()`'s fixed beat count doesn't evenly divide into bars for 3/4 or 5/4, so Band Mode gets its own bar-based cadence (`getBandBarsPerChange()`).

**Tech Stack:** Vanilla JS (`script.js`), Web Audio API, no build step, no framework. Testing via ad hoc Playwright `.cjs` scripts (project convention).

## Global Constraints

- No build step, no framework, no new dependencies.
- `script.js` is a flat file, no classes — new/changed code is plain top-level `function`/`let`/`const`, following existing style exactly.
- No new UI — the existing toggle, panel, and prompt display are unchanged; this is purely a timing-model change underneath (per the addendum spec).
- Non-Band-Mode behavior (scales/intervals/note finder, or Band Mode off entirely) must be provably unaffected — `getBeatsPerChange()` itself stays untouched; the new `getBandBarsPerChange()` is used only inside the band scheduler's own logic.
- Test scripts are `.cjs`, run via `node <script>.cjs`, using the Playwright install at `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`, resolving `index.html` via `path.resolve(__dirname, 'index.html')` (never a hardcoded checkout path).
- Spec: `docs/superpowers/specs/2026-07-05-band-mode-reveal-timing-addendum.md` — read it if anything here seems ambiguous; this plan implements it exactly, plus one clarified detail confirmed with the user during planning: the very first chord of a session follows the identical no-forced-timeout rule as every later one (no special-cased safety net).

---

### Task 1: Rewrite confirm/reveal state machine

**Files:**
- Modify: `script.js:486-491` (state vars), `script.js:2132-2142` (`getBeatsPerBar`/`getBeatsPerChange`/`bandModeEligible`), `script.js:2217-2306` (`scheduleGrooveHit`, `onBeatTick`, `scheduleStep`, `startBandScheduler`, `stopBandScheduler`), `script.js:3170-3186` (`triggerBandSuccess`)
- Delete: `test-band-groove-transition.cjs` (tests a race-condition fix that no longer applies — see Step 7)
- Modify: `test-band-groove-pattern.cjs`, `test-band-toggle-live.cjs`, `test-band-scheduler-core.cjs`
- Rewrite: `test-band-trigger-flow.cjs`

**Interfaces:**
- Consumes: `getBeatsPerBar()`, `getAudioCtx()`, `getBpm()`, `playClick`/`playKick`/`playSnare`/`playHihat`/`playBandBass`/`playBandComp`, `GROOVE_PATTERNS`, `pulseBeat`, `advancePromptOnSchedule`, `promptCard`, `midiSuccessActive`, `MAX_RESPONSE_MS`, `responseTimes`, `recordAdaptiveResult`, `updateDailyLog`, `showResponseTime`, `updateMidiStats`, `updateStreakDisplay` (all existing, unchanged).
- Produces: `confirmedChordPcs` (global, `Array<number> | null` — the chord currently audible in the groove), `pendingChordPcs` (global, `Array<number> | null` — an answered-but-not-yet-applied chord), `barsSinceConfirm` (global, `number` — bars elapsed since `confirmedChordPcs` was last set, counted on downbeats), `getBandBarsPerChange()` (function, returns `1` or `2`). Removes `rideOutActive` and `rideOutChordPcs` entirely — nothing outside this task's files references them afterward.

- [ ] **Step 1: Replace the ride-out state variables**

In `script.js`, lines 486-491 currently read:

```javascript
let bandActive       = false;  // true while the lookahead scheduler (not setInterval) drives the click
let bandSchedulerId  = null;
let nextStepTime     = 0;      // audioCtx time of the next unscheduled eighth-note step
let stepIndex        = 0;      // eighth-note step counter, wraps at (beatsPerBar * 2)
let rideOutActive    = false;  // true while playing the post-correct-answer groove (wired in Task 5)
let rideOutChordPcs  = null;   // pitch classes of the chord being ridden out (wired in Task 5)
```

Replace with:

```javascript
let bandActive       = false;  // true while the lookahead scheduler (not setInterval) drives the click
let bandSchedulerId  = null;
let nextStepTime     = 0;      // audioCtx time of the next unscheduled eighth-note step
let stepIndex        = 0;      // eighth-note step counter, wraps at (beatsPerBar * 2)
let confirmedChordPcs = null;  // pitch classes currently audible in the groove
let pendingChordPcs   = null;  // a correctly-answered chord awaiting the next downbeat to become confirmed
let barsSinceConfirm  = 0;     // bars elapsed since confirmedChordPcs was last set, counted on downbeats
```

- [ ] **Step 2: Add the bar-based cadence helper and rewrite eligibility**

In `script.js`, lines 2140-2142 currently read:

```javascript
function bandModeEligible() {
  return getBeatsPerChange() >= getBeatsPerBar();
}
```

Replace with:

```javascript
function getBandBarsPerChange() {
  return document.getElementById('metroNoteDuration').value === '8' ? 2 : 1;
}

function bandModeEligible() {
  const v = document.getElementById('metroNoteDuration').value;
  return v === '4' || v === '8';
}
```

(`getBeatsPerChange()` itself, just above this, is untouched — it still drives the non-Band-Mode `metroTick()` path exactly as before.)

- [ ] **Step 3: Update `scheduleGrooveHit`'s guard and chord source**

In `script.js`, `scheduleGrooveHit` (lines 2217-2231) currently reads:

```javascript
function scheduleGrooveHit(localStep, time, beatsPerBar) {
  if (!rideOutActive) return;
  const pattern = GROOVE_PATTERNS[beatsPerBar] || GROOVE_PATTERNS[4];

  if (pattern.hihat.includes(localStep)) playHihat(time);
  if (pattern.kick.includes(localStep))  playKick(time);
  if (pattern.snare.includes(localStep)) playSnare(time);

  if (!rideOutChordPcs) return;
  if (pattern.bass.includes(localStep)) playBandBass(rideOutChordPcs[0], time);
  if (pattern.comp.includes(localStep)) {
    const compPcs = rideOutChordPcs.length > 1 ? rideOutChordPcs.slice(1) : rideOutChordPcs;
    playBandComp(compPcs, time);
  }
}
```

Replace with:

```javascript
function scheduleGrooveHit(localStep, time, beatsPerBar) {
  if (!confirmedChordPcs) return;
  const pattern = GROOVE_PATTERNS[beatsPerBar] || GROOVE_PATTERNS[4];

  if (pattern.hihat.includes(localStep)) playHihat(time);
  if (pattern.kick.includes(localStep))  playKick(time);
  if (pattern.snare.includes(localStep)) playSnare(time);

  if (pattern.bass.includes(localStep)) playBandBass(confirmedChordPcs[0], time);
  if (pattern.comp.includes(localStep)) {
    const compPcs = confirmedChordPcs.length > 1 ? confirmedChordPcs.slice(1) : confirmedChordPcs;
    playBandComp(compPcs, time);
  }
}
```

(The old code's second early-return, `if (!rideOutChordPcs) return;`, is gone — `confirmedChordPcs`'s own null-check at the top of the function already covers it, since one array now serves both roles.)

- [ ] **Step 4: Rewrite `onBeatTick`**

In `script.js`, `onBeatTick` (lines 2233-2247) currently reads:

```javascript
function onBeatTick(beatNum) {
  metroBeat = beatNum;
  pulseBeat(beatNum === 0);
  metroCount++;
  if (metroCount >= getBeatsPerChange()) {
    metroCount = 0;
    if (rideOutActive) {
      rideOutActive   = false;
      rideOutChordPcs = null;
      promptCard.classList.remove('midi-success');
      midiSuccessActive = false;
    }
    advancePromptOnSchedule();
  }
}
```

Replace with:

```javascript
function onBeatTick(beatNum) {
  metroBeat = beatNum;
  pulseBeat(beatNum === 0);

  if (beatNum !== 0) return; // only downbeats drive confirm/reveal

  if (pendingChordPcs) {
    confirmedChordPcs = pendingChordPcs;
    pendingChordPcs    = null;
    barsSinceConfirm   = 0;
    return;
  }

  if (confirmedChordPcs) {
    barsSinceConfirm++;
    // Exact match (not >=), and no self-reset here: this must fire exactly once
    // per confirm cycle. barsSinceConfirm keeps growing past the threshold and
    // is only ever reset back to 0 by the pendingChordPcs branch above, when a
    // genuinely new correct answer arrives -- otherwise every later downbeat
    // would re-trigger advancePromptOnSchedule() forever, which is exactly the
    // forced-timeout behavior this design explicitly rules out.
    if (barsSinceConfirm === getBandBarsPerChange()) {
      promptCard.classList.remove('midi-success');
      midiSuccessActive = false;
      advancePromptOnSchedule();
    }
  }
}
```

**Correction found during implementation:** an earlier draft of this step used `barsSinceConfirm >= getBandBarsPerChange()` combined with resetting `barsSinceConfirm = 0` inside the `if`. That combination re-fires the reveal on *every* subsequent downbeat forever once a chord is confirmed, even with no new correct answer — directly violating the "no forced timeout, ever" requirement. The code above (exact `===`, no self-reset) is the corrected version; it fires exactly once per confirm cycle.

Note what this removes: the old unconditional `metroCount++`/`getBeatsPerChange()` check is gone from this function entirely (that pairing still exists, unchanged, in the separate non-Band-Mode `metroTick()` function a little further up in the file — the two paths no longer share any counter). One consequence, confirmed as intentional during design: if no chord has ever been confirmed yet (`confirmedChordPcs` and `pendingChordPcs` both `null` — i.e. before the very first correct answer of a session), neither branch runs, so a downbeat is a no-op and the first prompt simply waits, however long that takes, exactly like every later one.

- [ ] **Step 5: Remove the now-obsolete pickup-note scheduling from `scheduleStep`**

In `script.js`, `scheduleStep` (lines 2249-2273) currently reads:

```javascript
function scheduleStep(step, time) {
  const beatsPerBar = getBeatsPerBar();
  const localStep   = step % (beatsPerBar * 2);

  if (localStep % 2 === 0) {
    playClick(localStep === 0, time);
    const delayMs = Math.max(0, (time - getAudioCtx().currentTime) * 1000);
    setTimeout(() => onBeatTick(localStep / 2), delayMs);

    // If this on-beat is the ride-out's final beat, onBeatTick's boundary check
    // (above) will clear rideOutActive at this beat's own audio time — but the
    // lookahead loop wouldn't otherwise reach the *next* (off-beat) step until
    // roughly half a beat later, well after that clearing already happened,
    // silently dropping the pickup note leading into the next bar/chord.
    // Schedule it eagerly, right now, while rideOutActive/rideOutChordPcs are
    // still valid.
    if (rideOutActive && metroCount + 1 >= getBeatsPerChange()) {
      const secondsPerBeat = 60 / getBpm();
      const nextLocalStep  = (localStep + 1) % (beatsPerBar * 2);
      scheduleGrooveHit(nextLocalStep, time + secondsPerBeat / 2, beatsPerBar);
    }
  }

  scheduleGrooveHit(localStep, time, beatsPerBar);
}
```

Replace with:

```javascript
function scheduleStep(step, time) {
  const beatsPerBar = getBeatsPerBar();
  const localStep   = step % (beatsPerBar * 2);

  if (localStep % 2 === 0) {
    playClick(localStep === 0, time);
    const delayMs = Math.max(0, (time - getAudioCtx().currentTime) * 1000);
    setTimeout(() => onBeatTick(localStep / 2), delayMs);
  }

  scheduleGrooveHit(localStep, time, beatsPerBar);
}
```

(That block existed to avoid dropping a note right when `rideOutActive` got cleared at a boundary. Under this rewrite, `confirmedChordPcs` is never transiently cleared mid-session — only replaced on a downbeat, or cleared entirely on full teardown — so that race no longer exists.)

- [ ] **Step 6: Update `startBandScheduler` and `stopBandScheduler`**

In `script.js`, these two functions (lines 2284-2306) currently read:

```javascript
function startBandScheduler() {
  const ctx = getAudioCtx();
  stepIndex       = 0;
  metroBeat       = 0;
  metroCount      = 0;
  rideOutActive   = false;
  rideOutChordPcs = null;
  nextStepTime    = ctx.currentTime + 0.05;
  bandActive      = true;
  bandSchedulerId = setInterval(bandSchedulerTick, SCHEDULER_INTERVAL_MS);
  syncWakeLock();
}

function stopBandScheduler() {
  clearInterval(bandSchedulerId);
  bandSchedulerId = null;
  bandActive      = false;
  rideOutActive   = false;
  rideOutChordPcs = null;
  promptCard.classList.remove('midi-success');
  midiSuccessActive = false;
  syncWakeLock();
}
```

Replace with:

```javascript
function startBandScheduler() {
  const ctx = getAudioCtx();
  stepIndex         = 0;
  metroBeat         = 0;
  confirmedChordPcs = null;
  pendingChordPcs   = null;
  barsSinceConfirm  = 0;
  nextStepTime      = ctx.currentTime + 0.05;
  bandActive        = true;
  bandSchedulerId   = setInterval(bandSchedulerTick, SCHEDULER_INTERVAL_MS);
  syncWakeLock();
}

function stopBandScheduler() {
  clearInterval(bandSchedulerId);
  bandSchedulerId   = null;
  bandActive        = false;
  confirmedChordPcs = null;
  pendingChordPcs   = null;
  barsSinceConfirm  = 0;
  promptCard.classList.remove('midi-success');
  midiSuccessActive = false;
  syncWakeLock();
}
```

(`metroCount = 0` is dropped from `startBandScheduler` — it's no longer read anywhere in the Band Mode path after Step 4, only by the separate non-Band-Mode `metroTick()`, so resetting it here would be a vestigial no-op.)

- [ ] **Step 7: Update `triggerBandSuccess`**

In `script.js`, `triggerBandSuccess` (lines 3170-3186) currently ends with:

```javascript
  promptCard.classList.add('midi-success');
  rideOutActive   = true;
  rideOutChordPcs = expected.pcs.slice();
}
```

Replace those last two lines with:

```javascript
  promptCard.classList.add('midi-success');
  pendingChordPcs = expected.pcs.slice();
}
```

(Everything above that in the function — the `midiSuccessActive = true` at the top, and the response-time/streak/adaptive stats block — is unchanged. Recognition and stats recording stay instant; only the groove-audible chord is deferred.)

- [ ] **Step 8: Delete the now-obsolete race-condition test**

```bash
rm test-band-groove-transition.cjs
```

This test exercised a fix (eagerly pre-scheduling a trailing off-beat note before `rideOutActive` got cleared) for a race condition that no longer exists after Step 5 — `confirmedChordPcs` is never transiently cleared mid-session, so there's nothing left to race.

- [ ] **Step 9: Fix `test-band-groove-pattern.cjs`'s variable references**

In `test-band-groove-pattern.cjs`, the `page.evaluate` block currently reads:

```javascript
  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // Inactive ride-out: dispatch should be a no-op (no throw either way).
      rideOutActive = false;
      scheduleGrooveHit(0, t, 4);

      // Active ride-out with a C major chord (pcs [0, 4, 7]).
      rideOutActive   = true;
      rideOutChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (per GROOVE_PATTERNS[4])
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + comp
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat

      rideOutActive   = false;
      rideOutChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
```

Replace with:

```javascript
  const result = await page.evaluate(() => {
    try {
      const ctx = getAudioCtx();
      const t   = ctx.currentTime + 0.05;

      // Nothing confirmed yet: dispatch should be a no-op (no throw either way).
      confirmedChordPcs = null;
      scheduleGrooveHit(0, t, 4);

      // Confirmed C major chord (pcs [0, 4, 7]).
      confirmedChordPcs = [0, 4, 7];
      scheduleGrooveHit(0, t, 4);  // step 0: kick + hihat + bass (per GROOVE_PATTERNS[4])
      scheduleGrooveHit(3, t, 4);  // step 3: hihat + comp
      scheduleGrooveHit(2, t, 4);  // step 2: snare + hihat

      confirmedChordPcs = null;
      return { threw: false };
    } catch (e) {
      return { threw: true, message: e.message };
    }
  });
```

The `check('scheduleGrooveHit runs without throwing (active and inactive)', ...)` line and everything below it (the `GROOVE_PATTERNS` shape checks) are unchanged.

- [ ] **Step 10: Fix `test-band-toggle-live.cjs`'s variable references**

In `test-band-toggle-live.cjs`, two spots reference `rideOutActive`. First, lines 99-100 currently read:

```javascript
  const rideOutState = await page.evaluate(() => ({ rideOutActive, midiSuccessActive }));
  check('ride-out engaged before interrupting Band Mode', rideOutState.rideOutActive && rideOutState.midiSuccessActive, true);
```

Replace with:

```javascript
  const rideOutState = await page.evaluate(() => ({ pendingChordPcs, midiSuccessActive }));
  check('chord pending before interrupting Band Mode', !!rideOutState.pendingChordPcs && rideOutState.midiSuccessActive, true);
```

Second, lines 109-110 currently read:

```javascript
  const afterInterrupt = await page.evaluate(() => ({ midiSuccessActive, rideOutActive }));
  check('midiSuccessActive is cleared when scheduler is torn down mid-ride-out', afterInterrupt.midiSuccessActive, false);
```

Replace with:

```javascript
  const afterInterrupt = await page.evaluate(() => ({ midiSuccessActive, pendingChordPcs, confirmedChordPcs }));
  check('midiSuccessActive is cleared when scheduler is torn down mid-ride-out', afterInterrupt.midiSuccessActive, false);
  check('pendingChordPcs is cleared on teardown too', afterInterrupt.pendingChordPcs, null);
  check('confirmedChordPcs is cleared on teardown too', afterInterrupt.confirmedChordPcs, null);
```

Everything else in the file (the toggle-on/off engagement checks, the "MIDI answer detection works again" section) is unchanged.

- [ ] **Step 11: Fix `test-band-scheduler-core.cjs`'s two now-obsolete assertions**

In `test-band-scheduler-core.cjs`, lines 39-45 currently read:

```javascript
  const keyBefore = await page.evaluate(() => currentPromptKey);

  // At BPM 300 and Whole note (4 beats), one bar is 4 * 60/300 = 0.8s. Wait for it to elapse.
  await page.waitForTimeout(1500);

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt key changed after one bar elapsed', keyAfter !== keyBefore, true);
```

This asserted the *old* behavior (prompts auto-advance regardless of whether you ever answer correctly). Under the new model that's no longer true — confirmed with the user during design that the first chord of a session waits indefinitely, same as every later one. Replace with:

```javascript
  const keyBefore = await page.evaluate(() => currentPromptKey);

  // With no correct answer ever given, nothing should auto-advance any more --
  // the old "cycle through prompts regardless of correctness" behavior no longer
  // applies once Band Mode's scheduler is engaged; the very first chord waits
  // indefinitely, the same as every later one. Simulate several downbeats
  // directly (deterministic, no need to wait on real scheduler timing).
  await page.evaluate(() => { onBeatTick(0); onBeatTick(0); onBeatTick(0); });

  const keyAfter = await page.evaluate(() => currentPromptKey);
  check('prompt does NOT auto-advance without ever answering correctly', keyAfter, keyBefore);
```

Second, lines 50-61 currently read:

```javascript
  const result = await page.evaluate(() => {
    metroCount = 2; // simulate partway through a change
    const bandSchedulerIdBefore = bandSchedulerId;
    showPrompt();
    return {
      bandSchedulerIdSame: bandSchedulerId === bandSchedulerIdBefore,
      bandActiveStillTrue: bandActive === true,
      metroCount: metroCount,
    };
  });
  check('showPrompt() does not tear down/recreate the running scheduler', result.bandSchedulerIdSame && result.bandActiveStillTrue, true);
  check('showPrompt() resets metroCount in place', result.metroCount, 0);
```

`metroCount` is no longer read anywhere in the Band Mode path after Step 4, so the second assertion no longer tests anything meaningful. Replace the whole block with:

```javascript
  const result = await page.evaluate(() => {
    const bandSchedulerIdBefore = bandSchedulerId;
    showPrompt();
    return {
      bandSchedulerIdSame: bandSchedulerId === bandSchedulerIdBefore,
      bandActiveStillTrue: bandActive === true,
    };
  });
  check('showPrompt() does not tear down/recreate the running scheduler', result.bandSchedulerIdSame && result.bandActiveStillTrue, true);
```

- [ ] **Step 12: Rewrite `test-band-trigger-flow.cjs`**

The old ride-out model (groove ends and reveal happens at the same instant) is gone; this test needs to prove the new confirm-then-groove-then-reveal cycle instead. Two design choices make this precise and fast rather than flaky:

- Simulate downbeats by calling `onBeatTick(0)` directly instead of waiting on real scheduler timing — deterministic, and exercises the exact same code a real downbeat would run.
- Assert on `promptStartTime` changing (a timestamp `advancePromptOnSchedule()`/`showPrompt()` always freshly sets) rather than on `currentPromptKey` differing — with only one chord type and one root enabled in this test, `generatePrompt()` can legitimately regenerate the *same* key by chance, which would make a key-based "did it advance" check intermittently fail for reasons that have nothing to do with correctness.

Replace the entire file with:

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
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!ok) failed = true;
  };

  // ── Band Mode ON: confirm-then-groove reveal timing ──
  //
  // showPrompt() engages the real scheduler momentarily (needed to get
  // bandActive/eligibility wired up the normal way), but this test then stops
  // it immediately and drives every subsequent beat with direct onBeatTick(0)
  // calls. Leaving the real setInterval-driven scheduler running alongside
  // manual calls would risk a genuine background beat firing in between two
  // of this test's steps, corrupting the precise step-by-step assertions
  // below -- stopping it makes the sequence fully deterministic.
  await page.evaluate(() => {
    midiEnabled = true;
    document.getElementById('catChords').checked = true;
    document.getElementById('chordMajor').checked = true;
    document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
    document.querySelector('input[name="timer"][value="metronome"]').click();
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 1 bar per change
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    stopBandScheduler(); // kill the real interval; bandActive is restored below
    bandActive = true;   // checkMidi()'s routing to triggerBandSuccess depends on this
    // Force a known C major prompt so the correct notes are predictable.
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const startTimeBefore = await page.evaluate(() => promptStartTime);

  await page.evaluate(() => {
    // Simulate playing C-E-G (pcs 0,4,7) via the MIDI path.
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  const rightAfterAnswer = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    confirmedChordPcs,
    midiSuccessActive,
  }));
  check('prompt does not instantly advance on a correct answer', rightAfterAnswer.promptStartTime, startTimeBefore);
  check('chord becomes pending (not yet confirmed) immediately after answering', rightAfterAnswer.pendingChordPcs, [0, 4, 7]);
  check('groove has not started yet (no downbeat has passed since answering)', rightAfterAnswer.confirmedChordPcs, null);
  check('success guard held while pending', rightAfterAnswer.midiSuccessActive, true);

  // Simulate the next downbeat directly, rather than waiting on real time --
  // deterministic and immune to scheduler-timing flakiness.
  await page.evaluate(() => { onBeatTick(0); });
  const afterFirstDownbeat = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    confirmedChordPcs,
  }));
  check('prompt still has not advanced right after the chord is confirmed', afterFirstDownbeat.promptStartTime, startTimeBefore);
  check('chord is now confirmed (audible in the groove)', afterFirstDownbeat.confirmedChordPcs, [0, 4, 7]);
  check('nothing left pending once confirmed', afterFirstDownbeat.pendingChordPcs, null);

  // One more downbeat -- with "Whole note" = 1 bar per change, this is where
  // the next chord should reveal, one full bar after confirmation.
  await page.evaluate(() => { onBeatTick(0); });
  const afterSecondDownbeat = await page.evaluate(() => ({
    promptStartTime,
    confirmedChordPcs,
    midiSuccessActive,
  }));
  check('prompt advances once a full bar of confirmed groove has elapsed', afterSecondDownbeat.promptStartTime !== startTimeBefore, true);
  check('groove keeps playing the same confirmed chord through the reveal', afterSecondDownbeat.confirmedChordPcs, [0, 4, 7]);
  check('input is unlocked again once the next chord is revealed', afterSecondDownbeat.midiSuccessActive, false);

  // No forced timeout: without a new correct answer, further downbeats change nothing.
  const startTimeAfterReveal = afterSecondDownbeat.promptStartTime;
  await page.evaluate(() => { onBeatTick(0); onBeatTick(0); onBeatTick(0); });
  const stillWaiting = await page.evaluate(() => ({
    promptStartTime,
    confirmedChordPcs,
  }));
  check('prompt does not auto-advance again without a new correct answer', stillWaiting.promptStartTime, startTimeAfterReveal);
  check('groove keeps playing the same chord with no new answer', stillWaiting.confirmedChordPcs, [0, 4, 7]);

  // ── Band Mode OFF: correct chord should instantly advance (regression check) ──
  await page.evaluate(() => {
    // Fully tear down the running band scheduler so the OFF setting actually
    // takes effect (bandActive is only consulted when the metronome (re)starts).
    stopBandScheduler();
    stopMetronome();
    document.getElementById('bandModeToggle').checked = false;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const bandActiveOff = await page.evaluate(() => bandActive);
  check('bandActive is false after Band Mode is turned off', bandActiveOff, false);

  const startTimeBefore2 = await page.evaluate(() => promptStartTime);

  await page.evaluate(() => {
    heldNotes = new Set([60, 64, 67]);
    checkMidi();
  });

  await page.waitForTimeout(50);
  const stateRightAfter2 = await page.evaluate(() => ({
    promptStartTime,
    pendingChordPcs,
    midiSuccessActive,
  }));
  check('Band Mode off: does not set a pending chord', stateRightAfter2.pendingChordPcs, null);
  check('Band Mode off: prompt has not advanced yet at 50ms (still on the 700ms path)', stateRightAfter2.promptStartTime, startTimeBefore2);

  await page.waitForTimeout(900); // triggerMidiSuccess advances after a fixed 700ms
  const startTimeAfter2 = await page.evaluate(() => promptStartTime);
  check('Band Mode off: prompt still advances via the original 700ms path', startTimeAfter2 !== startTimeBefore2, true);

  await browser.close();
  if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
  console.log('RESULT: PASS');
})();
```

- [ ] **Step 13: Run all four touched test files**

```bash
node test-band-groove-pattern.cjs
node test-band-toggle-live.cjs
node test-band-scheduler-core.cjs
node test-band-trigger-flow.cjs
```

Expected: all four print only `PASS` lines and end with `RESULT: PASS`.

- [ ] **Step 14: Commit**

```bash
git add script.js test-band-groove-pattern.cjs test-band-toggle-live.cjs test-band-scheduler-core.cjs test-band-trigger-flow.cjs
git rm test-band-groove-transition.cjs
git commit -m "Rework Band Mode to confirm chords on the next downbeat and reveal a bar later"
```

---

### Task 2: Bar-alignment coverage and full regression sweep

**Files:**
- Modify: `test-band-e2e.cjs`
- Test: `test-band-e2e.cjs` (existing, being extended), full existing suite

**Interfaces:**
- Consumes: `getBandBarsPerChange()`, `bandModeEligible()`, `confirmedChordPcs`, `pendingChordPcs` (all from Task 1).

This task is verification-only — no further production changes are expected. It proves the bar-alignment fix (5/4 + "Whole note" is newly eligible) and re-sweeps the whole suite for regressions and flakiness, fixing anything it finds (matching how the original plan's Task 6 operated).

- [ ] **Step 1: Fix `test-band-e2e.cjs`'s key-based assertion (same flakiness class as Task 1 Step 12)**

In `test-band-e2e.cjs`, the loop body currently reads:

```javascript
  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      // "2 bars" (beatsPerChange = 8) so eligibility (beatsPerChange >= beatsPerBar) holds
      // for every tested time signature, including 5/4.
      document.getElementById('metroNoteDuration').value = '8';
      document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const before = await page.evaluate(() => currentPromptKey);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    // 8 beats @ 300bpm = 1.6s worst case (answered right at the top of the cycle); pad generously
    // for headless-browser/scheduler-housekeeping overhead on top of that.
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => currentPromptKey);
    check(`time sig ${timeSig}/4: prompt advances after ride-out`, after !== before, true);
  }
```

Replace with (switches to `promptStartTime`, which is immune to the "regenerated the same key by chance" flakiness class, and widens the wait to match the new worst-case timing — confirm can take up to one full bar, then reveal takes another `getBandBarsPerChange()` bars, so for "2 bars" that's up to 3 bar-lengths total, not the old model's 2):

```javascript
  for (const timeSig of ['4', '3', '5']) {
    await page.evaluate((sig) => {
      midiEnabled = true;
      document.getElementById('catChords').checked = true;
      document.getElementById('chordMajor').checked = true;
      document.querySelectorAll('input[data-note]').forEach(el => { el.checked = (el.dataset.note === 'C'); });
      document.querySelector('input[name="timer"][value="metronome"]').click();
      metroBpmInput.value = '300';
      // "2 bars" -- getBandBarsPerChange() returns 2, so this is eligible for
      // every tested time signature (bandModeEligible() only checks the
      // metroNoteDuration value itself, not a beat-count comparison anymore).
      document.getElementById('metroNoteDuration').value = '8';
      document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
      document.getElementById('metroTimeSig').value = sig;
      document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
      document.getElementById('bandModeToggle').checked = true;
      document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
      showPrompt();
      currentPromptKey = 'chord|C|Major|';
      promptStartTime = Date.now();
    }, timeSig);
    await page.waitForTimeout(100);

    const startBefore = await page.evaluate(() => promptStartTime);
    await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
    // Worst case: up to 1 bar to confirm, then getBandBarsPerChange()=2 more
    // bars to reveal = 3 bar-lengths total. At 300bpm, 3 bars of a 5-beat bar
    // is 3s; pad generously for headless-browser/scheduler-housekeeping overhead.
    await page.waitForTimeout(4500);
    const startAfter = await page.evaluate(() => promptStartTime);
    check(`time sig ${timeSig}/4: prompt advances after confirm+reveal`, startAfter !== startBefore, true);
  }
```

- [ ] **Step 2: Add the newly-eligible 5/4 + "Whole note" case**

Directly after the `for` loop's closing `}` (but before the `check('no uncaught page errors...` line), add a standalone scenario proving the bar-alignment fix: 5/4 with "Whole note" was previously ineligible (4 beats < a 5-beat bar under the old fixed-beat-count comparison) and should now work correctly with a 1-bar cadence.

```javascript
  // Bar-alignment fix: 5/4 + "Whole note" was previously ineligible (the old
  // fixed beat count, 4, was less than a 5-beat bar). getBandBarsPerChange()
  // makes this a proper 1-bar cadence now.
  await page.evaluate(() => {
    document.getElementById('metroTimeSig').value = '5';
    document.getElementById('metroTimeSig').dispatchEvent(new Event('change'));
    document.getElementById('metroNoteDuration').value = '4'; // Whole note = 1 bar
    document.getElementById('metroNoteDuration').dispatchEvent(new Event('change'));
  });
  const fiveFourEligible = await page.evaluate(() => bandModeEligible());
  check('5/4 + Whole note is now eligible (previously excluded)', fiveFourEligible, true);

  await page.evaluate(() => {
    document.getElementById('bandModeToggle').checked = true;
    document.getElementById('bandModeToggle').dispatchEvent(new Event('change'));
    showPrompt();
    currentPromptKey = 'chord|C|Major|';
    promptStartTime = Date.now();
  });
  await page.waitForTimeout(100);

  const startBefore5 = await page.evaluate(() => promptStartTime);
  await page.evaluate(() => { heldNotes = new Set([60, 64, 67]); checkMidi(); });
  // Worst case: 1 bar to confirm + 1 bar (getBandBarsPerChange()=1) to reveal
  // = 2 bar-lengths of a 5-beat bar at 300bpm = 2s; pad generously.
  await page.waitForTimeout(3000);
  const startAfter5 = await page.evaluate(() => promptStartTime);
  check('5/4 + Whole note: prompt advances after confirm+reveal', startAfter5 !== startBefore5, true);
```

- [ ] **Step 3: Run the updated e2e test three times to confirm it isn't flaky**

```bash
node test-band-e2e.cjs
node test-band-e2e.cjs
node test-band-e2e.cjs
```

Expected: all three runs print only `PASS` lines and end with `RESULT: PASS`, with no `Errors seen:` output.

- [ ] **Step 4: Run the full remaining suite**

```bash
node test-band-mode-toggle.cjs
node test-band-scheduler-core.cjs
node test-band-percussion.cjs
node test-band-groove-pattern.cjs
node test-band-trigger-flow.cjs
node test-band-toggle-live.cjs
node test-band-e2e.cjs
```

Expected: every file prints only `PASS` lines and ends with `RESULT: PASS`. (`test-band-groove-transition.cjs` no longer exists, per Task 1 Step 8, and is correctly absent from this list.)

- [ ] **Step 5: Commit**

```bash
git add test-band-e2e.cjs
git commit -m "Add 5/4+Whole-note bar-alignment coverage and de-flake e2e assertions"
```

- [ ] **Step 6: Note the manual-listening gap**

As with the original Band Mode plan, no MIDI/audio hardware is available in this environment — every check above proves the state machine and timing plumbing are correct, not that the result actually sounds musical. Say so plainly in your final report: this rework still needs a real listen-through before being considered done, same as the original feature.

---

## Self-Review Notes

- **Spec coverage:** Instant-recognition/deferred-audio (Task 1 Steps 4, 7), one-bar-lead-time reveal (Task 1 Step 4), no-forced-timeout including the first chord (Task 1 Step 4 + Task 1 Step 11's updated assertion), bar-alignment fix and its 5/4 side effect (Task 1 Step 2, Task 2 Step 2), removal of the now-unnecessary pickup-note fix (Task 1 Step 5), teardown cleanup (Task 1 Step 6) — all covered.
- **Placeholder scan:** every step has complete, runnable code; no TBD/TODO.
- **Type/name consistency checked:** `confirmedChordPcs`, `pendingChordPcs`, `barsSinceConfirm`, `getBandBarsPerChange()` are spelled identically everywhere they're introduced (Task 1) and consumed (Task 2). `rideOutActive`/`rideOutChordPcs` do not appear anywhere after Task 1 completes — confirmed by re-reading every remaining test file's planned content above.
- **A note on test design carried through this plan:** two flakiness classes were found by actually running the existing suite during planning (not merely reasoned about): a chord/root pool broad enough to let `generatePrompt()` coincidentally regenerate the same key, and wait margins sized for the old (shorter) ride-out model. Both are fixed at the root (asserting on `promptStartTime` instead of prompt content, and widening waits to the new worst-case bar count) rather than patched over with retries.
