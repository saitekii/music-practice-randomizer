# Claude Workflow Optimization

**Goal:** Reduce repeated context/token spend in future Claude Code sessions on this project by persisting hard-won, currently-undocumented conventions into the repo itself, and by trimming two sources of unbounded growth (the plan-execution ledger, and duplicated test boilerplate).

## Background

A fresh audit of this project's `.claude/` configuration, `CLAUDE.md`, and `docs/` (2026-07-15) found:

- **`.claude/` has zero project-specific skills, agents, or commands** — only `settings.local.json`. Every convention this project has developed over ~50 shipped rounds (stage-line column alignment, pre-flight adjacency-grep discipline, phase-count bookkeeping) currently lives only in the assistant's own session memory, outside the repo — invisible to a human reading the repo, and not guaranteed to be loaded by a differently-configured future session.
- **`.superpowers/sdd/progress.md`** (the plan-execution ledger, git-ignored) is 208 lines and grows every round with no pruning. It's read in full at the start of every `subagent-driven-development` invocation, including sections for plans that shipped and were pushed weeks ago and will never be resumed.
- **78 test files duplicate the same ~20-line Playwright/reporting boilerplate** verbatim (browser launch, `check`/`checkTrue` helpers, the `mpr_settings` pre-seed workaround, the `RESULT: PASS/FAIL` footer).
- **`CLAUDE.md`'s localStorage table documents 3 of the 16 real `mpr_*` keys** (independently re-verified via `grep -oE "'mpr_[a-z_]+'" script.js`, confirmed exactly 16).

## Design

### 1. New skill: `.claude/skills/learning-path-stages/SKILL.md`

A project-local skill (standard Claude Code skill format: YAML frontmatter with `name`/`description`, then a markdown body), triggered whenever `LEARNING_PATH`/`LEARNING_PATH_PHASES` in `script.js` is being added to, removed from, or reordered. Content:

