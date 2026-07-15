# Claude Workflow Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist this project's hard-won-but-undocumented conventions into the repo (a new project-local skill), stop two sources of unbounded context growth (the plan-execution ledger, duplicated test boilerplate), and fix stale documentation in `CLAUDE.md`.

**Architecture:** Four independent pieces — a new skill file, a one-time ledger archival, a new shared test-helper module (additive only, no migration of existing files), and `CLAUDE.md` edits. No app code (`script.js`/`index.html`/`style.css`) is touched.

**Tech Stack:** Markdown (skill file, docs), vanilla Node.js/CommonJS (`test-helpers.cjs`), no build step.

## Global Constraints

- No changes to `script.js`, `index.html`, or `style.css` in this plan.
- The 78 existing test files are NOT migrated to `test-helpers.cjs` — additive only, per explicit scope decision during brainstorming.
- Column-alignment numbers documented in the new skill must be the numbers measured live against `script.js` on 2026-07-15 (146/179/252/341/381 for plain stages; 146/179/252/341/381/449 for stages with `progressions` only; 147/180/253/342/382/450/486 for stages with both `progressions` and `requireProgressionInversions`) — copy them exactly, they were re-verified against the live file during planning, not recalled from memory.
- `.superpowers/` stays git-ignored (already covered by the existing `.gitignore` entry) — the ledger archival in Task 2 produces zero repo diff.
- `test-helpers.cjs` must work correctly regardless of which directory the requiring test file lives in (all current test files are flat at the repo root, but the module's own `__dirname`-based path resolution must not assume anything about the caller's location).

---

### Task 1: New skill — `.claude/skills/learning-path-stages/SKILL.md`

**Files:**
- Create: `.claude/skills/learning-path-stages/SKILL.md`

**Interfaces:**
- Produces: nothing consumed programmatically by later tasks — this is a standalone documentation artifact. Task 4 references this skill's name/path in a CLAUDE.md pointer, but does not depend on this task's exact prose content, only its file path.

- [ ] **Step 1: Create the skill directory and file**

Create `.claude/skills/learning-path-stages/SKILL.md`:

```markdown
---
name: learning-path-stages
description: Use when adding, removing, or reordering stages or phases in script.js's LEARNING_PATH or LEARNING_PATH_PHASES arrays — covers the column-alignment conventions and the pre-flight adjacency-grep discipline this project has learned the hard way, across many rounds, before this skill existed to write it down.
---

# Learning Path Stage Editing

`LEARNING_PATH` (script.js) is a large, still-growing array of stage objects. `LEARNING_PATH_PHASES` is a separate, parallel array of `{ name, count }` entries describing named groupings of consecutive stages — a `count`-based design (not a per-stage `phase` field) chosen specifically so a stage insertion only requires bumping one phase's `count` rather than touching every affected stage object.

## Column alignment

Stage lines are hand-formatted to align at fixed character columns, per field, so the array reads like a table. **The exact columns are NOT a single global constant — they differ by which optional fields a stage has, and they drift over time as longer `name`/`hint` strings get added.** Never reuse a column number from a prior round without re-measuring against live sibling lines first.

As of 2026-07-15, three families exist (verified live against `script.js` — re-verify before trusting these again):

| Family | Fields | `cats:` | `notes:` | `chords:` | `scales:` | `progressions:` | `requireProgressionInversions:` | `timer:` |
|---|---|---|---|---|---|---|---|---|
| Plain | cats/notes/chords/scales/timer | 146 | 179 | 252 | 341 | — | — | 381 |
| +progressions | adds `progressions` | 146 | 179 | 252 | 341 | 381 | — | 449 |
| +progressions+inversions | adds `progressions` and `requireProgressionInversions` | 147 | 180 | 253 | 342 | 382 | 450 | 486 |

**Before writing any new stage line:**
1. Identify which family it belongs to (which optional fields it has).
2. Find 2-3 existing sibling stage lines in that exact family.
3. Measure their actual column offsets with a short Node script, e.g.:
   ```js
   const fs = require('fs');
   const lines = fs.readFileSync('script.js', 'utf8').split('\n');
   const line = lines.find(l => l.includes("name: 'SOME_SIBLING_STAGE_NAME'"));
   ['cats:','notes:','chords:','scales:','progressions:','requireProgressionInversions:','timer:']
     .forEach(m => { const i = line.indexOf(m); if (i !== -1) console.log(m, i); });
   ```
4. Build new lines with a `padTo`-style helper targeting those exact measured columns — never eyeball spacing.
5. After writing, re-measure the new lines themselves and confirm they land on the same columns as the siblings.

## Pre-flight adjacency grep — required before dispatching any implementer

Before finalizing a plan that inserts, deletes, or reorders `LEARNING_PATH` content, grep the whole test suite for BOTH of these, on BOTH sides of every insertion/deletion point:

1. **Simple stage-name adjacency assertions** — `names.indexOf('X')`, `names[idx + 1]`, etc.
2. **`slice()`-based range checks** — `LEARNING_PATH.slice(idxA, idxB)`, "count stages between X and Y."

Check adjacency at **both** the `LEARNING_PATH` (stage) level and the `LEARNING_PATH_PHASES` (phase) level — these are two separate arrays, and a phase-array-level assertion (e.g. "which phase comes right before phase X") can break even when no stage-level assertion is affected. This exact gap was missed by a plan's own pre-flight grep on 2026-07-15 and only caught by an implementer mid-task.

If the round both inserts AND deletes content (rare, but has happened), grep both the insertion boundary and the deletion boundary — they are usually different locations in the file.

## Phase-count bookkeeping

`LEARNING_PATH_PHASES`'s `count` fields must sum to exactly `LEARNING_PATH.length`. Any insertion or deletion must update the relevant phase's `count`, or add/remove a whole phase entry if a whole phase is being added or removed. Verify with a quick live check before considering a round done:

```js
LEARNING_PATH_PHASES.reduce((sum, p) => sum + p.count, 0) === LEARNING_PATH.length
```

## Ledger hygiene

`.superpowers/sdd/progress.md` (the plan-execution ledger) has no automated pruning. Periodically — every several rounds, not every round — archive sections for plans that are fully shipped (final review clean, pushed) into `.superpowers/sdd/progress-archive.md`, leaving only the current/most-recent plan's section in the live ledger. This isn't required before every round, but doing it occasionally keeps the ledger from growing forever.
```

