# Test Runner

**Goal:** Give this repo a single command that runs its entire 75-file Playwright test suite and reports one clear pass/fail result, replacing the undocumented manual practice of running files one at a time or hand-writing an ad hoc loop.

## Background

A fresh holistic audit of the project (2026-07-15) found 75 `.cjs` test files at the repo root with no runner, no CI config, and no `package.json` — CLAUDE.md's Testing section only documents running a single file (`node test-script.cjs`). Every regression check performed across this project's many development rounds has been an ad hoc, undocumented bash loop. A full sequential run of the suite that day showed 74/75 passing, with the one failure (`test-synth-pluck-karplus.cjs`, a timing-sensitive audio-DSP test) not reproducing when run standalone — flaky under load, not a real regression, and evidence that the suite is fundamentally healthy today.

Scope was deliberately narrowed during brainstorming: this is a **local script only**, not a GitHub Actions CI workflow. The project has no `package.json`, no build step, and no existing CI infrastructure — adding real CI (workflow YAML, a Playwright-install step, secrets/runner configuration) is a materially bigger and separate piece of work than "make it possible to run everything with one command," and wasn't asked for.

## Design

**New file: `run-all-tests.cjs`** at the repo root — a plain Node script, no new dependency, matching the existing `.cjs` convention used by every test file.

**Discovery:** `fs.readdirSync(targetDir)` filtered to filenames matching `/^test-.*\.cjs$/`, sorted alphabetically, where `targetDir` defaults to `__dirname` (the repo root) but can be overridden via an optional CLI argument (`node run-all-tests.cjs [dir]`). The override exists specifically so the runner's own test (see Testing below) can point it at a throwaway fixture directory instead of the real repo root — normal usage is always `node run-all-tests.cjs` with no argument. This means the runner never goes stale as new test files are added — no hardcoded list to maintain, which matters given nearly every development round in this project's history has added at least one new test file.

**Execution: sequential, not parallel.** Each discovered file is run as a child process via Node's `child_process.spawnSync('node', [filename], { encoding: 'utf8' })`, one at a time, in the sorted order. Rationale (from brainstorming): a live suite run the same day surfaced one flaky failure under purely sequential execution — running 75 headless Chromium launches concurrently would likely increase flakiness, not save meaningful wall-clock time, and sequential also matches how the suite has always actually been exercised manually.

**Per-file output**, streamed as each file finishes (not buffered to the end — a full run can take several minutes and silence for that long is unhelpful):

```
[42/75] PASS test-band-scheduler-core.cjs (2.1s)
[43/75] FAIL test-example-broken.cjs (0.8s)
  <full stdout+stderr of the failed run, indented>
```

A file counts as PASS if its process exits with code `0`, FAIL otherwise (matching every test file's own `process.exit(1)` on failure / implicit `0` on success convention). On FAIL, the child process's combined stdout+stderr is printed immediately under that file's line, indented, so the failure reason is visible without a separate re-run.

**Final summary**, printed after all files finish:

```
==============================
75 files: 74 passed, 1 failed
Total time: 3m 42s
Failed:
  test-example-broken.cjs
==============================
```

**Exit code:** `1` if any file failed, `0` if all passed — makes the script usable as a real pass/fail gate (e.g. before a commit), even without CI wired up to it.

## Documentation

CLAUDE.md's Testing section (currently only documenting `node test-script.cjs` for a single file) gets one line added documenting `node run-all-tests.cjs` as the "run everything" command, alongside the existing single-file instruction — not replacing it, since running one file at a time during active development of a single feature remains the faster loop.

## Testing

Since this *is* the test-running infrastructure, its own test can't recurse into running the full suite as part of itself. Instead:
- Create 2-3 tiny throwaway `.cjs` fixture files in a temp directory (not the real repo root, to avoid the runner picking up its own test fixtures in a real run) that deterministically pass or fail (e.g. `process.exit(0)` and `process.exit(1)`), and verify `run-all-tests.cjs` correctly counts and reports them when pointed at that directory.
- Verify the real run against the actual repo root discovers all 75 (at time of writing) real test files (count check, not full execution — full execution is covered by the separate manual verification step in the implementation plan).
- Verify exit code is `0` when all fixture files pass and `1` when any fail.
- Verify a failed fixture file's stdout/stderr actually appears in the runner's output.
