# Test Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `run-all-tests.cjs`, a single command that runs this repo's entire Playwright test suite (75+ `test-*.cjs` files at the repo root) sequentially and reports one clear pass/fail result — replacing the currently undocumented, ad hoc practice of running tests one at a time or hand-writing a loop.

**Architecture:** A plain Node script (no new dependency) that discovers `test-*.cjs` files via `fs.readdirSync`, runs each as a child process via `child_process.spawnSync`, streams a one-line status per file as it completes, and prints a final pass/fail summary with a non-zero exit code on any failure.

**Tech Stack:** Vanilla Node.js (no build step, no framework — see repo CLAUDE.md), `child_process`/`fs`/`path`/`os` built-ins only.

## Global Constraints

- The new file must be named `run-all-tests.cjs` and live at the repo root, matching every existing test file's `.cjs` convention.
- Execution is **sequential**, one file at a time, in alphabetical order — not parallel (see spec's Background section for why: a real suite run surfaced a flaky test even sequentially; parallel headless-Chromium launches would likely make that worse).
- File discovery matches `/^test-.*\.cjs$/` against `fs.readdirSync(targetDir)`, where `targetDir` defaults to `__dirname` but can be overridden via an optional CLI argument: `node run-all-tests.cjs [dir]`. This override exists solely so the runner's own test can point it at a throwaway fixture directory instead of executing the real 75-file suite.
- Per-file output streams immediately as each file finishes: `[N/total] PASS|FAIL <filename> (<elapsed>s)`. On FAIL, the child process's combined stdout+stderr is printed immediately after, each line indented by 2 spaces.
- Final summary format (printed once, after all files complete):
  ```
  ==============================
  <N> files: <P> passed, <F> failed
  Total time: <M>m <S>s
  Failed:
    <filename>
    <filename>
  ==============================
  ```
  The `Failed:` block is only printed if `F > 0`.
- Exit code: `1` if any file failed, `0` if all passed.
- CLAUDE.md's Testing section gets one new line documenting `node run-all-tests.cjs`, added alongside (not replacing) the existing single-file instruction.
- The runner's own test must NOT invoke Playwright/Chromium (it tests Node-level child-process orchestration, not browser behavior) and must NOT run the real 75-file suite as part of itself (too slow, and would make the test's own runtime scale with the whole project). It tests against small, throwaway fixture files created in a temp directory.

---

### Task 1: `run-all-tests.cjs` runner script, its test, and the CLAUDE.md doc update

**Files:**
- Create: `run-all-tests.cjs`
- Create: `test-run-all-tests.cjs`
- Modify: `CLAUDE.md` (Testing section)

**Interfaces:**
- Produces: `run-all-tests.cjs` is a standalone script invoked as `node run-all-tests.cjs [dir]` — no exported functions, no other file depends on it programmatically. Its only "interface" is: CLI argument (optional directory), stdout output format (documented in Global Constraints above), and process exit code.

- [ ] **Step 1: Write the failing test**

Create `test-run-all-tests.cjs`:

```js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

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

const RUNNER = path.resolve(__dirname, 'run-all-tests.cjs');

// --- Fixture directory: 2 passing files, 1 failing file, 1 non-matching file ---
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpr-run-all-tests-'));
fs.writeFileSync(path.join(fixtureDir, 'test-fixture-pass-a.cjs'), 'process.exit(0);\n');
fs.writeFileSync(path.join(fixtureDir, 'test-fixture-pass-b.cjs'), 'process.exit(0);\n');
fs.writeFileSync(path.join(fixtureDir, 'test-fixture-fail.cjs'), "console.log('FIXTURE FAILURE MARKER');\nprocess.exit(1);\n");
fs.writeFileSync(path.join(fixtureDir, 'not-a-test-file.cjs'), 'process.exit(0);\n'); // must be ignored by discovery

const fixtureResult = spawnSync('node', [RUNNER, fixtureDir], { encoding: 'utf8' });
const fixtureOutput = fixtureResult.stdout + fixtureResult.stderr;

check('runner exits 1 when a fixture file fails', fixtureResult.status, 1);
checkTrue('summary reports 3 files, ignoring the non-test-*.cjs file', /3 files: 2 passed, 1 failed/.test(fixtureOutput), fixtureOutput);
checkTrue('failed fixture file is named in the Failed: list', fixtureOutput.includes('test-fixture-fail.cjs'), null);
checkTrue("failed fixture's own stdout (FIXTURE FAILURE MARKER) is shown in the runner's output", fixtureOutput.includes('FIXTURE FAILURE MARKER'), null);
checkTrue('both passing fixture files are individually reported as PASS', /PASS test-fixture-pass-a\.cjs/.test(fixtureOutput) && /PASS test-fixture-pass-b\.cjs/.test(fixtureOutput), null);
checkTrue('the non-matching fixture file is never mentioned in the output', !fixtureOutput.includes('not-a-test-file.cjs'), null);

fs.rmSync(fixtureDir, { recursive: true, force: true });

// --- All-passing fixture directory: exit code 0, no Failed: block ---
const passDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mpr-run-all-tests-pass-'));
fs.writeFileSync(path.join(passDir, 'test-fixture-ok.cjs'), 'process.exit(0);\n');
const passResult = spawnSync('node', [RUNNER, passDir], { encoding: 'utf8' });
const passOutput = passResult.stdout + passResult.stderr;
check('runner exits 0 when all fixture files pass', passResult.status, 0);
checkTrue('summary reports 1 files: 1 passed, 0 failed', /1 files: 1 passed, 0 failed/.test(passOutput), passOutput);
checkTrue('no Failed: block is printed when nothing failed', !passOutput.includes('Failed:'), null);
fs.rmSync(passDir, { recursive: true, force: true });

// --- Sanity check against the real repo root (count only, NOT full execution) ---
const repoRoot = path.resolve(__dirname);
const realTestFileCount = fs.readdirSync(repoRoot).filter(f => /^test-.*\.cjs$/.test(f)).length;
checkTrue(`repo root has at least 70 real test-*.cjs files (sanity check, found ${realTestFileCount})`, realTestFileCount >= 70, null);

if (failed) { console.log('RESULT: FAIL'); process.exit(1); }
console.log('RESULT: PASS');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-run-all-tests.cjs`
Expected: FAIL — every check involving `RUNNER` fails, since `run-all-tests.cjs` doesn't exist yet (spawnSync will report a non-zero/error status because Node can't find the file to run).