- [ ] **Step 2: Verify the file is well-formed**

Run: `node -e "const fs=require('fs'); const c=fs.readFileSync('.claude/skills/learning-path-stages/SKILL.md','utf8'); if (!c.startsWith('---')) throw new Error('missing frontmatter'); console.log('OK, length:', c.length);"`
Expected: prints `OK, length: <N>` with no error.

- [ ] **Step 3: Cross-check the column numbers against the live file**

Run this to confirm the three families' numbers in the new skill file exactly match what's live in `script.js` right now:

```bash
node -e "
const fs = require('fs');
const lines = fs.readFileSync('script.js', 'utf8').split('\n');
function cols(line) {
  return ['cats:','notes:','chords:','scales:','progressions:','requireProgressionInversions:','timer:']
    .map(m => [m, line.indexOf(m)]).filter(([,i]) => i !== -1);
}
console.log('Plain:', cols(lines.find(l => l.includes(\"name: 'Scale Timer'\"))));
console.log('+progressions:', cols(lines.find(l => l.includes(\"name: 'First Minor Progression'\") && l.includes('progressions'))));
console.log('+progressions+inversions:', cols(lines.find(l => l.includes(\"name: 'Two-Handed Minor Progression'\"))));
"
```

Expected: `Plain` shows `cats:`146/`notes:`179/`chords:`252/`scales:`341/`timer:`381; `+progressions` shows the same 4 plus `progressions:`381/`timer:`449; `+progressions+inversions` shows `cats:`147/`notes:`180/`chords:`253/`scales:`342/`progressions:`382/`requireProgressionInversions:`450/`timer:`486. If any of these differ from what Step 1 wrote into the skill file, update the skill file's table to match — the live file is the source of truth, not this plan.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/learning-path-stages/SKILL.md
git commit -m "Add learning-path-stages skill: column alignment and adjacency-grep conventions"
```

---

### Task 2: Archive the plan-execution ledger

**Files:**
- Create: `.superpowers/sdd/progress-archive.md`
- Modify: `.superpowers/sdd/progress.md`

**Interfaces:**
- Produces: nothing consumed by later tasks. Both files are git-ignored — this task produces zero `git diff` in the tracked repo.

- [ ] **Step 1: Copy the current ledger to the archive**

```bash
cp .superpowers/sdd/progress.md .superpowers/sdd/progress-archive.md
```

- [ ] **Step 2: Verify no data was lost**

Run: `diff .superpowers/sdd/progress.md .superpowers/sdd/progress-archive.md`
Expected: no output (the two files are identical at this point, confirming the copy is complete before truncating the original).

- [ ] **Step 3: Truncate the live ledger**

Replace the entire contents of `.superpowers/sdd/progress.md` with just:

```
# Plan Execution Ledger

