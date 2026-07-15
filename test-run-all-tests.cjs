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