- **Column alignment is per-family, not a single global scheme, and the exact numbers drift as content grows — always re-measure, never hardcode.** As of 2026-07-15, three families exist, verified live against `script.js`:
  - Plain stages (`cats`/`notes`/`chords`/`scales`/`timer`, no `progressions`): `cats:`146, `notes:`179, `chords:`252, `scales:`341, `timer:`381.
  - Stages with `progressions` but no `requireProgressionInversions`: `cats:`146, `notes:`179, `chords:`252, `scales:`341, `progressions:`381, `timer:`449.
  - Stages with both `progressions` and `requireProgressionInversions`: `cats:`147, `notes:`180, `chords:`253, `scales:`342, `progressions:`382, `requireProgressionInversions:`450, `timer:`486.
  - These numbers can shift by a character or two whenever a stage in that family gets a longer `name`/`hint` than any existing sibling — the skill instructs: before writing any new stage line, pick 2-3 sibling lines in the same field-shape family, measure their actual marker offsets with a short Node script (the `padTo`-style pattern used throughout this project's history), and use those measured numbers — never reuse numbers from a prior round without re-measuring.
- **Pre-flight adjacency grep, required before dispatching any implementer**: search the whole test suite for both (a) simple stage-name adjacency assertions (`names.indexOf(...)`, `names[idx+1]`) and (b) `slice()`-based "count stages between X and Y" range checks — on **both** the insertion/deletion point's stage-level neighbors **and** the enclosing phase's neighbors in `LEARNING_PATH_PHASES` (a distinct array from `LEARNING_PATH` — an insertion can break a phase-array-level adjacency assertion even when no stage-level assertion is affected, as happened in the 2026-07-15 scales-ramp-reorder round). If the round both inserts and deletes content, grep both boundaries.
- **Phase-count bookkeeping**: `LEARNING_PATH_PHASES` entries' `count` fields must sum to exactly `LEARNING_PATH.length`. Any insertion/deletion must update the relevant phase's `count`, or add/remove a phase entry if a whole phase is added/removed.
- **Note on ledger hygiene**: periodically archive fully-shipped plan sections out of `.superpowers/sdd/progress.md` into `.superpowers/sdd/progress-archive.md` (see item 2 below) — there's no automation for this, it's a manual housekeeping step worth doing every few rounds rather than letting the ledger grow forever.

### 2. `.superpowers/sdd/progress.md` archival

One-time move: everything currently in `.superpowers/sdd/progress.md` (all fully-shipped, reviewed-clean, pushed plan sections) moves to a new `.superpowers/sdd/progress-archive.md`, leaving `progress.md` empty (or holding only a short header comment) since nothing is currently in-progress. Both files stay git-ignored (already covered by the existing `.superpowers/` line in `.gitignore`) — this is pure local housekeeping with zero repo diff.

### 3. `test-helpers.cjs` (new test files only — existing 78 files are not touched)

New file at the repo root, alongside all test files (so `__dirname` inside it always resolves correctly regardless of which test file requires it):

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

`check()` upgrades from the historically-inconsistent mix of bare `===` (breaks on arrays/objects) and `JSON.stringify`-based comparison (used in the most recent test files) to `JSON.stringify` uniformly — a strict superset that also handles primitives correctly, so it's safe as the one canonical version new files should use.

A new test file using this looks like:

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

CLAUDE.md's Testing section gets this example plus a one-line note that new test files should use `test-helpers.cjs` rather than inlining the boilerplate. The 78 existing files are explicitly NOT migrated — this is additive only, chosen to avoid regression risk on already-working, already-passing files for a purely mechanical refactor.

### 4. `CLAUDE.md` updates

- Replace the existing 3-row localStorage table with the full, independently-verified 16-key list: `mpr_settings`, `mpr_theme`, `mpr_learning_stage`, `mpr_midi`, `mpr_daily`, `mpr_weights`, `mpr_weights_ear`, `mpr_ear_settings`, `mpr_ear_stage`, `mpr_synth_preset`, `mpr_synth_vol`, `mpr_click_vol`, `mpr_band_style`, `mpr_auto_backup_enabled`, `mpr_auto_backup_cadence`, `mpr_last_auto_backup` — each with a one-line description of its contents.
- Add a one-line pointer in the Architecture section (near the existing "Learning Path" subsection) to the new `learning-path-stages` skill, so a future session knows it exists before hand-deriving column alignment from scratch again.
- Add the `test-helpers.cjs` usage note to the Testing section (see item 3).

## Testing

- `.claude/skills/learning-path-stages/SKILL.md` exists with valid frontmatter (`name`, `description`) and is well-formed markdown — no automated test possible for skill *content* quality, but confirm the file parses as valid YAML frontmatter + markdown and that the three column-family numbers in it exactly match what's live in `script.js` today (cross-check, not just internally consistent).
- `.superpowers/sdd/progress-archive.md` contains everything that was previously in `progress.md`; `progress.md` is empty/near-empty afterward; nothing is lost (diff the concatenation of both files against the original `progress.md` content to confirm no data loss).
- `test-helpers.cjs`: a real, permanent, committed test file (`test-test-helpers.cjs`, joining the regular suite — matching this project's established practice of every piece of shared functionality having its own test) verifies `createReporter()`'s `check`/`checkTrue`/`finish` behave identically to the inline pattern (PASS/FAIL output format, `finish()` exits 1 on any failure, 0 otherwise) and `launchApp()` successfully loads the real app (returns a `page` where a known element, e.g. `#pianoKeyboard`, exists in the DOM).
- `CLAUDE.md`: all 16 keys present in the table, matching the live `grep -oE "'mpr_[a-z_]+'" script.js` output exactly (same set, no more, no fewer).
- Regression: `node run-all-tests.cjs` — this round touches no app code (`script.js`/`index.html`/`style.css` untouched), so the full suite should show no new failures beyond the already-known-flaky `test-synth-pluck-karplus.cjs`.
