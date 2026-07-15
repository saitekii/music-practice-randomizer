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