Tracks progress for the CURRENTLY ACTIVE plan only (compaction recovery — see subagent-driven-development skill). Fully-shipped plans are archived to progress-archive.md; check there for history, not here.
```

- [ ] **Step 4: Verify the archive still has everything, and the live ledger is now minimal**

Run: `wc -l .superpowers/sdd/progress.md .superpowers/sdd/progress-archive.md`
Expected: `progress.md` shows 3 lines; `progress-archive.md` shows the original line count (208 or whatever it was immediately before this task started — confirm it matches what Step 2's `diff` compared against, i.e. nothing was lost between Step 1 and Step 3).

No commit for this task — both files are git-ignored, so there is nothing to add to git. Skip the usual "Step N: Commit" step entirely for this task.

---

### Task 3: `test-helpers.cjs` + its test

**Files:**
- Create: `test-helpers.cjs`
- Create: `test-test-helpers.cjs`

**Interfaces:**
- Produces: `createReporter()` — no arguments, returns `{ check(label, actual, expected), checkTrue(label, condition, extra), finish() }`. `launchApp({ viewport, seedSettings })` — both options optional (defaults: `viewport = { width: 420, height: 800 }`, `seedSettings = true`), returns a Promise resolving to `{ browser, page }` (a live Playwright `Browser`/`Page` with the real app already loaded).
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write the failing test**

Create `test-test-helpers.cjs`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-test-helpers.cjs`
Expected: an error (not a clean FAIL report) — `require('./test-helpers.cjs')` throws `Cannot find module` since the file doesn't exist yet.

- [ ] **Step 3: Write `test-helpers.cjs`**

Create `test-helpers.cjs`:

```js
const path = require('path');
const { chromium } = require('C:\\Users\\John\\AppData\\Local\\Temp\\pw\\node_modules\\playwright');

function createReporter() {
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
  const finish = () => {
    console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
    if (failed) process.exit(1);
  };
  return { check, checkTrue, finish };
}

async function launchApp({ viewport = { width: 420, height: 800 }, seedSettings = true } = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  if (seedSettings) {
    await page.addInitScript(() => localStorage.setItem('mpr_settings', '{}'));
  }
  await page.goto('file://' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/'));
  await page.waitForTimeout(300);
  return { browser, page };
}

module.exports = { createReporter, launchApp };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-test-helpers.cjs`
Expected: `RESULT: PASS`, every check/checkTrue line prefixed `PASS`.

- [ ] **Step 5: Commit**

```bash
git add test-helpers.cjs test-test-helpers.cjs
git commit -m "Add test-helpers.cjs shared Playwright/reporting module for new test files"
```

---

### Task 4: `CLAUDE.md` updates

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: the skill's name/path from Task 1 (`.claude/skills/learning-path-stages/SKILL.md`, skill name `learning-path-stages`) and the `test-helpers.cjs` usage shape from Task 3 (`createReporter()`/`launchApp()`).

- [ ] **Step 1: Add the `test-helpers.cjs` usage note to the Testing section**

The current text (lines 9-16) reads:

```markdown
## Testing

No dev server or test suite runner beyond `run-all-tests.cjs`. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run a single test: `node test-script.cjs`
- Run the entire suite: `node run-all-tests.cjs` (discovers and runs every `test-*.cjs` file at the repo root sequentially; exits non-zero if anything fails)
```

Change it to (adds a bullet about `test-helpers.cjs` with a usage example):