- [ ] **Step 3: Write the runner script**

Create `run-all-tests.cjs`:

```js
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const targetDir = path.resolve(process.argv[2] || __dirname);

const files = fs.readdirSync(targetDir)
  .filter(f => /^test-.*\.cjs$/.test(f))
  .sort();

let passed = 0;
let failed = 0;
const failedFiles = [];
const startAll = Date.now();

files.forEach((file, i) => {
  const start = Date.now();
  const result = spawnSync('node', [file], { cwd: targetDir, encoding: 'utf8' });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const ok = result.status === 0;

  console.log(`[${i + 1}/${files.length}] ${ok ? 'PASS' : 'FAIL'} ${file} (${elapsed}s)`);

  if (ok) {
    passed++;
  } else {
    failed++;
    failedFiles.push(file);
    const output = (result.stdout || '') + (result.stderr || '');
    console.log(output.split('\n').map(line => `  ${line}`).join('\n'));
  }
});

const totalMs = Date.now() - startAll;
const mins = Math.floor(totalMs / 60000);
const secs = Math.round((totalMs % 60000) / 1000);

console.log('='.repeat(30));
console.log(`${files.length} files: ${passed} passed, ${failed} failed`);
console.log(`Total time: ${mins}m ${secs}s`);
if (failedFiles.length) {
  console.log('Failed:');
  failedFiles.forEach(f => console.log(`  ${f}`));
}
console.log('='.repeat(30));

process.exit(failed > 0 ? 1 : 0);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-run-all-tests.cjs`
Expected: `RESULT: PASS`, every check line prefixed `PASS`.

- [ ] **Step 5: Update CLAUDE.md**

The current Testing section of `CLAUDE.md` reads:

```markdown
## Testing

No dev server or test suite. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run: `node test-script.cjs`
```

Change it to (adds one line documenting the new full-suite command):

```markdown
## Testing

No dev server or test suite runner beyond `run-all-tests.cjs`. For automated testing, Playwright is pre-installed:

- Path: `C:\Users\John\AppData\Local\Temp\pw\node_modules\playwright`
- Always write test scripts as `.cjs` — ESM absolute Windows paths fail in Node
- Run a single test: `node test-script.cjs`
- Run the entire suite: `node run-all-tests.cjs` (discovers and runs every `test-*.cjs` file at the repo root sequentially; exits non-zero if anything fails)
```

- [ ] **Step 6: Manually verify against the real repo root**

Run: `node run-all-tests.cjs`
Expected: streams one `[N/<total>] PASS|FAIL <file> (<elapsed>s)` line per real test file (currently 75+), ends with a summary block, and exits `0` if the whole real suite passes (matching the 74/75-with-one-flaky-file baseline established during this feature's brainstorming — a single unrelated flake is not a reason to treat this step as failed; re-run once if the summary shows exactly the same single pre-existing flaky file and nothing else new).

- [ ] **Step 7: Commit**

```bash
git add run-all-tests.cjs test-run-all-tests.cjs CLAUDE.md
git commit -m "Add run-all-tests.cjs: a single command to run the entire test suite"
```
