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