```markdown
## Testing

No dev server or test suite runner beyond `run-all-tests.cjs`. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run a single test: `node test-script.cjs`
- Run the entire suite: `node run-all-tests.cjs` (discovers and runs every `test-*.cjs` file at the repo root sequentially; exits non-zero if anything fails)
- New test files should use `test-helpers.cjs` instead of inlining the Playwright/reporting boilerplate (existing test files predate this and are not migrated):

  ```js
  const { createReporter, launchApp } = require('./test-helpers.cjs');

  (async () => {
    const { browser, page } = await launchApp();
    const { check, checkTrue, finish } = createReporter();

    // ... test body using check()/checkTrue() ...

    await browser.close();
    finish();
  })();
  ```
```

- [ ] **Step 2: Fix the stale Learning Path description and add the skill pointer**

The current text (line 28-30) reads:

```markdown
### Learning Path

`LEARNING_PATH` is a 41-entry array of stage objects. `applyStage(idx)` wipes all categories, chord types, scale types, and root notes, then sets only what the stage specifies plus the timer value. Calls `saveSettings()` + `syncUI()` + `showPrompt()`. Shuffle Settings exits the path. Stage persisted as `mpr_learning_stage` in localStorage.
```

Change it to (fixes the stale "41-entry" claim — found live to be 154 as of 2026-07-15, and this number will keep changing, so the fix avoids hardcoding a number that will just go stale again — and adds a pointer to the new skill):

```markdown
### Learning Path

`LEARNING_PATH` is a large, still-growing array of stage objects — check `LEARNING_PATH.length` live rather than trusting a hardcoded count in prose (it was wrong here for a long time: this doc said "41-entry" while the live array had grown to 154). `applyStage(idx)` wipes all categories, chord types, scale types, and root notes, then sets only what the stage specifies plus the timer value. Calls `saveSettings()` + `syncUI()` + `showPrompt()`. Shuffle Settings exits the path. Stage persisted as `mpr_learning_stage` in localStorage (by stage **name**, not index — this was fixed 2026-07-09 specifically so stage insertions don't silently shift a learner's saved position). **Adding, removing, or reordering stages/phases**: use the `learning-path-stages` skill (`.claude/skills/learning-path-stages/SKILL.md`) — it covers the column-alignment conventions and pre-flight adjacency-grep discipline this project has learned the hard way.
```

- [ ] **Step 3: Replace the localStorage keys table with the full 16-key list**

The current text (lines 32-38) reads:

```markdown
### localStorage keys

| Key | Contents |
|-----|----------|
| `mpr_settings` | All checkbox/radio/select state |
| `mpr_theme` | `"dark"` or `"light"` |
| `mpr_learning_stage` | Current stage index (absent = not on path) |
```

Change it to (adds the 13 undocumented keys, and fixes `mpr_learning_stage`'s description to match Step 2's fix — it stores the stage name, not an index):

```markdown
### localStorage keys

| Key | Contents |
|-----|----------|
| `mpr_settings` | All checkbox/radio/select state |
| `mpr_theme` | `"dark"` or `"light"` |
| `mpr_learning_stage` | Current stage **name** (not index; absent = not on path) |
| `mpr_midi` | `"1"` if MIDI was enabled last session |
| `mpr_daily` | 30-day practice history log |
| `mpr_weights` | Adaptive-practice weights (Playing mode) |
| `mpr_weights_ear` | Adaptive-practice weights (Ear Training mode) |
| `mpr_ear_settings` | Ear Training category checkboxes + label visibility |
| `mpr_ear_stage` | Current Ear Training learning-path stage index |
| `mpr_synth_preset` | Selected synth voice preset |
| `mpr_synth_vol` | Synth master volume (0-100) |
| `mpr_click_vol` | Metronome click volume (0-100) |
| `mpr_band_style` | Selected Band Mode groove style |
| `mpr_auto_backup_enabled` | `"1"` if auto-backup is on (off by default) |
| `mpr_auto_backup_cadence` | `"daily"` / `"weekly"` / `"monthly"` |
| `mpr_last_auto_backup` | Timestamp of the last automatic backup |
```

- [ ] **Step 4: Verify the key list is complete and matches live code exactly**

Run: `grep -oE "'mpr_[a-z_]+'" script.js | sort -u`
Expected: exactly 16 distinct keys, and every single one appears as a row in the Step 3 table (cross-check by eye — same set, no more, no fewer).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Fix stale Learning Path/localStorage docs in CLAUDE.md; document test-helpers.cjs and the new skill"
```
